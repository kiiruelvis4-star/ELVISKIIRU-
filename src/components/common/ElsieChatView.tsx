import React, { useState, useEffect, useRef } from 'react';
import {
  UserIdentity,
  ElsieMessage,
  loadThread,
  saveThread,
  clearThread,
  solveElsieQueryStreaming,
  generateGreeting,
  formatTimeHM,
  isThursdayInNairobi,
} from '../../utils/elsieEngine';
import { sound } from '../../utils/sound';
import { usePWAInstall } from '../../utils/usePWAInstall';
import { EmojiKeyboardDrawer, recordRecentEmoji } from './EmojiKeyboardDrawer';
import {
  analyzeEmojiSemantics,
  lookupEmojiMeaning,
  getToneChipLabel,
} from '../../data/emojiCatalog';

interface ElsieChatViewProps {
  identity: UserIdentity;
  onClose?: () => void;
  quickPrompts?: string[];
  theme?: 'light' | 'dark';
  autoPrompt?: { id: string; text: string } | null;
  onAutoPromptConsumed?: () => void;
}

function renderTextWithInteractiveEmojis(
  segment: string,
  keyPrefix: string,
  onInspectEmoji?: (emoji: string) => void
): React.ReactNode {
  if (!onInspectEmoji || typeof Intl === 'undefined' || !(Intl as any).Segmenter) {
    return segment;
  }
  const segmenter = new (Intl as any).Segmenter('en', { granularity: 'grapheme' });
  const emojiRegex = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]/u;
  const parts: React.ReactNode[] = [];
  let textBuf = '';
  let idx = 0;

  for (const s of segmenter.segment(segment)) {
    const g = s.segment;
    if (emojiRegex.test(g)) {
      if (textBuf) {
        parts.push(<React.Fragment key={`${keyPrefix}_t_${idx++}`}>{textBuf}</React.Fragment>);
        textBuf = '';
      }
      const info = lookupEmojiMeaning(g);
      parts.push(
        <button
          key={`${keyPrefix}_e_${idx++}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInspectEmoji(g);
          }}
          className="inline-flex items-center justify-center rounded px-0.5 hover:bg-black/10 dark:hover:bg-white/15 cursor-pointer transition-colors align-baseline"
          title={info ? `${info.emoji} ${info.name} — ${info.meaning}` : `${g} (Tap for meaning)`}
        >
          {g}
        </button>
      );
    } else {
      textBuf += g;
    }
  }
  if (textBuf) {
    parts.push(<React.Fragment key={`${keyPrefix}_t_${idx++}`}>{textBuf}</React.Fragment>);
  }
  return parts;
}

// Render clean formatted text (bold, italic, bullet points, CBC band pills, tappable emojis) without raw markdown symbols
function renderInlineSegments(
  line: string,
  onInspectEmoji?: (emoji: string) => void
): React.ReactNode[] {
  const tokens = line.split(/(\*\*[^*]+\*\*|_[^_]+_|\[(?:EE|ME|AE|BE)\])/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
      return (
        <strong key={i} className="font-extrabold">
          {renderTextWithInteractiveEmojis(tok.slice(2, -2), `b_${i}`, onInspectEmoji)}
        </strong>
      );
    }
    if (tok.startsWith('_') && tok.endsWith('_') && tok.length > 2) {
      return (
        <em key={i} className="italic opacity-90">
          {renderTextWithInteractiveEmojis(tok.slice(1, -1), `em_${i}`, onInspectEmoji)}
        </em>
      );
    }
    if (tok === '[EE]' || tok === '[ME]' || tok === '[AE]' || tok === '[BE]') {
      const code = tok.slice(1, -1);
      const colorMap: Record<string, string> = {
        EE: 'bg-[#2563EB] text-white',
        ME: 'bg-[#16A34A] text-white',
        AE: 'bg-[#EA580C] text-white',
        BE: 'bg-[#E11D48] text-white',
      };
      return (
        <span
          key={i}
          className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-black tracking-wide align-middle mx-0.5 ${colorMap[code]}`}
        >
          {code}
        </span>
      );
    }
    return (
      <React.Fragment key={i}>
        {renderTextWithInteractiveEmojis(tok, `p_${i}`, onInspectEmoji)}
      </React.Fragment>
    );
  });
}

const FormattedMessageBody: React.FC<{
  text: string;
  onInspectEmoji?: (emoji: string) => void;
}> = ({ text, onInspectEmoji }) => {
  const lines = text.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((rawLine, idx) => {
        const trimmed = rawLine.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;
        if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1">
              <span className="text-emerald-500 font-black leading-snug shrink-0">•</span>
              <span className="flex-1 leading-relaxed">
                {renderInlineSegments(trimmed.slice(2), onInspectEmoji)}
              </span>
            </div>
          );
        }
        return (
          <div key={idx} className="leading-relaxed">
            {renderInlineSegments(rawLine, onInspectEmoji)}
          </div>
        );
      })}
    </div>
  );
};

export const ElsieChatView: React.FC<ElsieChatViewProps> = ({
  identity,
  onClose,
  quickPrompts,
  theme = 'light',
  autoPrompt,
  onAutoPromptConsumed,
}) => {
  const [messages, setMessages] = useState<ElsieMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showEmojiTray, setShowEmojiTray] = useState<boolean>(false);
  const [inspectedBubbleEmoji, setInspectedBubbleEmoji] = useState<{
    msgId: string;
    emoji: string;
  } | null>(null);
  const [showDossierStrip, setShowDossierStrip] = useState<boolean>(
    identity.role === 'parent' || identity.role === 'learner'
  );
  const [liveSnapshot, setLiveSnapshot] = useState<any>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const consumedAutoPromptRef = useRef<string | null>(null);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Initialize or load existing 24-hour thread
  useEffect(() => {
    const existing = loadThread(identity.role, identity.id);
    if (existing.length > 0) {
      setMessages(existing);
    } else {
      const greeting = generateGreeting(identity);
      const initialMsg: ElsieMessage = {
        id: `msg_${Date.now()}`,
        text: greeting,
        out: false,
        timestamp: new Date().toISOString(),
        displayTime: formatTimeHM(new Date()),
        status: 'read',
      };
      setMessages([initialMsg]);
      saveThread(identity.role, identity.id, [initialMsg]);
    }
  }, [identity.role, identity.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (
      autoPrompt &&
      autoPrompt.text &&
      autoPrompt.id !== consumedAutoPromptRef.current &&
      messages.length > 0 &&
      !isTyping
    ) {
      consumedAutoPromptRef.current = autoPrompt.id;
      handleSend(autoPrompt.text);
      if (onAutoPromptConsumed) onAutoPromptConsumed();
    }
  }, [autoPrompt, messages.length, isTyping]);

  const handleResetThread = () => {
    sound.playClick(450);
    clearThread(identity.role, identity.id);
    const greeting = generateGreeting(identity);
    const freshMsg: ElsieMessage = {
      id: `msg_${Date.now()}`,
      text: greeting,
      out: false,
      timestamp: new Date().toISOString(),
      displayTime: formatTimeHM(new Date()),
      status: 'read',
    };
    setMessages([freshMsg]);
    saveThread(identity.role, identity.id, [freshMsg]);
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isTyping) return;

    sound.playClick(500);

    const userMsg: ElsieMessage = {
      id: `msg_${Date.now()}_u`,
      text,
      out: true,
      timestamp: new Date().toISOString(),
      displayTime: formatTimeHM(new Date()),
      status: 'delivered',
    };

    const streamMsgId = `msg_${Date.now() + 1}_ai`;
    const updatedWithUser = [...messages, userMsg];
    setMessages(updatedWithUser);
    saveThread(identity.role, identity.id, updatedWithUser);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await solveElsieQueryStreaming(
        text,
        identity,
        updatedWithUser,
        (partialText) => {
          if (!partialText) return;
          setIsTyping(false);
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === streamMsgId);
            if (exists) {
              return prev.map((m) => (m.id === streamMsgId ? { ...m, text: partialText } : m));
            }
            return [
              ...prev,
              {
                id: streamMsgId,
                text: partialText,
                out: false,
                timestamp: new Date().toISOString(),
                displayTime: formatTimeHM(new Date()),
                status: 'read',
                source: 'gemini',
              },
            ];
          });
        }
      );

      if (response.pathwaySnapshot) {
        setLiveSnapshot(response.pathwaySnapshot);
      }

      const aiMsg: ElsieMessage = {
        id: streamMsgId,
        text: response.text,
        out: false,
        timestamp: new Date().toISOString(),
        displayTime: formatTimeHM(new Date()),
        status: 'read',
        source: response.source,
      };

      const finalMessages = [...updatedWithUser, aiMsg];
      setMessages(finalMessages);
      saveThread(identity.role, identity.id, finalMessages);
      sound.playClick(650);
    } catch {
      const fallbackMsg: ElsieMessage = {
        id: `msg_${Date.now()}_err`,
        text: isThursdayInNairobi()
          ? 'Asante, nimepokea ujumbe wako. Kuna jambo jingine ungependa Elsie AI ikusaidie?'
          : 'Thank you for your message. How else may Elsie AI assist you today?',
        out: false,
        timestamp: new Date().toISOString(),
        displayTime: formatTimeHM(new Date()),
        source: 'offline',
      };
      const finalMessages = [...updatedWithUser, fallbackMsg];
      setMessages(finalMessages);
      saveThread(identity.role, identity.id, finalMessages);
    } finally {
      setIsTyping(false);
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (!searchQuery.trim()) return true;
    return m.text.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const isDark = theme === 'dark';
  const draftEmojiSemantics = analyzeEmojiSemantics(inputText);
  const draftToneChip = draftEmojiSemantics.dominantTone
    ? getToneChipLabel(draftEmojiSemantics.dominantTone)
    : null;

  const getSubTitle = () => {
    if (identity.role === 'learner') {
      return `${identity.name} (${identity.id}) · ${identity.grade || 'Primary'} · Learner`;
    }
    if (identity.role === 'teacher') {
      return `${identity.preferredName || `Tr. ${identity.name}`} · 🧠 CBC Faculty Brain`;
    }
    if (identity.role === 'parent') {
      const kid = identity.linkedLearners?.[0];
      return `${identity.name} · 🎓 Guardian of ${kid?.name || 'Learner'} (${kid?.grade || 'CBC'})`;
    }
    return `Administrator · 🤖 School Master AI`;
  };

  const summary = identity.assessmentSummary;
  const releasedCount = summary?.releasedSubjectsCount ?? 0;
  const pendingPushCount = summary?.pendingReleaseSubjects?.length ?? 0;
  const topPathwayName =
    liveSnapshot?.topPathway || summary?.topPathway?.name || null;

  return (
    <div
      className={`relative w-full h-full flex flex-col font-sans select-none overflow-hidden transition-colors duration-200 ${
        isDark ? 'bg-[#0B141A] text-[#E9EDEF]' : 'bg-[#ECE5DD] text-[#111B21]'
      }`}
      style={{
        ['--head' as any]: isDark ? '#17232A' : '#075E54',
        ['--bg' as any]: isDark ? '#0B141A' : '#ECE5DD',
        ['--out' as any]: isDark ? '#005C4B' : '#DCF8C6',
        ['--in' as any]: isDark ? '#202C33' : '#FFFFFF',
        ['--text' as any]: isDark ? '#E9EDEF' : '#111B21',
        ['--meta' as any]: isDark ? '#8696A0' : '#667781',
        ['--bar' as any]: isDark ? '#202C33' : '#F0F2F5',
        ['--line' as any]: isDark ? '#2A3942' : '#D1D7DB',
        ['--accent' as any]: isDark ? '#00A884' : '#128C7E',
        ['--tick' as any]: isDark ? '#53BDEB' : '#34B7F1',
        ['--field' as any]: isDark ? '#2A3942' : '#FFFFFF',
      }}
    >
      {/* 1. ELSIE AI HEADER */}
      <div
        className="flex items-center gap-2.5 px-3 py-2 min-h-[60px] shrink-0 shadow-xs z-10"
        style={{ backgroundColor: 'var(--head)', color: '#FFFFFF' }}
      >
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-white cursor-pointer transition-colors"
            title="Back to portal"
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>
        )}

        {/* Crest + AI Pulse */}
        <div className="relative w-10 h-10 shrink-0">
          <img
            src="/images/lra_crest.jpg"
            alt="Elsie AI — Little Roses Academy"
            className="w-10 h-10 rounded-full object-cover bg-white border border-white/30 shadow-xs"
          />
          <span
            className="absolute -top-1 -left-1 text-[12px] leading-none bg-[#075E54] rounded-full p-0.5 shadow-xs"
            title="Elsie AI Assistant"
          >
            🤖
          </span>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#075E54] ${
              isOnline ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
            title={isOnline ? 'AI Brain Online' : 'Offline PWA Mode'}
          />
        </div>

        {/* Identity & Brain Badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-extrabold text-[14.5px] leading-tight truncate text-white">
              🤖 Elsie AI
            </span>
            <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-white/15 text-emerald-100 font-bold tracking-wide">
              🧠 CBC & Pathways Brain
            </span>
            {isThursdayInNairobi() && (
              <span className="text-[9.5px] px-1.5 py-0.5 bg-amber-500/80 rounded text-slate-950 font-black">
                🇰🇪 Alhamisi · Swahili
              </span>
            )}
          </div>
          <div className="text-[11px] text-white/80 truncate font-normal mt-0.5">
            {getSubTitle()}
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!isInstalled && isInstallable && (
            <button
              onClick={() => install()}
              className="px-2 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] cursor-pointer transition-colors"
              title="Install PWA App"
            >
              📲 PWA
            </button>
          )}
          {(identity.role === 'parent' || identity.role === 'learner') && (
            <button
              onClick={() => setShowDossierStrip((p) => !p)}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/90 hover:text-white cursor-pointer transition-colors text-sm"
              title="Toggle Live CBC & Senior Pathway Brief"
            >
              🎓
            </button>
          )}
          <button
            onClick={() => {
              setIsSearchOpen((prev) => !prev);
              if (!isSearchOpen) setSearchQuery('');
            }}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/90 hover:text-white cursor-pointer transition-colors"
            title="Search messages"
            aria-label="Search"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
          </button>
          <button
            onClick={handleResetThread}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white cursor-pointer transition-colors text-xs font-bold"
            title="Start fresh chat thread"
            aria-label="New Chat"
          >
            🔄
          </button>
        </div>
      </div>

      {/* LIVE CBC & SENIOR PATHWAY BRIEF STRIP (Parents & Learners — zero demo data) */}
      {showDossierStrip && (identity.role === 'parent' || identity.role === 'learner') && (
        <div
          className="px-3 py-2 border-b text-[11px] flex flex-wrap items-center justify-between gap-2 shrink-0"
          style={{ backgroundColor: 'var(--bar)', borderColor: 'var(--line)' }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            {releasedCount > 0 ? (
              <>
                <span className="px-2 py-0.5 rounded-full bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-500/30">
                  ✓ {releasedCount} Admin-Released Subject{releasedCount === 1 ? '' : 's'}
                </span>
                {summary?.overallAverage !== undefined && (
                  <span className="font-bold" style={{ color: 'var(--text)' }}>
                    Avg: <strong>{summary.overallAverage}%</strong> [{summary.performanceLevel || 'ME'}]
                  </span>
                )}
                {topPathwayName && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-600/15 text-blue-700 dark:text-blue-300 font-bold truncate max-w-[210px]">
                    🎓 Top Pathway: {topPathwayName.split('(')[0].trim()}
                  </span>
                )}
              </>
            ) : pendingPushCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
                ⏳ {pendingPushCount} teacher-filled subject(s) awaiting Admin push/release
              </span>
            ) : (
              <span className="text-[11px]" style={{ color: 'var(--meta)' }}>
                📋 No Admin-released Assessment Book marks yet — Elsie uses live teacher marks once pushed.
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              handleSend(
                identity.role === 'parent'
                  ? `Analyze ${identity.linkedLearners?.[0]?.name || 'my child'}'s released performance and advise on Kenyan Senior School Pathways`
                  : 'Analyze my released CBC performance and which Kenyan Senior School Pathway suits me'
              )
            }
            className="px-2.5 py-1 rounded-lg bg-[#128C7E] hover:bg-[#075E54] text-white font-bold text-[10.5px] cursor-pointer transition-colors shrink-0"
          >
            ✨ Advise on Pathways
          </button>
        </div>
      )}

      {/* 2. EXPANDABLE SEARCH BAR */}
      {isSearchOpen && (
        <div
          className="flex items-center gap-2 px-3 py-2 border-b shrink-0 animate-fadeIn"
          style={{ backgroundColor: 'var(--bar)', borderColor: 'var(--line)' }}
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="flex-1 h-9 px-3 rounded-full text-sm outline-none transition-all shadow-inner"
            style={{
              backgroundColor: 'var(--field)',
              color: 'var(--text)',
            }}
            autoFocus
          />
          {searchQuery && (
            <span className="text-xs whitespace-nowrap" style={{ color: 'var(--meta)' }}>
              {filteredMessages.length} {filteredMessages.length === 1 ? 'match' : 'matches'}
            </span>
          )}
          <button
            onClick={() => {
              setIsSearchOpen(false);
              setSearchQuery('');
            }}
            className="p-1 text-sm font-semibold cursor-pointer hover:opacity-80"
            style={{ color: 'var(--text)' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. CHAT STREAM */}
      <div
        className="relative flex-1 min-h-0 flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        {/* Exact Attached Little Roses Academy Wallpaper Layer (100% unaltered) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none select-none"
          style={{
            backgroundImage: "url('/assets/aistudio/file_00000000b884820b8d6b455acfa2f045_8538020f.png')",
            opacity: 1,
          }}
        />

        <div className="relative z-10 flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2">
          <div className="self-center my-1">
            <span
              className="text-[11px] px-2.5 py-1 rounded-md shadow-sm font-semibold backdrop-blur-xs border border-black/5 dark:border-white/10"
              style={{ backgroundColor: 'var(--in)', color: 'var(--meta)' }}
            >
              🤖 ✨ Elsie AI · Honest Assistant · Grounded in Live LRA Cloud Records
            </span>
          </div>

          {filteredMessages.map((msg) => {
            const isInspectingThisMsg = inspectedBubbleEmoji?.msgId === msg.id;
            const inspectedDetails = isInspectingThisMsg
              ? lookupEmojiMeaning(inspectedBubbleEmoji.emoji)
              : null;
            const userMsgSemantics = msg.out ? analyzeEmojiSemantics(msg.text) : null;
            const userMsgTone =
              userMsgSemantics?.dominantTone && userMsgSemantics.emojis.length > 0
                ? getToneChipLabel(userMsgSemantics.dominantTone)
                : null;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.out ? 'items-end' : 'items-start'} w-full animate-fadeIn`}
              >
                <div
                  className={`max-w-[88%] sm:max-w-[80%] px-3 py-2 rounded-xl text-[13.5px] shadow-md relative break-words border ${
                    msg.out
                      ? 'rounded-tr-none border-emerald-500/20'
                      : 'rounded-tl-none border-black/10 dark:border-white/10'
                  }`}
                  style={{
                    backgroundColor: msg.out ? 'var(--out)' : 'var(--in)',
                    color: 'var(--text)',
                  }}
                >
                  <FormattedMessageBody
                    text={msg.text}
                    onInspectEmoji={(em) => {
                      sound.playClick(480);
                      setInspectedBubbleEmoji((prev) =>
                        prev && prev.msgId === msg.id && prev.emoji === em
                          ? null
                          : { msgId: msg.id, emoji: em }
                      );
                    }}
                  />
                  <div
                    className="flex items-center justify-end gap-1.5 mt-1 text-[10px] select-none flex-wrap"
                    style={{ color: 'var(--meta)' }}
                  >
                    {msg.out && userMsgTone && (
                      <span
                        className="px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 font-semibold text-[9.5px]"
                        title={userMsgSemantics?.summaryText}
                      >
                        {userMsgSemantics?.emojis[0]} {userMsgTone.label}
                      </span>
                    )}
                    {!msg.out && msg.source && (
                      <span className="opacity-75 font-semibold">
                        {msg.source === 'gemini'
                          ? '🤖 ✨ AI Brain'
                          : msg.source === 'offline'
                          ? '📴 Offline PWA'
                          : '☁️ 🧠 Cloud CBC'}
                      </span>
                    )}
                    <span>{msg.displayTime}</span>
                    {msg.out && (
                      <span className="font-bold text-[11px]" style={{ color: 'var(--tick)' }} title="Read">
                        ✔✔
                      </span>
                    )}
                  </div>
                </div>

                {isInspectingThisMsg && (
                  <div
                    className="mt-1 max-w-[85%] px-2.5 py-1.5 rounded-xl border shadow-sm text-[11px] flex items-center gap-2 animate-fadeIn"
                    style={{
                      backgroundColor: 'var(--in)',
                      borderColor: 'var(--line)',
                      color: 'var(--text)',
                    }}
                  >
                    <span className="text-base leading-none">{inspectedBubbleEmoji.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold truncate">
                        {inspectedDetails?.name || 'Emoji Meaning'}
                      </div>
                      <div className="text-[10.5px]" style={{ color: 'var(--meta)' }}>
                        {inspectedDetails?.meaning || 'Expressive symbol in conversation'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInspectedBubbleEmoji(null)}
                      className="text-[10px] font-bold px-1 opacity-70 hover:opacity-100 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {isTyping && (
            <div className="flex justify-start w-full">
              <div
                className="px-3 py-2 rounded-xl rounded-tl-none text-xs italic shadow-md flex items-center gap-2 border border-black/10 dark:border-white/10"
                style={{ backgroundColor: 'var(--in)', color: 'var(--meta)' }}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>🤖 ✨ Elsie AI is thinking through live CBC records &amp; Kenyan pathways…</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 4. QUICK SUGGESTION CHIPS */}
      {quickPrompts && quickPrompts.length > 0 && (
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto no-scrollbar shrink-0 border-t"
          style={{ backgroundColor: 'var(--bar)', borderColor: 'var(--line)' }}
        >
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-all hover:scale-102 active:scale-98 shadow-2xs border"
              style={{
                backgroundColor: 'var(--in)',
                borderColor: 'var(--line)',
                color: 'var(--text)',
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* 4.5 LIVE DRAFT EMOJI MEANING BAR */}
      {draftEmojiSemantics.details.length > 0 && (
        <div
          className="px-3 py-1.5 border-t flex items-center justify-between gap-2 text-[11px] shrink-0"
          style={{
            backgroundColor: draftEmojiSemantics.hasInappropriate
              ? isDark
                ? '#2B1A1E'
                : '#FEF2F2'
              : 'var(--bar)',
            borderColor: 'var(--line)',
          }}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-sm leading-none shrink-0">
              {draftEmojiSemantics.details
                .slice(0, 3)
                .map((d) => d.emoji)
                .join('')}
            </span>
            <span className="font-bold truncate" style={{ color: 'var(--text)' }}>
              {draftEmojiSemantics.hasInappropriate
                ? 'Let’s keep our Little Roses chat kind & respectful — Elsie stays calm & helpful 💛'
                : `${draftToneChip?.label || 'Emoji Tone'}: ${draftEmojiSemantics.details[0].meaning}`}
            </span>
          </div>
          {!draftEmojiSemantics.hasInappropriate && draftToneChip && (
            <span className="text-[10px] font-semibold hidden sm:inline shrink-0" style={{ color: 'var(--meta)' }}>
              {draftToneChip.hint}
            </span>
          )}
        </div>
      )}

      {/* 4.6 FULL KEYBOARD-STYLE EMOJI DRAWER */}
      {showEmojiTray && (
        <EmojiKeyboardDrawer
          isDark={isDark}
          onSelectEmoji={(em) => {
            recordRecentEmoji(em);
            setInputText((prev) => `${prev}${em}`);
            inputRef.current?.focus();
          }}
          onClose={() => setShowEmojiTray(false)}
        />
      )}

      {/* 5. COMPOSER BAR */}
      <div
        className="flex items-center gap-2 p-2 shrink-0 border-t"
        style={{ backgroundColor: 'var(--bar)', borderColor: 'var(--line)' }}
      >
        <button
          type="button"
          onClick={() => {
            sound.playClick(480);
            setShowEmojiTray((v) => !v);
          }}
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer text-lg transition-transform active:scale-95 border ${
            showEmojiTray ? 'ring-2 ring-emerald-500' : ''
          }`}
          style={{
            backgroundColor: 'var(--field)',
            borderColor: 'var(--line)',
          }}
          title="Add emojis for AI message"
          aria-label="Toggle emojis"
        >
          😊
        </button>

        <div
          className="flex-1 flex items-center px-3.5 h-[42px] rounded-full shadow-inner"
          style={{ backgroundColor: 'var(--field)' }}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder={
              isThursdayInNairobi()
                ? '🤖 Andika kwa Kiswahili, Sheng, au English...'
                : '🤖 ✨ Ask Elsie AI (English, Kiswahili, Sheng, Pathways)...'
            }
            className="w-full bg-transparent border-none outline-none text-sm"
            style={{ color: 'var(--text)' }}
          />
        </div>

        <button
          onClick={() => handleSend()}
          disabled={!inputText.trim() || isTyping}
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 cursor-pointer shadow-sm transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
          title="Send message"
          aria-label="Send message"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
};
