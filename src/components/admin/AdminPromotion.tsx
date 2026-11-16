import React, { useState, useEffect } from 'react';
import { AdminState, GradeName, GRADES, GRADE_COLORS } from './types';
import { sound } from '../../utils/sound';
import { useBackHandler } from '../../utils/navigationHistory';
import {
  getAcademicLifecycleSnapshot,
  TermStatusSummary,
} from '../../utils/academicLifecycle';

interface AdminPromotionProps {
  state: AdminState;
  onExecutePromotion: () => void;
  onPurgeOldAssessments?: () => void | Promise<void>;
  onOpenTermDates?: () => void;
  onOpenFreezeTimetable?: () => void;
  onSendReminder?: () => void;
  onShowToast: (msg: string) => void;
}

export const AdminPromotion: React.FC<AdminPromotionProps> = ({
  state,
  onExecutePromotion,
  onPurgeOldAssessments,
  onOpenTermDates,
  onOpenFreezeTimetable,
  onSendReminder,
  onShowToast,
}) => {
  const [showConfirmPromote, setShowConfirmPromote] = useState(false);
  const [showConfirmPurge, setShowConfirmPurge] = useState(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useBackHandler(
    () => {
      sound.playClick(400);
      if (showConfirmPurge) {
        setShowConfirmPurge(false);
        return true;
      }
      setShowConfirmPromote(false);
      return true;
    },
    showConfirmPromote || showConfirmPurge,
    45,
    'promotion_confirm_modal'
  );

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const isDark = state.theme === 'dark';
  const snapshot = getAcademicLifecycleSnapshot(state, nowMs);
  const { freeze, holiday, termDetails, term3Countdown } = snapshot;

  const nextGradeMap: Record<GradeName, string> = {
    'Grade 1': 'Grade 2',
    'Grade 2': 'Grade 3',
    'Grade 3': 'Grade 4',
    'Grade 4': 'Grade 5',
    'Grade 5': 'Grade 6',
    'Grade 6': 'Alumni Archive (Graduated Primary)',
  };

  const activeLearners = (state.learners || []).filter((l) => !l.alumni);
  const alumniCount = (state.learners || []).filter((l) => l.alumni).length;
  const getLearnerCount = (g: GradeName) =>
    activeLearners.filter((l) => l.grade === g).length;

  const handleRunPromotion = () => {
    sound.playCompleteChime();
    onExecutePromotion();
    setShowConfirmPromote(false);
    onShowToast('Promotion started: learners advanced & 30-day assessment deletion window active');
  };

  const handleRunPurge = async () => {
    sound.playCompleteChime();
    if (onPurgeOldAssessments) {
      await onPurgeOldAssessments();
    }
    setShowConfirmPurge(false);
  };

  const phaseAccent =
    snapshot.phase === 'freeze_exams'
      ? 'border-amber-500/40 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100'
      : snapshot.phase === 'term3_expired_pending'
      ? 'border-rose-500/40 bg-rose-50 text-rose-950 dark:bg-rose-950/30 dark:text-rose-100'
      : snapshot.phase === 'term3_countdown'
      ? 'border-indigo-500/40 bg-indigo-50 text-indigo-950 dark:bg-indigo-950/30 dark:text-indigo-100'
      : snapshot.phase === 'term3_completed'
      ? 'border-emerald-500/40 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100'
      : snapshot.phase === 'inter_term_holiday'
      ? 'border-teal-500/40 bg-teal-50 text-teal-950 dark:bg-teal-950/30 dark:text-teal-100'
      : 'border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-[#141C33] dark:text-white';

  return (
    <div className="space-y-4 animate-fade-in pb-6">
      {/* Live Academic Lifecycle Header */}
      <div className="rounded-2xl bg-[#0A1F4D] text-white p-5 border border-indigo-900/60">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-200">
          <span>Academic Year {snapshot.academicYear} · Nairobi Time ({snapshot.todayKey})</span>
          <span className="font-mono tabular-nums">
            {activeLearners.length} Active Learners{alumniCount > 0 ? ` · ${alumniCount} Alumni` : ''}
          </span>
        </div>

        <h2 className="text-lg sm:text-xl font-bold mt-1.5 tracking-tight">
          Academic Promotion &amp; 30-Day Assessment Lifecycle
        </h2>
        <p className="text-xs text-indigo-100/90 mt-1 leading-relaxed">
          Synced live with Admin Term Dates and Timetable Freeze. Assessment Books and Reports appear automatically to learners and parents without waiting for manual push, and follow Term 3’s 30-day rule to clear old books and promote classes.
        </p>

        {/* 3-Column Synchronized Telemetry Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4">
          <div className="rounded-xl bg-white/10 p-3 border border-white/15">
            <div className="text-[11px] text-indigo-200 font-medium">Current Phase</div>
            <div className="text-sm font-bold mt-0.5 leading-snug">{snapshot.phaseLabel}</div>
          </div>

          <div className="rounded-xl bg-white/10 p-3 border border-white/15">
            <div className="text-[11px] text-indigo-200 font-medium">Freeze &amp; Holiday Monitor</div>
            <div className="text-sm font-bold mt-0.5 leading-snug">
              {freeze.active
                ? `Frozen for Exams (${freeze.daysRemaining}d left)`
                : freeze.scheduledFuture
                ? `Freeze Scheduled: ${freeze.from}`
                : holiday.active
                ? `${holiday.label} (${holiday.totalDays ?? '—'}d)`
                : 'Normal Lessons Active'}
            </div>
          </div>

          <div className="rounded-xl bg-white/10 p-3 border border-white/15">
            <div className="text-[11px] text-indigo-200 font-medium">Term 3 30-Day Erasure Clock</div>
            <div className="text-sm font-bold font-mono tabular-nums mt-0.5 leading-snug">
              {term3Countdown.isPurgedCompleted
                ? 'Cleared & Promoted'
                : term3Countdown.active
                ? term3Countdown.isExpired
                  ? '0d 0h (Window Elapsed)'
                  : `${term3Countdown.daysRemaining}d ${term3Countdown.hoursRemaining}h left`
                : `Starts ${termDetails[2]?.close || 'Term 3 End'}`}
            </div>
          </div>
        </div>
      </div>

      {/* Live Phase Status & 30-Day Countdown / Holiday Rules */}
      <div className={`rounded-2xl p-4 border ${phaseAccent}`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs font-bold">
              {snapshot.phase === 'freeze_exams'
                ? 'Exams & Timetable Freeze Status'
                : snapshot.phase === 'inter_term_holiday'
                ? 'Inter-Term Holiday Status'
                : 'Term 3 Auto-Release & 30-Day Deletion Countdown'}
            </div>
            <p className="text-xs leading-relaxed opacity-90">{snapshot.phaseDescription}</p>
            {freeze.active && (
              <div className="text-xs font-medium pt-1">
                Freeze Period: <span className="font-mono tabular-nums">{freeze.from}</span> to{' '}
                <span className="font-mono tabular-nums">{freeze.to}</span> · Reason: {freeze.why}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {onOpenFreezeTimetable && (
              <button
                type="button"
                onClick={() => {
                  sound.playClick(450);
                  onOpenFreezeTimetable();
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-current/25 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
              >
                Manage Freeze / Exams
              </button>
            )}
            {onOpenTermDates && (
              <button
                type="button"
                onClick={() => {
                  sound.playClick(450);
                  onOpenTermDates();
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-current/25 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
              >
                Edit Term Dates
              </button>
            )}
          </div>
        </div>

        {/* 30-Day Progress Bar whenever Term 3 countdown is running */}
        {(term3Countdown.active || term3Countdown.isPurgedCompleted) && (
          <div className="mt-4 pt-3 border-t border-current/15 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold">
                30-Day Term 3 Window ({term3Countdown.source === 'manual_promotion' ? 'Started via Promotion' : 'Started automatically at Term 3 Closing'})
              </span>
              <span className="font-mono tabular-nums font-bold">
                {Math.round(term3Countdown.progressPercent)}% elapsed ·{' '}
                {term3Countdown.isPurgedCompleted
                  ? 'Books Deleted'
                  : term3Countdown.expiresAtDateLabel
                  ? `Deletes ${term3Countdown.expiresAtDateLabel}`
                  : 'Day 30'}
              </span>
            </div>

            <div className="h-2.5 w-full rounded-full bg-black/10 dark:bg-white/15 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  term3Countdown.isExpired ? 'bg-rose-600' : 'bg-indigo-600 dark:bg-indigo-400'
                }`}
                style={{ width: `${Math.max(4, term3Countdown.progressPercent)}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-[11px] opacity-85">
                Reminders are dispatched inside Parents &amp; Learners Notifications UI (30d, 14d, 7d, 3d, 1d) and books stay live without waiting for Admin push.
              </span>
              {onSendReminder && !term3Countdown.isPurgedCompleted && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(520);
                    onSendReminder();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  Send Countdown Reminder Now
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Synchronized Term Dates & Break Policy Table */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Term Dates, Break Durations &amp; Deletion Rules ({snapshot.academicYear})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Changes to term dates in Admin Settings update this schedule automatically. Breaks under 30 days between Term 1 &amp; Term 2 never delete books; Term 3 follows the 30-day rule automatically.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[560px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-300 border-b border-slate-200 dark:border-white/10">
                <th className="py-2.5 px-4 font-semibold">Term</th>
                <th className="py-2.5 px-3 font-semibold">Opens</th>
                <th className="py-2.5 px-3 font-semibold">Mid-Term</th>
                <th className="py-2.5 px-3 font-semibold">Closes</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-4 font-semibold">Post-Term Break &amp; Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {termDetails.map((t: TermStatusSummary) => {
                const statusText =
                  t.status === 'active'
                    ? `Active (${t.daysUntilClose ?? 0}d left)`
                    : t.status === 'ended'
                    ? 'Ended'
                    : `Starts in ${t.daysUntilOpen ?? '—'}d`;

                const statusClass =
                  t.status === 'active'
                    ? 'text-emerald-700 dark:text-emerald-300 font-bold'
                    : t.status === 'ended'
                    ? 'text-slate-500 dark:text-slate-400 font-semibold'
                    : 'text-indigo-700 dark:text-indigo-300 font-semibold';

                const breakRule =
                  t.term === 'Term 3'
                    ? '30 days strict · Auto-release books, remind families, then promote & delete'
                    : t.breakAfterDays !== null
                    ? `${t.breakAfterDays} days${t.breakLessThan30Days ? ' (< 30d)' : ''} · Holiday only, books kept`
                    : 'Inter-term holiday · Books kept';

                return (
                  <tr key={t.term} className="hover:bg-slate-50/70 dark:hover:bg-white/5">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{t.term}</td>
                    <td className="py-3 px-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {t.open || '—'}
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {t.mid || '—'}
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {t.close || '—'}
                    </td>
                    <td className={`py-3 px-3 font-mono tabular-nums ${statusClass}`}>{statusText}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{breakRule}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Automated Workflow Chain */}
      <div
        className={`rounded-2xl border p-4 ${
          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
          How Terms, Freeze, Auto-Release &amp; 30-Day Deletion Work Together
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10">
            <div className="font-bold text-slate-900 dark:text-white">01. Freeze &amp; Term Watch</div>
            <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              Detects Timetable Freeze dates for examinations and checks Terms 1–3 open/close dates continuously.
            </p>
          </div>
          <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10">
            <div className="font-bold text-slate-900 dark:text-white">02. Auto-Appear Without Push</div>
            <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              Assessment Books &amp; Reports appear immediately in Learners and Parents portals when teachers save marks or Term 3 closes.
            </p>
          </div>
          <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10">
            <div className="font-bold text-slate-900 dark:text-white">03. 30-Day Family Reminders</div>
            <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              Term 3 closing starts a 30-day timer and delivers reminders inside Parents &amp; Learners Notifications UI.
            </p>
          </div>
          <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10">
            <div className="font-bold text-slate-900 dark:text-white">04. Promote &amp; Delete at Day 30</div>
            <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              After 30 days, learners automatically move up one class (Grade 6 to Alumni) and all old assessment books are completely deleted.
            </p>
          </div>
        </div>
      </div>

      {/* Cohort Transition Breakdown */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Next-Class Promotion Cohort Map
          </h3>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {activeLearners.length} active learners
          </span>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-white/10">
          {GRADES.map((g) => {
            const count = getLearnerCount(g);
            const destination = nextGradeMap[g];
            const isGraduating = g === 'Grade 6';

            return (
              <div
                key={g}
                className="px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-9 h-9 rounded-xl text-white font-bold text-xs flex items-center justify-center shrink-0"
                    style={{ backgroundColor: GRADE_COLORS[g] }}
                  >
                    {g.replace('Grade ', 'G')}
                  </span>

                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-1.5">
                      <span>{g}</span>
                      <span className="text-slate-400">→</span>
                      <span className={isGraduating ? 'text-amber-600 dark:text-amber-400' : ''}>
                        {destination}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isGraduating
                        ? 'Graduates primary CBC cycle cleanly'
                        : 'Moves forward automatically with zero retention'}
                    </div>
                  </div>
                </div>

                <span className="text-xs font-mono tabular-nums font-bold text-slate-700 dark:text-slate-200 shrink-0">
                  {count} {count === 1 ? 'pupil' : 'pupils'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
        <button
          type="button"
          onClick={() => {
            sound.playClick(600);
            setShowConfirmPromote(true);
          }}
          className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-[#16A34A] hover:bg-emerald-700 text-white cursor-pointer transition-colors"
        >
          Promote Learners Now &amp; Start 30-Day Window
        </button>

        {onPurgeOldAssessments && (
          <button
            type="button"
            onClick={() => {
              sound.playClick(500);
              setShowConfirmPurge(true);
            }}
            className="py-3 px-4 rounded-xl font-bold text-xs border border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer transition-colors"
          >
            Delete Assessment Books Now
          </button>
        )}
      </div>

      {/* Modal: Confirm Promotion */}
      {showConfirmPromote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div
            className={`w-full max-w-sm rounded-2xl p-5 border shadow-2xl ${
              isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="text-emerald-600 dark:text-emerald-400 font-bold text-sm mb-1.5">
              Confirm Next-Class Promotion
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              This moves Grades 1–5 forward to their next class, graduates Grade 6 to the Alumni Archive, notifies Parents &amp; Learners inside the Notifications UI, and begins the 30-day countdown after which old assessment books are completely deleted.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmPromote(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRunPromotion}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#16A34A] hover:bg-emerald-700 text-white cursor-pointer"
              >
                Confirm Promotion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Complete Assessment Book Deletion */}
      {showConfirmPurge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div
            className={`w-full max-w-sm rounded-2xl p-5 border shadow-2xl ${
              isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="text-rose-600 dark:text-rose-400 font-bold text-sm mb-1.5">
              Delete All Assessment Books?
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              This will permanently delete all current Assessment Books, strand marks, Focus Zone items, submissions, and offline booklet caches across all portals right away (normally triggered automatically 30 days after Term 3 ends).
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmPurge(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRunPurge}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                Delete Books
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
