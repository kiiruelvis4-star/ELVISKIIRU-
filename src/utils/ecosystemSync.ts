// Real-time Ecosystem synchronization engine for Little Roses Academy
// Connects the 4 Portals: Administration, Teachers, Learners, and Parents

export interface LearnerAttendanceState {
  todayStatus: 'Present' | 'Late' | 'Absent';
  presentCount: number;
  absentCount: number;
  lateCount: number;
  totalDays: number;
  streak: number;
  lastCheckInTime: string;
  markedByTeacher: string;
}

export interface CBCSubjectGrade {
  name: string;
  catScore: number; // 0-100% (weighted 60%)
  asgScore: number; // 0-100% (weighted 40%)
  totalPct: number;
  band: 'EE' | 'ME' | 'AE' | 'BE';
  rubricComment: string;
  assessedBy: string;
}

export interface EcosystemNotice {
  id: string;
  title: string;
  category: 'Official Circular' | 'Assessment' | 'Finance' | 'Safety' | 'Event';
  date: string;
  author: string;
  content: string;
  targetAudiences: ('parents' | 'learners' | 'teachers' | 'admin')[];
  urgent: boolean;
}

export interface HomeworkTaskSync {
  id: string;
  subject: string;
  title: string;
  assignedBy: string;
  dueDate: string;
  status: 'Pending' | 'Completed' | 'Overdue';
  learnerScore?: number;
  parentAcknowledged: boolean;
}

export interface FeeAccountState {
  termFee: number;
  paidAmount: number;
  balance: number;
  lastPaymentMpesa: string;
  lastPaymentDate: string;
  status: 'Cleared' | 'Partial' | 'Pending';
}

import {
  SchemeOfWorkItem,
  LessonPlanItem,
  LessonNoteItem,
  RecordOfWorkItem,
  TeacherCATUploadItem,
} from '../types/cbcDocuments';
import {
  INITIAL_CBC_SCHEMES,
  INITIAL_CBC_LESSON_PLANS,
  INITIAL_CBC_LESSON_NOTES,
  INITIAL_CBC_RECORDS_OF_WORK,
  INITIAL_TEACHER_CAT_UPLOADS,
} from '../data/cbcCurriculumData';
import { pushSchoolStateToCloud } from './cloudSync';

export interface EcosystemState {
  learnerName: string;
  learnerAdm: string;
  learnerGrade: string;
  learnerStream: string;
  parentName: string;
  parentPhone: string;
  classTeacherName: string;
  attendance: LearnerAttendanceState;
  subjectGrades: Record<string, CBCSubjectGrade>;
  notices: EcosystemNotice[];
  homework: HomeworkTaskSync[];
  fees: FeeAccountState;
  // CBC Professional Documents & Teacher Online Uploads
  cbcSchemes: SchemeOfWorkItem[];
  cbcLessonPlans: LessonPlanItem[];
  cbcLessonNotes: LessonNoteItem[];
  cbcRecordsOfWork: RecordOfWorkItem[];
  teacherCATs: TeacherCATUploadItem[];
  timetable?: Record<string, any>;
  freeze?: { from: string; to: string; why: string } | null;
}

const STORAGE_KEY = 'lra_ecosystem_sync_v1';

export function computeCbcBand(pct: number): 'EE' | 'ME' | 'AE' | 'BE' {
  if (pct >= 80) return 'EE'; // Exceeding Expectations
  if (pct >= 60) return 'ME'; // Meeting Expectations
  if (pct >= 40) return 'AE'; // Approaching Expectations
  return 'BE'; // Below Expectations
}

export const BAND_DESCRIPTIONS: Record<'EE' | 'ME' | 'AE' | 'BE', { label: string; color: string; bg: string }> = {
  EE: { label: 'Exceeding Expectations (80–100%)', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
  ME: { label: 'Meeting Expectations (60–79%)', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
  AE: { label: 'Approaching Expectations (40–59%)', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
  BE: { label: 'Below Expectations (0–39%)', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
};

export const DEFAULT_STATE: EcosystemState = {
  learnerName: 'Faith Wanjiku',
  learnerAdm: 'LRA/0001',
  learnerGrade: 'Grade 4',
  learnerStream: '4A',
  parentName: 'Mr. James Mwangi',
  parentPhone: '0711 223 344',
  classTeacherName: 'Tr. Peter Kibet',
  attendance: {
    todayStatus: 'Present',
    presentCount: 42,
    absentCount: 2,
    lateCount: 3,
    totalDays: 47,
    streak: 18,
    lastCheckInTime: '08:15 AM (Class 4A Roll Call)',
    markedByTeacher: 'Tr. Peter Kibet',
  },
  subjectGrades: {
    'Mathematics': {
      name: 'Mathematics',
      catScore: 82,
      asgScore: 88,
      totalPct: Math.round(82 * 0.6 + 88 * 0.4), // 84
      band: 'EE',
      rubricComment: 'Consistently demonstrates mastery in fractions, place value and 3D shapes.',
      assessedBy: 'Tr. Peter Kibet',
    },
    'English': {
      name: 'English',
      catScore: 78,
      asgScore: 85,
      totalPct: Math.round(78 * 0.6 + 85 * 0.4), // 81
      band: 'EE',
      rubricComment: 'Expressive vocabulary and creative narrative composition.',
      assessedBy: 'Tr. Sarah Ochieng',
    },
    'Kiswahili': {
      name: 'Kiswahili',
      catScore: 74,
      asgScore: 76,
      totalPct: Math.round(74 * 0.6 + 76 * 0.4), // 75
      band: 'ME',
      rubricComment: 'Matumizi mazuri ya sarufi na msamiati katika mazungumzo.',
      assessedBy: 'Mwl. Hassan Bakari',
    },
    'Science & Technology': {
      name: 'Science & Technology',
      catScore: 86,
      asgScore: 90,
      totalPct: Math.round(86 * 0.6 + 90 * 0.4), // 88
      band: 'EE',
      rubricComment: 'High curiosity during plant propagation practical and digital devices.',
      assessedBy: 'Tr. Peter Kibet',
    },
    'Social Studies': {
      name: 'Social Studies',
      catScore: 72,
      asgScore: 75,
      totalPct: Math.round(72 * 0.6 + 75 * 0.4), // 73
      band: 'ME',
      rubricComment: 'Good grasp of Nakuru County physical features and community resources.',
      assessedBy: 'Tr. Grace Muthoni',
    },
    'CRE': {
      name: 'CRE',
      catScore: 88,
      asgScore: 92,
      totalPct: Math.round(88 * 0.6 + 92 * 0.4), // 90
      band: 'EE',
      rubricComment: 'Exemplifies Christian values and actively participates in chapel singing.',
      assessedBy: 'Tr. Grace Muthoni',
    },
    'Agriculture & Nutrition': {
      name: 'Agriculture & Nutrition',
      catScore: 80,
      asgScore: 84,
      totalPct: Math.round(80 * 0.6 + 84 * 0.4), // 82
      band: 'EE',
      rubricComment: 'Hands-on participation in school kitchen garden drip irrigation project.',
      assessedBy: 'Tr. David Kimani',
    },
    'Creative Arts': {
      name: 'Creative Arts',
      catScore: 85,
      asgScore: 88,
      totalPct: Math.round(85 * 0.6 + 88 * 0.4), // 86
      band: 'EE',
      rubricComment: 'Exquisite color blending in landscape painting and recorder playing.',
      assessedBy: 'Tr. Sarah Ochieng',
    },
  },
  notices: [
    {
      id: 'not-01',
      title: 'Term 2 Mid-Term CBC Assessment Week & Parent Teacher Conference',
      category: 'Assessment',
      date: 'May 18, 2026',
      author: 'Office of the Principal (Admin)',
      content: 'Summative assessments for Grades 1–6 begin on Monday 8:30 AM. Parents will receive individual appointment slips for the Academic Clinic.',
      targetAudiences: ['parents', 'learners', 'teachers', 'admin'],
      urgent: true,
    },
    {
      id: 'not-02',
      title: 'Annual Inter-House Athletics & Sports Day at Nakuru Stadium',
      category: 'Event',
      date: 'May 24, 2026',
      author: 'Sports Department & Admin',
      content: 'Pupils to arrive dressed in respective house colors (Simba, Chui, Ndovu, Kifaru). Transport departs school compound at 7:45 AM sharp.',
      targetAudiences: ['parents', 'learners', 'teachers', 'admin'],
      urgent: false,
    },
    {
      id: 'not-03',
      title: 'Term 2 Fee Clearance Notice & M-Pesa Paybill Verification',
      category: 'Finance',
      date: 'May 10, 2026',
      author: 'School Bursar & Administration',
      content: 'Kindly clear remaining school fee balances before June 1st. Use Lipa na M-Pesa Paybill 247247, Account: LRA/0001 (Pupil Adm).',
      targetAudiences: ['parents', 'admin'],
      urgent: false,
    },
  ],
  homework: [
    {
      id: 'hw-01',
      subject: 'Mathematics',
      title: 'Fractions Addition & Equivalent Halves Worksheet',
      assignedBy: 'Tr. Peter Kibet',
      dueDate: 'Tomorrow, 8:00 AM',
      status: 'Completed',
      learnerScore: 100,
      parentAcknowledged: true,
    },
    {
      id: 'hw-02',
      subject: 'Science & Technology',
      title: 'Labeling Parts of a Dicotyledonous Leaf',
      assignedBy: 'Tr. Peter Kibet',
      dueDate: 'Thursday, 8:00 AM',
      status: 'Completed',
      learnerScore: 90,
      parentAcknowledged: true,
    },
    {
      id: 'hw-03',
      subject: 'English',
      title: 'Write 5 Sentences Using Plural Irregular Nouns',
      assignedBy: 'Tr. Sarah Ochieng',
      dueDate: 'Friday, 8:00 AM',
      status: 'Pending',
      parentAcknowledged: false,
    },
  ],
  fees: {
    termFee: 18500,
    paidAmount: 12000,
    balance: 6500,
    lastPaymentMpesa: 'QHJ89912KL',
    lastPaymentDate: 'May 04, 2026',
    status: 'Partial',
  },
  cbcSchemes: INITIAL_CBC_SCHEMES,
  cbcLessonPlans: INITIAL_CBC_LESSON_PLANS,
  cbcLessonNotes: INITIAL_CBC_LESSON_NOTES,
  cbcRecordsOfWork: INITIAL_CBC_RECORDS_OF_WORK,
  teacherCATs: INITIAL_TEACHER_CAT_UPLOADS,
};

type Listener = (state: EcosystemState) => void;

class EcosystemSyncManager {
  private state: EcosystemState;
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.state = this.loadState();
    if (typeof window !== 'undefined') {
      window.addEventListener('lra-cloud-ecosystem-updated', (e: any) => {
        if (e?.detail) {
          this.applyRemoteState(e.detail);
        }
      });
    }
  }

  private applyRemoteState(remote: Partial<EcosystemState>) {
    this.state = {
      ...DEFAULT_STATE,
      ...this.state,
      ...remote,
      cbcSchemes: remote.cbcSchemes || this.state.cbcSchemes || INITIAL_CBC_SCHEMES,
      cbcLessonPlans: remote.cbcLessonPlans || this.state.cbcLessonPlans || INITIAL_CBC_LESSON_PLANS,
      cbcLessonNotes: remote.cbcLessonNotes || this.state.cbcLessonNotes || INITIAL_CBC_LESSON_NOTES,
      cbcRecordsOfWork: remote.cbcRecordsOfWork || this.state.cbcRecordsOfWork || INITIAL_CBC_RECORDS_OF_WORK,
      teacherCATs: remote.teacherCATs || this.state.teacherCATs || INITIAL_TEACHER_CAT_UPLOADS,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // ignore
    }
    this.notify();
  }

  private loadState(): EcosystemState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_STATE,
          ...parsed,
          cbcSchemes: parsed.cbcSchemes || INITIAL_CBC_SCHEMES,
          cbcLessonPlans: parsed.cbcLessonPlans || INITIAL_CBC_LESSON_PLANS,
          cbcLessonNotes: parsed.cbcLessonNotes || INITIAL_CBC_LESSON_NOTES,
          cbcRecordsOfWork: parsed.cbcRecordsOfWork || INITIAL_CBC_RECORDS_OF_WORK,
          teacherCATs: parsed.teacherCATs || INITIAL_TEACHER_CAT_UPLOADS,
        };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_STATE;
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Storage unavailable or full
    }
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lra-ecosystem-sync', { detail: this.getState() }));
      }
    } catch {
      // Window unavailable
    }
    pushSchoolStateToCloud({ ecosystem: this.state }).catch(console.warn);
    this.notify();
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn(this.getState());
      } catch (err) {
        console.error('Ecosystem listener error:', err);
      }
    });
  }

  public getState(): EcosystemState {
    return JSON.parse(JSON.stringify(this.state));
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    // Call immediately with current state
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  // --- ACTIONS TRIGGERED FROM ANY PORTAL ---

  // 1. Teacher marks or updates attendance
  public setAttendanceStatus(status: 'Present' | 'Late' | 'Absent', teacherName = 'Tr. Peter Kibet') {
    const prev = this.state.attendance.todayStatus;
    let { presentCount, absentCount, lateCount } = this.state.attendance;

    // Adjust counts based on delta from previous todayStatus
    if (prev === 'Present') presentCount--;
    if (prev === 'Absent') absentCount--;
    if (prev === 'Late') lateCount--;

    if (status === 'Present') presentCount++;
    if (status === 'Absent') absentCount++;
    if (status === 'Late') lateCount++;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

    this.state.attendance = {
      ...this.state.attendance,
      todayStatus: status,
      presentCount: Math.max(0, presentCount),
      absentCount: Math.max(0, absentCount),
      lateCount: Math.max(0, lateCount),
      lastCheckInTime: `${timeStr} (Class 4A Roll Call)`,
      markedByTeacher: teacherName,
    };
    this.saveState();
  }

  // 2. Teacher records CAT or Assignment score for Faith Wanjiku
  public updateSubjectScore(
    subjectName: string,
    catScore: number,
    asgScore: number,
    teacherName = 'Tr. Peter Kibet'
  ) {
    const clampedCat = Math.max(0, Math.min(100, Math.round(catScore)));
    const clampedAsg = Math.max(0, Math.min(100, Math.round(asgScore)));
    const totalPct = Math.round(clampedCat * 0.6 + clampedAsg * 0.4);
    const band = computeCbcBand(totalPct);

    let rubric = 'Meets expected learning outcomes for Grade 4 competencies.';
    if (band === 'EE') rubric = 'Demonstrates deep conceptual mastery and independent problem solving.';
    else if (band === 'ME') rubric = 'Accomplishes tasks accurately within standard curriculum guidelines.';
    else if (band === 'AE') rubric = 'Grasps core ideas but requires occasional prompt and remedial practice.';
    else rubric = 'Requires intensive scaffolding and parent-guided review sessions.';

    this.state.subjectGrades[subjectName] = {
      name: subjectName,
      catScore: clampedCat,
      asgScore: clampedAsg,
      totalPct,
      band,
      rubricComment: rubric,
      assessedBy: teacherName,
    };
    this.saveState();
  }

  // 3. Admin publishes school notice
  public publishNotice(
    title: string,
    category: EcosystemNotice['category'],
    content: string,
    urgent = false
  ) {
    const newNotice: EcosystemNotice = {
      id: 'not-' + Date.now(),
      title,
      category,
      date: new Date().toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }),
      author: 'Office of the Principal (Admin)',
      content,
      targetAudiences: ['parents', 'learners', 'teachers', 'admin'],
      urgent,
    };
    this.state.notices = [newNotice, ...this.state.notices];
    this.saveState();
  }

  // 4. Learner toggles homework completion
  public toggleHomeworkStatus(hwId: string) {
    this.state.homework = this.state.homework.map((hw) => {
      if (hw.id === hwId) {
        const nextStatus = hw.status === 'Completed' ? 'Pending' : 'Completed';
        return {
          ...hw,
          status: nextStatus,
          learnerScore: nextStatus === 'Completed' ? 95 : undefined,
          parentAcknowledged: nextStatus === 'Completed',
        };
      }
      return hw;
    });
    this.saveState();
  }

  // 5. Admin or Bursar updates Fee payment
  public recordFeePayment(amountPaid: number, mpesaRef: string) {
    const newPaid = this.state.fees.paidAmount + amountPaid;
    const newBalance = Math.max(0, this.state.fees.termFee - newPaid);
    this.state.fees = {
      ...this.state.fees,
      paidAmount: newPaid,
      balance: newBalance,
      lastPaymentMpesa: mpesaRef,
      lastPaymentDate: new Date().toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: newBalance === 0 ? 'Cleared' : 'Partial',
    };
    this.saveState();
  }

  // 6. Teacher uploads and publishes CAT/Assignment to parents & learner focus zone
  public publishTeacherCAT(cat: TeacherCATUploadItem) {
    // Add or update CAT
    const exists = this.state.teacherCATs.some((c) => c.id === cat.id);
    if (exists) {
      this.state.teacherCATs = this.state.teacherCATs.map((c) => (c.id === cat.id ? cat : c));
    } else {
      this.state.teacherCATs = [cat, ...this.state.teacherCATs];
    }

    // Automatically create a corresponding Homework / Assessment task in homework queue
    const syncHw: HomeworkTaskSync = {
      id: `hw_${cat.id}`,
      subject: cat.subject,
      title: `${cat.kind}: ${cat.title} (${cat.totalMarks} Mks)`,
      assignedBy: cat.teacherName,
      dueDate: cat.dueDate || 'Next Class',
      status: 'Pending',
      parentAcknowledged: false,
    };
    const hwExists = this.state.homework.some((h) => h.id === syncHw.id);
    if (!hwExists) {
      this.state.homework = [syncHw, ...this.state.homework];
    }

    // Add school notice for parents
    const newNotice: EcosystemNotice = {
      id: 'not_cat_' + Date.now(),
      title: `New ${cat.kind} Uploaded: ${cat.title}`,
      category: 'Assessment',
      date: new Date().toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }),
      author: cat.teacherName,
      content: `${cat.kind} for ${cat.grade} (${cat.subject} - Strand: ${cat.strand}) is now available online. Total: ${cat.totalMarks} Marks. Due: ${cat.dueDate}. Parents please download or supervise homework.`,
      targetAudiences: ['parents', 'learners'],
      urgent: true,
    };
    this.state.notices = [newNotice, ...this.state.notices];

    this.saveState();
  }

  // Delete a Teacher CAT
  public deleteTeacherCAT(catId: string) {
    this.state.teacherCATs = this.state.teacherCATs.filter((c) => c.id !== catId);
    this.state.homework = this.state.homework.filter((h) => h.id !== `hw_${catId}`);
    this.saveState();
  }

  // 7. Save or update CBC Scheme of Work
  public saveCBCScheme(scheme: SchemeOfWorkItem) {
    const exists = this.state.cbcSchemes.some((s) => s.id === scheme.id);
    if (exists) {
      this.state.cbcSchemes = this.state.cbcSchemes.map((s) => (s.id === scheme.id ? scheme : s));
    } else {
      this.state.cbcSchemes = [scheme, ...this.state.cbcSchemes];
    }
    this.saveState();
  }

  // 8. Save or update CBC Lesson Plan
  public saveCBCLessonPlan(plan: LessonPlanItem) {
    const exists = this.state.cbcLessonPlans.some((p) => p.id === plan.id);
    if (exists) {
      this.state.cbcLessonPlans = this.state.cbcLessonPlans.map((p) => (p.id === plan.id ? plan : p));
    } else {
      this.state.cbcLessonPlans = [plan, ...this.state.cbcLessonPlans];
    }
    this.saveState();
  }

  // 9. Save or update CBC Lesson Note (immediately connects to Focus Zone)
  public saveCBCLessonNote(note: LessonNoteItem) {
    const exists = this.state.cbcLessonNotes.some((n) => n.id === note.id);
    if (exists) {
      this.state.cbcLessonNotes = this.state.cbcLessonNotes.map((n) => (n.id === note.id ? note : n));
    } else {
      this.state.cbcLessonNotes = [note, ...this.state.cbcLessonNotes];
    }
    this.saveState();
  }

  // 10. Save or update CBC Record of Work Covered
  public saveCBCRecordOfWork(record: RecordOfWorkItem) {
    const exists = this.state.cbcRecordsOfWork.some((r) => r.id === record.id);
    if (exists) {
      this.state.cbcRecordsOfWork = this.state.cbcRecordsOfWork.map((r) => (r.id === record.id ? record : r));
    } else {
      this.state.cbcRecordsOfWork = [record, ...this.state.cbcRecordsOfWork];
    }
    this.saveState();
  }

  // Delete professional document
  public deleteCBCDocument(type: 'scheme' | 'plan' | 'note' | 'record', id: string) {
    if (type === 'scheme') {
      this.state.cbcSchemes = this.state.cbcSchemes.filter((s) => s.id !== id);
    } else if (type === 'plan') {
      this.state.cbcLessonPlans = this.state.cbcLessonPlans.filter((p) => p.id !== id);
    } else if (type === 'note') {
      this.state.cbcLessonNotes = this.state.cbcLessonNotes.filter((n) => n.id !== id);
    } else if (type === 'record') {
      this.state.cbcRecordsOfWork = this.state.cbcRecordsOfWork.filter((r) => r.id !== id);
    }
    this.saveState();
  }

  public syncTimetable(timetable: Record<string, any>, freeze?: any) {
    this.state.timetable = timetable;
    if (freeze !== undefined) this.state.freeze = freeze;
    this.saveState();
  }

  // Reset to default sample
  public resetToDefault() {
    this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.saveState();
  }
}

export const ecosystemSync = new EcosystemSyncManager();
