import {
  AdminState,
  FreezeConfig,
  GradeName,
  Learner,
  TermsConfig,
} from '../components/admin/types';
import { INITIAL_ADMIN_STATE } from '../components/admin/initialData';
import { nairobiParts, nairobiStamp, TZ } from '../components/admin/adminUtils';
import {
  PROMOTION_WINDOW_MS,
  STORAGE_KEYS,
  getStoredMarks,
  getStoredSubmissions,
} from './cbcAssessmentEngine';
import { clearAssessmentIndexedDB } from './indexedDBStorage';
import {
  addInboxNotification,
  getNotificationPermissionState,
  showSystemNotification,
} from './notifications';
import { pushAssessmentClearToCloud, pushSchoolStateToCloud } from './cloudSync';

export type LifecyclePhase =
  | 'freeze_exams'
  | 'active_term'
  | 'inter_term_holiday'
  | 'term3_countdown'
  | 'term3_expired_pending'
  | 'term3_completed';

export interface TermStatusSummary {
  term: 'Term 1' | 'Term 2' | 'Term 3';
  open: string;
  mid: string;
  close: string;
  status: 'upcoming' | 'active' | 'ended';
  daysUntilOpen: number | null;
  daysUntilClose: number | null;
  breakAfterLabel?: string;
  breakAfterDays?: number | null;
  breakLessThan30Days?: boolean;
}

export interface AcademicLifecycleSnapshot {
  academicYear: number;
  todayKey: string;
  nowMs: number;
  phase: LifecyclePhase;
  phaseLabel: string;
  phaseDescription: string;
  activeTerm: 'Term 1' | 'Term 2' | 'Term 3' | null;
  isMidTermWindow: boolean;
  freeze: {
    active: boolean;
    scheduledFuture: boolean;
    from: string | null;
    to: string | null;
    why: string | null;
    daysRemaining: number;
  };
  holiday: {
    active: boolean;
    label: string | null;
    totalDays: number | null;
    lessThan30Days: boolean;
    willPromoteAfterBreak: boolean;
  };
  termDetails: TermStatusSummary[];
  term3CycleKey: string;
  term3Ended: boolean;
  term3Countdown: {
    active: boolean;
    isExpired: boolean;
    isPurgedCompleted: boolean;
    source: 'term3_close' | 'manual_promotion' | 'none';
    startedAtMs: number | null;
    expiresAtMs: number | null;
    expiresAtDateLabel: string | null;
    daysRemaining: number;
    hoursRemaining: number;
    minutesRemaining: number;
    progressPercent: number;
    formattedTimeRemaining: string;
  };
  booksVisibleToFamiliesAutomatically: boolean;
}

const LIFECYCLE_MILESTONES_KEY = 'lra_term3_notif_milestones_v1';

function parseNairobiMidnightMs(ymd?: string | null): number | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const ms = Date.parse(`${ymd}T00:00:00+03:00`);
  return Number.isNaN(ms) ? null : ms;
}

function diffWholeDays(fromYmd?: string | null, toYmd?: string | null): number | null {
  const a = parseNairobiMidnightMs(fromYmd);
  const b = parseNairobiMidnightMs(toYmd);
  if (a === null || b === null) return null;
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

function formatDateReadable(ms: number): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toDateString();
  }
}

export function readStoredAdminStateSafe(): AdminState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('lra_admin_v3');
    if (raw) {
      return JSON.parse(raw) as AdminState;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Sync Admin `state.terms` into `lra_cbc_calendar_v1` so changing term dates
 * in Admin Settings immediately updates Academic Year and Term 3 promotion trackers.
 */
export function syncAdminTermsToCalendarStorage(
  terms: TermsConfig,
  promotedTimestamp?: number | null,
  promotedAcademicYear?: number
): void {
  if (typeof window === 'undefined' || !terms) return;
  try {
    const t1Open = terms['Term 1']?.open || `${new Date().getFullYear()}-01-06`;
    const parsedYear = parseInt(t1Open.split('-')[0], 10);
    const currentYear = !isNaN(parsedYear) && parsedYear > 2000 ? parsedYear : new Date().getFullYear();

    const prevRaw = localStorage.getItem(STORAGE_KEYS.CALENDAR);
    const prev = prevRaw ? JSON.parse(prevRaw) : {};

    const nextCal = {
      ...prev,
      currentYear,
      term1Start: terms['Term 1']?.open || prev.term1Start || `${currentYear}-01-06`,
      term2Start: terms['Term 2']?.open || prev.term2Start || `${currentYear}-05-04`,
      term3Start: terms['Term 3']?.open || prev.term3Start || `${currentYear}-08-31`,
      term3Close: terms['Term 3']?.close || prev.term3Close || `${currentYear}-10-30`,
      promotedTimestamp:
        promotedTimestamp !== undefined ? promotedTimestamp : prev.promotedTimestamp ?? null,
      promotedAcademicYear:
        promotedAcademicYear !== undefined
          ? promotedAcademicYear
          : prev.promotedAcademicYear || currentYear + 1,
    };

    localStorage.setItem(STORAGE_KEYS.CALENDAR, JSON.stringify(nextCal));
  } catch {
    // ignore
  }
}

/**
 * Computes the complete live Academic Lifecycle Snapshot combining:
 * - Admin Term Dates (`state.terms`)
 * - Timetable Freeze (`state.freeze`) -> Exams / Freeze detection
 * - Academic Year (`Term 1 open`)
 * - Inter-term Holiday (<30d vs >=30d)
 * - Term 3 End -> Automatic Release & 30-Day Deletion/Promotion Countdown
 */
export function getAcademicLifecycleSnapshot(
  partialState?: Partial<AdminState> | null,
  nowMs: number = Date.now()
): AcademicLifecycleSnapshot {
  const stored = partialState || readStoredAdminStateSafe();
  const terms: TermsConfig = stored?.terms || INITIAL_ADMIN_STATE.terms;
  const freeze: FreezeConfig | null = stored?.freeze ?? null;
  const promotedTimestamp = stored?.promotedTimestamp ?? null;
  const completedCycleKey = stored?.completedPromotionCycleKey ?? null;
  const purgedAtLabel = stored?.assessmentRetentionPurgedAt ?? null;

  const todayKey = nairobiParts(new Date(nowMs)).key;
  const todayMidMs = parseNairobiMidnightMs(todayKey) ?? nowMs;

  const t1OpenYear = parseInt(String(terms['Term 1']?.open || '').split('-')[0], 10);
  const academicYear =
    !isNaN(t1OpenYear) && t1OpenYear > 2000 ? t1OpenYear : new Date(nowMs).getFullYear();

  const termOrder: Array<'Term 1' | 'Term 2' | 'Term 3'> = ['Term 1', 'Term 2', 'Term 3'];

  let activeTerm: 'Term 1' | 'Term 2' | 'Term 3' | null = null;
  let isMidTermWindow = false;

  const termDetails: TermStatusSummary[] = termOrder.map((termKey, idx) => {
    const cfg = terms[termKey] || { open: '', mid: '', close: '' };
    let status: 'upcoming' | 'active' | 'ended' = 'upcoming';
    if (cfg.open && cfg.close) {
      if (todayKey < cfg.open) status = 'upcoming';
      else if (todayKey > cfg.close) status = 'ended';
      else {
        status = 'active';
        activeTerm = termKey;
        if (cfg.mid) {
          const dMid = diffWholeDays(todayKey, cfg.mid);
          if (dMid !== null && Math.abs(dMid) <= 2) {
            isMidTermWindow = true;
          }
        }
      }
    }

    const daysUntilOpen = cfg.open ? diffWholeDays(todayKey, cfg.open) : null;
    const daysUntilClose = cfg.close ? diffWholeDays(todayKey, cfg.close) : null;

    let breakAfterLabel: string | undefined;
    let breakAfterDays: number | null = null;
    let breakLessThan30Days = false;

    if (idx < 2) {
      const nextCfg = terms[termOrder[idx + 1]];
      if (cfg.close && nextCfg?.open) {
        breakAfterDays = diffWholeDays(cfg.close, nextCfg.open);
        breakAfterLabel = `${termKey} → ${termOrder[idx + 1]} Holiday`;
        breakLessThan30Days = breakAfterDays !== null && breakAfterDays < 30;
      }
    } else {
      breakAfterLabel = 'Term 3 End → 30-Day Deletion & Promotion';
      breakAfterDays = 30;
      breakLessThan30Days = false;
    }

    return {
      term: termKey,
      open: cfg.open,
      mid: cfg.mid,
      close: cfg.close,
      status,
      daysUntilOpen,
      daysUntilClose,
      breakAfterLabel,
      breakAfterDays,
      breakLessThan30Days,
    };
  });

  // Freeze / Examination detection
  const freezeActive = Boolean(
    freeze && freeze.from && freeze.to && todayKey >= freeze.from && todayKey <= freeze.to
  );
  const freezeFuture = Boolean(
    freeze && freeze.from && freeze.to && todayKey < freeze.from
  );
  const freezeDaysLeft =
    freezeActive && freeze?.to ? Math.max(0, (diffWholeDays(todayKey, freeze.to) ?? 0) + 1) : 0;

  // Term 3 close & 30-day promotion/deletion window
  const term3CloseYmd = terms['Term 3']?.close || `${academicYear}-10-30`;
  const term3CloseMs = parseNairobiMidnightMs(term3CloseYmd);
  const term3CycleKey = `${academicYear}_T3_${term3CloseYmd}`;

  // Term 3 is ended if today is on or after closing date
  const term3DateReached = Boolean(term3CloseYmd && todayKey >= term3CloseYmd);
  const hasManualPromotion = Boolean(promotedTimestamp && promotedTimestamp > 0);
  const isCycleCompleted =
    completedCycleKey === term3CycleKey ||
    Boolean(hasManualPromotion && purgedAtLabel);

  let windowSource: 'term3_close' | 'manual_promotion' | 'none' = 'none';
  let windowStartMs: number | null = null;

  if (hasManualPromotion && term3DateReached && term3CloseMs !== null) {
    windowSource = promotedTimestamp! <= term3CloseMs ? 'manual_promotion' : 'term3_close';
    windowStartMs = Math.min(promotedTimestamp!, term3CloseMs);
  } else if (hasManualPromotion) {
    windowSource = 'manual_promotion';
    windowStartMs = promotedTimestamp!;
  } else if (term3DateReached && term3CloseMs !== null) {
    windowSource = 'term3_close';
    windowStartMs = term3CloseMs;
  }

  let countdownActive = false;
  let isExpired = false;
  let daysRemaining = 30;
  let hoursRemaining = 0;
  let minutesRemaining = 0;
  let progressPercent = 0;
  let expiresAtMs: number | null = null;
  let expiresAtDateLabel: string | null = null;
  let formattedTimeRemaining = 'Waiting for Term 3 closing date';

  if (windowStartMs !== null) {
    expiresAtMs = windowStartMs + PROMOTION_WINDOW_MS;
    expiresAtDateLabel = formatDateReadable(expiresAtMs);

    if (isCycleCompleted) {
      countdownActive = false;
      isExpired = true;
      daysRemaining = 0;
      progressPercent = 100;
      formattedTimeRemaining = `Completed · Old assessment books deleted`;
    } else {
      const elapsedMs = Math.max(0, nowMs - windowStartMs);
      const remainingMs = PROMOTION_WINDOW_MS - elapsedMs;
      if (remainingMs <= 0) {
        countdownActive = true;
        isExpired = true;
        daysRemaining = 0;
        progressPercent = 100;
        formattedTimeRemaining = '30 days elapsed — Ready to promote & clear books';
      } else {
        countdownActive = true;
        isExpired = false;
        daysRemaining = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
        hoursRemaining = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        minutesRemaining = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
        progressPercent = Math.min(100, Math.max(0, (elapsedMs / PROMOTION_WINDOW_MS) * 100));
        formattedTimeRemaining = `${daysRemaining}d ${hoursRemaining}h ${minutesRemaining}m left before deletion & class push`;
      }
    }
  }

  // Holiday detection between Term 1 -> 2, Term 2 -> 3, or post-Term 3
  let holidayActive = false;
  let holidayLabel: string | null = null;
  let holidayDays: number | null = null;
  let holidayLessThan30 = false;

  const t1 = terms['Term 1'];
  const t2 = terms['Term 2'];
  const t3 = terms['Term 3'];

  if (!activeTerm) {
    if (t1?.close && t2?.open && todayKey > t1.close && todayKey < t2.open) {
      holidayActive = true;
      holidayLabel = 'Term 1 Holiday Break';
      holidayDays = diffWholeDays(t1.close, t2.open);
      holidayLessThan30 = holidayDays !== null && holidayDays < 30;
    } else if (t2?.close && t3?.open && todayKey > t2.close && todayKey < t3.open) {
      holidayActive = true;
      holidayLabel = 'Term 2 Holiday Break';
      holidayDays = diffWholeDays(t2.close, t3.open);
      holidayLessThan30 = holidayDays !== null && holidayDays < 30;
    } else if (t3?.close && todayKey > t3.close) {
      holidayActive = true;
      holidayLabel = 'End of Year / Term 3 Holiday';
      holidayDays = 30;
      holidayLessThan30 = false;
    } else if (t1?.open && todayKey < t1.open) {
      holidayActive = true;
      holidayLabel = `Pre-Term 1 Holiday (${academicYear})`;
      holidayDays = diffWholeDays(todayKey, t1.open);
      holidayLessThan30 = holidayDays !== null && holidayDays < 30;
    }
  }

  // Derive top-level Phase following Priority: Freeze/Exams -> Term 3 states -> Active Term -> Inter-term Holiday
  let phase: LifecyclePhase = 'active_term';
  let phaseLabel = 'Active Academic Term';
  let phaseDescription = 'Regular CBC lessons and teacher assessments are in progress.';

  if (freezeActive) {
    phase = 'freeze_exams';
    phaseLabel = `Exams & Timetable Freeze On (${freeze!.why})`;
    phaseDescription = `Regular timetable lessons are frozen from ${freeze!.from} to ${freeze!.to} (${freezeDaysLeft} day(s) remaining) while examinations proceed.`;
  } else if (isCycleCompleted) {
    phase = 'term3_completed';
    phaseLabel = `Term 3 (${academicYear}) Promoted & Books Cleared`;
    phaseDescription = `The 30-day Term 3 window ended. Learners moved forward one class and old assessment books were deleted.`;
  } else if (countdownActive && isExpired) {
    phase = 'term3_expired_pending';
    phaseLabel = '30-Day Window Reached — Promotion & Book Cleanup Due';
    phaseDescription =
      '30 days since Term 3 closing have elapsed. Learners are advancing to the next class and assessment books are being cleared.';
  } else if (countdownActive) {
    phase = 'term3_countdown';
    phaseLabel = `Term 3 Ended · ${daysRemaining}d ${hoursRemaining}h Left`;
    phaseDescription = `Assessment books & reports are live automatically for parents and learners. Complete downloads before ${expiresAtDateLabel || 'Day 30'} when classes promote & books clear.`;
  } else if (activeTerm) {
    phase = 'active_term';
    const dLeft = termDetails.find((x) => x.term === activeTerm)?.daysUntilClose;
    phaseLabel = isMidTermWindow
      ? `${activeTerm} (${academicYear}) · Mid-Term Window`
      : `${activeTerm} (${academicYear}) In Session`;
    phaseDescription =
      activeTerm === 'Term 3'
        ? `Term 3 ends on ${term3CloseYmd} (${dLeft ?? '—'} day(s) left). Assessment books auto-release at closing, starting the 30-day download & promotion cycle.`
        : `${activeTerm} closes in ${dLeft ?? '—'} day(s). Next break is ${holidayLessThan30 ? 'under 30 days' : 'an inter-term holiday'} — learners stay in current class and books remain open.`;
  } else if (holidayActive) {
    phase = 'inter_term_holiday';
    phaseLabel = `${holidayLabel || 'School Holiday On'}`;
    phaseDescription =
      holidayDays !== null
        ? `Holiday lasts ~${holidayDays} days${holidayLessThan30 ? ' (< 30 days)' : ''}. Because this is between terms (not Term 3 end), learners keep their current class & assessment books.`
        : 'Holiday break is active; learners remain in their current grade until Term 3 ends.';
  }

  return {
    academicYear,
    todayKey,
    nowMs,
    phase,
    phaseLabel,
    phaseDescription,
    activeTerm,
    isMidTermWindow,
    freeze: {
      active: freezeActive,
      scheduledFuture: freezeFuture,
      from: freeze?.from || null,
      to: freeze?.to || null,
      why: freeze?.why || null,
      daysRemaining: freezeDaysLeft,
    },
    holiday: {
      active: holidayActive,
      label: holidayLabel,
      totalDays: holidayDays,
      lessThan30Days: holidayLessThan30,
      willPromoteAfterBreak: false,
    },
    termDetails,
    term3CycleKey,
    term3Ended: term3DateReached || hasManualPromotion,
    term3Countdown: {
      active: countdownActive,
      isExpired,
      isPurgedCompleted: isCycleCompleted,
      source: windowSource,
      startedAtMs: windowStartMs,
      expiresAtMs,
      expiresAtDateLabel,
      daysRemaining,
      hoursRemaining,
      minutesRemaining,
      progressPercent,
      formattedTimeRemaining,
    },
    booksVisibleToFamiliesAutomatically: true,
  };
}

/**
 * Promote every non-alumni learner up 1 grade (`Grade 1 -> Grade 2 ... Grade 5 -> Grade 6`),
 * and graduate `Grade 6` into the Alumni Archive (`alumni: true`).
 */
export function promoteLearnersArrayNextClass(
  learners: Learner[],
  nowMs: number = Date.now()
): { updatedLearners: Learner[]; promotedCount: number; graduatedCount: number } {
  const nextGradeMap: Record<GradeName, GradeName | null> = {
    'Grade 1': 'Grade 2',
    'Grade 2': 'Grade 3',
    'Grade 3': 'Grade 4',
    'Grade 4': 'Grade 5',
    'Grade 5': 'Grade 6',
    'Grade 6': null,
  };

  let promotedCount = 0;
  let graduatedCount = 0;

  const updatedLearners = (learners || []).map((l) => {
    if (l.alumni) return l;
    const next = nextGradeMap[l.grade];
    if (next) {
      promotedCount++;
      return {
        ...l,
        promotedFrom: l.grade,
        grade: next,
        promotedAt: nowMs,
      };
    }
    graduatedCount++;
    return {
      ...l,
      promotedFrom: l.grade,
      promotedAt: nowMs,
      alumni: true,
    };
  });

  return { updatedLearners, promotedCount, graduatedCount };
}

/**
 * Completely deletes all assessment books, strand marks, submissions, focus zone remediation records,
 * booklet comments, IndexedDB caches, and syncs erasure to cloud database.
 */
export async function purgeAllAssessmentBooksAndRecords(): Promise<{
  clearedAt: string;
  marksCleared: number;
}> {
  if (typeof window === 'undefined') {
    return { clearedAt: nairobiStamp(new Date()), marksCleared: 0 };
  }

  const existingMarksCount = Object.keys(getStoredMarks()).length;
  const now = Date.now();
  const stamp = nairobiStamp(new Date(now));

  try {
    localStorage.setItem(STORAGE_KEYS.MARKS, JSON.stringify({}));
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify({}));
    localStorage.setItem(STORAGE_KEYS.FOCUS_ZONE, JSON.stringify({}));
    localStorage.setItem('lra_assessment_comments_v1', JSON.stringify({}));
    localStorage.setItem('lra_completed_holiday_cats', JSON.stringify({}));
    localStorage.setItem('lra_last_assessment_clear_at', String(now));

    // Also update calendar snapshot
    const calRaw = localStorage.getItem(STORAGE_KEYS.CALENDAR);
    if (calRaw) {
      const cal = JSON.parse(calRaw);
      cal.promotedTimestamp = null;
      localStorage.setItem(STORAGE_KEYS.CALENDAR, JSON.stringify(cal));
    }
  } catch (e) {
    console.warn('Error clearing local assessment stores:', e);
  }

  await clearAssessmentIndexedDB().catch(() => {});
  await pushAssessmentClearToCloud().catch(() => {});

  window.dispatchEvent(new CustomEvent('lra_data_sync', { detail: { type: 'assessment_purge' } }));

  return { clearedAt: stamp, marksCleared: existingMarksCount };
}

/**
 * Auto-marks teacher-entered subjects as released in storage once Term 3 closes
 * (Assessment books & reports are already auto-visible, and this keeps submission badges consistent without waiting for Admin push).
 */
export function ensureTerm3SubmissionsAutoReleased(term: string = 'Term 3'): number {
  if (typeof window === 'undefined') return 0;
  try {
    const subs = getStoredSubmissions();
    const marks = getStoredMarks();
    if (Object.keys(marks).length === 0 && Object.keys(subs).length === 0) return 0;

    let changed = 0;
    const now = Date.now();
    Object.keys(subs).forEach((k) => {
      if (subs[k] && subs[k].term === term && subs[k].status !== 'released') {
        subs[k] = {
          ...subs[k],
          status: 'released',
          releasedAt: subs[k].releasedAt || now,
        };
        changed++;
      }
    });

    if (changed > 0) {
      localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(subs));
      window.dispatchEvent(new CustomEvent('lra_data_sync', { detail: { type: 'submissions' } }));
    }
    return changed;
  } catch {
    return 0;
  }
}

function readSentMilestones(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LIFECYCLE_MILESTONES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSentMilestones(map: Record<string, number>) {
  try {
    localStorage.setItem(LIFECYCLE_MILESTONES_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/**
 * Sends deduped Term 3 30-day download & promotion reminders inside Notifications UI
 * for BOTH Parents and Learners (plus OS lock-screen push when permitted).
 */
export function dispatchTerm3CountdownNotifications(
  snapshot: AcademicLifecycleSnapshot,
  opts?: { forceManualReminder?: boolean }
): number {
  if (typeof window === 'undefined') return 0;
  if (!snapshot.term3Countdown.active && !snapshot.term3Countdown.isPurgedCompleted && !opts?.forceManualReminder) {
    return 0;
  }

  const sentMap = readSentMilestones();
  const { daysRemaining, hoursRemaining, expiresAtDateLabel, isExpired, isPurgedCompleted } =
    snapshot.term3Countdown;
  const cycle = snapshot.term3CycleKey;

  let milestoneId = '';
  let title = '';
  let body = '';

  if (opts?.forceManualReminder) {
    milestoneId = `manual_${cycle}_${Math.floor(Date.now() / 10000)}`;
    title = `⏳ Reminder: ${daysRemaining} Days Left to Download Assessment Books (${snapshot.academicYear})`;
    body = `Term 3 (${snapshot.academicYear}) Assessment Books & Reports are live. Download before ${expiresAtDateLabel || 'Day 30'} — after 30 days books are automatically deleted and learners advance to the next class.`;
  } else if (isPurgedCompleted || isExpired) {
    milestoneId = `completed_${cycle}`;
    title = `🎓 Term 3 Promotion Complete & Assessment Books Cleared`;
    body = `The 30-day Term 3 (${snapshot.academicYear}) download window has ended. Learners have been promoted to the next grade and prior assessment books have been cleared.`;
  } else if (daysRemaining <= 1) {
    milestoneId = `d1_${cycle}`;
    title = `🚨 Final ${Math.max(1, hoursRemaining)}h: Download Term 3 Assessment Book Today`;
    body = `Less than 1 day remains before ${snapshot.academicYear} Assessment Books & Reports are completely deleted and classes advance to the next grade.`;
  } else if (daysRemaining <= 3) {
    milestoneId = `d3_${cycle}`;
    title = `⚠️ 3 Days Left to Save Term 3 Assessment Book & Report`;
    body = `Download your ${snapshot.academicYear} CBC Assessment Book and Termly Report before ${expiresAtDateLabel || 'deletion in 3 days'}.`;
  } else if (daysRemaining <= 7) {
    milestoneId = `d7_${cycle}`;
    title = `⏳ ${daysRemaining} Days Left — Download Term 3 Assessment Book`;
    body = `Term 3 closed and automatic deletion occurs on ${expiresAtDateLabel || 'Day 30'}. Save your child's Assessment Book & Report now.`;
  } else if (daysRemaining <= 14) {
    milestoneId = `d14_${cycle}`;
    title = `📘 ${daysRemaining} Days Left to Download ${snapshot.academicYear} Assessment Book`;
    body = `Your Term 3 CBC Assessment Book and Report are ready automatically. Please download your copy before the 30-day deadline (${expiresAtDateLabel || ''}).`;
  } else {
    milestoneId = `d30_${cycle}`;
    title = `📘 Term 3 Ended — Assessment Books Live (30-Day Window)`;
    body = `${snapshot.academicYear} Term 3 Assessment Books & Reports are now ready automatically without waiting for Admin push. Download within 30 days (before ${expiresAtDateLabel || 'expiry'}) before automatic deletion and class promotion.`;
  }

  if (!opts?.forceManualReminder && sentMap[milestoneId]) {
    return 0;
  }

  let dispatched = 0;
  const createdAt = Date.now();

  const addedParent = addInboxNotification({
    id: `${milestoneId}_parents`,
    category: 'booklet',
    title,
    body,
    sender: 'Academic Progression Office',
    targetPortal: 'parents',
    targetTab: 'book',
    url: '/?portal=parents',
    createdAt,
  });

  const addedLearner = addInboxNotification({
    id: `${milestoneId}_learners`,
    category: 'booklet',
    title,
    body,
    sender: 'Academic Progression Office',
    targetPortal: 'learners',
    targetTab: 'progress',
    url: '/?portal=learners',
    createdAt,
  });

  if (addedParent) dispatched++;
  if (addedLearner) dispatched++;

  sentMap[milestoneId] = createdAt;
  saveSentMilestones(sentMap);

  if (dispatched > 0 && getNotificationPermissionState() === 'granted') {
    showSystemNotification({
      id: `${milestoneId}_push`,
      category: 'booklet',
      title,
      body,
      tag: milestoneId,
      targetPortal: 'parents',
      url: '/?portal=parents',
      requireInteraction: daysRemaining <= 3,
    }).catch(() => {});
  }

  return dispatched;
}

/**
 * Automated Background Academic Lifecycle Engine:
 * Runs in App startup + Admin portal timer:
 * 1. Syncs state.terms -> calendar storage
 * 2. When Term 3 closing date arrives, auto-releases Term 3 books & sends Parent/Learner countdown reminders
 * 3. When 30 days elapse after Term 3 closing (or manual promotion trigger), automatically pushes learners
 *    to the next class AND deletes all old assessment books/marks/submissions/IndexedDB/cloud marks.
 */
export async function runAcademicLifecycleAutomation(opts?: {
  currentAdminState?: AdminState | null;
  applyAdminStateUpdate?: (updater: (prev: AdminState) => AdminState) => void;
}): Promise<{
  snapshot: AcademicLifecycleSnapshot;
  didAutoRelease: boolean;
  didAutoPromoteAndPurge: boolean;
}> {
  const adminState = opts?.currentAdminState || readStoredAdminStateSafe();
  if (!adminState) {
    return {
      snapshot: getAcademicLifecycleSnapshot(null),
      didAutoRelease: false,
      didAutoPromoteAndPurge: false,
    };
  }

  syncAdminTermsToCalendarStorage(adminState.terms, adminState.promotedTimestamp);
  const snapshot = getAcademicLifecycleSnapshot(adminState);

  let didAutoRelease = false;
  let didAutoPromoteAndPurge = false;

  // Step A: Term 3 closing reached -> Auto-release without waiting for Admin + trigger reminders
  if (snapshot.term3Ended && !snapshot.term3Countdown.isPurgedCompleted) {
    const releasedCount = ensureTerm3SubmissionsAutoReleased('Term 3');
    if (releasedCount > 0 || adminState.autoReleasedTerm3Year !== snapshot.academicYear) {
      didAutoRelease = true;
      if (opts?.applyAdminStateUpdate) {
        opts.applyAdminStateUpdate((prev) => ({
          ...prev,
          autoReleasedTerm3Year: snapshot.academicYear,
        }));
      } else {
        try {
          const updated = {
            ...adminState,
            autoReleasedTerm3Year: snapshot.academicYear,
            clientModifiedAt: Date.now(),
          };
          localStorage.setItem('lra_admin_v3', JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
    }
    dispatchTerm3CountdownNotifications(snapshot);
  }

  // Step B: 30 days elapsed -> Promote learners (if not yet promoted for this cycle) & completely delete assessment books
  if (
    snapshot.term3Countdown.active &&
    snapshot.term3Countdown.isExpired &&
    !snapshot.term3Countdown.isPurgedCompleted
  ) {
    const now = Date.now();
    const alreadyPromotedThisCycle = Boolean(
      adminState.promotedTimestamp &&
        adminState.promotedTimestamp >= (snapshot.term3Countdown.startedAtMs || 0) - 60000
    );

    const purgeRes = await purgeAllAssessmentBooksAndRecords();
    didAutoPromoteAndPurge = true;

    const finalizeUpdater = (prev: AdminState): AdminState => {
      const promoResult = alreadyPromotedThisCycle
        ? { updatedLearners: prev.learners, promotedCount: 0, graduatedCount: 0 }
        : promoteLearnersArrayNextClass(prev.learners, now);

      return {
        ...prev,
        learners: promoResult.updatedLearners,
        promotedAt: prev.promotedAt || nairobiStamp(new Date(now)),
        promotedTimestamp: null,
        assessmentRetentionPurgedAt: purgeRes.clearedAt,
        completedPromotionCycleKey: snapshot.term3CycleKey,
        clientModifiedAt: now,
        log: [
          {
            text: alreadyPromotedThisCycle
              ? `30-day Term 3 window completed: Deleted all assessment books (${purgeRes.marksCleared} strand records cleared)`
              : `Auto-executed Term 3 30-day rule: Promoted ${promoResult.promotedCount} learner(s), graduated ${promoResult.graduatedCount}, and deleted all assessment books`,
            by: 'Academic Lifecycle Engine',
            at: purgeRes.clearedAt,
          },
          ...(prev.log || []).slice(0, 140),
        ],
      };
    };

    if (opts?.applyAdminStateUpdate) {
      opts.applyAdminStateUpdate(finalizeUpdater);
    } else {
      try {
        const nextState = finalizeUpdater(adminState);
        localStorage.setItem('lra_admin_v3', JSON.stringify(nextState));
        pushSchoolStateToCloud({
          adminState: nextState,
          clearAssessments: true,
          replaceLists: true,
        }).catch(() => {});
        window.dispatchEvent(new CustomEvent('lra-admin-state-updated', { detail: nextState }));
      } catch {
        // ignore
      }
    }

    const postSnapshot = getAcademicLifecycleSnapshot({
      ...adminState,
      assessmentRetentionPurgedAt: purgeRes.clearedAt,
      completedPromotionCycleKey: snapshot.term3CycleKey,
    });
    dispatchTerm3CountdownNotifications(postSnapshot);
  }

  return {
    snapshot,
    didAutoRelease,
    didAutoPromoteAndPurge,
  };
}
