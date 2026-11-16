export type LevelBand = 'EE' | 'ME' | 'AE' | 'BE';

export interface SubStrandDef {
  code: string;
  name: string;
}

export interface StrandDef {
  sid: string;
  code: string;
  name: string;
  subs: SubStrandDef[];
}

export interface LearningAreaDef {
  name: string;
  strands: StrandDef[];
}

export interface GradeCurriculumDef {
  terms: {
    'Term 1': LearningAreaDef[];
    'Term 2': LearningAreaDef[];
    'Term 3': LearningAreaDef[];
    [key: string]: LearningAreaDef[];
  };
}

export interface AssessmentRowItem {
  id?: string;
  name?: string;
  s: number; // score
  t: number; // total / out of
}

export interface StrandAssessmentRecord {
  cats: AssessmentRowItem[];
  asg: AssessmentRowItem[];
}

export interface ResultCalculation {
  c: number; // CATs percentage (0-100)
  a: number; // Assignment percentage (0-100)
  f: number; // Final weighted result: c * 0.60 + a * 0.40
}

export interface FocusZoneAttempt {
  cats: AssessmentRowItem[];
  asg: AssessmentRowItem[];
}

export type SubjectSubmissionStatus = 'draft' | 'submitted' | 'released';

export interface SubjectSubmission {
  id?: string;
  learnerId: string;
  grade: string;
  term: string;
  subject: string;
  teacherId?: string;
  teacherName?: string;
  status: SubjectSubmissionStatus;
  submittedAt?: number;
  releasedAt?: number;
}

export interface SchoolCalendarConfig {
  currentYear: number;
  term1Start: string; // e.g. "2026-01-06"
  term2Start: string; // e.g. "2026-05-04"
  term3Start: string; // e.g. "2026-08-31"
  promotedTimestamp?: number | null;
  promotedAcademicYear?: number;
}

export interface BellNotification {
  id: string;
  title: string;
  message: string;
  at: number;
  type: 'promotion' | 'submission' | 'release' | 'admission' | 'general';
  read?: boolean;
}
