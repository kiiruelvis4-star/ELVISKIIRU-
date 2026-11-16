import { GradeName, Teacher, Learner, TimetableCell, TermsConfig, FreezeConfig, Notice } from '../admin/types';

export type CBCRubric = 'EE' | 'ME' | 'AE' | 'BE';

export interface CATQuestion {
  number: number;
  prompt: string;
  options?: string[]; // multiple choice options e.g. A, B, C, D
  correctAnswer: string;
  rubricCriteria?: string;
  sourceExam?: 'KPSEA Past Paper' | 'CBC Formative Bank' | 'KNEC Standard';
}

export interface FormativeAssessment {
  id: string;
  strandId?: string;
  subStrandId?: string;
  type?: 'CAT' | 'Assignment';
  kind?: 'CAT' | 'Assignment';
  number: number; // 1 to 100
  title: string;
  maxMarks: number;
  date: string;
  questionsList?: CATQuestion[]; // 10 questions for standardized CAT
  scores: Record<string, number>; // adm -> score
}

export type AssessmentRecord = FormativeAssessment;

export interface FocusZoneItem {
  id: string;
  learnerAdm: string;
  learnerName: string;
  grade: GradeName | string;
  stream?: string;
  subject: string;
  strandName: string;
  subStrandName: string;
  rubric: 'ME' | 'BE' | CBCRubric;
  scorePct: number;
  reason?: string;
  notes?: string;
  status: 'Needs Support' | 'Intervention Active' | 'Completed' | 'Pending' | string;
  dateAdded?: string;
}

export interface LessonPlanItem {
  lessonNumber: number;
  title: string;
  durationMinutes: number; // 40 minutes bell
  outcome: string; // Specific Learning Outcome
  keyInquiryQuestion: string;
  learningResources: string;
  introduction: string; // 5 min
  development: string; // 25 min step-by-step
  conclusion: string; // 5 min
  reflection?: string;
}

export interface SchemeOfWorkItem {
  week: number;
  lesson: number;
  subStrandId: string;
  topic: string;
  specificOutcomes: string;
  keyInquiryQuestion: string;
  learningExperiences: string;
  learningResources: string;
  assessmentMethod: string;
  reflection?: string;
}

export interface SubStrand {
  id: string;
  name: string;
  strandId: string;
  term?: 1 | 2 | 3;
  targetWeek?: number;
  totalLessons?: number;
  learnerNotes?: string; // Extended learner language notes
  checkQuestions?: { question: string; answer: string }[]; // Teacher check questions with answers
  lessonPlans?: LessonPlanItem[];
  assessments: FormativeAssessment[];
  manualOverrides?: Record<string, CBCRubric>; // adm -> rubric override
}

export interface Strand {
  id: string;
  name: string;
  grade: GradeName;
  subject: string;
  subStrands: SubStrand[];
}

export interface LessonRecord {
  date: string;
  stamp: string;
  topic: string;
  status: 'Taught' | 'Partly taught' | 'Not taught';
  reflection?: string;
}

export interface AssessmentItem {
  id: string;
  cls: string;
  title: string;
  kind: 'CAT' | 'Assignment';
  questions: number;
  marksEach: number;
  total: number;
  status: 'draft' | 'approved';
  created: string;
  approved?: string;
  documents?: { id: string; name: string; url?: string; ext?: string; size?: string | number }[];
}

export interface TeacherFile {
  id?: string;
  name: string;
  ext: string;
  by: 'teacher' | 'admin';
  grade?: string;
  subject?: string;
  folder?: string;
  size?: number | string;
  uploadedAt?: string;
  blobUrl?: string;
  dataUrl?: string;
  rawContent?: string;
  description?: string;
}

export interface TeacherChatMessage {
  id: string;
  from: 'me' | 'elsie';
  text: string;
  at?: number;
  stamp?: string;
}

export interface FocusRemediation {
  adm: string;
  learnerName: string;
  grade: GradeName;
  subject: string;
  subStrandId: string;
  subStrandName: string;
  rubric: 'ME' | 'BE';
  scorePct: number;
  note: string;
  status: 'pending' | 'remediated';
  updatedAt: string;
}

export interface TeacherState {
  signedInId: string | null;
  theme: 'light' | 'dark';
  tab: 'home' | 'classes' | 'timetable' | 'assessment' | 'book' | 'report' | 'focus';
  classes: Record<string, {
    lessons: LessonRecord[];
    marks: Record<string, Record<string, number>>;
    att?: Record<string, Record<string, boolean>>;
    subjectScores?: Record<string, { catScore: number; asgScore: number }>;
  }>;
  strands: Strand[];
  focusRemediations?: Record<string, FocusRemediation>; // key: `${adm}_${subStrandId}`
  focusZoneInterventions?: FocusZoneItem[];
  assessments: AssessmentItem[];
  files: Record<string, TeacherFile[]>;
  uploadedResources?: TeacherFile[];
  msgs: TeacherChatMessage[];
  aiUse: { day: string; count: number };
  adminInbox: { id: string; title: string; body: string; stamp: string; unread: boolean }[];
}

export interface SharedAdminData {
  teachers: Teacher[];
  learners: Learner[];
  timetable: Record<string, TimetableCell>;
  terms: TermsConfig;
  notices: Notice[];
  freeze: FreezeConfig | null;
  bands?: { EE: number; ME: number; AE: number };
}
