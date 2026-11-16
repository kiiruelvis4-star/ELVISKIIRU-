import React, { useState, useRef, useEffect } from 'react';
import { AdminState, ChatMessage, ProposedDraft } from './types';
import { sound } from '../../utils/sound';
import { RETENTION_RULES } from '../../supabaseClient';

interface AdminMessagesProps {
  state: AdminState;
  onSendMessage: (text: string) => void;
  onApproveDraft: (messageId: string, draft: ProposedDraft) => void;
  onRejectDraft: (messageId: string) => void;
  onUpdateDraft: (messageId: string, updatedDraft: ProposedDraft) => void;
  onPurgeOldMessages?: () => void;
  onClearAllMessages?: () => void;
  onShowToast: (msg: string) => void;
  isLoading?: boolean;
}

export const AdminMessages: React.FC<AdminMessagesProps> = ({
  state,
  onSendMessage,
  onApproveDraft,
  onRejectDraft,
  onUpdateDraft,
  onPurgeOldMessages,
  onClearAllMessages,
  onShowToast,
  isLoading = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [editingDraftMsgId, setEditingDraftMsgId] = useState<string | null>(null);
  const [editSummary, setEditSummary] = useState('');
  const [editPayloadJson, setEditPayloadJson] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const isDark = state.theme === 'dark';

  // Check how many messages exist and if any are > 24 hours old
  const cutoff = Date.now() - RETENTION_RULES.MESSAGE_EXPIRY_MS;
  const expiredCount = state.messages.filter(
    (m) => m.id !== 'msg_welcome' && m.at && m.at < cutoff
  ).length;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages, isLoading]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputText.trim();
    if (!clean || isLoading) return;
    sound.playClick(600);
    onSendMessage(clean);
    setInputText('');
  };

  const handleQuickPrompt = (prompt: string) => {
    sound.playClick(500);
    setInputText(prompt);
  };

  const handleStartEditDraft = (msg: ChatMessage) => {
    if (!msg.draft) return;
    setEditingDraftMsgId(msg.id);
    setEditSummary(msg.draft.summary || '');
    setEditPayloadJson(
      msg.draft.payload ? JSON.stringify(msg.draft.payload, null, 2) : ''
    );
  };

  const handleSaveDraftEdit = () => {
    if (!editingDraftMsgId) return;
    const msg = state.messages.find((m) => m.id === editingDraftMsgId);
    if (!msg || !msg.draft) return;

    let parsedPayload = msg.draft.payload;
    if (editPayloadJson.trim()) {
      try {
        parsedPayload = JSON.parse(editPayloadJson);
      } catch {
        onShowToast('Invalid JSON in payload. Saved summary only.');
      }
    }

    onUpdateDraft(editingDraftMsgId, {
      ...msg.draft,
      summary: editSummary,
      payload: parsedPayload,
    });

    setEditingDraftMsgId(null);
    onShowToast('Draft updated. Tap Approve to apply.');
  };

  const handleTriggerPurge = () => {
    sound.playClick(400);
    onPurgeOldMessages?.();
    onShowToast('Messages older than 24 hours purged.');
  };

  const handleTriggerClearBacklog = () => {
    sound.playClick(400);
    if (onClearAllMessages) {
      onClearAllMessages();
    } else {
      onSendMessage('clear messages');
    }
  };

  return (
    <div className="space-y-3 animate-fade-in pb-4 flex flex-col h-[calc(100vh-170px)] sm:h-[660px]">
      {/* ELSIE Header: Clean, relevant info only (no engine telemetry or limit counters) */}
      <div
        className={`rounded-2xl p-3.5 border shrink-0 shadow-xs ${
          isDark
            ? 'bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900 border-purple-500/20 text-white'
            : 'bg-gradient-to-r from-purple-50 via-pink-50/50 to-indigo-50 border-purple-200 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/images/lra_crest.jpg"
              alt="Elsie AI Logo"
              className="w-10 h-10 object-contain rounded-full bg-[#0A192F]/40 p-0.5 border border-pink-400/40 shadow-sm shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black tracking-tight flex items-center gap-1.5">
                  <span>🤖 ✨ Elsie AI · LRA</span>
                  <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30 font-mono">
                    24-HR SESSION
                  </span>
                </h3>
                <span className="text-[10px] text-pink-600 dark:text-pink-300 font-semibold tracking-wide uppercase">
                  Learn • Love • Lead
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Little Roses Academy Master AI · Nakuru, Kenya · Grades 1–6 CBC
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">

            <button
              onClick={handleTriggerClearBacklog}
              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 dark:text-rose-300 hover:bg-rose-500/20 border border-rose-500/20 cursor-pointer transition-colors"
              title="Clear chat messages (audit log is permanently preserved)"
            >
              Clear Chat
            </button>
          </div>
        </div>
      </div>

      {/* 24-Hour Message Policy Strip */}
      <div className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-[11px] shrink-0">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="text-purple-400">⏳</span>
          <span className="font-semibold text-slate-200">24h Message Policy:</span>
          <span className="text-slate-400 hidden sm:inline">
            Conversations clear after 24h. Approved changes remain permanent in the Activity Log.
          </span>
          <span className="text-slate-400 sm:hidden">
            Clears after 24h. Log is permanent.
          </span>
        </div>

        {expiredCount > 0 ? (
          <button
            onClick={handleTriggerPurge}
            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 cursor-pointer"
          >
            Purge {expiredCount} Expired
          </button>
        ) : (
          <span className="text-[10px] text-emerald-400 font-mono">
            {state.messages.length} messages active
          </span>
        )}
      </div>

      {/* Quick Administrative Command Shortcuts */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 shrink-0 no-scrollbar text-[11px]">
        <button
          onClick={() => handleQuickPrompt('Admit pupil Jane Wanjiku into Grade 3')}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 whitespace-nowrap cursor-pointer transition-colors"
        >
          🎒 Admit Pupil
        </button>
        <button
          onClick={() => handleQuickPrompt('Add teacher Mr. Simon Kimani, phone 0722123456, subjects Mathematics, grades Grade 5')}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 whitespace-nowrap cursor-pointer transition-colors"
        >
          ➕ Add Teacher
        </button>
        <button
          onClick={() => handleQuickPrompt('Draft a Grade 4 Science CAT on Plants out of 10')}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 whitespace-nowrap cursor-pointer transition-colors"
        >
          📝 Draft CBC CAT
        </button>
        <button
          onClick={() => handleQuickPrompt('Freeze timetable for Term 1 examination period')}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 whitespace-nowrap cursor-pointer transition-colors"
        >
          ❄️ Freeze Timetable
        </button>
        <button
          onClick={() => handleQuickPrompt('Broadcast notice: Mid-term holiday commences next Friday at 3:00 PM')}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 whitespace-nowrap cursor-pointer transition-colors"
        >
          📢 Broadcast Notice
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto space-y-3.5 p-3.5 rounded-2xl bg-black/20 border border-white/5 min-h-0">
        {state.messages.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            <img
              src="/images/lra_crest.jpg"
              alt="ELSIE"
              className="w-14 h-14 mx-auto object-contain rounded-full mb-2 shadow-md bg-[#0A192F]/40 p-0.5 border border-purple-400/40"
            />
            <p className="font-bold text-slate-200 mb-1">ELSIE is ready to help</p>
            <p className="text-slate-400">
              Type any command or inquiry above to manage learners, faculty, CBC resources, or announcements.
            </p>
          </div>
        ) : (
          state.messages.map((m) => {
            const isMe = m.from === 'admin';
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400">
                  <span className="font-semibold flex items-center gap-1">
                    {isMe ? (
                      'Chief Administrator'
                    ) : (
                      <>
                        <img
                          src="/images/lra_crest.jpg"
                          alt="ELSIE"
                          className="w-3.5 h-3.5 rounded-full object-contain inline-block"
                        />
                        <span>ELSIE</span>
                      </>
                    )}
                  </span>
                  <span>·</span>
                  <span className="font-mono">{m.stamp}</span>
                </div>

                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs max-w-[92%] sm:max-w-[80%] ${
                    isMe
                      ? 'bg-gradient-to-tr from-[#7C3AED] to-[#EC4899] text-white rounded-br-xs'
                      : isDark
                      ? 'bg-[#182342] text-slate-100 border border-white/10 rounded-bl-xs'
                      : 'bg-white text-slate-900 border border-slate-200 rounded-bl-xs'
                  }`}
                >
                  <div className="whitespace-pre-line font-normal">{m.text}</div>

                  {/* Proposed Action Draft Card */}
                  {m.draft && !m.done && (
                    <div className="mt-3 p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-black text-[10px] text-purple-400 uppercase tracking-wider">
                          <span>⚡</span>
                          <span>Proposed Change · Requires Approval</span>
                        </div>
                        <span className="text-[10px] font-mono text-amber-400">
                          Draft
                        </span>
                      </div>

                      <div className="text-xs font-bold text-white leading-snug">
                        {m.draft.summary}
                      </div>

                      {/* Payload details if present */}
                      {m.draft.payload && (
                        <div className="p-2 rounded-lg bg-black/30 border border-white/5 text-[11px] text-slate-300 font-mono space-y-0.5">
                          {Object.entries(m.draft.payload).map(([k, v]) => (
                            <div key={k} className="flex gap-2">
                              <span className="text-slate-400 shrink-0">{k}:</span>
                              <span className="text-purple-300 font-semibold truncate">
                                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Edit Modal / Inline Edit */}
                      {editingDraftMsgId === m.id ? (
                        <div className="space-y-2 pt-1 border-t border-white/10">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                              Summary:
                            </label>
                            <input
                              type="text"
                              value={editSummary}
                              onChange={(e) => setEditSummary(e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                              Payload (JSON):
                            </label>
                            <textarea
                              value={editPayloadJson}
                              onChange={(e) => setEditPayloadJson(e.target.value)}
                              rows={3}
                              className="w-full px-2 py-1.5 rounded-lg bg-white/10 border border-white/15 text-[11px] font-mono text-white resize-none"
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setEditingDraftMsgId(null)}
                              className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveDraftEdit}
                              className="px-3 py-1 rounded-lg text-xs font-bold bg-purple-600 text-white"
                            >
                              Save Edits
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => {
                              sound.playCompleteChime();
                              onApproveDraft(m.id, m.draft!);
                            }}
                            className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer text-center transition-colors"
                          >
                            ✓ Approve & Apply
                          </button>

                          <button
                            onClick={() => handleStartEditDraft(m)}
                            className="py-1.5 px-3 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 cursor-pointer text-center transition-colors"
                          >
                            Change
                          </button>

                          <button
                            onClick={() => {
                              sound.playClick(400);
                              onRejectDraft(m.id);
                            }}
                            className="py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-300 cursor-pointer text-center transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Executed Resolution Badge */}
                  {m.done && (
                    <div className="mt-2.5 pt-2 border-t border-white/10 text-[11px] font-medium text-emerald-400 flex items-center gap-1.5">
                      <span>✓</span>
                      <span>{m.done}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-purple-400 animate-pulse px-2">
            <span>🌹 ELSIE is thinking...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Composer Input */}
      <form onSubmit={handleSend} className="flex gap-2 shrink-0">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Message ELSIE (e.g. 'Admit pupil Jane to Grade 3', 'Draft Grade 4 Science CAT')…"
          rows={1}
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
          className={`flex-1 p-3 rounded-2xl text-xs border resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 ${
            isDark
              ? 'bg-white/5 border-white/10 text-white placeholder-slate-500'
              : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
          }`}
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white cursor-pointer transition-all shadow-md shrink-0 flex items-center gap-1.5"
        >
          <span>Send</span>
          <span>→</span>
        </button>
      </form>
    </div>
  );
};
