import React, { useState } from 'react';
import { AdminState } from './types';
import { sound } from '../../utils/sound';

interface AdminNoticesProps {
  state: AdminState;
  onBroadcastNotice: (title: string, body: string, recipient: string) => void;
  onShowToast: (msg: string) => void;
}

export const AdminNotices: React.FC<AdminNoticesProps> = ({
  state,
  onBroadcastNotice,
  onShowToast,
}) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [recipient, setRecipient] = useState<'All parents' | 'All teachers' | 'Everyone'>('All parents');

  const isDark = state.theme === 'dark';

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      onShowToast('Please provide both notice title and message content');
      return;
    }
    sound.playCompleteChime();
    onBroadcastNotice(title.trim(), body.trim(), recipient);
    setTitle('');
    setBody('');
    onShowToast(`Notice broadcasted to ${recipient}`);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-4">
      {/* Title */}
      <div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">
          Broadcast Notice Board
        </h2>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Send official communications directly into portal notification feeds
        </div>
      </div>

      {/* Composer Card */}
      <div
        className={`rounded-2xl p-4 border shadow-xs ${
          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <form onSubmit={handleSend} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Notice Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. End of Term 3 Parent-Teacher Consultation"
              className={`w-full p-2.5 rounded-xl text-xs border ${
                isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
              }`}
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Message Body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="Write detailed school announcement…"
              className={`w-full p-2.5 rounded-xl text-xs border ${
                isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
              }`}
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Recipient Audience
            </label>
            <select
              value={recipient}
              onChange={(e) => setRecipient(e.target.value as any)}
              className={`w-full p-2.5 rounded-xl text-xs border font-bold ${
                isDark ? 'bg-[#0A0F1F] border-white/10 text-white' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <option value="All parents">All Parents & Guardians</option>
              <option value="All teachers">All Teaching Staff</option>
              <option value="Everyone">Everyone (All Portals)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl text-xs font-black bg-[#EC4899] hover:bg-pink-600 text-white shadow-xs cursor-pointer transition-all active:scale-[0.98]"
          >
            Publish Notice
          </button>
        </form>
      </div>

      {/* Broadcasted Notices Feed */}
      <div className="space-y-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Sent Communications ({state.notices.length})
        </h3>

        {state.notices.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No notices published yet.
          </div>
        ) : (
          state.notices.map((n) => (
            <div
              key={n.id}
              className={`p-3.5 rounded-2xl border shadow-xs ${
                isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                  {n.title}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {n.time}
                </span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {n.body}
              </div>
              <div className="mt-2 text-[10px] font-bold text-slate-400">
                From: {n.from} · {n.role.toUpperCase()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
