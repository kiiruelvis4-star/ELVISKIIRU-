import {
  LevelBand,
  AssessmentRowItem,
  StrandAssessmentRecord,
  ResultCalculation,
  FocusZoneAttempt,
  SchoolCalendarConfig,
  SubjectSubmission,
  BellNotification,
} from '../types/cbcAssessment';
import { pushMarksToCloud, pushSchoolStateToCloud } from './cloudSync';

export type {
  LevelBand,
  AssessmentRowItem,
  StrandAssessmentRecord,
  ResultCalculation,
  FocusZoneAttempt,
  SchoolCalendarConfig,
  SubjectSubmission,
  BellNotification,
};

export interface FocusZoneCompatItem {
  id: string;
  strandId: string;
  subStrandId?: string;
  strandName: string;
  subStrandName: string;
  score: number;
  compositeScore: number;
  rubric: string;
  status: 'active' | 'cleared';
  attemptsCount: number;
  term?: string;
  grade?: string;
  subject?: string;
  teacherRemarks?: string;
  teacherName?: string;
}

export function isFocusZoneScore(score: number): boolean {
  return score <= 70;
}

export function saveSubStrandEvaluation(..._args: any[]): { success: boolean } {
  return { success: true };
}

/**
 * FIXED CBC PERFORMANCE LEVEL COLORS
 * User constraint: Do not use these colors for anything else!
 */
export const LEVEL_COLORS: Record<LevelBand, string> = {
  EE: '#2563EB', // Blue
  ME: '#16A34A', // Green
  AE: '#EA580C', // Orange
  BE: '#E11D48', // Red
};

export const LEVEL_NAMES: Record<LevelBand, string> = {
  EE: 'Exceeding Expectations',
  ME: 'Meeting Expectations',
  AE: 'Approaching Expectations',
  BE: 'Below Expectations',
};

export const STRAND_HEADER_BG = '#E5E7EB'; // Grey

export const PROMOTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

export const STORAGE_KEYS = {
  MARKS: 'lra_cbc_marks_v1',
  FOCUS_ZONE: 'lra_cbc_fz_v1',
  SUBMISSIONS: 'lra_cbc_submissions_v1',
  CALENDAR: 'lra_cbc_calendar_v1',
  NOTICES: 'lra_cbc_notices_v1',
  LEARNERS: 'lra_learners_roster_v1',
};

/**
 * Calculates raw average percentage for a list of score/total entries
 */
export function pct(list: AssessmentRowItem[]): number | null {
  if (!list || list.length === 0) return null;
  const t = list.reduce((acc, cur) => acc + (Number(cur.t) || 0), 0);
  const g = list.reduce((acc, cur) => acc + (Number(cur.s) || 0), 0);
  return t > 0 ? (g / t) * 100 : null;
}

/**
 * Computes Strand Result: CATs average * 0.60 + Assignments average * 0.40
 * Requires at least one CAT and one Assignment to compute final score.
 */
export function resultOf(
  record: StrandAssessmentRecord | FocusZoneAttempt | null | undefined
): ResultCalculation | null {
  if (!record) return null;
  const c = pct(record.cats || []);
  const a = pct(record.asg || []);
  if (c === null || a === null) return null;
  return {
    c,
    a,
    f: c * 0.60 + a * 0.40,
  };
}

/**
 * Maps final percentage to Kenyan CBC standard 4 performance level bands:
 * EE >= 80%
 * ME >= 60%
 * AE >= 40%
 * BE < 40%
 */
export function band(score: number | null): LevelBand | null {
  if (score === null || isNaN(score)) return null;
  if (score >= 80) return 'EE';
  if (score >= 60) return 'ME';
  if (score >= 40) return 'AE';
  return 'BE';
}

/**
 * Default school calendar config for Little Roses Academy
 * Academic year is extracted from Term 1 Opening Date
 */
export function getDefaultSchoolCalendar(): SchoolCalendarConfig {
  const currentYear = new Date().getFullYear();
  return {
    currentYear,
    term1Start: `${currentYear}-01-06`,
    term2Start: `${currentYear}-05-04`,
    term3Start: `${currentYear}-08-31`,
    promotedTimestamp: null,
    promotedAcademicYear: undefined,
  };
}

/**
 * Derives academic year from calendar's Term One opening date
 * Never manually typed!
 */
export function getCalendarAcademicYear(isPromoted?: boolean): number {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CALENDAR);
      if (stored) {
        const cal = JSON.parse(stored) as SchoolCalendarConfig;
        if (isPromoted && cal.promotedAcademicYear) {
          return cal.promotedAcademicYear;
        }
        if (cal.term1Start) {
          const year = parseInt(cal.term1Start.split('-')[0], 10);
          if (!isNaN(year) && year > 2000) {
            return isPromoted ? year + 1 : year;
          }
        }
      }
    } catch {
      // fallback
    }
  }
  const baseYear = new Date().getFullYear();
  return isPromoted ? baseYear + 1 : baseYear;
}

/**
 * Evaluates the 30-day promotional retention countdown
 */
export function evaluateAssessmentRetention(promotedAtTimestamp: number | null | undefined): {
  isPromoted: boolean;
  isExpired: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  progressPercent: number;
  formattedTimeRemaining: string;
} {
  if (!promotedAtTimestamp) {
    return {
      isPromoted: false,
      isExpired: false,
      daysRemaining: 30,
      hoursRemaining: 0,
      minutesRemaining: 0,
      progressPercent: 0,
      formattedTimeRemaining: 'No promotion active',
    };
  }

  const elapsedMs = Date.now() - promotedAtTimestamp;
  const remainingMs = PROMOTION_WINDOW_MS - elapsedMs;

  if (remainingMs <= 0) {
    return {
      isPromoted: true,
      isExpired: true,
      daysRemaining: 0,
      hoursRemaining: 0,
      minutesRemaining: 0,
      progressPercent: 100,
      formattedTimeRemaining: '30-day download window expired (Archived)',
    };
  }

  const daysRemaining = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const hoursRemaining = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutesRemaining = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
  const progressPercent = Math.min(100, Math.max(0, (elapsedMs / PROMOTION_WINDOW_MS) * 100));

  return {
    isPromoted: true,
    isExpired: false,
    daysRemaining,
    hoursRemaining,
    minutesRemaining,
    progressPercent,
    formattedTimeRemaining: `${daysRemaining}d ${hoursRemaining}h remaining to download booklet`,
  };
}

/**
 * Storage helpers for marks and focus zone items
 */
export function getStoredMarks(): Record<string, StrandAssessmentRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MARKS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredMarks(marks: Record<string, StrandAssessmentRecord>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.MARKS, JSON.stringify(marks));
    window.dispatchEvent(new CustomEvent('lra_data_sync', { detail: { type: 'marks' } }));
    pushMarksToCloud(marks).catch(console.warn);
  } catch (e) {
    console.error('Failed to save marks to localStorage:', e);
  }
}

export function getStoredFocusZone(): Record<string, FocusZoneAttempt[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FOCUS_ZONE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredFocusZone(fz: Record<string, FocusZoneAttempt[]>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.FOCUS_ZONE, JSON.stringify(fz));
    window.dispatchEvent(new CustomEvent('lra_data_sync', { detail: { type: 'focus_zone' } }));
  } catch (e) {
    console.error('Failed to save focus zone to localStorage:', e);
  }
}

export function getStoredSubmissions(): Record<string, SubjectSubmission> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredSubmissions(subs: Record<string, SubjectSubmission>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(subs));
    window.dispatchEvent(new CustomEvent('lra_data_sync', { detail: { type: 'submissions' } }));
    pushMarksToCloud(getStoredMarks(), undefined, subs).catch(console.warn);
  } catch (e) {
    console.error('Failed to save submissions to localStorage:', e);
  }
}

export function getStoredNotices(): BellNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTICES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredNotices(notices: BellNotification[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.NOTICES, JSON.stringify(notices));
  } catch (e) {
    console.error('Failed to save notices to localStorage:', e);
  }
}

export function addBellNotification(
  title: string,
  message: string,
  type: BellNotification['type'] = 'general'
): BellNotification {
  const notices = getStoredNotices();
  const newNotice: BellNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title,
    message,
    at: Date.now(),
    type,
    read: false,
  };
  notices.unshift(newNotice);
  const sliced = notices.slice(0, 30);
  saveStoredNotices(sliced);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lra_data_sync', { detail: { type: 'notices' } }));
    pushSchoolStateToCloud({ bellNotices: sliced }).catch(console.warn);
  }
  return newNotice;
}

/**
 * Creates unique mark key combining learner, grade, term, and strand ID
 */
export function makeMarkKey(learnerId: string, sid: string): string {
  return `${learnerId}_${sid}`;
}

export function makeFzKey(learnerId: string, sid: string, subIndex: number): string {
  return `${learnerId}_${sid}_sub${subIndex}#fz`;
}

export function makeSubmissionKey(learnerId: string, grade: string, term: string, subject: string): string {
  return `${learnerId}_${grade}_${term}_${subject}`.toLowerCase().replace(/\s+/g, '_');
}

/**
 * Compatibility helper for existing components looking for focus zone items
 */
export function getLearnerFocusZoneItems(
  learnerId?: string,
  grade?: string,
  term?: string
): FocusZoneCompatItem[] {
  const marks = getStoredMarks();
  const fz = getStoredFocusZone();
  const items: FocusZoneCompatItem[] = [];

  const targetLearnerId = learnerId || 'l_faith';
  const targetGrade = grade || 'Grade 4';
  const targetTerm = term || 'Term 3';

  // Iterate over marks matching learner
  for (const [key, record] of Object.entries(marks)) {
    if (key.startsWith(`${targetLearnerId}_`)) {
      const res = resultOf(record);
      if (res && res.f <= 70) {
        const sid = key.replace(`${targetLearnerId}_`, '');
        const fzKey = makeFzKey(targetLearnerId, sid, 0);
        const attempts = fz[fzKey] || [];
        const lastAtt = attempts.length > 0 ? resultOf(attempts[attempts.length - 1]) : null;
        const isCleared = !!(lastAtt && lastAtt.f >= 70);
        const activeBand = band(res.f) || 'BE';

        items.push({
          id: fzKey,
          strandId: sid,
          subStrandId: `${sid}.1`,
          strandName: sid,
          subStrandName: 'Key Competency Remediation',
          score: res.f,
          compositeScore: res.f,
          rubric: activeBand,
          status: isCleared ? 'cleared' : 'active',
          attemptsCount: attempts.length,
          term: targetTerm,
          grade: targetGrade,
          subject: 'Core Learning Area',
          teacherRemarks: isCleared
            ? 'Concept successfully mastered during Focus Zone intervention.'
            : 'Learner requires extra guided practice on this sub-strand.',
          teacherName: 'Class Teacher',
        });
      }
    }
  }

  return items;
}
