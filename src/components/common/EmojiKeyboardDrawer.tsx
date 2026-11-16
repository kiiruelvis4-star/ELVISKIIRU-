import React, { useMemo, useState } from 'react';
import {
  EMOJI_CATEGORIES,
  EMOJI_CATALOG,
  DEFAULT_RECENT_EMOJIS,
  EmojiCategoryId,
  EmojiEntry,
  lookupEmojiMeaning,
  getToneChipLabel,
} from '../../data/emojiCatalog';
import { sound } from '../../utils/sound';

const RECENT_STORAGE_KEY = 'lra_elsie_recent_emojis_v1';

export function loadRecentEmojis(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((x) => typeof x === 'string').slice(0, 32);
      }
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_RECENT_EMOJIS;
}

export function recordRecentEmoji(emoji: string): string[] {
  const current = loadRecentEmojis();
  const next = [emoji, ...current.filter((e) => e !== emoji)].slice(0, 32);
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

interface EmojiKeyboardDrawerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
  isDark?: boolean;
}

export const EmojiKeyboardDrawer: React.FC<EmojiKeyboardDrawerProps> = ({
  onSelectEmoji,
  onClose,
  isDark = false,
}) => {
  const [activeCategory, setActiveCategory] = useState<EmojiCategoryId>('smileys');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => loadRecentEmojis());
  const [inspectedEmoji, setInspectedEmoji] = useState<EmojiEntry | null>(
    () => EMOJI_CATALOG.find((e) => e.emoji === '😂') || EMOJI_CATALOG[0]
  );

  const visibleEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      return EMOJI_CATALOG.filter(
        (entry) =>
          entry.emoji === q ||
          entry.name.toLowerCase().includes(q) ||
          entry.meaning.toLowerCase().includes(q) ||
          entry.keywords.some((k) => k.includes(q))
      );
    }

    if (activeCategory === 'recent') {
      return recentEmojis
        .map((em) => {
          const catalogMatch = EMOJI_CATALOG.find((e) => e.emoji === em);
          if (catalogMatch) return catalogMatch;
          const info = lookupEmojiMeaning(em);
          return {
            emoji: em,
            name: info?.name || 'Emoji',
            keywords: [],
            meaning: info?.meaning || 'Expressive keyboard emoji',
            aiGuidance: 'Interpreted warmly by Elsie AI.',
            tone: info?.tone || 'warmth',
            category: 'smileys' as const,
          };
        })
        .slice(0, 32);
    }

    return EMOJI_CATALOG.filter((e) => e.category === activeCategory);
  }, [activeCategory, searchQuery, recentEmojis]);

  const handlePick = (entry: EmojiEntry) => {
    sound.playClick(520);
    setInspectedEmoji(entry);
    setRecentEmojis(recordRecentEmoji(entry.emoji));
    onSelectEmoji(entry.emoji);
  };

  const inspectedToneInfo = inspectedEmoji ? getToneChipLabel(inspectedEmoji.tone) : null;

  return (
    <div
      className="border-t shrink-0 flex flex-col select-none animate-fadeIn"
      style={{
        backgroundColor: 'var(--bar)',
        borderColor: 'var(--line)',
      }}
    >
      {/* Top Semantic Meaning & Tone Preview Bar */}
      <div
        className="px-3 py-1.5 border-b flex items-center justify-between gap-2 text-[11px]"
        style={{
          backgroundColor: isDark ? '#182229' : '#FFFFFF',
          borderColor: 'var(--line)',
        }}
      >
        {inspectedEmoji ? (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xl leading-none shrink-0">{inspectedEmoji.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold truncate" style={{ color: 'var(--text)' }}>
                  {inspectedEmoji.name}
                </span>
                {inspectedToneInfo && (
                  <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shrink-0">
                    {inspectedToneInfo.label}
                  </span>
                )}
              </div>
              <div className="text-[10.5px] truncate" style={{ color: 'var(--meta)' }}>
                {inspectedEmoji.meaning}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-[11px]" style={{ color: 'var(--meta)' }}>
            Tap any emoji to insert and view what it means to Elsie AI
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            sound.playClick(400);
            onClose();
          }}
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer shrink-0"
          style={{ color: 'var(--meta)' }}
          title="Close emoji keyboard"
          aria-label="Close emoji keyboard"
        >
          ✕
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-2.5 pt-2 pb-1.5 flex items-center gap-2">
        <div
          className="flex-1 flex items-center gap-1.5 px-2.5 h-8 rounded-full border text-xs"
          style={{
            backgroundColor: 'var(--field)',
            borderColor: 'var(--line)',
          }}
        >
          <span className="text-xs opacity-60">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all emojis (e.g. laugh, plead, eyes, fire, heart, math)..."
            className="w-full bg-transparent border-none outline-none text-xs"
            style={{ color: 'var(--text)' }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[10px] font-bold opacity-60 hover:opacity-100 cursor-pointer"
              style={{ color: 'var(--text)' }}
            >
              ✕
            </button>
          )}
        </div>
        <span className="text-[10px] font-bold whitespace-nowrap px-1.5" style={{ color: 'var(--meta)' }}>
          {visibleEntries.length} emojis
        </span>
      </div>

      {/* Category Tabs */}
      {!searchQuery.trim() && (
        <div className="flex items-center gap-1 px-2 pb-1.5 overflow-x-auto no-scrollbar">
          {EMOJI_CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  sound.playClick(460);
                  setActiveCategory(cat.id);
                }}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-all ${
                  active
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'hover:bg-black/5 dark:hover:bg-white/10'
                }`}
                style={!active ? { color: 'var(--meta)' } : undefined}
                title={cat.label}
              >
                <span className="text-sm leading-none">{cat.icon}</span>
                <span className="hidden sm:inline">{cat.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Emoji Keyboard Grid */}
      <div className="h-[190px] sm:h-[215px] overflow-y-auto px-2.5 pb-2.5">
        {visibleEntries.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-xs gap-1" style={{ color: 'var(--meta)' }}>
            <span>🔎 No matching emojis found</span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 underline cursor-pointer"
            >
              Show all categories
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1">
            {visibleEntries.map((entry, idx) => (
              <button
                key={`${entry.emoji}_${idx}`}
                type="button"
                onMouseEnter={() => setInspectedEmoji(entry)}
                onFocus={() => setInspectedEmoji(entry)}
                onClick={() => handlePick(entry)}
                className="h-9 rounded-lg flex items-center justify-center text-xl cursor-pointer transition-transform hover:scale-115 active:scale-95 hover:bg-black/5 dark:hover:bg-white/10"
                title={`${entry.name} — ${entry.meaning}`}
                aria-label={`${entry.name}: ${entry.meaning}`}
              >
                {entry.emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
