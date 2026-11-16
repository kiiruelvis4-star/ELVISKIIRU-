import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  GradeName,
  Teacher,
  Learner,
  TimetableCell,
  GRADES,
  GRADE_COLORS,
  SUBJECTS,
  FOLDERS,
  Notice,
  TermsConfig,
  FreezeConfig,
  TaughtLessonLog,
} from '../admin/types';
import {
  TeacherState,
  TeacherFile,
  LessonRecord,
  AssessmentItem,
  TeacherChatMessage,
  CBCRubric,
  AssessmentRecord,
  SubStrand,
  Strand,
  FocusZoneItem,
  FormativeAssessment,
} from './types';
import { INITIAL_TEACHER_STATE, DEFAULT_CBC_STRANDS } from './teacherInitialData';
import { INITIAL_ADMIN_STATE } from '../admin/initialData';
import { sound } from '../../utils/sound';
import { useBackHandler } from '../../utils/navigationHistory';
import { ElsieChatView } from '../common/ElsieChatView';
import { UserIdentity } from '../../utils/elsieEngine';
import { DirectDocumentViewerModal, DirectViewableDoc } from '../DirectDocumentViewerModal';
import {
  readUploadedDocument,
  formatFileSize,
  AttachedDocument,
} from '../../utils/documentReader';
import { ecosystemSync } from '../../utils/ecosystemSync';
import { pullSchoolStateFromCloud, pushSchoolStateToCloud } from '../../utils/cloudSync';
import { AssessmentPwaView } from '../common/AssessmentPwaView';
import { getStoredMarks, saveStoredMarks, makeMarkKey } from '../../utils/cbcAssessmentEngine';
import { DATA } from '../../data/curriculumData';
import {
  AssessmentModals,
  StrandModalData,
  SubStrandModalData,
  AssessmentModalData,
} from './AssessmentModals';
import { getUnreadNotificationCount } from '../../utils/notifications';

interface TeacherPortalProps {
  onExitPortal: () => void;
  onShowToast: (msg: string) => void;
  initialTeacherId?: string;
}

const BELLS = [
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

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const LOWER_GRADES: GradeName[] = ['Grade 1', 'Grade 2', 'Grade 3'];
const PALETTE = ['#7C3AED', '#EC4899', '#F59E0B', '#22C55E', '#2F6BFF', '#F97316', '#14B8A6', '#A855F7', '#E11D48', '#6366F1'];
const MSG_EXPIRY_MS = 24 * 60 * 60 * 1000;
const ADMIN_STORAGE_KEY = 'lra_admin_v3';
const TEACHER_STORAGE_KEY = 'lra_teacher_v1';

const BAND_NAMES: Record<string, string> = {
  EE: 'Exceeding Expectations',
  ME: 'Meeting Expectations',
  AE: 'Approaching Expectations',
  BE: 'Below Expectations',
};

const BAND_COLORS: Record<string, string> = {
  EE: '#16A34A',
  ME: '#2563EB',
  AE: '#F5B301',
  BE: '#E11D48',
};

export const TeacherPortal: React.FC<TeacherPortalProps> = ({
  onExitPortal,
  onShowToast,
  initialTeacherId,
}) => {
  // Load admin data from shared local storage (teachers, learners, timetable, notices, terms, freeze)
  const [adminData, setAdminData] = useState(() => {
    try {
      const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          teachers: parsed.teachers || INITIAL_ADMIN_STATE.teachers,
          learners: parsed.learners || INITIAL_ADMIN_STATE.learners,
          timetable: parsed.timetable || INITIAL_ADMIN_STATE.timetable,
          timetableSlots: parsed.timetableSlots || BELLS,
          terms: parsed.terms || INITIAL_ADMIN_STATE.terms,
          notices: parsed.notices || INITIAL_ADMIN_STATE.notices,
          freeze: parsed.freeze || null,
        };
      }
    } catch (e) {
      console.warn('Failed to load admin data for teacher portal:', e);
    }
    return {
      teachers: INITIAL_ADMIN_STATE.teachers,
      learners: INITIAL_ADMIN_STATE.learners,
      timetable: INITIAL_ADMIN_STATE.timetable,
      timetableSlots: BELLS,
      terms: INITIAL_ADMIN_STATE.terms,
      notices: INITIAL_ADMIN_STATE.notices,
      freeze: null,
    };
  });

  // Teacher's own state (classes, assessments, strands, Focus Zone, ELSIE messages, admin inbox)
  const [tState, setTState] = useState<TeacherState>(() => {
    let sessionTeacherId: string | null = null;
    try {
      const sessRaw = localStorage.getItem('lra_session_user');
      if (sessRaw) {
        const sess = JSON.parse(sessRaw);
        if (sess?.portalId === 'staff' && sess?.id) {
          sessionTeacherId = sess.id;
        }
      }
    } catch {
      // ignore
    }

    try {
      const stored = localStorage.getItem(TEACHER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...INITIAL_TEACHER_STATE,
          ...parsed,
          tab: parsed.tab === 'resources' ? 'home' : (parsed.tab || 'home'),
          signedInId: initialTeacherId || sessionTeacherId || parsed.signedInId || INITIAL_TEACHER_STATE.signedInId,
          strands:
            parsed.strands && parsed.strands.length > 0 ? parsed.strands : DEFAULT_CBC_STRANDS,
          focusZoneInterventions: parsed.focusZoneInterventions || [],
        };
      }
    } catch (e) {
      console.warn('Failed to load teacher state:', e);
    }
    return {
      ...INITIAL_TEACHER_STATE,
      tab: 'home',
      signedInId: initialTeacherId || sessionTeacherId || INITIAL_TEACHER_STATE.signedInId,
      strands: DEFAULT_CBC_STRANDS,
      focusZoneInterventions: [],
    };
  });

  // Subview navigation stack
  const [stack, setStack] = useState<{ view: string; title: string; payload?: any }[]>([]);

  // Modals
  const [showMarkTaughtModal, setShowMarkTaughtModal] = useState<string | null>(null);
  const [showSwitchTeacherModal, setShowSwitchTeacherModal] = useState(false);

  // Direct Document Viewer
  const [directViewingDoc, setDirectViewingDoc] = useState<DirectViewableDoc | null>(null);

  // CBC Assessment Management Modals
  const [strandModal, setStrandModal] = useState<StrandModalData | null>(null);
  const [subStrandModal, setSubStrandModal] = useState<SubStrandModalData | null>(null);
  const [assessmentModal, setAssessmentModal] = useState<AssessmentModalData | null>(null);

  // Assessment Tab State: ONLY Assessment Book & Assessment Report (Reads subjects of teacher and learners added by admin)
  const [usePwaEngine, setUsePwaEngine] = useState<boolean>(true);
  const [assessMode, setAssessMode] = useState<'book' | 'report'>('book');
  const [assessGrade, setAssessGrade] = useState<GradeName>('Grade 4');
  const [assessSubject, setAssessSubject] = useState<string>('Mathematics');
  const [assessLearnerId, setAssessLearnerId] = useState<string | null>(null);
  const [teacherTimetableView, setTeacherTimetableView] = useState<string>('my');

  // Form states
  const [markTaughtTopic, setMarkTaughtTopic] = useState('');
  const [markTaughtStatus, setMarkTaughtStatus] = useState<'Taught' | 'Partly taught' | 'Not taught'>('Taught');
  const [markTaughtReflection, setMarkTaughtReflection] = useState('');
  const [pendingSlotMeta, setPendingSlotMeta] = useState<{ day?: string; slotKey?: string } | null>(null);

  // Message Admin form
  const [adminMsgSubject, setAdminMsgSubject] = useState('');
  const [adminMsgBody, setAdminMsgBody] = useState('');



  // Real-time synchronization: connects Teacher Portal to live Administration Timetable changes
  useEffect(() => {
    const syncAdminData = (overrideData?: any) => {
      try {
        let parsed = overrideData;
        if (!parsed) {
          const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
          if (raw) parsed = JSON.parse(raw);
        }
        if (parsed) {
          setAdminData((prev: any) => ({
            ...prev,
            teachers: parsed.teachers || prev.teachers,
            learners: parsed.learners || prev.learners,
            timetable: parsed.timetable || prev.timetable,
            timetableSlots:
              Array.isArray(parsed.timetableSlots) && parsed.timetableSlots.length > 0
                ? parsed.timetableSlots
                : prev.timetableSlots || BELLS,
            terms: parsed.terms || prev.terms,
            notices: parsed.notices || prev.notices,
            freeze: parsed.freeze !== undefined ? parsed.freeze : prev.freeze,
          }));
        }
      } catch (err) {
        console.warn('Failed to sync admin data in TeacherPortal:', err);
      }
    };

    const handleAdminStateUpdated = (e: any) => {
      syncAdminData(e.detail);
    };

    const handleTimetableUpdated = (e: any) => {
      if (e.detail) {
        setAdminData((prev: any) => ({
          ...prev,
          timetable: e.detail.timetable || prev.timetable,
          timetableSlots:
            Array.isArray(e.detail.timetableSlots) && e.detail.timetableSlots.length > 0
              ? e.detail.timetableSlots
              : prev.timetableSlots || BELLS,
          freeze: e.detail.freeze !== undefined ? e.detail.freeze : prev.freeze,
          teachers: e.detail.teachers || prev.teachers,
        }));
        onShowToast('🔔 Timetable updated by Administration');
      } else {
        syncAdminData();
      }
    };

    const handleGenericSync = () => syncAdminData();

    pullSchoolStateFromCloud().then((updated) => {
      if (updated) syncAdminData();
    }).catch(() => {});

    window.addEventListener('lra-admin-state-updated', handleAdminStateUpdated);
    window.addEventListener('lra-timetable-updated', handleTimetableUpdated);
    window.addEventListener('storage', handleGenericSync);
    window.addEventListener('lra_data_sync', handleGenericSync);

    return () => {
      window.removeEventListener('lra-admin-state-updated', handleAdminStateUpdated);
      window.removeEventListener('lra-timetable-updated', handleTimetableUpdated);
      window.removeEventListener('storage', handleGenericSync);
      window.removeEventListener('lra_data_sync', handleGenericSync);
    };
  }, [onShowToast]);

  // Persist teacher state on change
  useEffect(() => {
    try {
      localStorage.setItem(TEACHER_STORAGE_KEY, JSON.stringify(tState));
    } catch (e) {
      console.error('Failed to save teacher state:', e);
    }
  }, [tState]);

  // Active teacher profile
  const teacher = useMemo(() => {
    const byId = adminData.teachers.find((t: Teacher) => t.id === tState.signedInId);
    if (byId) return byId;

    try {
      const sessRaw = localStorage.getItem('lra_session_user');
      if (sessRaw) {
        const sess = JSON.parse(sessRaw);
        if (sess?.portalId === 'staff') {
          const norm9 = (p?: string) => {
            const d = (p || '').replace(/\D/g, '');
            return d.length >= 9 ? d.slice(-9) : d;
          };
          const sessPhone9 = norm9(sess.phone || sess.identifier);
          if (sessPhone9) {
            const byPhone = adminData.teachers.find((t: Teacher) => norm9(t.phone) === sessPhone9);
            if (byPhone) return byPhone;
          }
          if (sess.name) {
            return {
              id: sess.id || tState.signedInId,
              name: sess.name,
              phone: sess.phone || sess.identifier || '',
              subjects: Array.isArray(sess.subjects) ? sess.subjects : [],
              grades: Array.isArray(sess.grades) ? sess.grades : [],
              gradeSubjects: sess.gradeSubjects || {},
              color: '#2F6BFF',
              photo: null,
              files: {},
              mustChangePw: false,
            } as Teacher;
          }
        }
      }
    } catch {
      // ignore
    }

    return adminData.teachers[0] || INITIAL_ADMIN_STATE.teachers[0];
  }, [adminData.teachers, tState.signedInId]);

  // Elsie Teacher Identity with Phone Number, Preferred Title & Assigned Classes
  const teacherIdentity: UserIdentity = useMemo(() => {
    const phone = teacher?.phone ? teacher.phone.replace(/\D/g, '') : '0712345678';
    const isMadam = teacher?.name?.toLowerCase().includes('madam') || teacher?.name?.toLowerCase().includes('mrs');
    const title = isMadam ? 'Madam' : 'Tr.';
    const assignedSet = new Set<string>();
    if (teacher) {
      Object.entries(adminData.timetable || {}).forEach(([k, cell]: [string, any]) => {
        if (cell && cell.teacherId === teacher.id && cell.subject) {
          const parts = k.split('|');
          if (parts[2]) assignedSet.add(`${parts[2]} ${cell.subject}`);
        }
      });
      if (assignedSet.size === 0 && Array.isArray(teacher.grades) && Array.isArray(teacher.subjects)) {
        teacher.grades.forEach((g: string) =>
          teacher.subjects.forEach((s: string) => assignedSet.add(`${g} ${s}`))
        );
      }
    }
    return {
      role: 'teacher',
      id: phone,
      name: teacher?.name || 'Mwalimu',
      preferredTitle: title,
      preferredName: teacher?.name
        ? teacher.name.startsWith('Mr.') || teacher.name.startsWith('Madam')
          ? teacher.name
          : `${title} ${teacher.name}`
        : 'Mwalimu',
      assignedClasses: Array.from(assignedSet),
    };
  }, [teacher, adminData.timetable]);

  // Determine current active term
  const currentTerm = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const terms = adminData.terms;
    for (const t of ['Term 1', 'Term 2', 'Term 3'] as const) {
      const cfg = terms[t];
      if (cfg && cfg.open && cfg.close && todayStr >= cfg.open && todayStr <= cfg.close) {
        return t;
      }
    }
    return 'Term 1';
  }, [adminData.terms]);

  // Classes assigned to this teacher in timetable or per-grade teacher profile
  const myClasses = useMemo(() => {
    if (!teacher) return [];
    const set: Record<string, { grade: GradeName; subject: string }> = {};

    // 1. From explicit per-grade subject assignments
    if (teacher.gradeSubjects && Object.keys(teacher.gradeSubjects).length > 0) {
      teacher.grades.forEach((g: GradeName) => {
        const gSubs = teacher.gradeSubjects?.[g] || [];
        gSubs.forEach((s: string) => {
          set[`${g}|${s}`] = { grade: g, subject: s };
        });
      });
    }

    // 2. From Timetable slots
    Object.entries(adminData.timetable || {}).forEach(([k, cell]: [string, any]) => {
      if (cell && cell.teacherId === teacher.id && cell.subject) {
        const parts = k.split('|');
        const g = parts[2] as GradeName;
        if (g && cell.subject) {
          set[`${g}|${cell.subject}`] = { grade: g, subject: cell.subject };
        }
      }
    });

    // 3. Fallback from flat assigned teacher grades & subjects if neither map nor timetable has entries
    if (Object.keys(set).length === 0) {
      teacher.grades.forEach((g: GradeName) => {
        teacher.subjects.forEach((s: string) => {
          set[`${g}|${s}`] = { grade: g, subject: s };
        });
      });
    }

    return Object.values(set);
  }, [teacher, adminData.timetable]);

  // Per-grade map of subjects strictly taught by this teacher
  const teacherSubjectsByGrade = useMemo(() => {
    const map: Record<string, string[]> = {};
    myClasses.forEach(({ grade, subject }) => {
      if (!map[grade]) map[grade] = [];
      if (!map[grade].includes(subject)) {
        map[grade].push(subject);
      }
    });
    return map;
  }, [myClasses]);

  const teacherAssignedGrades = useMemo(() => {
    const gradesFromMap = Object.keys(teacherSubjectsByGrade);
    if (gradesFromMap.length > 0) return gradesFromMap;
    return Array.isArray(teacher?.grades) ? teacher.grades : [];
  }, [teacherSubjectsByGrade, teacher?.grades]);

  // Learners in a grade
  const learnersInGrade = (grade: GradeName): Learner[] => {
    return adminData.learners.filter((l: Learner) => l.grade === grade);
  };

  // Active bell slots (synced with Admin editable slots)
  const activeBells = useMemo(() => {
    return Array.isArray(adminData.timetableSlots) && adminData.timetableSlots.length > 0
      ? adminData.timetableSlots
      : BELLS;
  }, [adminData.timetableSlots]);

  // Lessons today on bell schedule
  const todayDayName = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const d = days[new Date().getDay()];
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(d) ? d : null;
  }, []);

  const todayLessons = useMemo(() => {
    if (!todayDayName || !teacher) return [];
    const out: { time: string; lesson: number; grade: GradeName; subject: string; k: string }[] = [];
    activeBells.filter((b: any) => b.lesson).forEach((b: any) => {
      GRADES.forEach((g) => {
        const key = `${todayDayName}|${b.k}|${g}`;
        const cell = adminData.timetable[key];
        if (cell && cell.teacherId === teacher.id) {
          out.push({
            time: b.t,
            lesson: b.lesson!,
            grade: g,
            subject: cell.subject,
            k: b.k,
          });
        }
      });
    });
    return out;
  }, [todayDayName, teacher, adminData.timetable, activeBells]);

  // Unread notifications count scoped strictly to this teacher & Faculty portal
  const [portalNotifUnread, setPortalNotifUnread] = useState<number>(() =>
    getUnreadNotificationCount({
      portalId: 'teachers',
      userId: teacher?.id,
      userName: teacher?.name || 'Mwalimu',
      subjects: teacher?.subjects,
    })
  );

  useEffect(() => {
    const refreshNotifs = () => {
      setPortalNotifUnread(
        getUnreadNotificationCount({
          portalId: 'teachers',
          userId: teacher?.id,
          userName: teacher?.name || 'Mwalimu',
          subjects: teacher?.subjects,
        })
      );
    };
    refreshNotifs();
    window.addEventListener('lra_notifications_updated', refreshNotifs);
    window.addEventListener('lra_data_sync', refreshNotifs);
    return () => {
      window.removeEventListener('lra_notifications_updated', refreshNotifs);
      window.removeEventListener('lra_data_sync', refreshNotifs);
    };
  }, [teacher?.id, teacher?.name, teacher?.subjects, adminData.notices, tState.adminInbox]);

  const unreadCount = portalNotifUnread;

  // Clean 24-hour expired messages
  useEffect(() => {
    const cutoff = Date.now() - MSG_EXPIRY_MS;
    setTState((prev) => ({
      ...prev,
      msgs: prev.msgs.filter((m) => !m.at || m.at >= cutoff),
    }));
  }, []);

  // --- HARDWARE BACK BUTTON NAVIGATION ---
  // Priority 40: Modals
  useBackHandler(
    () => {
      sound.playClick(400);
      if (strandModal) setStrandModal(null);
      else if (subStrandModal) setSubStrandModal(null);
      else if (assessmentModal) setAssessmentModal(null);
      else if (directViewingDoc) setDirectViewingDoc(null);
      else if (showMarkTaughtModal) setShowMarkTaughtModal(null);
      else if (showSwitchTeacherModal) setShowSwitchTeacherModal(false);
      return true;
    },
    !!strandModal ||
      !!subStrandModal ||
      !!assessmentModal ||
      !!directViewingDoc ||
      !!showMarkTaughtModal ||
      showSwitchTeacherModal,
    40,
    'teacher_modals'
  );

  // Priority 25: Subview stack -> non-home tab -> home
  useBackHandler(
    () => {
      sound.playClick(400);
      if (stack.length > 0) {
        setStack((prev) => prev.slice(0, -1));
        return true;
      }
      if (tState.tab !== 'home') {
        setTState((prev) => ({ ...prev, tab: 'home' }));
        return true;
      }
      return false;
    },
    stack.length > 0 || tState.tab !== 'home',
    25,
    'teacher_subviews'
  );

  // Push view to stack
  const pushView = (view: string, title: string, payload?: any) => {
    sound.playClick(500);
    setStack((prev) => [...prev, { view, title, payload }]);
  };

  const popView = () => {
    sound.playClick(400);
    setStack((prev) => prev.slice(0, -1));
  };

  // Helper for Nairobi timestamp
  const nowStamp = () => {
    return new Date().toLocaleString('en-GB', {
      timeZone: 'Africa/Nairobi',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Toggle Theme
  const handleToggleTheme = (t: 'light' | 'dark') => {
    sound.playClick(400);
    setTState((prev) => ({ ...prev, theme: t }));
  };

  // Attendance Toggle
  const handleToggleAttendance = (clsKey: string, learnerId: string) => {
    sound.playClick(500);
    const todayKey = new Date().toISOString().slice(0, 10);
    setTState((prev) => {
      const cls = prev.classes[clsKey] || { lessons: [], marks: {}, att: {} };
      const att = cls.att || {};
      const dayAtt = att[todayKey] || {};
      const current = dayAtt[learnerId] !== false; // default true (present)
      const updated = {
        ...dayAtt,
        [learnerId]: !current,
      };
      return {
        ...prev,
        classes: {
          ...prev.classes,
          [clsKey]: {
            ...cls,
            att: {
              ...att,
              [todayKey]: updated,
            },
          },
        },
      };
    });
  };

  const syncTaughtLessonToAdmin = (logEntry: TaughtLessonLog) => {
    if (!teacher) return;
    try {
      const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
      const parsedAdmin = raw ? JSON.parse(raw) : { ...INITIAL_ADMIN_STATE };
      const existingTeachers: Teacher[] = Array.isArray(parsedAdmin.teachers)
        ? parsedAdmin.teachers
        : adminData.teachers || [];
      const updatedTeachers = existingTeachers.map((t: Teacher) =>
        t.id === teacher.id
          ? { ...t, taughtLessons: [logEntry, ...(t.taughtLessons || [])] }
          : t
      );
      const nextAdmin = { ...parsedAdmin, teachers: updatedTeachers };
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(nextAdmin));
      setAdminData((prev: any) => ({ ...prev, teachers: updatedTeachers }));
      window.dispatchEvent(new CustomEvent('lra-admin-state-updated', { detail: nextAdmin }));
      window.dispatchEvent(new CustomEvent('lra_data_sync', { detail: { key: ADMIN_STORAGE_KEY } }));
      pushSchoolStateToCloud({ adminState: nextAdmin }).catch((err) =>
        console.warn('Cloud push after marking lesson taught failed:', err)
      );
    } catch (err) {
      console.warn('Failed to sync taught lesson to admin state:', err);
    }
  };

  // Mark Lesson Taught
  const handleSaveLessonRecord = () => {
    if (!showMarkTaughtModal) return;
    const clsKey = showMarkTaughtModal;
    const [parsedGrade, parsedSubject] = clsKey.split('|');
    const topic = markTaughtTopic.trim() || 'Core Competency Lesson';
    const todayIso = new Date().toISOString().slice(0, 10);
    const stamp = nowStamp();

    const newRecord: LessonRecord = {
      date: todayIso,
      stamp,
      topic,
      status: markTaughtStatus,
      reflection: markTaughtReflection.trim() || undefined,
    };

    setTState((prev) => {
      const cls = prev.classes[clsKey] || { lessons: [], marks: {}, att: {} };
      return {
        ...prev,
        classes: {
          ...prev.classes,
          [clsKey]: {
            ...cls,
            lessons: [newRecord, ...cls.lessons],
          },
        },
      };
    });

    syncTaughtLessonToAdmin({
      id: `tl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      date: todayIso,
      stamp,
      grade: (parsedGrade as GradeName) || 'Grade 4',
      subject: parsedSubject || 'Mathematics',
      topic,
      status: markTaughtStatus,
      day: pendingSlotMeta?.day,
      slotKey: pendingSlotMeta?.slotKey,
    });

    sound.playCompleteChime();
    onShowToast(`Recorded lesson: "${topic}" as ${markTaughtStatus}`);
    setShowMarkTaughtModal(null);
    setPendingSlotMeta(null);
    setMarkTaughtTopic('');
    setMarkTaughtReflection('');
  };

  // Upload and attach document to an existing assessment item
  const handleAttachDocumentToAssessment = async (
    assessmentId: string,
    file: File
  ) => {
    sound.playClick(500);
    try {
      const doc = await readUploadedDocument(file);
      setTState((prev) => ({
        ...prev,
        assessments: prev.assessments.map((a) =>
          a.id === assessmentId
            ? { ...a, documents: [...(a.documents || []), doc] }
            : a
        ),
      }));
      sound.playCompleteChime();
      onShowToast(`Uploaded ${doc.name} to assessment`);
    } catch (err: any) {
      console.error('Doc upload error:', err);
      onShowToast(`Failed to read document: ${err.message}`);
    }
  };

  // Remove attached document from an assessment item
  const handleRemoveAssessmentDoc = (assessmentId: string, docId: string) => {
    sound.playClick(400);
    setTState((prev) => ({
      ...prev,
      assessments: prev.assessments.map((a) =>
        a.id === assessmentId
          ? { ...a, documents: (a.documents || []).filter((d) => d.id !== docId) }
          : a
      ),
    }));
    onShowToast('Document removed');
  };

  // Approve Assessment
  const handleApproveAssessment = (id: string) => {
    const item = tState.assessments.find((a) => a.id === id);
    if (!item) return;

    sound.playCompleteChime();
    setTState((prev) => ({
      ...prev,
      assessments: prev.assessments.map((a) =>
        a.id === id ? { ...a, status: 'approved', approved: nowStamp() } : a
      ),
    }));

    onShowToast(`✓ "${item.title}" approved and dispatched to learners`);
  };

  // Delete Assessment Draft
  const handleDeleteAssessmentDraft = (id: string) => {
    sound.playClick(400);
    setTState((prev) => ({
      ...prev,
      assessments: prev.assessments.filter((a) => a.id !== id),
    }));
    onShowToast('Assessment deleted');
  };

  // Enter/Update Mark for Learner
  const handleSaveLearnerMark = (clsKey: string, assessId: string, learnerId: string, val: string) => {
    const item = tState.assessments.find((a) => a.id === assessId);
    if (!item) return;

    const num = Math.max(0, Math.min(item.total, parseInt(val, 10) || 0));

    setTState((prev) => {
      const cls = prev.classes[clsKey] || { lessons: [], marks: {}, att: {} };
      const currentMarks = cls.marks[assessId] || {};
      return {
        ...prev,
        classes: {
          ...prev.classes,
          [clsKey]: {
            ...cls,
            marks: {
              ...cls.marks,
              [assessId]: {
                ...currentMarks,
                [learnerId]: num,
              },
            },
          },
        },
      };
    });

    onShowToast('Mark saved');
  };

  // --- CBC STRANDS, SUB-STRANDS & ASSESSMENTS HANDLERS ---
  const handleSaveStrand = (data: StrandModalData) => {
    setTState((prev) => {
      const currentStrands = prev.strands || DEFAULT_CBC_STRANDS;
      if (data.mode === 'add') {
        const newStrand: Strand = {
          id: `strand_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: data.name,
          grade: data.grade,
          subject: data.subject,
          subStrands: [],
        };
        return {
          ...prev,
          strands: [...currentStrands, newStrand],
        };
      } else {
        return {
          ...prev,
          strands: currentStrands.map((s) =>
            s.id === data.strandId ? { ...s, name: data.name } : s
          ),
        };
      }
    });
    sound.playCompleteChime();
    onShowToast(data.mode === 'add' ? `Added strand "${data.name}"` : `Updated strand`);
    setStrandModal(null);
  };

  const handleDeleteStrand = (strandId: string) => {
    sound.playClick(400);
    setTState((prev) => ({
      ...prev,
      strands: (prev.strands || DEFAULT_CBC_STRANDS).filter((s) => s.id !== strandId),
    }));
    onShowToast('Strand deleted');
  };

  const handleSaveSubStrand = (data: SubStrandModalData) => {
    setTState((prev) => {
      const currentStrands = prev.strands || DEFAULT_CBC_STRANDS;
      return {
        ...prev,
        strands: currentStrands.map((strand) => {
          if (strand.id !== data.strandId) return strand;
          if (data.mode === 'add') {
            const newSub: SubStrand = {
              id: `substrand_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              strandId: data.strandId,
              name: data.name,
              assessments: [],
              manualOverrides: {},
            };
            return {
              ...strand,
              subStrands: [...strand.subStrands, newSub],
            };
          } else {
            return {
              ...strand,
              subStrands: strand.subStrands.map((sub) =>
                sub.id === data.subStrandId ? { ...sub, name: data.name } : sub
              ),
            };
          }
        }),
      };
    });
    sound.playCompleteChime();
    onShowToast(data.mode === 'add' ? `Added sub-strand "${data.name}"` : `Updated sub-strand`);
    setSubStrandModal(null);
  };

  const handleDeleteSubStrand = (strandId: string, subStrandId: string) => {
    sound.playClick(400);
    setTState((prev) => ({
      ...prev,
      strands: (prev.strands || DEFAULT_CBC_STRANDS).map((strand) => {
        if (strand.id !== strandId) return strand;
        return {
          ...strand,
          subStrands: strand.subStrands.filter((sub) => sub.id !== subStrandId),
        };
      }),
    }));
    onShowToast('Sub-strand deleted');
  };

  const handleSaveAssessment = (data: AssessmentModalData) => {
    setTState((prev) => {
      const currentStrands = prev.strands || DEFAULT_CBC_STRANDS;
      return {
        ...prev,
        strands: currentStrands.map((strand) => {
          if (strand.id !== data.strandId) return strand;
          return {
            ...strand,
            subStrands: strand.subStrands.map((sub) => {
              if (sub.id !== data.subStrandId) return sub;
              const curAssessments = sub.assessments || [];
              if (data.mode === 'add') {
                const sameKindCount = curAssessments.filter((a) => a.kind === data.kind).length;
                if (sameKindCount >= 100) return sub;
                const newAssess: AssessmentRecord = {
                  id: `ass_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  strandId: data.strandId,
                  subStrandId: data.subStrandId,
                  kind: data.kind,
                  number: sameKindCount + 1,
                  title: data.title,
                  maxMarks: data.maxMarks,
                  date: data.date,
                  scores: {},
                };
                return {
                  ...sub,
                  assessments: [...curAssessments, newAssess],
                };
              } else {
                return {
                  ...sub,
                  assessments: curAssessments.map((a) =>
                    a.id === data.assessmentId
                      ? {
                          ...a,
                          title: data.title,
                          maxMarks: data.maxMarks,
                          date: data.date,
                        }
                      : a
                  ),
                };
              }
            }),
          };
        }),
      };
    });
    sound.playCompleteChime();
    onShowToast(data.mode === 'add' ? `Added ${data.kind}: "${data.title}"` : `Assessment saved`);
    setAssessmentModal(null);
  };

  const handleDeleteAssessment = (strandId: string, subStrandId: string, assessmentId: string) => {
    sound.playClick(400);
    setTState((prev) => ({
      ...prev,
      strands: (prev.strands || DEFAULT_CBC_STRANDS).map((strand) => {
        if (strand.id !== strandId) return strand;
        return {
          ...strand,
          subStrands: strand.subStrands.map((sub) => {
            if (sub.id !== subStrandId) return sub;
            return {
              ...sub,
              assessments: (sub.assessments || []).filter((a) => a.id !== assessmentId),
            };
          }),
        };
      }),
    }));
    onShowToast('Assessment deleted');
  };

  const handleQuickMarkTaught = (clsKey: string, topic: string) => {
    const newRecord: LessonRecord = {
      date: new Date().toISOString().slice(0, 10),
      stamp: nowStamp(),
      topic,
      status: 'Taught',
      reflection: 'Completed according to 40-minute CBC lesson plan inquiry outcomes.',
    };
    setTState((prev) => {
      const cls = prev.classes[clsKey] || { lessons: [], marks: {}, att: {} };
      return {
        ...prev,
        classes: {
          ...prev.classes,
          [clsKey]: {
            ...cls,
            lessons: [newRecord, ...cls.lessons],
          },
        },
      };
    });
    sound.playCompleteChime();
    onShowToast(`Marked "${topic}" as Taught in Record of Work!`);
  };

  const handleAddGeneratedCAT = (strandId: string, subStrandId: string, cat: FormativeAssessment) => {
    setTState((prev) => {
      const curStrands = prev.strands || DEFAULT_CBC_STRANDS;
      return {
        ...prev,
        strands: curStrands.map((s) => {
          if (s.id !== strandId) return s;
          return {
            ...s,
            subStrands: s.subStrands.map((sub) => {
              if (sub.id !== subStrandId) return sub;
              const curAssessments = sub.assessments || [];
              const sameKindCount = curAssessments.filter((a) => a.kind === 'CAT' || a.type === 'CAT').length;
              const newAssess: AssessmentRecord = {
                id: cat.id || `as_cat_${Date.now()}`,
                strandId,
                subStrandId,
                kind: 'CAT',
                type: 'CAT',
                number: sameKindCount + 1,
                title: cat.title,
                maxMarks: cat.maxMarks,
                date: cat.date || new Date().toISOString().slice(0, 10),
                questionsList: cat.questionsList,
                scores: cat.scores || {},
              };
              return {
                ...sub,
                assessments: [...curAssessments, newAssess],
              };
            }),
          };
        }),
      };
    });
    sound.playCompleteChime();
    onShowToast(`Generated 10-Question CAT "${cat.title}" saved to pipeline & assessment record!`);
  };

  const handleUpdateAssessmentScore = (
    strandId: string,
    subStrandId: string,
    assessmentId: string,
    learnerAdm: string,
    score: number
  ) => {
    setTState((prev) => ({
      ...prev,
      strands: (prev.strands || DEFAULT_CBC_STRANDS).map((strand) => {
        if (strand.id !== strandId) return strand;
        return {
          ...strand,
          subStrands: strand.subStrands.map((sub) => {
            if (sub.id !== subStrandId) return sub;
            return {
              ...sub,
              assessments: (sub.assessments || []).map((assess) => {
                if (assess.id !== assessmentId) return assess;
                return {
                  ...assess,
                  scores: {
                    ...(assess.scores || {}),
                    [learnerAdm]: score,
                  },
                };
              }),
            };
          }),
        };
      }),
    }));
  };

  const handleOverrideRubric = (
    strandId: string,
    subStrandId: string,
    learnerAdm: string,
    rubric: CBCRubric
  ) => {
    sound.playClick(400);
    setTState((prev) => ({
      ...prev,
      strands: (prev.strands || DEFAULT_CBC_STRANDS).map((strand) => {
        if (strand.id !== strandId) return strand;
        return {
          ...strand,
          subStrands: strand.subStrands.map((sub) => {
            if (sub.id !== subStrandId) return sub;
            return {
              ...sub,
              manualOverrides: {
                ...(sub.manualOverrides || {}),
                [learnerAdm]: rubric,
              },
            };
          }),
        };
      }),
    }));
    onShowToast(`Manual rubric rating updated to ${rubric}`);
  };

  const handleSaveInterventionNote = (
    id: string,
    notes: string,
    status: FocusZoneItem['status']
  ) => {
    setTState((prev) => {
      const existingList = prev.focusZoneInterventions || [];
      const idx = existingList.findIndex((item) => item.id === id);
      if (idx >= 0) {
        const copy = [...existingList];
        copy[idx] = { ...copy[idx], notes, status };
        return { ...prev, focusZoneInterventions: copy };
      } else {
        const newItem: FocusZoneItem = {
          id,
          learnerAdm: id.split('_')[1] || '',
          learnerName: '',
          grade: assessGrade,
          stream: '',
          subject: assessSubject,
          strandName: '',
          subStrandName: '',
          rubric: 'ME',
          scorePct: 65,
          reason: 'Targeted teacher intervention',
          notes,
          status,
          dateAdded: nowStamp(),
        };
        return { ...prev, focusZoneInterventions: [...existingList, newItem] };
      }
    });
    onShowToast('Saved remedial intervention notes');
  };

  // Attendance metrics map for Assessment Report
  const attendanceMap = useMemo(() => {
    const map: Record<string, { daysPresent: number; totalDays: number; pct: number; isMarked?: boolean }> = {};
    const learners = learnersInGrade(assessGrade);
    const clsKey = `${assessGrade}|${assessSubject}`;
    const attData = tState.classes[clsKey]?.att || {};
    const dateKeys = Object.keys(attData);

    learners.forEach((l) => {
      if (dateKeys.length > 0) {
        let present = 0;
        dateKeys.forEach((d) => {
          if (attData[d]?.[l.id] !== false) present++;
        });
        const pct = (present / dateKeys.length) * 100;
        map[l.adm] = {
          daysPresent: present,
          totalDays: dateKeys.length,
          pct: Math.round(pct * 10) / 10,
          isMarked: true,
        };
      } else {
        map[l.adm] = {
          daysPresent: 0,
          totalDays: 0,
          pct: 0,
          isMarked: false,
        };
      }
    });
    return map;
  }, [adminData.learners, assessGrade, assessSubject, tState.classes]);

  // Set learner assessment band in Assessment Book (also bridges to cloud CBC marks)
  const handleSetLearnerBand = (clsKey: string, learnerId: string, band: 'EE' | 'ME' | 'AE' | 'BE') => {
    sound.playClick(500);
    const scoreMap = { EE: 85, ME: 70, AE: 50, BE: 35 };
    const markOutOf10Map = { EE: 9, ME: 7, AE: 5, BE: 3 };
    const score = scoreMap[band];
    const m10 = markOutOf10Map[band];

    const [gradeName, subjectName] = clsKey.split('|');
    if (gradeName && subjectName) {
      const gradeData = DATA.grades[gradeName];
      if (gradeData?.terms) {
        const allMarks = { ...getStoredMarks() };
        const norm = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
        const targetSubj = norm(subjectName);
        Object.values(gradeData.terms).forEach((areas) => {
          (areas || []).forEach((area) => {
            if (norm(area.name) === targetSubj || norm(area.name).includes(targetSubj)) {
              area.strands.forEach((st) => {
                const mk = makeMarkKey(learnerId, st.sid);
                allMarks[mk] = {
                  cats: [{ id: 'cat_1', name: 'CAT Evaluation', s: m10, t: 10 }],
                  asg: [{ id: 'asg_1', name: 'Class Assignment', s: m10, t: 10 }],
                };
              });
            }
          });
        });
        saveStoredMarks(allMarks);
      }
    }

    setTState((prev) => {
      const cls = prev.classes[clsKey] || { lessons: [], marks: {}, att: {}, subjectScores: {} };
      const currentScores = cls.subjectScores || {};
      return {
        ...prev,
        classes: {
          ...prev.classes,
          [clsKey]: {
            ...cls,
            subjectScores: {
              ...currentScores,
              [learnerId]: {
                catScore: score,
                asgScore: score,
              },
            },
          },
        },
      };
    });
    onShowToast(`Updated band to ${band}`);
  };

  // Update learner subject score (CAT or Asg)
  const handleUpdateSubjectScore = (
    clsKey: string,
    learnerId: string,
    field: 'catScore' | 'asgScore',
    value: number
  ) => {
    const validVal = Math.max(0, Math.min(100, isNaN(value) ? 0 : value));
    setTState((prev) => {
      const cls = prev.classes[clsKey] || { lessons: [], marks: {}, att: {}, subjectScores: {} };
      const currentScores = cls.subjectScores || {};
      const learnerScore = currentScores[learnerId] || { catScore: 70, asgScore: 70 };
      return {
        ...prev,
        classes: {
          ...prev.classes,
          [clsKey]: {
            ...cls,
            subjectScores: {
              ...currentScores,
              [learnerId]: {
                ...learnerScore,
                [field]: validVal,
              },
            },
          },
        },
      };
    });
  };

  const handleSendAdminMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminMsgSubject.trim() || !adminMsgBody.trim()) {
      onShowToast('Please enter both subject and message for admin');
      return;
    }

    const newNote = {
      id: 'ain_' + Math.random().toString(36).slice(2, 9),
      title: adminMsgSubject.trim(),
      body: adminMsgBody.trim(),
      stamp: nowStamp(),
      unread: false,
    };

    setTState((prev) => ({
      ...prev,
      adminInbox: [newNote, ...prev.adminInbox],
    }));

    sound.playCompleteChime();
    onShowToast('Message transmitted to Administration Office');
    setAdminMsgSubject('');
    setAdminMsgBody('');
    popView();
  };

  // Assessment results calculations
  const calculateResult = (grade: GradeName, subject: string, learnerId: string) => {
    const clsKey = `${grade}|${subject}`;
    const items = tState.assessments.filter((a) => a.cls === clsKey && a.status === 'approved');
    const catItems = items.filter((a) => a.kind === 'CAT');
    const asgItems = items.filter((a) => a.kind === 'Assignment');

    const sumPoints = (list: AssessmentItem[]) => {
      let earned = 0;
      let total = 0;
      let missing = 0;
      list.forEach((item) => {
        const m = (tState.classes[clsKey]?.marks || {})[item.id] || {};
        if (m[learnerId] === undefined || m[learnerId] === null) {
          missing++;
        } else {
          earned += m[learnerId];
          total += item.total;
        }
      });
      return { earned, total, missing, complete: list.length > 0 && missing === 0, pct: total ? (earned / total) * 100 : null };
    };

    const cat = sumPoints(catItems);
    const asg = sumPoints(asgItems);
    const complete = cat.complete && asg.complete;
    const finalPct = complete && cat.pct !== null && asg.pct !== null ? cat.pct * 0.6 + asg.pct * 0.4 : null;

    let band: string | null = null;
    if (finalPct !== null) {
      if (finalPct >= 80) band = 'EE';
      else if (finalPct >= 60) band = 'ME';
      else if (finalPct >= 40) band = 'AE';
      else band = 'BE';
    }

    return { cat, asg, complete, finalPct, band };
  };

  const isDark = tState.theme === 'dark';
  const topView = stack[stack.length - 1];

  return (
    <div
      className={`relative w-full h-full flex flex-col overflow-hidden text-sm ${
        isDark ? 'bg-[#0A0F1F] text-[#EEF2FF]' : 'bg-[#EEF2FA] text-[#0F1B33]'
      }`}
    >
      {/* HEADER */}
      <header className="w-full max-w-full overflow-hidden bg-gradient-to-r from-[#0A1F4D] to-[#1A3A8F] text-white p-3 sm:p-3.5 pb-3.5 rounded-b-[26px] shadow-lg shrink-0 z-20">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {/* Back button */}
          {(stack.length > 0 || tState.tab !== 'home') && (
            <button
              onClick={() => {
                if (stack.length > 0) popView();
                else setTState((prev) => ({ ...prev, tab: 'home' }));
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center font-bold text-base cursor-pointer shrink-0 transition-colors"
              aria-label="Back"
            >
              ←
            </button>
          )}

          {/* School Crest */}
          <img
            src="/images/lra_crest.jpg"
            alt="Little Roses Academy Crest"
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-pink-200 bg-white object-cover shrink-0 shadow-sm"
          />

          {/* Title & Teacher Subtitle */}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-base font-extrabold truncate leading-tight">
              {topView ? topView.title : (() => {
                const h = new Date().getHours();
                const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
                const emoji = h < 12 ? '☀️' : h < 17 ? '⛅' : '🌙';
                return `${greeting}, Tr. ${teacher?.name || 'Mwalimu'} ${emoji}`;
              })()}
            </h1>
            <p className="text-[11px] text-[#C7D7FF] truncate font-medium mt-0.5">
              {topView
                ? `${teacher?.name || 'Teacher'} · Little Roses Faculty`
                : `${(teacher?.subjects || []).join(' & ') || 'Faculty'} · Grades ${(teacher?.grades || []).join(', ').replace(/Grade /g, 'G') || '1–6'}`}
            </p>
          </div>

          {/* Single Scoped Teacher Notification Bell */}
          <button
            type="button"
            onClick={() => {
              sound.playClick(520);
              window.dispatchEvent(
                new CustomEvent('lra-open-notification-setup', {
                  detail: {
                    portalId: 'teachers',
                    userId: teacher?.id,
                    userName: teacher?.name || 'Teacher',
                    subjects: teacher?.subjects,
                    initialView: 'inbox',
                  },
                })
              );
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-sm relative shrink-0 cursor-pointer transition-colors"
            title="Teacher Notifications & Inbox"
            aria-label="Open Teacher Notifications"
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center px-1 border-2 border-[#0A1F4D]">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Secondary Header Row: Term Pill, Switch Faculty & Theme Toggle */}
        <div className="flex flex-wrap items-center justify-between mt-2.5 pt-2 border-t border-white/10 gap-1.5 text-xs min-w-0">
          <span className="text-[11px] font-extrabold bg-white/15 px-2.5 sm:px-3 py-1 rounded-full text-white tracking-wide truncate min-w-0 max-w-[54%]">
            {currentTerm ? `Active: ${currentTerm}` : 'Term dates not set'}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Switch Teacher Profile Button */}
            {adminData.teachers.length > 1 && (
              <button
                onClick={() => setShowSwitchTeacherModal(true)}
                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white cursor-pointer whitespace-nowrap"
              >
                Switch ▾
              </button>
            )}

            {/* Theme Toggle */}
            <div className="flex bg-white/15 rounded-full p-0.5">
              <button
                onClick={() => handleToggleTheme('light')}
                className={`px-1.5 sm:px-2.5 py-0.5 rounded-full text-xs transition-colors cursor-pointer ${
                  !isDark ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-white/80'
                }`}
              >
                ☀️
              </button>
              <button
                onClick={() => handleToggleTheme('dark')}
                className={`px-1.5 sm:px-2.5 py-0.5 rounded-full text-xs transition-colors cursor-pointer ${
                  isDark ? 'bg-slate-900 text-white font-bold shadow-xs' : 'text-white/80'
                }`}
              >
                🌙
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN VIEWPORT CONTAINER */}
      <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-3.5 pb-4">
        {/* SUBVIEW STACK RENDERING */}
        {topView ? (
          <div>
            {/* 1. ELSIE AI */}
            {topView.view === 'elsie' && (
              <div className="h-[calc(100dvh-250px)] min-h-[420px] max-h-[640px] rounded-2xl overflow-hidden border shadow-sm">
                <ElsieChatView
                  identity={teacherIdentity}
                  onClose={popView}
                  quickPrompts={[
                    'Draft CBC 40-minute lesson plan',
                    'Draft CAT test paper (10 marks)',
                    'Which Senior School Pathways match my subjects?',
                    'Explain Focus Zone remediation strategy',
                    'Habari za asubuhi',
                  ]}
                  theme={isDark ? 'dark' : 'light'}
                />
              </div>
            )}
            {/* 2. Message Admin */}
            {topView.view === 'admin_msg' && (
              <div className="space-y-4 animate-fade-in">
                <div
                  className={`p-4 rounded-2xl border shadow-sm ${
                    isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                  }`}
                >
                  <h3 className="text-base font-black text-amber-500 mb-1">
                    Send Note to School Office
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Official faculty note to the Chief Administrator. Appears directly in the office portal.
                  </p>

                  <form onSubmit={handleSendAdminMessage} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">
                        Subject Line
                      </label>
                      <input
                        type="text"
                        value={adminMsgSubject}
                        onChange={(e) => setAdminMsgSubject(e.target.value)}
                        placeholder="e.g. Science Laboratory Materials Request"
                        className={`w-full p-2.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                          isDark
                            ? 'bg-black/40 border-white/15 text-white'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">
                        Message Body
                      </label>
                      <textarea
                        value={adminMsgBody}
                        onChange={(e) => setAdminMsgBody(e.target.value)}
                        placeholder="State your administrative or teaching request in detail…"
                        rows={5}
                        className={`w-full p-2.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                          isDark
                            ? 'bg-black/40 border-white/15 text-white'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                        required
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={popView}
                        className="flex-1 py-2.5 text-xs font-bold rounded-xl border border-white/15 hover:bg-white/10 text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 text-xs font-black rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md transition-all cursor-pointer"
                      >
                        Send to Admin →
                      </button>
                    </div>
                  </form>
                </div>

                {/* Previously sent notes */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
                    Previous Notes Sent ({tState.adminInbox.length})
                  </h4>
                  {tState.adminInbox.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-2xl border text-xs shadow-xs ${
                        isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span className="text-white">{n.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{n.stamp}</span>
                      </div>
                      <p className="text-slate-300 text-[11.5px] leading-relaxed">{n.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Record of Work */}
            {topView.view === 'record' && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black">Record of Work</h2>
                    <p className="text-xs text-slate-400">{topView.payload.replace('|', ' · ')}</p>
                  </div>
                  <button
                    onClick={() => setShowMarkTaughtModal(topView.payload)}
                    className="py-1.5 px-3 rounded-xl text-xs font-bold bg-[#16A34A] text-white shadow-xs cursor-pointer"
                  >
                    ＋ Add Lesson
                  </button>
                </div>

                <div className="space-y-2 mt-2">
                  {(tState.classes[topView.payload]?.lessons || []).length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-400">
                      No lessons recorded yet for this class. Tap "Add Lesson" above to log taught topics.
                    </div>
                  ) : (
                    (tState.classes[topView.payload]?.lessons || []).map((l, i) => (
                      <div
                        key={i}
                        className={`p-3.5 rounded-2xl border text-xs shadow-xs ${
                          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-extrabold text-sm">{l.topic}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              l.status === 'Taught'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : l.status === 'Partly taught'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {l.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mb-1 font-mono">
                          {l.stamp || l.date}
                        </div>
                        {l.reflection && (
                          <div className="p-2 rounded-xl bg-black/20 text-slate-300 text-[11px] italic mt-1 border border-white/5">
                            "{l.reflection}"
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 4. Attendance Roll Call */}
            {topView.view === 'attendance' && (
              <div className="space-y-3 animate-fade-in">
                {(() => {
                  const grade = topView.payload.split('|')[0] as GradeName;
                  const list = learnersInGrade(grade);
                  const todayKey = new Date().toISOString().slice(0, 10);
                  const att = (tState.classes[topView.payload]?.att || {})[todayKey] || {};
                  const presentCount = list.filter((l) => att[l.id] !== false).length;

                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-base font-black">Daily Attendance</h2>
                          <p className="text-xs text-slate-400">
                            {topView.payload.replace('|', ' · ')} · {todayKey}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30">
                          {presentCount} of {list.length} Present
                        </span>
                      </div>

                      <div className="space-y-1.5 mt-2">
                        {list.length === 0 ? (
                          <div className="text-center py-10 text-xs text-slate-400">
                            No learners enrolled in {grade} yet.
                          </div>
                        ) : (
                          list.map((l) => {
                            const isPresent = att[l.id] !== false;
                            return (
                              <div
                                key={l.id}
                                onClick={() => handleToggleAttendance(topView.payload, l.id)}
                                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                                  isDark
                                    ? 'bg-[#141C33] border-white/10 hover:border-white/25'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div>
                                  <div className="font-bold text-xs">{l.name}</div>
                                  <div className="text-[11px] text-slate-400 font-mono">
                                    {l.adm}
                                  </div>
                                </div>
                                <span
                                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                                    isPresent
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  }`}
                                >
                                  {isPresent ? '✓ Present' : '✕ Absent'}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* 5. Class Learners List */}
            {topView.view === 'learners' && (
              <div className="space-y-3 animate-fade-in">
                {(() => {
                  const grade = topView.payload as GradeName;
                  const list = learnersInGrade(grade);
                  return (
                    <>
                      <div>
                        <h2 className="text-base font-black">{grade} Class Register</h2>
                        <p className="text-xs text-slate-400">
                          {list.length} learner(s) officially enrolled by school administration
                        </p>
                      </div>

                      <div className="space-y-1.5 mt-2">
                        {list.map((l) => (
                          <div
                            key={l.id}
                            className={`p-3 rounded-2xl border flex items-center gap-3 ${
                              isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-xs shrink-0"
                              style={{ backgroundColor: GRADE_COLORS[grade] || '#7C3AED' }}
                            >
                              {l.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-xs truncate">{l.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                {l.adm}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                              CBC Primary
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* 6. Enter Marks View */}
            {topView.view === 'marks' && (
              <div className="space-y-3 animate-fade-in">
                {(() => {
                  const assessId = topView.payload as string;
                  const item = tState.assessments.find((a) => a.id === assessId);
                  if (!item) return <div className="text-xs text-slate-400">Assessment not found.</div>;

                  const parts = item.cls.split('|');
                  const grade = parts[0] as GradeName;
                  const list = learnersInGrade(grade);
                  const marks = (tState.classes[item.cls]?.marks || {})[item.id] || {};

                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-base font-black">{item.title}</h2>
                          <p className="text-xs text-slate-400">
                            {item.cls.replace('|', ' · ')} · Total: {item.total} marks
                          </p>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-purple-600 text-white shadow-xs">
                          {item.kind}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11.5px] text-blue-200">
                        Enter score out of {item.total} for each learner. Marks save locally on your device and sync when online.
                      </div>

                      <div className="space-y-1.5 mt-2">
                        {list.map((l) => (
                          <div
                            key={l.id}
                            className={`p-3 rounded-2xl border flex items-center justify-between ${
                              isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div>
                              <div className="font-bold text-xs">{l.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{l.adm}</div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                max={item.total}
                                value={marks[l.id] ?? ''}
                                onChange={(e) =>
                                  handleSaveLearnerMark(item.cls, item.id, l.id, e.target.value)
                                }
                                placeholder="—"
                                className={`w-16 p-2 text-center rounded-xl font-bold text-xs border ${
                                  isDark
                                    ? 'bg-black/40 border-white/20 text-white'
                                    : 'bg-slate-100 border-slate-300 text-slate-900'
                                }`}
                              />
                              <span className="text-xs text-slate-400">/ {item.total}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* 7. Answer Key View */}
            {topView.view === 'answer_key' && (
              <div className="space-y-3 animate-fade-in">
                {(() => {
                  const assessId = topView.payload as string;
                  const item = tState.assessments.find((a) => a.id === assessId);
                  if (!item) return <div className="text-xs text-slate-400">Item not found.</div>;

                  return (
                    <div
                      className={`p-4 rounded-2xl border shadow-sm ${
                        isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                      }`}
                    >
                      <h2 className="text-base font-black mb-1">{item.title}</h2>
                      <p className="text-xs text-slate-400 mb-3">
                        Answer Key & Marking Guide · {item.questions} questions ({item.marksEach} marks each)
                      </p>

                      <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 space-y-2 mb-3">
                        <div className="font-bold text-purple-300">
                          Teacher Verified Marking Rubric
                        </div>
                        <p className="text-[11px] text-purple-200/90 leading-relaxed">
                          Questions and model answers are generated in accordance with KICD curriculum strands. You check every answer before publishing to learners.
                        </p>
                      </div>

                      <div className="space-y-2 text-xs">
                        {Array.from({ length: item.questions }).map((_, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-xl bg-black/20 border border-white/5 space-y-1"
                          >
                            <div className="font-bold text-white flex justify-between">
                              <span>Question {i + 1}:</span>
                              <span className="text-amber-400 font-mono">[{item.marksEach} mk]</span>
                            </div>
                            <p className="text-slate-300 text-[11px]">
                              Learner identifies correct CBC concept for sub-strand competency.
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 8. Reports Views (Grade -> Learner -> Report / Assessment Book) */}
            {topView.view === 'reports_root' && (
              <div className="space-y-3 animate-fade-in">
                <div>
                  <h2 className="text-base font-black">Assessment Progress Reports</h2>
                  <p className="text-xs text-slate-400">Choose a grade to view learners</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {teacher.grades.map((g: GradeName) => (
                    <div
                      key={g}
                      onClick={() => pushView('reports_grade', `${g} Learners`, g)}
                      className="p-4 rounded-2xl text-white shadow-sm cursor-pointer hover:scale-[1.02] transition-transform"
                      style={{ backgroundColor: GRADE_COLORS[g] || '#7C3AED' }}
                    >
                      <div className="text-2xl mb-1">🎒</div>
                      <div className="font-black text-sm">{g}</div>
                      <div className="text-[10px] text-white/80 mt-0.5">
                        {learnersInGrade(g).length} enrolled learner(s)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {topView.view === 'reports_grade' && (
              <div className="space-y-3 animate-fade-in">
                {(() => {
                  const g = topView.payload as GradeName;
                  const list = learnersInGrade(g);
                  return (
                    <>
                      <div>
                        <h2 className="text-base font-black">{g} Progress Folders</h2>
                        <p className="text-xs text-slate-400">Select learner to inspect reports</p>
                      </div>
                      <div className="space-y-1.5 mt-2">
                        {list.map((l) => (
                          <div
                            key={l.id}
                            onClick={() =>
                              pushView('reports_learner', l.name, { grade: g, learner: l })
                            }
                            className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-transform ${
                              isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-xs shrink-0"
                                style={{ backgroundColor: GRADE_COLORS[g] || '#7C3AED' }}
                              >
                                {l.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-xs">{l.name}</div>
                                <div className="text-[11px] text-slate-400 font-mono">{l.adm}</div>
                              </div>
                            </div>
                            <span className="text-xs text-purple-400 font-bold">Inspect ›</span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {topView.view === 'reports_learner' && (
              <div className="space-y-3 animate-fade-in">
                {(() => {
                  const { grade, learner } = topView.payload as { grade: GradeName; learner: Learner };
                  return (
                    <>
                      <div
                        className={`p-4 rounded-2xl border ${
                          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                        }`}
                      >
                        <h2 className="text-base font-black text-white">{learner.name}</h2>
                        <p className="text-xs text-slate-400">
                          {learner.adm} · {grade}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5">
                        <div
                          onClick={() =>
                            pushView('assessment_book', 'Assessment Book', { grade, learner })
                          }
                          className="p-4 rounded-2xl text-white shadow-md cursor-pointer bg-gradient-to-r from-amber-600 to-amber-500 hover:scale-[1.01] transition-transform"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-black text-sm">Official Assessment Book</div>
                              <div className="text-[10px] text-amber-100/90 mt-0.5">
                                Golden cover · Competency bands (EE, ME, AE, BE)
                              </div>
                            </div>
                            <span className="text-2xl">📖</span>
                          </div>
                        </div>

                        <div
                          onClick={() =>
                            pushView('assessment_report', 'Assessment Report', { grade, learner })
                          }
                          className="p-4 rounded-2xl text-white shadow-md cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.01] transition-transform"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-black text-sm">Detailed Assessment Report</div>
                              <div className="text-[10px] text-blue-100/90 mt-0.5">
                                All CATs & assignments with 60% / 40% math calculation
                              </div>
                            </div>
                            <span className="text-2xl">📊</span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* 9. Official Assessment Book (Approved Golden Cover & Competency Bands) */}
            {topView.view === 'assessment_book' && (
              <div className="space-y-4 animate-fade-in">
                {(() => {
                  const { grade, learner } = topView.payload as { grade: GradeName; learner: Learner };
                  return (
                    <>
                      {/* Approved Golden Cover */}
                      <div className="bg-gradient-to-b from-[#0B1B3F] to-[#132A6B] rounded-3xl p-5 text-[#F5EBD0] shadow-xl border border-[#1E3A8A] text-center space-y-3">
                        <img
                          src="/images/lra_crest.jpg"
                          alt="School Crest"
                          className="w-20 h-20 rounded-full border-2 border-[#C9A54A] mx-auto bg-white object-cover"
                        />
                        <div>
                          <div className="text-sm font-black tracking-[4px] text-[#E9C46A]">
                            LITTLE ROSES ACADEMY
                          </div>
                          <div className="text-[10px] font-bold tracking-[6px] text-[#C9B68A] mt-0.5">
                            NAKURU
                          </div>
                        </div>

                        <div className="h-px bg-[#C9A54A] my-2" />

                        <div>
                          <h2 className="text-xl font-light tracking-[3px] text-[#E9C46A]">
                            ASSESSMENT BOOK
                          </h2>
                          <p className="text-[11px] text-[#C9D4EE] italic">
                            Competency-Based Assessment Record
                          </p>
                        </div>

                        <div className="flex gap-3 text-left pt-2 border-t border-[#C9A54A]/40 text-xs">
                          {/* Passport photo placeholder */}
                          <div className="w-20 h-24 border-1.5 border-dashed border-[#C9A54A] rounded-xl flex flex-col items-center justify-center text-[#C9B68A] text-[9px] shrink-0">
                            <span className="text-2xl mb-1 opacity-70">👤</span>
                            <span>PHOTO</span>
                          </div>

                          <div className="flex-1 space-y-1.5">
                            <div>
                              <div className="text-[9px] uppercase tracking-wider text-[#C9B68A]">
                                Learner Name
                              </div>
                              <div className="font-bold text-white border-b border-dotted border-[#C9A54A] pb-0.5">
                                {learner.name}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] uppercase tracking-wider text-[#C9B68A]">
                                Admission Number
                              </div>
                              <div className="font-mono text-white border-b border-dotted border-[#C9A54A] pb-0.5">
                                {learner.adm}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] uppercase tracking-wider text-[#C9B68A]">
                                Grade / Class
                              </div>
                              <div className="font-bold text-white border-b border-dotted border-[#C9A54A] pb-0.5">
                                {grade}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] uppercase tracking-wider text-[#C9B68A]">
                                Class Teacher
                              </div>
                              <div className="font-bold text-white border-b border-dotted border-[#C9A54A] pb-0.5">
                                {teacher.name}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="h-px bg-[#C9A54A] my-2" />
                        <div className="text-[11px] font-black tracking-[4px] text-[#E9C46A]">
                          MUCH FROM LITTLE
                        </div>
                        <div className="text-[9px] font-semibold tracking-[4px] text-[#C9B68A]">
                          LEARN • THINK • GROW
                        </div>
                      </div>

                      {/* Subject Competency Bands */}
                      <div className="space-y-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
                          Evaluated Subject Levels ({teacher.subjects.length})
                        </h3>
                        {teacher.subjects.map((sub: string) => {
                          const res = calculateResult(grade, sub, learner.id);
                          const band = res.band || 'ME';
                          const color = BAND_COLORS[band] || '#2563EB';
                          const name = BAND_NAMES[band] || 'Meeting Expectations';

                          return (
                            <div
                              key={sub}
                              className={`p-3 rounded-2xl border flex items-center justify-between ${
                                isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                              }`}
                            >
                              <div>
                                <div className="font-bold text-xs">{sub}</div>
                                <div className="text-[11px] text-slate-400 mt-0.5">{name}</div>
                              </div>
                              <span
                                className="w-12 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-xs"
                                style={{ backgroundColor: color }}
                              >
                                {band}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* 10. Detailed Assessment Report (60% CAT / 40% Assignments) */}
            {topView.view === 'assessment_report' && (
              <div className="space-y-3 animate-fade-in">
                {(() => {
                  const { grade, learner } = topView.payload as { grade: GradeName; learner: Learner };
                  return (
                    <>
                      <div
                        className={`p-3.5 rounded-2xl border ${
                          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                        }`}
                      >
                        <h2 className="text-sm font-black">{learner.name} · Assessment Report</h2>
                        <p className="text-[11px] text-slate-400">
                          {learner.adm} · {grade} · 60% CATs + 40% Assignments Weighting
                        </p>
                      </div>

                      <div className="space-y-3">
                        {teacher.subjects.map((sub: string) => {
                          const res = calculateResult(grade, sub, learner.id);
                          return (
                            <div
                              key={sub}
                              className={`p-3.5 rounded-2xl border space-y-2 ${
                                isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-white">{sub}</span>
                                {res.finalPct !== null ? (
                                  <span className="text-xs font-black text-emerald-400 font-mono">
                                    {res.finalPct.toFixed(1)}% ({res.band})
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-amber-400 font-bold">
                                    Incomplete
                                  </span>
                                )}
                              </div>

                              <div className="text-[11px] text-slate-400 font-mono space-y-1 pt-1 border-t border-white/5">
                                <div>
                                  • CAT component (60%):{' '}
                                  {res.cat.pct !== null
                                    ? `${res.cat.pct.toFixed(1)}% × 0.60 = ${(res.cat.pct * 0.6).toFixed(1)} pts`
                                    : 'Awaiting CAT marks'}
                                </div>
                                <div>
                                  • Assignment component (40%):{' '}
                                  {res.asg.pct !== null
                                    ? `${res.asg.pct.toFixed(1)}% × 0.40 = ${(res.asg.pct * 0.4).toFixed(1)} pts`
                                    : 'Awaiting Assignment marks'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        ) : (
          /* PRIMARY 5 TABS */
          <>
            {/* TAB 1: HOME */}
            {tState.tab === 'home' && (
              <div className="space-y-4 animate-fade-in">
                {/* 4 Stat Tiles */}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="p-3.5 rounded-2xl shadow-sm text-slate-900 border border-blue-200"
                    style={{ backgroundColor: '#DBE7FF' }}
                  >
                    <div className="text-xs font-extrabold text-blue-700 uppercase tracking-wider">
                      Today's Classes
                    </div>
                    <div className="text-2xl font-black text-blue-950 mt-1">
                      {todayLessons.length}
                    </div>
                    <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                      {todayDayName ? `${todayDayName} schedule` : 'No lessons on weekend'}
                    </div>
                  </div>

                  <div
                    className="p-3.5 rounded-2xl shadow-sm text-slate-900 border border-emerald-200"
                    style={{ backgroundColor: '#DCFCE7' }}
                  >
                    <div className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider">
                      My Classes
                    </div>
                    <div className="text-2xl font-black text-emerald-950 mt-1">
                      {myClasses.length}
                    </div>
                    <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                      Assigned subject classes
                    </div>
                  </div>

                  <div
                    className="p-3.5 rounded-2xl shadow-sm text-slate-900 border border-amber-200"
                    style={{ backgroundColor: '#FEF3C7' }}
                  >
                    <div className="text-xs font-extrabold text-amber-800 uppercase tracking-wider">
                      Drafts to Review
                    </div>
                    <div className="text-2xl font-black text-amber-950 mt-1">
                      {tState.assessments.filter((a) => a.status === 'draft').length}
                    </div>
                    <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                      Pending your approval
                    </div>
                  </div>

                  <div
                    className="p-3.5 rounded-2xl shadow-sm text-slate-900 border border-purple-200"
                    style={{ backgroundColor: '#EDE9FE' }}
                  >
                    <div className="text-xs font-extrabold text-purple-700 uppercase tracking-wider">
                      Enrolled Learners
                    </div>
                    <div className="text-2xl font-black text-purple-950 mt-1">
                      {myClasses.reduce((acc, c) => acc + learnersInGrade(c.grade).length, 0)}
                    </div>
                    <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                      Across your classes
                    </div>
                  </div>
                </div>

                {/* Today's Lessons on Bell Schedule */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-extrabold">Today's Teaching Schedule</h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                      40-minute periods
                    </span>
                  </div>

                  {todayLessons.length === 0 ? (
                    <div
                      className={`p-4 rounded-2xl border text-center text-xs text-slate-400 ${
                        isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                      }`}
                    >
                      {todayDayName
                        ? 'No lessons scheduled for you today.'
                        : 'Weekend · Little Roses Academy is closed.'}
                    </div>
                  ) : (
                    todayLessons.map((l, i) => {
                      const todayIso = new Date().toISOString().slice(0, 10);
                      const isMarkedToday = (teacher?.taughtLessons || []).some(
                        (log: TaughtLessonLog) =>
                          log.date === todayIso &&
                          log.grade === l.grade &&
                          log.subject.toLowerCase() === l.subject.toLowerCase() &&
                          (!log.slotKey || log.slotKey === l.k) &&
                          log.status !== 'Not taught'
                      );
                      return (
                        <div
                          key={i}
                          className={`p-3 rounded-2xl border flex items-center gap-3 ${
                            isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0"
                            style={{ backgroundColor: GRADE_COLORS[l.grade] || '#7C3AED' }}
                          >
                            L{l.lesson}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-xs truncate">
                              {l.grade} · {l.subject}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">{l.time}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              sound.playClick(520);
                              setPendingSlotMeta({ day: todayDayName || undefined, slotKey: l.k });
                              setMarkTaughtStatus('Taught');
                              setShowMarkTaughtModal(`${l.grade}|${l.subject}`);
                            }}
                            className={`text-[10px] font-bold px-2.5 py-1.5 rounded-xl border cursor-pointer shrink-0 transition-colors ${
                              isMarkedToday
                                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                                : 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border-blue-500/30'
                            }`}
                          >
                            {isMarkedToday ? '✓ Taught' : '✓ Mark Taught'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 3 Interactive Action Tiles */}
                <div className="space-y-2">
                  <h3 className="text-sm font-extrabold px-1">🤖 Faculty Copilot & Services</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Ask Elsie AI */}
                    <div
                      onClick={() => pushView('elsie', '🤖 Elsie · Faculty Copilot')}
                      className="p-4 rounded-2xl text-white shadow-md cursor-pointer hover:scale-[1.02] transition-transform col-span-2 bg-gradient-to-r from-[#075E54] via-[#128C7E] to-[#25D366]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-2xl mb-1">🤖 ✨</div>
                        <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-100 font-bold border border-emerald-500/30">
                          🟢 Online · 24-hr session
                        </span>
                      </div>
                      <div className="font-black text-sm">🤖 Elsie AI · Faculty Assistant</div>
                      <div className="text-[10.5px] text-white/90 mt-0.5">
                        ✨ Lesson plans, CAT test drafts, learner assessment lookup & CBC guidance
                      </div>
                    </div>



                    {/* Message Admin */}
                    <div
                      onClick={() => pushView('admin_msg', 'Message Admin')}
                      className="p-4 rounded-2xl text-white shadow-md cursor-pointer hover:scale-[1.02] transition-transform bg-gradient-to-r from-[#F59E0B] to-[#FBBF24]"
                    >
                      <div className="text-2xl mb-1">✉️</div>
                      <div className="font-black text-sm">Message Admin</div>
                      <div className="text-[10.5px] text-white/90 mt-0.5">
                        Notes & requests to the office
                      </div>
                    </div>

                    {/* Reports */}
                    <div
                      onClick={() => pushView('reports_root', 'Reports')}
                      className="p-4 rounded-2xl text-white shadow-md cursor-pointer hover:scale-[1.02] transition-transform bg-gradient-to-r from-[#14B8A6] to-[#5EEAD4]"
                    >
                      <div className="text-2xl mb-1">📊</div>
                      <div className="font-black text-sm">Progress Reports</div>
                      <div className="text-[10.5px] text-white/90 mt-0.5">
                        60/40 scores & Assessment Book
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: MY CLASSES */}
            {tState.tab === 'classes' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h2 className="text-base font-black">My Teaching Classes</h2>
                  <p className="text-xs text-slate-400">
                    Assigned grades and subjects allocated by school administration
                  </p>
                </div>

                {myClasses.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400">
                    No classes assigned yet. Contact administration to assign timetable slots.
                  </div>
                ) : (
                  myClasses.map((c) => {
                    const clsKey = `${c.grade}|${c.subject}`;
                    const n = learnersInGrade(c.grade).length;
                    const rec = tState.classes[clsKey] || { lessons: [] };
                    const taught = rec.lessons.filter((l) => l.status === 'Taught').length;

                    return (
                      <div
                        key={clsKey}
                        className={`rounded-3xl border overflow-hidden shadow-sm ${
                          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                        }`}
                      >
                        {/* Class Header Banner */}
                        <div
                          className="p-4 text-white"
                          style={{
                            background: `linear-gradient(135deg, ${GRADE_COLORS[c.grade] || '#7C3AED'}, #EC4899)`,
                          }}
                        >
                          <div className="font-black text-base">{c.grade} {c.subject}</div>
                          <div className="text-[11px] text-white/90 mt-0.5">
                            👥 {n} learner(s) · {taught} lesson(s) marked taught
                          </div>
                        </div>

                        {/* 4 Quick Action Tiles per Class */}
                        <div className="grid grid-cols-4 gap-1.5 p-3 text-center text-xs">
                          <button
                            onClick={() => pushView('learners', `${c.grade} Learners`, c.grade)}
                            className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80"
                          >
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-lg shadow-xs">
                              👥
                            </div>
                            <span className="text-[10px] font-bold">Learners</span>
                          </button>

                          <button
                            onClick={() => pushView('attendance', 'Roll Call', clsKey)}
                            className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80"
                          >
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg shadow-xs">
                              ✅
                            </div>
                            <span className="text-[10px] font-bold">Attendance</span>
                          </button>

                          <button
                            onClick={() => {
                              sound.playClick(500);
                              setAssessGrade(c.grade);
                              setAssessSubject(c.subject);
                              setAssessMode('report');
                              setTState((prev) => ({ ...prev, tab: 'assessment' }));
                            }}
                            className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80"
                            title="Open Assessment Report for this class"
                          >
                            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-lg shadow-xs">
                              📊
                            </div>
                            <span className="text-[10px] font-bold">Report</span>
                          </button>

                          <button
                            onClick={() => {
                              sound.playClick(500);
                              setAssessGrade(c.grade);
                              setAssessSubject(c.subject);
                              setAssessMode('book');
                              setTState((prev) => ({ ...prev, tab: 'assessment' }));
                            }}
                            className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80"
                            title="Open CBC Assessment Book for this class"
                          >
                            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-lg shadow-xs">
                              📘
                            </div>
                            <span className="text-[10px] font-bold">Assess Book</span>
                          </button>
                        </div>

                        {/* Actions: Mark Taught & Record of Work */}
                        <div className="p-3 pt-0 flex gap-2">
                          <button
                            onClick={() => setShowMarkTaughtModal(clsKey)}
                            className="flex-1 py-2 px-3 rounded-xl font-black text-xs bg-[#F5B301] hover:bg-amber-400 text-slate-950 shadow-xs cursor-pointer transition-colors"
                          >
                            ✓ Mark Taught
                          </button>
                          <button
                            onClick={() => pushView('record', 'Record of Work', clsKey)}
                            className="flex-1 py-2 px-3 rounded-xl font-bold text-xs border border-purple-500/30 text-purple-600 dark:text-purple-300 hover:bg-purple-500/10 cursor-pointer transition-colors"
                          >
                            Record of Work ({taught})
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 3: TIMETABLE */}
            {tState.tab === 'timetable' && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-base font-black">CBC Teaching Timetable</h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        ⚡ Live Synced
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Synchronized with School Administration · 40-minute bell periods (8:20 – 3:00)
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="inline-block text-[11px] font-black px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-200 border border-purple-500/30">
                      {Object.values(adminData.timetable || {}).filter((c: any) => c && c.teacherId === teacher.id).length} Lessons Scheduled
                    </span>
                  </div>
                </div>

                {/* View Mode Pills */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                  <button
                    onClick={() => {
                      sound.playClick(450);
                      setTeacherTimetableView('my');
                    }}
                    className={`py-1.5 px-3 rounded-full text-xs font-black shrink-0 transition-all cursor-pointer ${
                      teacherTimetableView === 'my'
                        ? 'bg-[#7C3AED] text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    👤 My Schedule ({teacher.name.split(' ')[1] || teacher.name})
                  </button>
                  {['All', ...GRADES].map((g) => {
                    const isSel = teacherTimetableView === g;
                    return (
                      <button
                        key={g}
                        onClick={() => {
                          sound.playClick(450);
                          setTeacherTimetableView(g);
                        }}
                        className={`py-1.5 px-3 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                          isSel
                            ? 'text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-white'
                        }`}
                        style={{
                          backgroundColor: isSel
                            ? g === 'All'
                              ? '#0A1F4D'
                              : GRADE_COLORS[g as GradeName]
                            : undefined,
                        }}
                      >
                        {g === 'All' ? 'Master Timetable' : g.replace('Grade ', 'G')}
                      </button>
                    );
                  })}
                </div>

                {/* Exam Freeze Warning if Active */}
                {adminData.freeze && (
                  <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs animate-fade-in">
                    <div className="font-extrabold flex items-center gap-1.5 mb-0.5">
                      <span>❄️</span>
                      <span>Active Timetable Freeze ({adminData.freeze.why})</span>
                    </div>
                    <div>
                      Locked from {adminData.freeze.from} to {adminData.freeze.to}. Normal classroom lessons are paused for examination week.
                    </div>
                  </div>
                )}

                {/* Timetable Table Grid */}
                <div
                  className={`rounded-2xl border overflow-x-auto shadow-sm ${
                    isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                  }`}
                >
                  <table className="w-full text-[10px] text-left border-collapse min-w-[420px]">
                    <thead>
                      <tr className="bg-[#0A1F4D] text-white">
                        <th className="p-2 border-b border-white/10 font-bold w-20">Time</th>
                        {DAYS.map((d, i) => {
                          const isToday = todayDayName === d;
                          return (
                            <th
                              key={d}
                              className={`p-2 border-b border-white/10 font-black text-center ${
                                isToday ? 'bg-indigo-600/40 text-amber-300' : ''
                              }`}
                              style={{ color: isToday ? '#FDE047' : PALETTE[i % PALETTE.length] }}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span>{d}</span>
                                {isToday && (
                                  <span className="text-[8px] bg-amber-400 text-slate-950 px-1 rounded-sm font-black">
                                    TODAY
                                  </span>
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {activeBells.map((slot: any) => {
                        if (slot.brk) {
                          return (
                            <tr key={slot.k} className="bg-amber-500/10 text-amber-300 text-center font-bold">
                              <td colSpan={6} className="p-1">
                                {slot.brk} · {slot.t}
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={slot.k} className="border-t border-white/5 align-top">
                            <td className="p-1.5 font-bold whitespace-nowrap text-[9px] text-slate-400 bg-black/10">
                              <div className="font-extrabold text-slate-200">{slot.t}</div>
                              <div className="text-[8px] text-slate-400">Lesson {slot.lesson}</div>
                            </td>
                            {DAYS.map((day) => {
                              const isToday = todayDayName === day;

                              // Collect cells for this day/slot based on filter
                              const cells: { grade: GradeName; subject: string; teacherId: string; isMine: boolean }[] = [];

                              const gradesToInspect =
                                teacherTimetableView === 'my' || teacherTimetableView === 'All'
                                  ? GRADES
                                  : [teacherTimetableView as GradeName];

                              gradesToInspect.forEach((g) => {
                                if (slot.lesson === 7 && LOWER_GRADES.includes(g)) return;
                                const key = `${day}|${slot.k}|${g}`;
                                const cell = adminData.timetable[key];
                                if (!cell) return;

                                const isMine = cell.teacherId === teacher.id;
                                if (teacherTimetableView === 'my') {
                                  if (isMine) {
                                    cells.push({ grade: g, subject: cell.subject, teacherId: cell.teacherId, isMine });
                                  }
                                } else {
                                  cells.push({ grade: g, subject: cell.subject, teacherId: cell.teacherId, isMine });
                                }
                              });

                              return (
                                <td
                                  key={day}
                                  className={`p-1 border-r border-white/5 align-top ${
                                    isToday ? 'bg-indigo-950/20' : ''
                                  }`}
                                >
                                  {cells.length === 0 ? (
                                    teacherTimetableView === 'my' ? (
                                      <div className="text-[8px] text-slate-500 text-center py-2 italic opacity-60">
                                        — Free —
                                      </div>
                                    ) : null
                                  ) : (
                                    <div className="space-y-1">
                                      {cells.map((c, idx) => {
                                        const teacherObj = adminData.teachers.find((t: Teacher) => t.id === c.teacherId);
                                        const teacherLabel = teacherObj ? teacherObj.name.split(' ')[1] || teacherObj.name : 'Teacher';

                                        return (
                                          <div
                                            key={idx}
                                            className={`p-1 rounded-lg text-white font-extrabold text-[9px] leading-tight shadow-2xs transition-transform hover:scale-[1.02] ${
                                              c.isMine ? 'ring-2 ring-amber-400' : 'opacity-90'
                                            }`}
                                            style={{
                                              backgroundColor: GRADE_COLORS[c.grade] || '#7C3AED',
                                            }}
                                          >
                                            <div className="flex items-center justify-between gap-0.5">
                                              <span>{c.grade.replace('Grade ', 'G')}</span>
                                              {c.subject.includes('PPI') && <span>🙏</span>}
                                              {c.isMine && (
                                                <span className="text-[7px] bg-amber-400 text-slate-950 px-1 rounded font-black">
                                                  YOU
                                                </span>
                                              )}
                                            </div>
                                            <div className="truncate font-black">{c.subject}</div>
                                            {teacherTimetableView !== 'my' && (
                                              <div className="text-[8px] opacity-80 truncate font-normal">
                                                {c.isMine ? 'Tr. (You)' : `Tr. ${teacherLabel}`}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* TAB 4: ASSESSMENT — AUTHENTIC CBC ASSESSMENT ENGINE & PIPELINE */}
            {tState.tab === 'assessment' && (
              <div className="space-y-4 animate-fade-in">
                {usePwaEngine ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between bg-black/40 p-2.5 rounded-2xl border border-white/10 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">⚡</span>
                        <span className="text-xs font-black text-amber-300">
                          Official CBC Assessment PWA Engine & Pipeline
                        </span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                          Tr. {teacher.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setUsePwaEngine(false)}
                          className="text-[11px] font-bold text-slate-300 hover:text-white underline cursor-pointer"
                        >
                          View Class Roster Summary
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-3xl p-2 sm:p-4 border border-slate-200 shadow-xl overflow-hidden">
                      <AssessmentPwaView
                        initialRole="teacher"
                        teacherId={teacher.id}
                        teacherName={teacher.name}
                        assignedSubjects={teacher.subjects}
                        gradeSubjects={teacherSubjectsByGrade}
                        assignedGrades={teacherAssignedGrades}
                        initialGrade={teacherAssignedGrades[0] || teacher.grades?.[0]}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-2xl border border-white/10">
                      <span className="text-xs text-slate-300 font-bold">Class Roster Summary Grid</span>
                      <button
                        type="button"
                        onClick={() => setUsePwaEngine(true)}
                        className="text-xs font-black text-amber-300 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>⚡</span> Switch to Full Assessment Engine
                      </button>
                    </div>

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h2 className="text-base font-black flex items-center gap-2">
                          <span>⚖️</span> CBC Assessment Management
                        </h2>
                        <p className="text-xs text-slate-400">
                          Standard Assessment Report & Assessment Book reading assigned subjects for Tr. {teacher.name} and enrolled learners.
                        </p>
                      </div>

                  {/* Mode Switcher: Book vs Report */}
                  <div className="flex items-center bg-black/40 p-1 rounded-2xl border border-white/15 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick(400);
                        setAssessMode('book');
                      }}
                      className={`py-1.5 px-3 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                        assessMode === 'book'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 shadow-md'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <span>📘</span>
                      <span>Assessment Book</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick(400);
                        setAssessMode('report');
                      }}
                      className={`py-1.5 px-3 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                        assessMode === 'report'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <span>📊</span>
                      <span>Assessment Report</span>
                    </button>
                  </div>
                </div>

                {/* Class & Subject Selector from Admin Data */}
                <div
                  className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                    isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Grade Selector */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                        Selected Grade:
                      </label>
                      <select
                        value={assessGrade}
                        onChange={(e) => setAssessGrade(e.target.value as GradeName)}
                        className={`py-1.5 px-3 rounded-xl border text-xs font-bold ${
                          isDark
                            ? 'bg-black/50 border-white/20 text-white'
                            : 'bg-slate-100 border-slate-300 text-slate-900'
                        }`}
                      >
                        {teacher.grades.map((g: GradeName) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Subject Selector */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                        Learning Area (Subject):
                      </label>
                      <select
                        value={
                          (teacherSubjectsByGrade[assessGrade] || teacher.subjects).includes(assessSubject)
                            ? assessSubject
                            : (teacherSubjectsByGrade[assessGrade] || teacher.subjects)[0] || assessSubject
                        }
                        onChange={(e) => setAssessSubject(e.target.value)}
                        className={`py-1.5 px-3 rounded-xl border text-xs font-bold ${
                          isDark
                            ? 'bg-black/50 border-white/20 text-white'
                            : 'bg-slate-100 border-slate-300 text-slate-900'
                        }`}
                      >
                        {(teacherSubjectsByGrade[assessGrade] && teacherSubjectsByGrade[assessGrade].length > 0
                          ? teacherSubjectsByGrade[assessGrade]
                          : teacher.subjects
                        ).map((s: string) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      👥 {learnersInGrade(assessGrade).length} Learner(s) Enrolled
                    </span>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="py-1.5 px-3 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer flex items-center gap-1"
                      title="Print official assessment sheet"
                    >
                      <span>🖨 Print</span>
                    </button>
                  </div>
                </div>

                {/* 1. CBC ASSESSMENT BOOK VIEW */}
                {assessMode === 'book' && (
                  <div className="space-y-4">
                    {/* Prestigious Golden Assessment Book Cover Banner */}
                    <div className="p-4 rounded-3xl bg-gradient-to-r from-[#78350F] via-[#B45309] to-[#D97706] text-white shadow-lg border-2 border-amber-300/40 relative overflow-hidden">
                      <div className="flex items-center gap-3 relative z-10">
                        <img
                          src="/images/lra_crest.jpg"
                          alt="LRA Crest"
                          className="w-14 h-14 rounded-full border-2 border-amber-200 bg-white object-cover shrink-0 shadow-md"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-black uppercase tracking-widest text-amber-200">
                            Little Roses Academy · Official CBC Register
                          </div>
                          <h3 className="text-lg font-black tracking-tight leading-tight">
                            CBC Competency Assessment Book
                          </h3>
                          <p className="text-xs text-amber-100 mt-0.5 font-medium">
                            {assessGrade} · {assessSubject} · Facilitator: Tr. {teacher.name}
                          </p>
                        </div>
                      </div>

                      {/* Golden Bands Legend */}
                      <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-amber-400/30 text-center text-[10.5px] font-bold">
                        <div className="p-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-400/40">
                          <strong>EE</strong>: 80% – 100%
                        </div>
                        <div className="p-1 rounded-lg bg-blue-950/60 text-blue-300 border border-blue-400/40">
                          <strong>ME</strong>: 60% – 79%
                        </div>
                        <div className="p-1 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-400/40">
                          <strong>AE</strong>: 40% – 59%
                        </div>
                        <div className="p-1 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-400/40">
                          <strong>BE</strong>: Below 40%
                        </div>
                      </div>
                    </div>

                    {/* Learner Roster in Assessment Book */}
                    {learnersInGrade(assessGrade).length === 0 ? (
                      <div
                        className={`p-8 rounded-3xl border text-center text-xs text-slate-400 ${
                          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                        }`}
                      >
                        No learners currently enrolled in {assessGrade}. Learners added by administration will automatically appear here.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {learnersInGrade(assessGrade).map((l, idx) => {
                          const clsKey = `${assessGrade}|${assessSubject}`;
                          const curScores = (tState.classes[clsKey]?.subjectScores || {})[l.id] || {
                            catScore: 75,
                            asgScore: 75,
                          };
                          const compPct = Math.round(curScores.catScore * 0.6 + curScores.asgScore * 0.4);
                          let currentBand: 'EE' | 'ME' | 'AE' | 'BE' = 'ME';
                          if (compPct >= 80) currentBand = 'EE';
                          else if (compPct >= 60) currentBand = 'ME';
                          else if (compPct >= 40) currentBand = 'AE';
                          else currentBand = 'BE';

                          return (
                            <div
                              key={l.id}
                              className={`p-3.5 rounded-2xl border transition-all ${
                                isDark
                                  ? 'bg-[#141C33] border-white/10 hover:border-white/20'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                {/* Learner Info */}
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                                    {l.name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-extrabold text-sm truncate text-white">
                                        {l.name}
                                      </span>
                                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                                        #{l.adm || idx + 1}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400">
                                      Adm: {l.adm}
                                    </div>
                                  </div>
                                </div>

                                {/* Competency Level Pill Selectors */}
                                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                  <span className="text-[11px] font-mono font-black mr-1 text-slate-300">
                                    {compPct}%
                                  </span>

                                  {(['EE', 'ME', 'AE', 'BE'] as const).map((band) => {
                                    const isSelected = currentBand === band;
                                    const bandStyles = {
                                      EE: isSelected
                                        ? 'bg-emerald-600 text-white shadow-sm font-black'
                                        : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/30',
                                      ME: isSelected
                                        ? 'bg-blue-600 text-white shadow-sm font-black'
                                        : 'bg-blue-500/15 text-blue-300 hover:bg-blue-500/30',
                                      AE: isSelected
                                        ? 'bg-amber-600 text-white shadow-sm font-black'
                                        : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/30',
                                      BE: isSelected
                                        ? 'bg-rose-600 text-white shadow-sm font-black'
                                        : 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/30',
                                    };

                                    return (
                                      <button
                                        key={band}
                                        type="button"
                                        onClick={() => handleSetLearnerBand(clsKey, l.id, band)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/10 ${bandStyles[band]}`}
                                        title={`Set ${l.name} to ${band}`}
                                      >
                                        {band}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. ASSESSMENT REPORT VIEW (60% CAT + 40% ASSIGNMENT) */}
                {assessMode === 'report' && (
                  <div className="space-y-4">
                    {/* Weighting Info Banner */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border border-blue-500/30 text-blue-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                      <div>
                        <span className="font-extrabold text-white text-sm block">
                          Official KNEC Assessment Weighting Formula
                        </span>
                        <span className="text-[11px] text-blue-300">
                          Final Composite % = (CAT Score × 0.60) + (Assignment Score × 0.40)
                        </span>
                      </div>
                      <div className="text-[11px] font-mono font-black bg-blue-500/20 px-3 py-1.5 rounded-xl border border-blue-400/40 text-blue-100 self-start sm:self-auto">
                        60% CATs · 40% Assignments
                      </div>
                    </div>

                    {/* Performance Summary Metrics */}
                    {(() => {
                      const learners = learnersInGrade(assessGrade);
                      const clsKey = `${assessGrade}|${assessSubject}`;
                      const scores = tState.classes[clsKey]?.subjectScores || {};
                      let totalPct = 0;
                      let eeCount = 0;
                      let meCount = 0;
                      let aeCount = 0;
                      let beCount = 0;

                      learners.forEach((l) => {
                        const s = scores[l.id] || { catScore: 70, asgScore: 70 };
                        const p = Math.round(s.catScore * 0.6 + s.asgScore * 0.4);
                        totalPct += p;
                        if (p >= 80) eeCount++;
                        else if (p >= 60) meCount++;
                        else if (p >= 40) aeCount++;
                        else beCount++;
                      });

                      const avgPct = learners.length > 0 ? Math.round(totalPct / learners.length) : 0;

                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                          <div
                            className={`p-3 rounded-2xl border ${
                              isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="text-[10px] text-slate-400 font-bold uppercase">
                              Class Mean
                            </div>
                            <div className="text-xl font-black text-white mt-0.5">{avgPct}%</div>
                          </div>
                          <div
                            className={`p-3 rounded-2xl border ${
                              isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="text-[10px] text-emerald-400 font-bold uppercase">
                              EE (80-100%)
                            </div>
                            <div className="text-xl font-black text-emerald-400 mt-0.5">{eeCount}</div>
                          </div>
                          <div
                            className={`p-3 rounded-2xl border ${
                              isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="text-[10px] text-blue-400 font-bold uppercase">
                              ME (60-79%)
                            </div>
                            <div className="text-xl font-black text-blue-400 mt-0.5">{meCount}</div>
                          </div>
                          <div
                            className={`p-3 rounded-2xl border ${
                              isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="text-[10px] text-amber-400 font-bold uppercase">
                              AE (40-59%)
                            </div>
                            <div className="text-xl font-black text-amber-400 mt-0.5">{aeCount}</div>
                          </div>
                          <div
                            className={`p-3 rounded-2xl border col-span-2 sm:col-span-1 ${
                              isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="text-[10px] text-rose-400 font-bold uppercase">
                              BE (&lt;40%)
                            </div>
                            <div className="text-xl font-black text-rose-400 mt-0.5">{beCount}</div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Direct Marks Entry Table */}
                    <div
                      className={`rounded-2xl border overflow-x-auto shadow-sm ${
                        isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                      }`}
                    >
                      <table className="w-full text-left text-xs min-w-[620px]">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/5 text-[11px] font-black text-slate-300">
                            <th className="p-3 w-10 text-center">#</th>
                            <th className="p-3">Learner Name (Admin Enrolled)</th>
                            <th className="p-3 text-center w-28">CAT (/100)</th>
                            <th className="p-3 text-center w-28">Asg (/100)</th>
                            <th className="p-3 text-center w-24">CAT 60%</th>
                            <th className="p-3 text-center w-24">Asg 40%</th>
                            <th className="p-3 text-center w-24">Total %</th>
                            <th className="p-3 text-center w-24">Band</th>
                          </tr>
                        </thead>
                        <tbody>
                          {learnersInGrade(assessGrade).map((l, index) => {
                            const clsKey = `${assessGrade}|${assessSubject}`;
                            const scores = (tState.classes[clsKey]?.subjectScores || {})[l.id] || {
                              catScore: 70,
                              asgScore: 70,
                            };
                            const catComponent = (scores.catScore * 0.6).toFixed(1);
                            const asgComponent = (scores.asgScore * 0.4).toFixed(1);
                            const totalScore = Math.round(scores.catScore * 0.6 + scores.asgScore * 0.4);

                            let band = 'ME';
                            let bandColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                            if (totalScore >= 80) {
                              band = 'EE';
                              bandColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                            } else if (totalScore >= 60) {
                              band = 'ME';
                              bandColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                            } else if (totalScore >= 40) {
                              band = 'AE';
                              bandColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                            } else {
                              band = 'BE';
                              bandColor = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
                            }

                            return (
                              <tr
                                key={l.id}
                                className="border-b border-white/5 hover:bg-white/5 transition-colors"
                              >
                                <td className="p-3 text-center font-mono text-slate-400">
                                  {index + 1}
                                </td>
                                <td className="p-3">
                                  <div className="font-extrabold text-white text-xs">{l.name}</div>
                                  <div className="text-[10px] text-slate-400">
                                    Adm: {l.adm || `LRA-${index + 101}`}
                                  </div>
                                </td>
                                <td className="p-3 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={scores.catScore}
                                    onChange={(e) =>
                                      handleUpdateSubjectScore(
                                        clsKey,
                                        l.id,
                                        'catScore',
                                        parseInt(e.target.value, 10)
                                      )
                                    }
                                    className={`w-20 p-1.5 rounded-lg border text-center font-mono font-bold text-xs ${
                                      isDark
                                        ? 'bg-black/50 border-white/20 text-white'
                                        : 'bg-slate-100 border-slate-300 text-slate-900'
                                    }`}
                                  />
                                </td>
                                <td className="p-3 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={scores.asgScore}
                                    onChange={(e) =>
                                      handleUpdateSubjectScore(
                                        clsKey,
                                        l.id,
                                        'asgScore',
                                        parseInt(e.target.value, 10)
                                      )
                                    }
                                    className={`w-20 p-1.5 rounded-lg border text-center font-mono font-bold text-xs ${
                                      isDark
                                        ? 'bg-black/50 border-white/20 text-white'
                                        : 'bg-slate-100 border-slate-300 text-slate-900'
                                    }`}
                                  />
                                </td>
                                <td className="p-3 text-center font-mono text-slate-300 font-bold">
                                  {catComponent}
                                </td>
                                <td className="p-3 text-center font-mono text-slate-300 font-bold">
                                  {asgComponent}
                                </td>
                                <td className="p-3 text-center font-mono font-black text-white text-sm">
                                  {totalScore}%
                                </td>
                                <td className="p-3 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded-md font-black text-[11px] border ${bandColor}`}
                                  >
                                    {band}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                </>
              )}
            </div>
          )}
          </>
        )}
      </main>

      {/* DOCKED BOTTOM NAVIGATION BAR (Dark navy pill; docked below main so content never slides underneath) */}
      <div className="shrink-0 px-2.5 sm:px-3 pt-1 pb-2.5 z-30">
        <nav className="bg-gradient-to-r from-[#0A1F4D] to-[#14296B] rounded-[24px] p-1.5 shadow-[0_8px_22px_rgba(10,31,77,0.45)] flex items-center justify-between border border-white/10">
          <button
            onClick={() => {
              sound.playClick(500);
              setStack([]);
              setTState((prev) => ({ ...prev, tab: 'home' }));
            }}
            className={`min-w-0 flex-1 py-1.5 px-0.5 rounded-2xl flex flex-col items-center gap-0.5 text-[10px] sm:text-[11px] font-extrabold cursor-pointer transition-all ${
              tState.tab === 'home' && stack.length === 0
                ? 'bg-gradient-to-r from-[#2F6BFF] to-[#4F8BFF] text-white shadow-md'
                : 'text-[#B8C6E8] hover:text-white'
            }`}
          >
            <span className="text-base leading-none">🏠</span>
            <span className="w-full truncate text-center">Home</span>
          </button>

          <button
            onClick={() => {
              sound.playClick(500);
              setStack([]);
              setTState((prev) => ({ ...prev, tab: 'classes' }));
            }}
            className={`min-w-0 flex-1 py-1.5 px-0.5 rounded-2xl flex flex-col items-center gap-0.5 text-[10px] sm:text-[11px] font-extrabold cursor-pointer transition-all ${
              tState.tab === 'classes' && stack.length === 0
                ? 'bg-gradient-to-r from-[#2F6BFF] to-[#4F8BFF] text-white shadow-md'
                : 'text-[#B8C6E8] hover:text-white'
            }`}
          >
            <span className="text-base leading-none">👥</span>
            <span className="w-full truncate text-center">My Classes</span>
          </button>

          <button
            onClick={() => {
              sound.playClick(500);
              setStack([]);
              setTState((prev) => ({ ...prev, tab: 'timetable' }));
            }}
            className={`min-w-0 flex-1 py-1.5 px-0.5 rounded-2xl flex flex-col items-center gap-0.5 text-[10px] sm:text-[11px] font-extrabold cursor-pointer transition-all ${
              tState.tab === 'timetable' && stack.length === 0
                ? 'bg-gradient-to-r from-[#2F6BFF] to-[#4F8BFF] text-white shadow-md'
                : 'text-[#B8C6E8] hover:text-white'
            }`}
          >
            <span className="text-base leading-none">🗓️</span>
            <span className="w-full truncate text-center">Timetable</span>
          </button>

          <button
            onClick={() => {
              sound.playClick(500);
              setStack([]);
              setTState((prev) => ({ ...prev, tab: 'assessment' }));
            }}
            className={`min-w-0 flex-1 py-1.5 px-0.5 rounded-2xl flex flex-col items-center gap-0.5 text-[10px] sm:text-[11px] font-extrabold cursor-pointer transition-all ${
              tState.tab === 'assessment' && stack.length === 0
                ? 'bg-gradient-to-r from-[#2F6BFF] to-[#4F8BFF] text-white shadow-md'
                : 'text-[#B8C6E8] hover:text-white'
            }`}
          >
            <span className="text-base leading-none">📝</span>
            <span className="w-full truncate text-center">Assessment</span>
          </button>
        </nav>
      </div>

      {/* MODAL 3: MARK TAUGHT DIALOG */}
      {showMarkTaughtModal &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
            <div
              className={`w-full max-w-md rounded-3xl p-5 border shadow-2xl max-h-[85dvh] overflow-y-auto ${
                isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                <h3 className="text-base font-black">Record Taught Lesson</h3>
                <button
                  onClick={() => {
                    setShowMarkTaughtModal(null);
                    setPendingSlotMeta(null);
                  }}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Lesson Topic / Strand
                  </label>
                  <input
                    type="text"
                    value={markTaughtTopic}
                    onChange={(e) => setMarkTaughtTopic(e.target.value)}
                    placeholder="e.g. Proper Fractions & Number Lines"
                    className={`w-full p-2.5 rounded-xl border ${
                      isDark
                        ? 'bg-black/40 border-white/20 text-white'
                        : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Delivery Status
                  </label>
                  <select
                    value={markTaughtStatus}
                    onChange={(e) =>
                      setMarkTaughtStatus(e.target.value as 'Taught' | 'Partly taught' | 'Not taught')
                    }
                    className={`w-full p-2.5 rounded-xl border ${
                      isDark
                        ? 'bg-black/40 border-white/20 text-white'
                        : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Taught">✓ Taught (Full lesson completed)</option>
                    <option value="Partly taught">~ Partly Taught (Continued next slot)</option>
                    <option value="Not taught">! Not Taught (Postponed or school event)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Teacher Reflection / Notes (Optional)
                  </label>
                  <textarea
                    value={markTaughtReflection}
                    onChange={(e) => setMarkTaughtReflection(e.target.value)}
                    placeholder="Notes on learner engagement, homework assigned, or areas needing review…"
                    rows={3}
                    className={`w-full p-2.5 rounded-xl border ${
                      isDark
                        ? 'bg-black/40 border-white/20 text-white'
                        : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMarkTaughtModal(null);
                      setPendingSlotMeta(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-white/20 text-slate-300 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveLessonRecord}
                    className="flex-1 py-2.5 rounded-xl bg-[#16A34A] hover:bg-emerald-600 text-white font-black shadow-md cursor-pointer"
                  >
                    Save Record
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL 4: SWITCH ACTIVE TEACHER PROFILE */}
      {showSwitchTeacherModal &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
            <div
              className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl space-y-3 max-h-[85dvh] overflow-y-auto ${
                isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-sm font-black">Switch Teacher Profile</h3>
                <button
                  onClick={() => setShowSwitchTeacherModal(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Choose an active teacher enrolled on this device:
              </p>

              <div className="space-y-1.5">
                {adminData.teachers.map((t: Teacher) => {
                  const isActive = t.id === teacher.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        sound.playClick(500);
                        setTState((prev) => ({ ...prev, signedInId: t.id }));
                        setShowSwitchTeacherModal(false);
                        onShowToast(`Active teacher switched to ${t.name}`);
                      }}
                      className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                        isActive
                          ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                          : isDark
                          ? 'bg-black/30 border-white/10 text-slate-200 hover:bg-white/5'
                          : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs">{t.name}</div>
                        <div className="text-[11px] opacity-80">
                          {t.subjects.join(', ')} · Grades {t.grades.join(', ').replace(/Grade /g, 'G')}
                        </div>
                      </div>
                      {isActive && <span className="text-xs font-bold">✓ Active</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Assessment Modals (Strand, SubStrand, Assessment) */}
      <AssessmentModals
        isDark={isDark}
        strandModal={strandModal}
        onCloseStrandModal={() => setStrandModal(null)}
        onSaveStrand={handleSaveStrand}
        subStrandModal={subStrandModal}
        onCloseSubStrandModal={() => setSubStrandModal(null)}
        onSaveSubStrand={handleSaveSubStrand}
        assessmentModal={assessmentModal}
        onCloseAssessmentModal={() => setAssessmentModal(null)}
        onSaveAssessment={handleSaveAssessment}
        onDeleteAssessment={handleDeleteAssessment}
      />

      {/* Direct Document Viewer Modal (Pristine reading, printing, downloading, ZERO AI popups) */}
      <DirectDocumentViewerModal
        document={directViewingDoc}
        onClose={() => setDirectViewingDoc(null)}
        onShowToast={onShowToast}
        isDark={isDark}
      />
    </div>
  );
};
