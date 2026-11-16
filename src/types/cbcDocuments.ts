import { AttachedDocument } from '../utils/documentReader';

export interface CBCSyllabusTopic {
  id: string;
  subject: string;
  grade: string;
  strand: string;
  subStrand: string;
  term: 'Term 1' | 'Term 2' | 'Term 3';
  week: number;
  lessons: number;
  outcomes: string[];
  inquiryQuestions: string[];
  competencies: string[];
  values: string[];
  notes: string;
  workedExamples?: Array<{ title: string; problem: string; solution: string }>;
  practiceQuestions: Array<{
    q: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }>;
}

export interface SchemeOfWorkRow {
  week: number;
  lesson: number;
  strand: string;
  subStrand: string;
  specificLearningOutcomes: string;
  keyInquiryQuestions: string;
  learningExperiences: string;
  learningResources: string;
  assessmentMethods: string;
  reflection?: string;
}

export interface SchemeOfWorkItem {
  id: string;
  teacherId: string;
  teacherName: string;
  grade: string;
  subject: string;
  term: 'Term 1' | 'Term 2' | 'Term 3';
  year: number;
  rows: SchemeOfWorkRow[];
  approvedByHod: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LessonPlanStep {
  step: string;
  teacherActivity: string;
  learnerActivity: string;
  duration: string;
}

export interface LessonPlanItem {
  id: string;
  teacherId: string;
  teacherName: string;
  grade: string;
  subject: string;
  date: string;
  time: string;
  roll: string;
  strand: string;
  subStrand: string;
  specificLearningOutcomes: string;
  keyInquiryQuestion: string;
  learningResources: string;
  organization: string;
  introduction: string;
  steps: LessonPlanStep[];
  conclusion: string;
  selfReflection: string;
  createdAt: string;
}

export interface LessonNoteItem {
  id: string;
  teacherId: string;
  teacherName: string;
  grade: string;
  subject: string;
  strand: string;
  subStrand: string;
  title: string;
  content: string;
  workedExamples: string;
  learnerExercises: string;
  attachedDocs?: AttachedDocument[];
  publishedToFocusZone: boolean;
  publishedAt: string;
}

export interface RecordOfWorkItem {
  id: string;
  teacherId: string;
  teacherName: string;
  grade: string;
  subject: string;
  term: 'Term 1' | 'Term 2' | 'Term 3';
  week: number;
  date: string;
  workCovered: string;
  learnersPresent: number;
  totalLearners: number;
  teacherRemarks: string;
  hodStatus: 'Pending' | 'Approved' | 'Requires Review';
  hodRemarks?: string;
  createdAt: string;
}

export interface CATQuestionItem {
  num: number;
  question: string;
  marks: number;
  answerKey?: string;
  competency?: string;
}

export interface CATExaminationResult {
  detectedGrade: string;
  detectedStrand: string;
  detectedSubStrand?: string;
  qualityScore: number;
  executiveSummary: string;
  curriculumAlignment: string;
  questionReview: Array<{
    num: number;
    questionText: string;
    marks: number;
    clarity: 'High' | 'Moderate' | 'Needs Revision';
    answerKey?: string;
    competency?: string;
  }>;
  strengths: string[];
  suggestions: string[];
  recommendedAction: string;
}

export interface CATGeneratedDraft {
  title: string;
  grade: string;
  subject: string;
  strand: string;
  subStrand: string;
  totalMarks: number;
  questionsCount: number;
  instructions: string;
  questions: CATQuestionItem[];
  markingGuide: string;
  whatsappAlert: string;
}

export interface TeacherCATUploadItem {
  id: string;
  teacherId: string;
  teacherName: string;
  cls: string; // "Grade 4|Mathematics"
  grade: string;
  subject: string;
  strand: string;
  subStrand?: string;
  title: string;
  kind: 'CAT' | 'Assignment';
  dueDate: string;
  totalMarks: number;
  questionsCount: number;
  instructions: string;
  documents: AttachedDocument[];
  status: 'published' | 'draft' | 'pending_approval';
  publishedAt: string;
  sharedWithParents: boolean;
  whatsappMessage: string;
  learnerSubmissionsCount?: number;
  questions?: CATQuestionItem[];
  markingGuide?: string;
  approvedByTeacher?: boolean;
  aiExamined?: boolean;
  aiQualityScore?: number;
}

