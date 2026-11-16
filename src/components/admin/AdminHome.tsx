import React from 'react';
import { AdminState } from './types';
import { sound } from '../../utils/sound';

interface AdminHomeProps {
  state: AdminState;
  onNavigateTab: (tab: AdminState['tab']) => void;
  onOpenQuickAction: (action: string) => void;
  unreadCount: number;
}

export const AdminHome: React.FC<AdminHomeProps> = ({
  state,
  onNavigateTab,
  onOpenQuickAction,
  unreadCount,
}) => {
  const flaggedPasswords = state.teachers.filter((t) => t.mustChangePw).length;
  const passwordRequests = state.passwordRequests || [];
  const pendingRequestsCount = passwordRequests.filter((r) => r.status === 'pending').length;
  const isDark = state.theme === 'dark';

  return (
    <div className="space-y-4 animate-fade-in pb-2">
      {/* Pending Password Requests Alert Banner if any */}
      {pendingRequestsCount > 0 && (
        <div
          onClick={() => {
            sound.playClick(500);
            onOpenQuickAction('password_requests');
          }}
          className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-pink-500/15 border border-amber-500/40 text-slate-100 flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-all shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shrink-0">
              🔐
            </span>
            <div>
              <div className="text-xs font-black flex items-center gap-1.5">
                <span>{pendingRequestsCount} Password Change Request{pendingRequestsCount > 1 ? 's' : ''} Pending</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-bold uppercase">
                  Action Required
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Tap to review the pending queue and issue temporary passwords
              </div>
            </div>
          </div>
          <span className="text-amber-400 font-black text-sm">›</span>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Teachers */}
        <div
          onClick={() => {
            sound.playClick(500);
            onNavigateTab('teachers');
          }}
          className={`rounded-2xl p-3.5 shadow-sm border transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
            isDark ? 'bg-[#142345] border-blue-500/30' : 'bg-[#EBF2FF] border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Teachers
            </span>
            <span className="w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-sm shadow-xs">
              👥
            </span>
          </div>
          <div className="text-2xl font-black text-blue-900 dark:text-blue-100 leading-tight">
            {state.teachers.length}
          </div>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">
            Enrolled CBC staff
          </div>
        </div>

        {/* Learners */}
        <div
          onClick={() => {
            sound.playClick(500);
            onNavigateTab('pupils');
          }}
          className={`rounded-2xl p-3.5 shadow-sm border transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
            isDark ? 'bg-[#132E27] border-emerald-500/30' : 'bg-[#E8FAF0] border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Learners
            </span>
            <span className="w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-sm shadow-xs">
              🎒
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100 leading-tight">
            {state.learners.length}
          </div>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">
            Grades 1 to 6 only
          </div>
        </div>

        {/* Families */}
        <div
          onClick={() => {
            sound.playClick(500);
            onNavigateTab('families');
          }}
          className={`rounded-2xl p-3.5 shadow-sm border transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
            isDark ? 'bg-[#2E2413] border-amber-500/30' : 'bg-[#FEF7E8] border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Families
            </span>
            <span className="w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-sm shadow-xs">
              👨‍👩‍👧
            </span>
          </div>
          <div className="text-2xl font-black text-amber-900 dark:text-amber-100 leading-tight">
            {state.families.length}
          </div>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">
            Linked households
          </div>
        </div>

        {/* Notices & Security */}
        <div
          onClick={() => {
            sound.playClick(500);
            onOpenQuickAction('notices');
          }}
          className={`rounded-2xl p-3.5 shadow-sm border transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
            isDark ? 'bg-[#2B1942] border-purple-500/30' : 'bg-[#F5EDFF] border-purple-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Notices
            </span>
            <span className="w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-sm shadow-xs">
              🔔
            </span>
          </div>
          <div className="text-2xl font-black text-purple-900 dark:text-purple-100 leading-tight">
            {unreadCount}
          </div>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">
            {flaggedPasswords > 0
              ? `${flaggedPasswords} temp password(s)`
              : 'School secure'}
          </div>
        </div>
      </div>

      {/* Quick Actions Header */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-sm font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
            Quick Actions
          </h3>
          <button
            onClick={() => {
              sound.playClick(500);
              onOpenQuickAction('password_requests');
            }}
            className="text-[11px] text-[#7C3AED] dark:text-[#A855F7] font-black hover:underline cursor-pointer flex items-center gap-1.5"
          >
            <span>🔐 Password Requests</span>
            {pendingRequestsCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>

        {/* CBC Assessment Pipeline & Engine Banner */}
        <div
          onClick={() => {
            sound.playClick(500);
            onOpenQuickAction('assessment');
          }}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-[#0A1F4D] via-[#1E3A8A] to-[#2563EB] text-white shadow-md border border-white/20 cursor-pointer hover:scale-[1.01] transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black text-lg flex items-center justify-center shrink-0 shadow-sm">
              ⚖️
            </span>
            <div>
              <div className="text-xs sm:text-sm font-black flex items-center gap-1.5">
                <span>CBC Assessment Pipeline & Engine</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-400 text-slate-950 font-bold uppercase">
                  Active
                </span>
              </div>
              <div className="text-[11px] text-blue-200 mt-0.5">
                Review teacher CATs & marks, release to parents, manage calendar dates & promotion
              </div>
            </div>
          </div>
          <span className="text-amber-300 font-black text-lg shrink-0">›</span>
        </div>

        {/* 4 Quick Action Colorful Tiles */}
        <div className="grid grid-cols-2 gap-3">
          {/* Pupils Register */}
          <button
            onClick={() => {
              sound.playClick(550);
              onNavigateTab('pupils');
            }}
            className="group relative rounded-2xl p-4 text-left text-white shadow-md overflow-hidden cursor-pointer transition-all active:scale-[0.98] hover:shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
            }}
          >
            <div className="font-black text-sm sm:text-base leading-tight">Pupils Register</div>
            <div className="text-[11px] text-white/90 font-medium mt-1">
              Admit & edit learner details
            </div>
            <span className="absolute right-2 bottom-1.5 text-3xl opacity-85 pointer-events-none group-hover:scale-110 transition-transform">
              🎒
            </span>
          </button>

          {/* Elsie AI */}
          <button
            onClick={() => {
              sound.playClick(550);
              onOpenQuickAction('messages');
            }}
            className="group relative rounded-2xl p-4 text-left text-white shadow-md overflow-hidden cursor-pointer transition-all active:scale-[0.98] hover:shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #075E54 0%, #128C7E 100%)',
            }}
          >
            <div className="font-black text-sm sm:text-base leading-tight">🤖 Elsie AI ✨</div>
            <div className="text-[11px] text-white/90 font-medium mt-1">
              🧠 Assessment reader & executive desk
            </div>
            <img
              src="/images/lra_crest.jpg"
              alt="Elsie AI"
              className="absolute right-2 bottom-1.5 w-10 h-10 object-contain rounded-full shadow-md group-hover:scale-110 transition-transform pointer-events-none bg-[#0A192F]/40 p-0.5 border border-white/20"
            />
          </button>

          {/* Timetable */}
          <button
            onClick={() => {
              sound.playClick(550);
              onOpenQuickAction('timetable');
            }}
            className="group relative rounded-2xl p-4 text-left text-white shadow-md overflow-hidden cursor-pointer transition-all active:scale-[0.98] hover:shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #2F6BFF 0%, #60A5FA 100%)',
            }}
          >
            <div className="font-black text-sm sm:text-base leading-tight">Timetable</div>
            <div className="text-[11px] text-white/90 font-medium mt-1">
              40m lessons & freeze
            </div>
            <span className="absolute right-2 bottom-1.5 text-3xl opacity-85 pointer-events-none group-hover:scale-110 transition-transform">
              🗓️
            </span>
          </button>

          {/* Promotion */}
          <button
            onClick={() => {
              sound.playClick(550);
              onOpenQuickAction('promotion');
            }}
            className="group relative rounded-2xl p-4 text-left text-white shadow-md overflow-hidden cursor-pointer transition-all active:scale-[0.98] hover:shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
            }}
          >
            <div className="font-black text-sm sm:text-base leading-tight">Promotion</div>
            <div className="text-[11px] text-white/90 font-medium mt-1">
              End of Term 3
            </div>
            <span className="absolute right-2 bottom-1.5 text-3xl opacity-85 pointer-events-none group-hover:scale-110 transition-transform">
              🎓
            </span>
          </button>
        </div>
      </div>

      {/* Classes Needing Attention */}
      <div className={`rounded-2xl p-4 border shadow-sm ${
        isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-black text-xs text-slate-900 dark:text-slate-100">
            CBC Continuous Assessment (60% CAT / 40% Assignments)
          </div>
          <button
            onClick={() => onNavigateTab('teachers')}
            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            View Teachers ›
          </button>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
          Term 3 CAT marks entered by subject teachers across sub-strands automatically feed the full-year CBC progress booklets.
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
            <span className="font-bold text-slate-700 dark:text-slate-200">
              Grade 5 Science (Agriculture & Nutrition)
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              88% recorded
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
            <span className="font-bold text-slate-700 dark:text-slate-200">
              Grade 6 Mathematics (Fractions & Measurements)
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
              CAT 2 in progress
            </span>
          </div>
        </div>
      </div>

      {/* Recent Activity Log */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
            Recent Activity Log
          </h3>
          <button
            onClick={() => onOpenQuickAction('activity_log')}
            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Full Log ›
          </button>
        </div>

        <div className="space-y-2">
          {state.log.slice(0, 4).map((entry, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 p-3 rounded-2xl border shadow-xs ${
                isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#A855F7] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                ✓
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100 leading-snug">
                  {entry.text}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                  {entry.by} · {entry.at}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
