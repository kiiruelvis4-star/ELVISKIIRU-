import React from 'react';
import { sound } from '../../utils/sound';
import { getCalendarAcademicYear } from '../../utils/cbcCalculations';

export interface AssessmentCoverLearner {
  name: string;
  adm: string;
  grade: string; // e.g. "Grade 1", "Grade 4"
  stream?: string;
  isPromoted?: boolean;
  academicYear?: number;
}

/**
 * Returns dynamic academic year strictly following the school calendar year.
 * Baseline year follows new Date().getFullYear().
 * When promoted or after December in January, it advances following the academic cycle.
 */
export function getAcademicYear(isPromoted?: boolean): number {
  return getCalendarAcademicYear(isPromoted);
}

/**
 * Returns a formatted date string matching calendar date (e.g. "3 November 2026")
 */
export function getCalendarFormattedDate(d: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return d.toLocaleDateString('en-GB');
  }
}

/**
 * Extracts numeric grade or advances if promoted
 */
export function getLearnerGradeDisplay(rawGrade: string, isPromoted?: boolean): {
  fullName: string;
  numberOnly: string;
  gradeNum: number;
} {
  const match = String(rawGrade || '').match(/\d+/);
  let gradeNum = match ? parseInt(match[0], 10) : 1;

  if (isPromoted && gradeNum < 6) {
    gradeNum += 1;
  }

  return {
    fullName: `Grade ${gradeNum}`,
    numberOnly: `${gradeNum}`,
    gradeNum,
  };
}

/**
 * Maps numeric grade to the authentic cover image path from the PWA engine.
 */
export function getGradeCoverImagePath(gradeNum: number): string {
  const clamped = Math.max(1, Math.min(6, gradeNum || 1));
  return `/images/covers/pwa_book_grade${clamped}.jpg`;
}

/**
 * Maps numeric grade to the authentic report cover image path from the PWA engine.
 */
export function getGradeReportCoverImagePath(gradeNum: number): string {
  const clamped = Math.max(1, Math.min(6, gradeNum || 1));
  return `/images/covers/pwa_report_grade${clamped}.jpg`;
}

import { getAcademicLifecycleSnapshot } from '../../utils/academicLifecycle';

/**
 * Helper to get live Term 3 30-day retention countdown info
 */
export function get30DayNoticeInfo() {
  const snapshot = getAcademicLifecycleSnapshot();
  return {
    daysRemaining: snapshot.term3Countdown.daysRemaining,
    hoursRemaining: snapshot.term3Countdown.hoursRemaining,
    isPromotedActive: snapshot.term3Countdown.active,
    isPurgedCompleted: snapshot.term3Countdown.isPurgedCompleted,
    expiresAtDateLabel: snapshot.term3Countdown.expiresAtDateLabel,
    term3CloseDate: snapshot.termDetails[2]?.close || null,
    phase: snapshot.phase,
    freezeActive: snapshot.freeze.active,
    freezeWhy: snapshot.freeze.why,
    holidayActive: snapshot.holiday.active,
    holidayLabel: snapshot.holiday.label,
    holidayLessThan30Days: snapshot.holiday.lessThan30Days,
  };
}

/**
 * Term 3 30-Day Assessment Download & Auto-Erasure Banner
 * Shows live countdown when Term 3 closes or promotion is active, and clearly communicates
 * automatic book availability without waiting for Admin push.
 */
export const AssessmentDownloadNotice: React.FC<{
  onDownloadBook?: () => void;
  onDownloadReport?: () => void;
  onToggleArchive?: () => void;
  isViewingArchive?: boolean;
  previousGrade?: string;
  compact?: boolean;
}> = ({
  onDownloadBook,
  onDownloadReport,
  onToggleArchive,
  isViewingArchive = false,
  previousGrade = 'Grade 1',
}) => {
  const info = get30DayNoticeInfo();
  const isUrgentCountdown = info.isPromotedActive && info.daysRemaining <= 7;

  const badgeText = info.isPurgedCompleted
    ? '30-Day Window Completed'
    : info.isPromotedActive
    ? `${info.daysRemaining}d ${info.hoursRemaining}h Left`
    : 'Auto-Live Booklet';

  const subtitleText = info.isPurgedCompleted
    ? 'Previous cycle books cleared · Ready for new academic session'
    : info.isPromotedActive
    ? `Deletes automatically ${info.expiresAtDateLabel ? `on ${info.expiresAtDateLabel}` : 'after 30 days'}`
    : `Clears automatically 30 days after Term 3 ends (${info.term3CloseDate || 'End of Term 3'})`;

  const headlineText = isViewingArchive
    ? `Viewing ${previousGrade} Assessment Booklet Cycle`
    : info.isPromotedActive
    ? `Download Your Assessment Book & Report (${info.daysRemaining} Days Remaining)`
    : 'Assessment Book & Report Appear Automatically';

  const bodyText = info.isPurgedCompleted
    ? 'Prior Term 3 assessment books have been erased after the 30-day download period and classes have advanced.'
    : info.isPromotedActive
    ? `Term 3 has closed and your CBC Assessment Book & Report are available automatically. Save a copy before ${info.expiresAtDateLabel || 'Day 30'}, when old assessment books are completely deleted and learners move to the next class.`
    : `Marks entered by subject teachers appear immediately here and in Parents Portal without waiting for Admin push. Note: inter-term holidays (<30 days) keep books intact; after Term 3 ends, books are deleted after 30 days.`;

  const gradientClass = isUrgentCountdown
    ? 'border-amber-400 bg-gradient-to-r from-amber-600 via-orange-600 to-rose-700'
    : info.isPromotedActive
    ? 'border-indigo-400 bg-gradient-to-r from-indigo-700 via-blue-700 to-cyan-700'
    : 'border-emerald-400 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700';

  return (
    <div className={`relative overflow-hidden rounded-2xl border-2 ${gradientClass} p-4 text-white shadow-lg animate-fade-in print:hidden`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shrink-0 border border-white/30 shadow-inner">
            {info.isPromotedActive ? '⏳' : '📚'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="bg-white text-slate-900 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 font-mono tabular-nums">
                {badgeText}
              </span>
              <span className="text-white/90 text-[11px] font-bold">
                {subtitleText}
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-black text-white mt-0.5">
              {headlineText}
            </h4>
            <p className="text-xs text-white/90 mt-0.5 leading-snug max-w-xl">
              {bodyText}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
          {onToggleArchive && (
            <button
              type="button"
              onClick={() => {
                sound.playClick(440);
                onToggleArchive();
              }}
              className="px-3.5 py-2 bg-black/30 hover:bg-black/45 text-white active:scale-95 text-xs font-black rounded-xl border border-white/30 shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>{isViewingArchive ? '📖 Active Grade Cycle' : `📂 View ${previousGrade} Cycle`}</span>
            </button>
          )}

          {onDownloadBook && (
            <button
              type="button"
              onClick={() => {
                sound.playClick(450);
                onDownloadBook();
              }}
              className="px-3.5 py-2 bg-white text-slate-900 hover:bg-slate-100 active:scale-95 text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>📥</span>
              <span>Download Booklet</span>
            </button>
          )}

          {onDownloadReport && (
            <button
              type="button"
              onClick={() => {
                sound.playClick(450);
                onDownloadReport();
              }}
              className="px-3.5 py-2 bg-black/30 hover:bg-black/45 text-white active:scale-95 text-xs font-black rounded-xl border border-white/25 shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>📄</span>
              <span>Report</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

import { AssessmentCoverView } from './AssessmentCoverView';

/**
 * Official CBC Assessment Book Cover
 * Uses the authentic grade-specific artwork for Grades 1 through 6 via AssessmentCoverView.
 */
export const AssessmentBookCover: React.FC<{
  learner: AssessmentCoverLearner;
  className?: string;
  onClick?: () => void;
}> = ({ learner, className = '', onClick }) => {
  const gradeInfo = getLearnerGradeDisplay(learner.grade, learner.isPromoted);
  const academicYear = getAcademicYear(learner.isPromoted);

  return (
    <div onClick={onClick} className={`${onClick ? 'cursor-pointer hover:scale-[1.01] transition-transform' : ''} ${className}`}>
      <AssessmentCoverView
        grade={gradeInfo.fullName}
        viewMode="book"
        learnerName={learner.name}
        admissionNumber={learner.adm}
        academicYear={academicYear}
        stream={learner.stream}
      />
    </div>
  );
};

/**
 * Official CBC Assessment Report Cover
 * Uses the authentic grade-specific artwork for Grades 1 through 6 via AssessmentCoverView.
 */
export const AssessmentReportCover: React.FC<{
  learner: AssessmentCoverLearner;
  className?: string;
  onClick?: () => void;
}> = ({ learner, className = '', onClick }) => {
  const gradeInfo = getLearnerGradeDisplay(learner.grade, learner.isPromoted);
  const academicYear = getAcademicYear(learner.isPromoted);

  return (
    <div onClick={onClick} className={`${onClick ? 'cursor-pointer hover:scale-[1.01] transition-transform' : ''} ${className}`}>
      <AssessmentCoverView
        grade={gradeInfo.fullName}
        viewMode="report"
        learnerName={learner.name}
        admissionNumber={learner.adm}
        academicYear={academicYear}
        stream={learner.stream}
      />
    </div>
  );
};
