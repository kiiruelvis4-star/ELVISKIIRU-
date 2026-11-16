export type GradeName = 'Grade 1' | 'Grade 2' | 'Grade 3' | 'Grade 4' | 'Grade 5' | 'Grade 6';

export const GRADES: GradeName[] = [
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
];

export const GRADE_COLORS: Record<GradeName, string> = {
  'Grade 1': '#7C3AED',
  'Grade 2': '#EC4899',
  'Grade 3': '#F97316',
  'Grade 4': '#A855F7',
  'Grade 5': '#78350F',
  'Grade 6': '#4F46E5',
};

export const SUBJECTS: Record<GradeName, string[]> = {
  'Grade 1': ['English', 'Kiswahili', 'Mathematics', 'Environmental Activities', 'Creative Activities', 'CRE'],
  'Grade 2': ['English', 'Kiswahili', 'Mathematics', 'Environmental Activities', 'Creative Activities', 'CRE', 'Indigenous Language'],
  'Grade 3': ['English', 'Kiswahili', 'Mathematics', 'Environmental Activities', 'Creative Activities', 'CRE', 'Indigenous Language'],
  'Grade 4': ['English', 'Kiswahili', 'Mathematics', 'Science & Technology', 'Social Studies', 'CRE', 'Agriculture & Nutrition', 'Creative Arts'],
  'Grade 5': ['English', 'Kiswahili', 'Mathematics', 'Science & Technology', 'Social Studies', 'CRE', 'Agriculture & Nutrition', 'Creative Arts'],
  'Grade 6': ['English', 'Kiswahili', 'Mathematics', 'Science & Technology', 'Social Studies', 'CRE', 'Agriculture & Nutrition', 'Creative Arts'],
};

export const FOLDERS: [string, string, string][] = [
  ['📘', 'KNEC / CBE documents', '#7C3AED'],
  ['🗂️', 'Schemes of work', '#EC4899'],
  ['📝', 'Lesson plans', '#F59E0B'],
  ['📓', 'Lesson notes', '#22C55E'],
  ['📒', 'Records of work', '#2F6BFF'],
  ['🧪', 'CATs & assessment', '#F97316'],
  ['📊', 'Rubrics', '#14B8A6'],
  ['🎨', 'Teaching resources', '#A855F7'],
  ['📚', 'Assignments', '#E11D48'],
  ['📄', 'Revision & past papers', '#6366F1'],
  ['🗒️', 'Class notes', '#84CC16'],
  ['📁', 'Teacher documents', '#06B6D4'],
  ['🏛️', 'Shared staff documents', '#D946EF'],
  ['🗓️', 'Timetables', '#0EA5E9'],
  ['👥', 'Class lists', '#F43F5E'],
  ['📋', 'Teacher reports', '#10B981'],
];

export interface TimetableSlotDef {
  k: string;
  t: string;
  lesson?: number;
  brk?: string;
}

export const SLOTS: TimetableSlotDef[] = [
  { k: 'L1', t: '8:20 – 9:00', lesson: 1 },
  { k: 'L2', t: '9:00 – 9:40', lesson: 2 },
  { k: 'B1', t: '9:40 – 10:00', brk: 'Health break' },
  { k: 'L3', t: '10:00 – 10:40', lesson: 3 },
  { k: 'L4', t: '10:40 – 11:20', lesson: 4 },
  { k: 'B2', t: '11:20 – 11:40', brk: 'Health break' },
  { k: 'L5', t: '11:40 – 12:20', lesson: 5 },
  { k: 'L6', t: '12:20 – 1:00', lesson: 6 },
  { k: 'LU', t: '1:00 – 2:00', brk: 'Lunch and rest' },
  { k: 'L7', t: '2:00 – 2:40', lesson: 7 },
  { k: 'DM', t: '2:40 – 3:00', brk: 'Dismissal' },
];

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
export const LOWER_GRADES: GradeName[] = ['Grade 1', 'Grade 2', 'Grade 3'];

export interface ResourceFile {
  name: string;
  ext: string;
}

export interface TaughtLessonLog {
  id: string;
  grade: GradeName;
  subject: string;
  topic: string;
  slotKey?: string;
  day?: string;
  date: string;
  stamp: string;
  status: 'Taught' | 'Partly taught' | 'Not taught';
  reflection?: string;
}

export interface Teacher {
  id: string;
  name: string;
  phone: string;
  subjects: string[];
  grades: GradeName[];
  gradeSubjects?: Partial<Record<GradeName, string[]>>;
  color: string;
  photo: string | null;
  mustChangePw: boolean;
  passHash?: string;
  files: Record<string, ResourceFile[]>;
  taughtLessons?: TaughtLessonLog[];
}

export interface LearnerParentDetails {
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;
}

export type PaternalRole = 'Father' | 'Grandfather';
export type MaternalRole = 'Mother' | 'Grandmother';

export interface Learner {
  id: string;
  name: string;
  adm: string; // LRA/0001, LRA/0002...
  grade: GradeName;
  stream: string;
  parentPhone: string;
  familyId: string | null;
  fatherRole?: PaternalRole;
  fatherName?: string;
  fatherPhone?: string;
  motherRole?: MaternalRole;
  motherName?: string;
  motherPhone?: string;
  permanentPassword?: string;
  photo?: string | null;
  feeBalance?: number;
  promotedFrom?: GradeName | null;
  promotedAt?: number | null;
  alumni?: boolean;
}

export interface Family {
  id: string; // FAM-001, FAM-002...
  head: string;
  phone: string;
  secondaryPhone?: string;
  fatherRole?: PaternalRole;
  fatherName?: string;
  fatherPhone?: string;
  motherRole?: MaternalRole;
  motherName?: string;
  motherPhone?: string;
  passwordReset?: boolean;
  passHash?: string;
}

export interface TermDateConfig {
  open: string;
  mid: string;
  close: string;
}

export interface TermsConfig {
  'Term 1': TermDateConfig;
  'Term 2': TermDateConfig;
  'Term 3': TermDateConfig;
}

export interface Notice {
  id: string;
  from: string;
  role: 'admin' | 'teacher';
  title: string;
  body: string;
  time: string;
  unread: boolean;
  ref: string | null;
}

export interface ProposedDraft {
  type: 'freeze' | 'notice' | 'delete_learner' | 'admit' | 'admit_learner' | 'add_teacher' | 'delete_teacher' | 'broadcast_notice' | 'push_resource' | 'freeze_timetable' | 'lesson_notes' | string;
  summary: string;
  from?: string;
  to?: string;
  why?: string;
  id?: string;
  name?: string;
  grade?: GradeName | string;
  payload?: any;
}

export interface ChatMessage {
  id: string;
  from: 'admin' | 'ai';
  text: string;
  at: number;
  stamp?: string;
  draft?: ProposedDraft | null;
  done?: string;
}

export interface ActivityLogItem {
  text: string;
  by: string;
  at: string;
}

export interface FreezeConfig {
  from: string;
  to: string;
  why: string;
}

export interface SchoolProfile {
  name: string;
  motto: string;
  address: string;
  phone: string;
  email: string;
  whatsapp?: string;
  facebook?: string;
  instagram?: string;
}

export interface AdminCodeAuth {
  salt: string;
  codeHash: string;
  passHash: string;
}

export interface TimetableCell {
  subject: string;
  teacherId: string;
}

export interface PasswordChangeRequest {
  id: string;
  userType: 'teacher' | 'family' | 'learner' | 'staff';
  name: string;
  identifier: string; // Phone number or Admission number
  reason: string;
  urgency: 'normal' | 'urgent' | 'critical';
  requestedAt: string; // Nairobi timestamp
  status: 'pending' | 'approved' | 'rejected';
  resolvedAt?: string;
  notes?: string;
  tempPasswordGenerated?: string;
}

export type GovernmentRoleKey =
  | 'president'
  | 'deputy_president'
  | 'academic_prefect'
  | 'duty_prefect'
  | 'environment_prefect'
  | 'sports_prefect'
  | 'health_hygiene_prefect'
  | 'class_prefect_g1'
  | 'class_prefect_g2'
  | 'class_prefect_g3'
  | 'class_prefect_g4'
  | 'class_prefect_g5'
  | 'class_prefect_g6';

export interface StudentCouncilRoleDef {
  key: GovernmentRoleKey;
  title: string;
  category: 'executive' | 'school' | 'class';
  targetGrade?: GradeName;
  badge: string;
  color: string;
  duties: string[];
}

export type InterPortalSenderType = 'teacher' | 'parent' | 'learner' | 'admin';

export type InterPortalRequestType =
  | 'lesson_notes'
  | 'schedule_update'
  | 'cat_review'
  | 'resource_request'
  | 'leave_notice'
  | 'general_inquiry';

export type InterPortalRequestStatus =
  | 'pending'
  | 'processing'
  | 'approved'
  | 'auto_resolved'
  | 'rejected'
  | 'delivered';

export interface InterPortalMessage {
  id: string;
  senderType: InterPortalSenderType;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientPortal: 'admin' | 'teachers' | 'parents' | 'learners';
  type: InterPortalRequestType;
  title: string;
  body: string;
  priority: 'normal' | 'urgent' | 'high';
  createdAt: number;
  createdStamp: string;
  expiresAt: number;
  status: InterPortalRequestStatus;
  payload?: {
    grade?: GradeName;
    subject?: string;
    topic?: string;
    generatedNotes?: {
      title: string;
      grade: string;
      subject: string;
      body: string;
    };
    currentSlot?: {
      day: string;
      slotKey: string;
      grade: GradeName;
      subject: string;
    };
    proposedSlot?: {
      day: string;
      slotKey: string;
      grade: GradeName;
      subject: string;
    };
    conflictDetected?: boolean;
    conflictDetail?: string;
  };
  aiResolution?: {
    actionTaken: string;
    resolvedAt: string;
    responseSentToPortal: string;
    pushedFileName?: string;
  };
}

export interface AIServiceConfig {
  autoPurge24h: boolean;
  autoApproveLessonNotes: boolean;
  autoDetectScheduleClashes: boolean;
  lastPurgeRunAt?: string;
  purgedTotalCount: number;
}

export interface AdminState {
  admin: AdminCodeAuth | null;
  loggedIn: boolean;
  theme: 'light' | 'dark';
  school: SchoolProfile;
  teachers: Teacher[];
  learners: Learner[];
  families: Family[];
  studentCouncil?: Record<string, string | null>;
  interPortalMessages?: InterPortalMessage[];
  aiServiceConfig?: AIServiceConfig;
  timetable: Record<string, TimetableCell>; // key: "Day|SlotKey|Grade"
  timetableSlots?: TimetableSlotDef[];
  terms: TermsConfig;
  notices: Notice[];
  messages: ChatMessage[];
  freeze: FreezeConfig | null;
  promotedAt: string | null;
  promotedTimestamp?: number | null;
  assessmentRetentionPurgedAt?: string | null;
  completedPromotionCycleKey?: string | null;
  autoReleasedTerm3Year?: number | null;
  clientModifiedAt?: number;
  passwordRequests?: PasswordChangeRequest[];
  log: ActivityLogItem[];
  tab: 'home' | 'teachers' | 'pupils' | 'families' | 'more';
  admNext: number;
  admRegister: Record<string, { inUse: boolean }>;
  clashResolved?: Record<string, 'same' | 'separate'>;
  aiUse?: {
    day: string;
    count: number;
  };
}
