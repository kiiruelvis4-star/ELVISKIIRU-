import { supabase, isSupabaseConfigured } from '../supabaseClient';
import {
  SchoolCalendarConfig,
  SubjectSubmission,
  getDefaultSchoolCalendar,
  STORAGE_KEYS,
  addBellNotification,
  getStoredSubmissions,
  saveStoredSubmissions,
  getStoredMarks,
} from './cbcAssessmentEngine';
import { INITIAL_ADMIN_STATE } from '../components/admin/initialData';
import { pushSchoolStateToCloud } from './cloudSync';
import { notifyLocalAssessmentRelease } from './notifications';

export interface LearnerRecord {
  id: string;
  adm: string;
  name: string;
  grade: string;
  stream: string;
  parentPhone?: string;
  familyId?: string;
  isPromoted?: boolean;
  academicYear?: number;
  created_at?: string;
}

/**
 * Pupil roster loader (Unified single source of truth across Admin, Teachers, Parents, and Assessment Booklets)
 */
export function getStoredLearners(): LearnerRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    // Check primary Admin storage 'lra_admin_v3'
    const adminRaw = localStorage.getItem('lra_admin_v3');
    if (adminRaw) {
      const parsed = JSON.parse(adminRaw);
      if (Array.isArray(parsed.learners) && parsed.learners.length > 0) {
        return parsed.learners.map((l: any) => ({
          id: l.id,
          adm: l.adm,
          name: l.name,
          grade: l.grade,
          stream: l.stream || 'East',
          parentPhone: l.parentPhone || l.fatherPhone || l.motherPhone || '',
          familyId: l.familyId,
          isPromoted: l.isPromoted || false,
          academicYear: l.academicYear,
        }));
      }
    }
    const raw = localStorage.getItem(STORAGE_KEYS.LEARNERS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return (INITIAL_ADMIN_STATE.learners || []).map((l: any) => ({
    id: l.id,
    adm: l.adm,
    name: l.name,
    grade: l.grade,
    stream: l.stream || 'East',
    parentPhone: l.parentPhone || l.fatherPhone || l.motherPhone || '',
    familyId: l.familyId,
    isPromoted: false,
  }));
}

export function saveStoredLearners(learners: LearnerRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.LEARNERS, JSON.stringify(learners));

    // Also synchronize back into lra_admin_v3 so admin portal reflects changes immediately without stripping passwords or parent fields
    const adminRaw = localStorage.getItem('lra_admin_v3');
    if (adminRaw) {
      const parsed = JSON.parse(adminRaw);
      const existingByKey = new Map<string, any>();
      (parsed.learners || []).forEach((ex: any) => {
        if (ex?.id) existingByKey.set(ex.id, ex);
        if (ex?.adm) existingByKey.set(ex.adm.toUpperCase(), ex);
      });
      parsed.learners = learners.map((l) => {
        const prev = existingByKey.get(l.id) || existingByKey.get((l.adm || '').toUpperCase()) || {};
        return {
          ...prev,
          id: l.id,
          name: l.name,
          adm: l.adm,
          grade: l.grade,
          stream: l.stream,
          parentPhone: l.parentPhone || prev.parentPhone || '',
          familyId: l.familyId ?? prev.familyId ?? null,
        };
      });
      parsed.clientModifiedAt = Date.now();
      localStorage.setItem('lra_admin_v3', JSON.stringify(parsed));
      pushSchoolStateToCloud({ adminState: parsed, replaceLists: true }).catch(console.warn);
    } else {
      pushSchoolStateToCloud({
        adminState: {
          clientModifiedAt: Date.now(),
          learners: learners.map((l) => ({
            id: l.id,
            name: l.name,
            adm: l.adm,
            grade: l.grade,
            stream: l.stream,
            parentPhone: l.parentPhone || '',
            familyId: l.familyId || null,
          })),
        } as any,
      }).catch(console.warn);
    }

    // Broadcast synchronization event to all open tabs and components
    window.dispatchEvent(new Event('lra_data_sync'));
  } catch (e) {
    console.error('Failed to save learners roster:', e);
  }
}

/**
 * Auto-generates next sequential Admission Number: LRA/0001, LRA/0002...
 */
export function generateNextAdmissionNumber(existingLearners: LearnerRecord[]): string {
  let highest = 0;
  for (const l of existingLearners) {
    const match = l.adm.match(/LRA\/(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > highest) highest = num;
    }
  }
  const nextNum = highest + 1;
  return `LRA/${String(nextNum).padStart(4, '0')}`;
}

/**
 * Fetch calendar configuration from Supabase or local storage
 */
export async function getCalendar(): Promise<SchoolCalendarConfig> {
  const localDefault = getDefaultSchoolCalendar();

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CALENDAR);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('school_calendar')
        .select('*')
        .limit(1)
        .single();
      if (!error && data) {
        const cal: SchoolCalendarConfig = {
          currentYear: data.current_year || localDefault.currentYear,
          term1Start: data.term1_start || localDefault.term1Start,
          term2Start: data.term2_start || localDefault.term2Start,
          term3Start: data.term3_start || localDefault.term3Start,
          promotedTimestamp: data.promoted_timestamp || null,
          promotedAcademicYear: data.promoted_academic_year,
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.CALENDAR, JSON.stringify(cal));
        }
        return cal;
      }
    } catch (err) {
      console.warn('Supabase calendar fetch failed, using local:', err);
    }
  }

  return localDefault;
}

/**
 * Enrolls a new pupil: assigns automatic admission number, saves to Supabase,
 * and initializes their empty booklet waiting for term to commence.
 */
export async function addLearner(data: {
  name: string;
  grade: string;
  stream?: string;
  parentPhone?: string;
  familyId?: string;
}): Promise<LearnerRecord> {
  const currentLearners = getStoredLearners();
  const nextAdm = generateNextAdmissionNumber(currentLearners);
  const calendar = await getCalendar();
  const term1Year = calendar.term1Start
    ? parseInt(calendar.term1Start.split('-')[0], 10)
    : new Date().getFullYear();

  const newLearner: LearnerRecord = {
    id: `lrn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    adm: nextAdm,
    name: data.name.trim(),
    grade: data.grade,
    stream: data.stream || 'East',
    parentPhone: data.parentPhone || '',
    familyId: data.familyId || `FAM-${nextAdm.replace('/', '')}`,
    isPromoted: false,
    academicYear: term1Year,
    created_at: new Date().toISOString(),
  };

  const updated = [...currentLearners, newLearner];
  saveStoredLearners(updated);

  // Sync to Supabase if available
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('learners').upsert({
        id: newLearner.id,
        adm: newLearner.adm,
        name: newLearner.name,
        grade: newLearner.grade,
        stream: newLearner.stream,
        parent_phone: newLearner.parentPhone,
        family_id: newLearner.familyId,
        academic_year: newLearner.academicYear,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Could not sync learner to Supabase:', e);
    }
  }

  // Bell notification
  addBellNotification(
    'New Pupil Enrolled',
    `${newLearner.name} assigned admission number ${newLearner.adm} in ${newLearner.grade}. Assessment book and report ready empty.`,
    'admission'
  );

  return newLearner;
}

/**
 * Teacher submits subject marks to Admin for review
 */
export async function submitSubject(
  learnerId: string,
  grade: string,
  term: string,
  subject: string,
  teacherName?: string
): Promise<{ success: boolean; message: string }> {
  const subs = getStoredSubmissions();
  const key = `${learnerId}_${grade}_${term}_${subject}`.toLowerCase().replace(/\s+/g, '_');

  const submission: SubjectSubmission = {
    learnerId,
    grade,
    term,
    subject,
    teacherName: teacherName || 'Assigned Educator',
    status: 'submitted',
    submittedAt: Date.now(),
  };

  subs[key] = submission;
  saveStoredSubmissions(subs);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('subject_submissions').upsert({
        id: key,
        learner_id: learnerId,
        grade,
        term,
        subject,
        teacher_name: submission.teacherName,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Could not sync submission to Supabase:', e);
    }
  }

  addBellNotification(
    'Subject Marks Submitted',
    `${subject} for ${grade} (${term}) submitted to Admin by ${teacherName || 'teacher'}.`,
    'submission'
  );

  return { success: true, message: `${subject} submitted to Admin successfully!` };
}

/**
 * Admin pushes/releases the completed term booklet to Parents and Learners
 */
export async function releaseSubject(
  learnerId: string,
  grade: string,
  term: string,
  subject: string
): Promise<{ success: boolean; message: string }> {
  const subs = getStoredSubmissions();
  const key = `${learnerId}_${grade}_${term}_${subject}`.toLowerCase().replace(/\s+/g, '_');

  const existing = subs[key] || {
    learnerId,
    grade,
    term,
    subject,
    status: 'submitted',
  };

  existing.status = 'released';
  existing.releasedAt = Date.now();
  subs[key] = existing;
  saveStoredSubmissions(subs);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('subject_submissions').upsert({
        id: key,
        learner_id: learnerId,
        grade,
        term,
        subject,
        status: 'released',
        released_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Could not sync release to Supabase:', e);
    }
  }

  addBellNotification(
    'Booklet Released to Parents',
    `Term activity for ${subject} (${grade}, ${term}) released to Parents & Learners.`,
    'release'
  );

  const matchingLearner = getStoredLearners().find((l) => l.id === learnerId || l.adm === learnerId);
  notifyLocalAssessmentRelease(
    matchingLearner?.name || 'Learner',
    grade,
    term,
    subject
  );

  return { success: true, message: `${subject} released to Parents and Learners.` };
}

/**
 * Admin reopens a subject for editing if adjustments are needed
 */
export async function reopenSubject(
  learnerId: string,
  grade: string,
  term: string,
  subject: string
): Promise<{ success: boolean; message: string }> {
  const subs = getStoredSubmissions();
  const key = `${learnerId}_${grade}_${term}_${subject}`.toLowerCase().replace(/\s+/g, '_');
  if (subs[key]) {
    subs[key].status = 'draft';
    saveStoredSubmissions(subs);
  }
  return { success: true, message: `${subject} reopened for editing.` };
}

/**
 * Admin clicks "Promote", transitioning learners smoothly while keeping
 * assessment booklets permanently available for review and download.
 */
export async function startPromotion(): Promise<{
  success: boolean;
  message: string;
  promotedTimestamp: number;
}> {
  const now = Date.now();
  const cal = await getCalendar();
  const currentYear = cal.currentYear || new Date().getFullYear();
  const nextAcademicYear = currentYear + 1;

  cal.promotedTimestamp = now;
  cal.promotedAcademicYear = nextAcademicYear;

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.CALENDAR, JSON.stringify(cal));

    // Also update admin storage if present
    try {
      const adminRaw = localStorage.getItem('lra_admin_v3');
      if (adminRaw) {
        const parsed = JSON.parse(adminRaw);
        parsed.promotedTimestamp = now;
        parsed.promotedAt = now;
        parsed.academicYear = nextAcademicYear;
        localStorage.setItem('lra_admin_v3', JSON.stringify(parsed));
        pushSchoolStateToCloud({ adminState: parsed, calendar: cal }).catch(console.warn);
      } else {
        pushSchoolStateToCloud({ calendar: cal }).catch(console.warn);
      }
    } catch {
      // ignore
    }
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('school_calendar').upsert({
        id: 'lra_calendar',
        current_year: currentYear,
        promoted_timestamp: now,
        promoted_academic_year: nextAcademicYear,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Could not sync promotion to Supabase:', e);
    }
  }

  addBellNotification(
    '🎓 Term 3 Promotion & 30-Day Window Active!',
    'Assessment Books & Reports are live for Parents and Learners. Download within 30 days before automatic deletion and next-class transition.',
    'promotion'
  );

  return {
    success: true,
    message: 'Promotion activated! Families have 30 days to download Assessment Books before automatic deletion.',
    promotedTimestamp: now,
  };
}

/**
 * Advances learners to next grade and clears assessment books once the 30-day Term 3 window expires.
 */
export function checkAndExecuteGradeAdvancement(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const calRaw = localStorage.getItem(STORAGE_KEYS.CALENDAR);
    if (!calRaw) return false;
    const cal = JSON.parse(calRaw) as SchoolCalendarConfig;
    if (!cal.promotedTimestamp) return false;

    const elapsed = Date.now() - cal.promotedTimestamp;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    if (elapsed >= thirtyDaysMs) {
      const learners = getStoredLearners();
      const updated = learners.map((l) => {
        const match = l.grade.match(/\d+/);
        const gradeNum = match ? parseInt(match[0], 10) : 1;
        if (gradeNum < 6) {
          return {
            ...l,
            grade: `Grade ${gradeNum + 1}`,
            isPromoted: false,
            academicYear: cal.promotedAcademicYear || new Date().getFullYear(),
          };
        } else {
          return {
            ...l,
            grade: 'Grade 6',
            isPromoted: false,
          };
        }
      });

      saveStoredLearners(updated);

      cal.promotedTimestamp = null;
      cal.currentYear = cal.promotedAcademicYear || cal.currentYear + 1;
      localStorage.setItem(STORAGE_KEYS.CALENDAR, JSON.stringify(cal));
      localStorage.setItem(STORAGE_KEYS.MARKS, JSON.stringify({}));
      localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify({}));
      localStorage.setItem(STORAGE_KEYS.FOCUS_ZONE, JSON.stringify({}));

      addBellNotification(
        '30-Day Promotion & Assessment Cleanup Completed',
        'Learners have moved forward to the next grade and prior-term assessment books have been cleared.',
        'general'
      );

      return true;
    }
  } catch (err) {
    console.error('Error executing grade rollover:', err);
  }
  return false;
}
