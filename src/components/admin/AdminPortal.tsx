import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  AdminState,
  Teacher,
  Learner,
  GradeName,
  ProposedDraft,
  SchoolProfile,
  TermsConfig,
  TimetableCell,
  TimetableSlotDef,
  PasswordChangeRequest,
  Family,
  PaternalRole,
  MaternalRole,
} from './types';
import { INITIAL_ADMIN_STATE } from './initialData';
import {
  nairobiStamp,
  nairobiParts,
  admFormat,
  currentTerm,
  uid,
  digitsOnly,
} from './adminUtils';
import { sound } from '../../utils/sound';
import {
  cleanExpiredMessages,
  syncSchoolRecordsToSupabase,
} from '../../supabaseClient';
import {
  dispatchTerm3CountdownNotifications,
  getAcademicLifecycleSnapshot,
  promoteLearnersArrayNextClass,
  purgeAllAssessmentBooksAndRecords,
  runAcademicLifecycleAutomation,
  syncAdminTermsToCalendarStorage,
} from '../../utils/academicLifecycle';

import { AdminHome } from './AdminHome';
import { AdminTeachers } from './AdminTeachers';
import { AdminPupils } from './AdminPupils';
import { AdminFamilies } from './AdminFamilies';
import { AdminTimetable } from './AdminTimetable';
import { AdminCalendar } from './AdminCalendar';
import { AdminMessages } from './AdminMessages';
import { AdminResources } from './AdminResources';
import { AdminPromotion } from './AdminPromotion';
import { AdminNotices } from './AdminNotices';
import { AdminSettings } from './AdminSettings';
import { StudentGovernmentModal } from './StudentGovernmentModal';
import { PasswordChangeRequestModal } from './PasswordChangeRequestModal';
import { ElsieChatView } from '../common/ElsieChatView';
import { UserIdentity } from '../../utils/elsieEngine';
import { AdminAIService } from './AdminAIService';
import { AssessmentPwaView } from '../common/AssessmentPwaView';
import { useBackHandler, triggerAppBack } from '../../utils/navigationHistory';
import {
  persistTimetableCellChange,
  persistTimetableFreezeChange,
  persistTimetableSlotsChange,
} from '../../utils/timetableSync';
import { generate6CharPassword } from '../../utils/learnerPasswordUtils';
import {
  reconcileFamiliesFromLearners,
  samePhone,
  getFamilyPhones,
} from '../../utils/familySyncUtils';
import {
  markLocalAdminModified,
  recordAdminDeletions,
  clearDeletionTombstonesFor,
  hasPendingOutbox,
  flushOfflineOutbox,
} from '../../utils/cloudSync';
import { getAdminSnapshotFromIndexedDB } from '../../utils/indexedDBStorage';
import { getUnreadNotificationCount } from '../../utils/notifications';

const STORAGE_KEY = 'lra_admin_v3';
const FREE_LIMIT = 20;

interface AdminPortalProps {
  onExitPortal: () => void;
  onShowToast: (msg: string) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  onExitPortal,
  onShowToast,
}) => {
  // Load state from localStorage or initial seed (and guarantee every learner has a linked Family)
  const [state, setState] = useState<AdminState>(() => {
    let base = INITIAL_ADMIN_STATE;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const parsedSchool = parsed?.school || {};
        const cleanEmail =
          !parsedSchool.email ||
          parsedSchool.email === 'admin@littlerosesacademy.sc.ke' ||
          parsedSchool.email === 'info@littlerosesacademy.ac.ke'
            ? INITIAL_ADMIN_STATE.school.email
            : parsedSchool.email;
        const cleanFacebook =
          !parsedSchool.facebook || parsedSchool.facebook === 'Little Roses Academy'
            ? INITIAL_ADMIN_STATE.school.facebook
            : parsedSchool.facebook;
        const cleanInstagram =
          !parsedSchool.instagram || parsedSchool.instagram === 'Little Roses Academy'
            ? INITIAL_ADMIN_STATE.school.instagram
            : parsedSchool.instagram;
        base = {
          ...INITIAL_ADMIN_STATE,
          ...parsed,
          school: {
            ...INITIAL_ADMIN_STATE.school,
            ...parsedSchool,
            email: cleanEmail,
            facebook: cleanFacebook,
            instagram: cleanInstagram,
          },
        };
      }
    } catch (e) {
      console.error('Failed to load admin state', e);
    }
    const reconciled = reconcileFamiliesFromLearners(base.learners || [], base.families || []);
    return reconciled.changed
      ? { ...base, learners: reconciled.learners, families: reconciled.families }
      : base;
  });

  // Navigation Stack for deep subviews under tabs
  const [subView, setSubView] = useState<string | null>(null);

  // Tab history stack to support phone back navigation across tabs/sessions
  const [tabHistory, setTabHistory] = useState<AdminState['tab'][]>(['home']);

  // Modals
  const [showQuickAddResource, setShowQuickAddResource] = useState(false);
  const [quickResourceTeacherId, setQuickResourceTeacherId] = useState('');
  const [showStudentGovModal, setShowStudentGovModal] = useState(false);
  const [showPasswordRequestModal, setShowPasswordRequestModal] = useState(false);
    // Elsie Admin Identity (Executive Desk)
  const adminIdentity: UserIdentity = useMemo(() => ({
    role: "admin",
    id: "admin_office",
    name: "Administrator",
    preferredTitle: "Chief Admin",
    preferredName: "Administrator",
  }), []);
const [isAiLoading, setIsAiLoading] = useState(false);

  // Biometric prompt simulation for sensitive administrative tasks
  const [biometricTask, setBiometricTask] = useState<{
    actionTitle: string;
    onConfirmed: () => void;
  } | null>(null);

  // Prevent overwriting cloud DB on initial mount or echoing back remote cloud updates
  const skipNextCloudPushRef = useRef<boolean>(true);
  const prevIdsRef = useRef<{
    teachers: Set<string>;
    learners: Set<string>;
    families: Set<string>;
  }>({
    teachers: new Set((state.teachers || []).map((t) => t.id).filter(Boolean)),
    learners: new Set((state.learners || []).map((l) => l.id).filter(Boolean)),
    families: new Set((state.families || []).map((f) => f.id).filter(Boolean)),
  });

  // Restore strictly newer local IndexedDB backup on mount if present (offline resilience)
  useEffect(() => {
    getAdminSnapshotFromIndexedDB()
      .then((snap) => {
        if (!snap?.adminState) return;
        const localAt = Number((state as any).clientModifiedAt || 0);
        if (snap.clientModifiedAt > localAt) {
          skipNextCloudPushRef.current = true;
          setState((prev) => ({ ...prev, ...snap.adminState }));
        }
      })
      .catch(() => {});
    if (hasPendingOutbox() && typeof navigator !== 'undefined' && navigator.onLine) {
      flushOfflineOutbox().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save state on changes and protect offline modifications with clientModifiedAt + tombstones
  useEffect(() => {
    try {
      const currTeacherIds = new Set((state.teachers || []).map((t) => t.id).filter(Boolean));
      const currLearnerIds = new Set((state.learners || []).map((l) => l.id).filter(Boolean));
      const currFamilyIds = new Set((state.families || []).map((f) => f.id).filter(Boolean));

      if (skipNextCloudPushRef.current) {
        skipNextCloudPushRef.current = false;
        prevIdsRef.current = {
          teachers: currTeacherIds,
          learners: currLearnerIds,
          families: currFamilyIds,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return;
      }

      const deletedTeacherIds = Array.from(prevIdsRef.current.teachers).filter(
        (id) => !currTeacherIds.has(id)
      );
      const deletedLearnerIds = Array.from(prevIdsRef.current.learners).filter(
        (id) => !currLearnerIds.has(id)
      );
      const deletedFamilyIds = Array.from(prevIdsRef.current.families).filter(
        (id) => !currFamilyIds.has(id)
      );

      if (deletedTeacherIds.length || deletedLearnerIds.length || deletedFamilyIds.length) {
        recordAdminDeletions({
          teacherIds: deletedTeacherIds,
          learnerIds: deletedLearnerIds,
          familyIds: deletedFamilyIds,
        });
      }

      const addedTeachers = Array.from(currTeacherIds).filter(
        (id) => !prevIdsRef.current.teachers.has(id)
      );
      const addedLearners = Array.from(currLearnerIds).filter(
        (id) => !prevIdsRef.current.learners.has(id)
      );
      const addedFamilies = Array.from(currFamilyIds).filter(
        (id) => !prevIdsRef.current.families.has(id)
      );
      if (addedTeachers.length || addedLearners.length || addedFamilies.length) {
        clearDeletionTombstonesFor({
          teacherIds: addedTeachers,
          learnerIds: addedLearners,
          familyIds: addedFamilies,
        });
      }

      prevIdsRef.current = {
        teachers: currTeacherIds,
        learners: currLearnerIds,
        families: currFamilyIds,
      };

      const stampedState = markLocalAdminModified(state);

      // Background sync to Cloud DB / Supabase (queues cleanly into outbox when offline)
      syncSchoolRecordsToSupabase(stampedState).catch((e) =>
        console.warn('Background Supabase sync skipped:', e)
      );
    } catch (e) {
      console.error('Failed to save admin state', e);
    }
  }, [state]);

  // Listen for real-time state updates from Elsie, Cloud Polling, or connected portals
  useEffect(() => {
    const handleRemoteUpdate = (e: any) => {
      if (e.detail) {
        const { __fromCloud, ...cleanState } = e.detail;
        if (__fromCloud) {
          skipNextCloudPushRef.current = true;
        }
        setState((prev) => {
          const merged = { ...prev, ...cleanState };
          const rec = reconcileFamiliesFromLearners(merged.learners || [], merged.families || []);
          return rec.changed ? { ...merged, learners: rec.learners, families: rec.families } : merged;
        });
      }
    };
    const handleDataSync = (e: any) => {
      if (e?.detail?.source === 'cloud_sync') {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const incoming = JSON.parse(raw);
            setState((prev) => {
              const prevAt = Number((prev as any).clientModifiedAt || 0);
              const inAt = Number(incoming?.clientModifiedAt || 0);
              if (inAt && inAt === prevAt && prev.learners?.length === incoming?.learners?.length && prev.teachers?.length === incoming?.teachers?.length) {
                return prev;
              }
              skipNextCloudPushRef.current = true;
              const merged = { ...prev, ...incoming };
              const rec = reconcileFamiliesFromLearners(merged.learners || [], merged.families || []);
              return rec.changed ? { ...merged, learners: rec.learners, families: rec.families } : merged;
            });
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('lra-admin-state-updated', handleRemoteUpdate);
    window.addEventListener('lra_data_sync', handleDataSync);
    return () => {
      window.removeEventListener('lra-admin-state-updated', handleRemoteUpdate);
      window.removeEventListener('lra_data_sync', handleDataSync);
    };
  }, []);

  // Automated Data Retention & Academic Lifecycle Policies:
  // 1. 24-Hour Message Cleanup
  // 2. Sync Admin Term Dates -> Academic Year & Term 3 Calendar
  // 3. Auto-release Term 3 books & dispatch 30-day reminders without waiting for Admin push
  // 4. After 30 days from Term 3 closing: promote learners to next class & completely delete old assessment books
  useEffect(() => {
    const runRetentionChecks = () => {
      setState((prev) => {
        const { retained, purgedCount } = cleanExpiredMessages(prev.messages);
        if (purgedCount > 0) {
          return { ...prev, messages: retained };
        }
        return prev;
      });

      runAcademicLifecycleAutomation({
        applyAdminStateUpdate: (updater) => setState((prev) => updater(prev)),
      }).catch(console.warn);
    };

    runRetentionChecks();
    const interval = setInterval(runRetentionChecks, 60000);
    return () => clearInterval(interval);
  }, []);

  const isDark = state.theme === 'dark';

  // Helper to log activities
  const logActivity = useCallback((text: string) => {
    setState((prev) => ({
      ...prev,
      log: [
        {
          text,
          by: 'Administrator',
          at: nairobiStamp(new Date()),
        },
        ...prev.log.slice(0, 150),
      ],
    }));
  }, []);

  const activeTerm = currentTerm(state.terms);
  const pendingPasswordRequestsCount = (state.passwordRequests || []).filter(
    (r) => r.status === 'pending'
  ).length;
  const [unreadNoticesCount, setUnreadNoticesCount] = useState<number>(() =>
    getUnreadNotificationCount({ portalId: 'admin', userId: 'admin_office', userName: 'Administrator' })
  );

  useEffect(() => {
    const refreshUnread = () => {
      setUnreadNoticesCount(
        getUnreadNotificationCount({
          portalId: 'admin',
          userId: 'admin_office',
          userName: 'Administrator',
        })
      );
    };
    refreshUnread();
    window.addEventListener('lra_notifications_updated', refreshUnread);
    window.addEventListener('lra_data_sync', refreshUnread);
    return () => {
      window.removeEventListener('lra_notifications_updated', refreshUnread);
      window.removeEventListener('lra_data_sync', refreshUnread);
    };
  }, [state.notices, state.passwordRequests]);

  // --- PHONE HARDWARE BACK BUTTON & NAVIGATION STACK HANDLERS ---

  // 2. Sensitive Biometric Task prompt (priority: 48)
  useBackHandler(
    () => {
      sound.playClick(400);
      setBiometricTask(null);
      return true;
    },
    biometricTask !== null,
    48,
    'admin_biometric_task'
  );

  // 3. Password Change Requests Modal (priority: 45)
  useBackHandler(
    () => {
      sound.playClick(400);
      setShowPasswordRequestModal(false);
      return true;
    },
    showPasswordRequestModal,
    45,
    'admin_password_requests'
  );

  // 4. Quick Add Resource Modal (priority: 45)
  useBackHandler(
    () => {
      sound.playClick(400);
      setShowQuickAddResource(false);
      return true;
    },
    showQuickAddResource,
    45,
    'admin_quick_resource'
  );

  // 6. Student Government Modal (priority: 45)
  useBackHandler(
    () => {
      sound.playClick(400);
      setShowStudentGovModal(false);
      return true;
    },
    showStudentGovModal,
    45,
    'admin_student_gov'
  );

  // 7. Subview drilldowns (notices, calendar, timetable, messages, settings, etc.) (priority: 25)
  useBackHandler(
    () => {
      sound.playClick(400);
      setSubView(null);
      return true;
    },
    subView !== null,
    25,
    'admin_subview'
  );

  // 8. Tab / Session History: Step back through previous tabs visited (priority: 15)
  useBackHandler(
    () => {
      sound.playClick(400);
      if (tabHistory.length > 1) {
        const nextStack = tabHistory.slice(0, -1);
        const prevTab = nextStack[nextStack.length - 1];
        setTabHistory(nextStack);
        setState((prev) => ({ ...prev, tab: prevTab }));
        return true;
      }
      if (state.tab !== 'home') {
        setTabHistory(['home']);
        setState((prev) => ({ ...prev, tab: 'home' }));
        return true;
      }
      return false; // let root home handler catch
    },
    (state.tab !== 'home' || tabHistory.length > 1) && !subView,
    15,
    'admin_tab_history'
  );

  // 9. Root Home falls through to App.tsx universal "ARE YOU LEAVING ALREADY?" confirmation modal (priority 10)

  // Header Back Button Logic: delegates to the unified navigation history stack
  const handleBack = () => {
    sound.playClick(400);
    triggerAppBack();
  };

  const handleSwitchTab = (tab: AdminState['tab']) => {
    sound.playClick(500);
    setSubView(null);
    setState((prev) => {
      if (prev.tab !== tab) {
        setTabHistory((h) => {
          if (h.length > 0 && h[h.length - 1] === tab) return h;
          return [...h, tab];
        });
      }
      return { ...prev, tab };
    });
  };

  const handleToggleTheme = (theme: 'light' | 'dark') => {
    sound.playClick(550);
    setState((prev) => ({ ...prev, theme }));
    onShowToast(`Theme changed to ${theme} mode`);
  };

  // TEACHER HANDLERS
  const handleAddTeacher = (
    teacherData: Omit<Teacher, 'id' | 'files' | 'color' | 'photo' | 'mustChangePw'> & { photo?: string | null },
    tempPw: string
  ) => {
    const id = 't_' + uid();
    const colors = ['#7C3AED', '#EC4899', '#2F6BFF', '#14B8A6', '#F59E0B', '#6366F1'];
    const color = colors[state.teachers.length % colors.length];

    const newTeacher: Teacher = {
      ...teacherData,
      id,
      color,
      photo: teacherData.photo || null,
      mustChangePw: false,
      passHash: tempPw.trim() || generate6CharPassword(teacherData.name, teacherData.phone),
      files: {},
    };

    setState((prev) => ({
      ...prev,
      teachers: [...prev.teachers, newTeacher],
    }));

    logActivity(`Added educator ${newTeacher.name}`);
    sound.playCompleteChime();
    onShowToast(`${newTeacher.name} enrolled with permanent access password`);
  };

  const handleUpdateTeacher = (updatedTeacher: Teacher) => {
    setState((prev) => ({
      ...prev,
      teachers: prev.teachers.map((t) => (t.id === updatedTeacher.id ? updatedTeacher : t)),
    }));
    logActivity(`Updated profile & details for ${updatedTeacher.name}`);
    sound.playCompleteChime();
    onShowToast(`Updated details for ${updatedTeacher.name}`);
  };

  const handleUpdateTeacherPhoto = (teacherId: string, photoDataUrl: string) => {
    setState((prev) => ({
      ...prev,
      teachers: prev.teachers.map((t) =>
        t.id === teacherId ? { ...t, photo: photoDataUrl } : t
      ),
    }));
    const teacher = state.teachers.find((t) => t.id === teacherId);
    logActivity(`Updated photo profile for ${teacher?.name || 'teacher'}`);
    onShowToast('Teacher photo updated');
  };

  const handleResetTeacherPassword = (teacherId: string, tempPw: string) => {
    const cleanPw = tempPw.trim();
    setState((prev) => ({
      ...prev,
      teachers: prev.teachers.map((t) =>
        t.id === teacherId ? { ...t, mustChangePw: false, passHash: cleanPw || t.passHash } : t
      ),
    }));
    const teacher = state.teachers.find((t) => t.id === teacherId);
    logActivity(`Set permanent password for ${teacher?.name || 'teacher'}`);
    sound.playCompleteChime();
    onShowToast(`Permanent password set for ${teacher?.name}`);
  };

  const handleDeleteTeacher = (teacherId: string) => {
    const teacher = state.teachers.find((t) => t.id === teacherId);
    setState((prev) => ({
      ...prev,
      teachers: prev.teachers.filter((t) => t.id !== teacherId),
      notices: prev.notices.filter((n) => n.ref !== teacherId),
    }));
    logActivity(`Permanently deleted teacher ${teacher?.name || ''}`);
    sound.playClick(400);
    onShowToast(`${teacher?.name || 'Teacher'} permanently removed`);
  };

  // PASSWORD CHANGE REQUEST HANDLERS
  const handleSubmitPasswordRequest = (
    reqData: Omit<PasswordChangeRequest, 'id' | 'requestedAt' | 'status'>
  ) => {
    const newReq: PasswordChangeRequest = {
      ...reqData,
      id: 'REQ-' + Math.floor(1000 + Math.random() * 9000),
      requestedAt: nairobiStamp(new Date()),
      status: 'pending',
    };

    setState((prev) => ({
      ...prev,
      passwordRequests: [newReq, ...(prev.passwordRequests || [])],
    }));

    logActivity(`Submitted password change request for ${newReq.name} (${newReq.id})`);
    onShowToast(`Password request ${newReq.id} submitted to queue`);
  };

  const handleApprovePasswordRequest = (requestId: string, tempPassword: string) => {
    setState((prev) => {
      const existingReqs = prev.passwordRequests || [];
      const targetReq = existingReqs.find((r) => r.id === requestId);
      if (!targetReq) return prev;

      // Update request status
      const updatedReqs = existingReqs.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: 'approved' as const,
              resolvedAt: nairobiStamp(new Date()),
              tempPasswordGenerated: tempPassword,
            }
          : r
      );

      // If teacher: flag mustChangePw & store temp passHash
      let updatedTeachers = prev.teachers;
      if (targetReq.userType === 'teacher') {
        const cleanPhone = digitsOnly(targetReq.identifier);
        const normPhone = cleanPhone.length >= 9 ? cleanPhone.slice(-9) : cleanPhone;
        updatedTeachers = prev.teachers.map((t) => {
          const tDigits = digitsOnly(t.phone);
          const tNorm = tDigits.length >= 9 ? tDigits.slice(-9) : tDigits;
          return tNorm === normPhone || t.name.toLowerCase() === targetReq.name.toLowerCase()
            ? { ...t, mustChangePw: true, passHash: tempPassword.trim() }
            : t;
        });
      }

      // If family: flag passwordReset & store temp passHash
      let updatedFamilies = prev.families;
      if (targetReq.userType === 'family') {
        const cleanPhone = digitsOnly(targetReq.identifier);
        const normPhone = cleanPhone.length >= 9 ? cleanPhone.slice(-9) : cleanPhone;
        updatedFamilies = prev.families.map((f) => {
          const fDigits = digitsOnly(f.phone);
          const fNorm = fDigits.length >= 9 ? fDigits.slice(-9) : fDigits;
          return fNorm === normPhone || targetReq.name.includes(f.id)
            ? { ...f, passwordReset: true, passHash: tempPassword.trim() }
            : f;
        });
      }

      // Send notice to user
      const newNotice = {
        id: 'notif_' + uid(),
        from: 'School Administration Office',
        role: 'admin' as const,
        title: `Temporary Password Issued (${targetReq.name})`,
        body: `Temporary password set for ${targetReq.name}. User must change it at next login.`,
        time: nairobiStamp(new Date()),
        unread: true,
        ref: requestId,
      };

      return {
        ...prev,
        teachers: updatedTeachers,
        families: updatedFamilies,
        passwordRequests: updatedReqs,
        notices: [newNotice, ...prev.notices],
      };
    });

    logActivity(`Approved password change request ${requestId}; temporary password issued`);
    onShowToast('Request approved & temporary credential issued');
  };

  const handleRejectPasswordRequest = (requestId: string, reason: string) => {
    setState((prev) => {
      const existingReqs = prev.passwordRequests || [];
      const updatedReqs = existingReqs.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: 'rejected' as const,
              resolvedAt: nairobiStamp(new Date()),
              notes: reason,
            }
          : r
      );

      return {
        ...prev,
        passwordRequests: updatedReqs,
      };
    });

    logActivity(`Rejected password request ${requestId}: ${reason}`);
    onShowToast('Password request marked as rejected');
  };

  const handleAddFilesToFolder = (teacherId: string, key: string, files: File[]) => {
    setState((prev) => {
      const teacher = prev.teachers.find((t) => t.id === teacherId);
      if (!teacher) return prev;

      const existingFiles = teacher.files[key] || [];
      const newFiles = files.map((f) => ({
        name: f.name,
        ext: (f.name.split('.').pop() || 'DOC').toUpperCase(),
      }));

      const updatedTeacher: Teacher = {
        ...teacher,
        files: {
          ...teacher.files,
          [key]: [...existingFiles, ...newFiles],
        },
      };

      return {
        ...prev,
        teachers: prev.teachers.map((t) =>
          t.id === teacherId ? updatedTeacher : t
        ),
      };
    });

    logActivity(`Uploaded ${files.length} resource file(s)`);
    onShowToast(`${files.length} resource(s) uploaded successfully`);
  };

  const handleRemoveFile = (teacherId: string, key: string, fileIdx: number) => {
    setState((prev) => {
      const teacher = prev.teachers.find((t) => t.id === teacherId);
      if (!teacher) return prev;

      const existingFiles = [...(teacher.files[key] || [])];
      existingFiles.splice(fileIdx, 1);

      return {
        ...prev,
        teachers: prev.teachers.map((t) =>
          t.id === teacherId
            ? {
                ...t,
                files: { ...t.files, [key]: existingFiles },
              }
            : t
        ),
      };
    });
    onShowToast('File removed');
  };

  // PUPIL HANDLERS
  const handleAdmitLearner = (
    learnerData: {
      name: string;
      grade: GradeName;
      stream: string;
      parentPhone: string;
      fatherRole?: PaternalRole;
      fatherName?: string;
      fatherPhone?: string;
      motherRole?: MaternalRole;
      motherName?: string;
      motherPhone?: string;
      permanentPassword?: string;
      parentPassword?: string;
    },
    oldAdmNumber?: string
  ) => {
    let assignedAdm = '';
    let nextAdmIndex = state.admNext;

    if (oldAdmNumber) {
      assignedAdm = oldAdmNumber;
    } else {
      assignedAdm = admFormat(nextAdmIndex);
      nextAdmIndex++;
    }

    const primaryPhone =
      learnerData.parentPhone || learnerData.fatherPhone || learnerData.motherPhone || '';
    const candidatePhones = [
      learnerData.fatherPhone,
      learnerData.motherPhone,
      learnerData.parentPhone,
    ].filter(Boolean) as string[];

    setState((prev) => {
      let targetFamilyId: string | null = null;
      let nextFamilies: Family[] = [...prev.families];

      // Match existing family using ANY parent/guardian phone number (Father/Grandfather OR Mother/Grandmother)
      const existingIdx = candidatePhones.length
        ? nextFamilies.findIndex((f) => {
            const fPhones = getFamilyPhones(f);
            return candidatePhones.some((cp) => fPhones.some((fp) => samePhone(cp, fp)));
          })
        : -1;

      const requestedParentPw = learnerData.parentPassword?.trim();

      if (existingIdx !== -1) {
        const existingFam = { ...nextFamilies[existingIdx] };
        targetFamilyId = existingFam.id;
        const primary = existingFam.phone || primaryPhone;
        const otherPhone = candidatePhones.find((p) => !samePhone(p, primary));
        existingFam.phone = primary;
        if (otherPhone) existingFam.secondaryPhone = otherPhone;
        if (learnerData.fatherRole) existingFam.fatherRole = learnerData.fatherRole;
        if (learnerData.fatherName) existingFam.fatherName = learnerData.fatherName;
        if (learnerData.fatherPhone) existingFam.fatherPhone = learnerData.fatherPhone;
        if (learnerData.motherRole) existingFam.motherRole = learnerData.motherRole;
        if (learnerData.motherName) existingFam.motherName = learnerData.motherName;
        if (learnerData.motherPhone) existingFam.motherPhone = learnerData.motherPhone;
        if (requestedParentPw) {
          existingFam.passHash = requestedParentPw;
          existingFam.passwordReset = false;
        } else if (!existingFam.passHash) {
          existingFam.passHash = generate6CharPassword(existingFam.head, existingFam.id);
        }
        nextFamilies[existingIdx] = existingFam;
      } else {
        // Always create a Family record for this learner (even if 1 child)
        const parentHeadName =
          learnerData.fatherName ||
          learnerData.motherName ||
          `${learnerData.name.split(' ')[0]}'s Family`;

        let maxNum = nextFamilies.length;
        for (const f of nextFamilies) {
          const m = f.id.match(/(\d+)$/);
          if (m) {
            const n = parseInt(m[1], 10);
            if (n > maxNum) maxNum = n;
          }
        }
        const newFamId = `FAM-${String(maxNum + 1).padStart(3, '0')}`;
        const secondPhone = candidatePhones.find((p) => !samePhone(p, primaryPhone)) || undefined;

        const newFamily: Family = {
          id: newFamId,
          head: parentHeadName,
          phone: primaryPhone,
          secondaryPhone: secondPhone,
          fatherRole: learnerData.fatherRole || 'Father',
          fatherName: learnerData.fatherName,
          fatherPhone: learnerData.fatherPhone,
          motherRole: learnerData.motherRole || 'Mother',
          motherName: learnerData.motherName,
          motherPhone: learnerData.motherPhone,
          passwordReset: false,
          passHash: requestedParentPw || generate6CharPassword(parentHeadName, newFamId),
        };
        nextFamilies.push(newFamily);
        targetFamilyId = newFamId;
      }

      const newLearner: Learner = {
        id: 'l_' + uid(),
        name: learnerData.name,
        adm: assignedAdm,
        grade: learnerData.grade,
        stream: learnerData.stream,
        parentPhone: primaryPhone,
        familyId: targetFamilyId,
        fatherRole: learnerData.fatherRole || 'Father',
        fatherName: learnerData.fatherName,
        fatherPhone: learnerData.fatherPhone,
        motherRole: learnerData.motherRole || 'Mother',
        motherName: learnerData.motherName,
        motherPhone: learnerData.motherPhone,
        permanentPassword:
          learnerData.permanentPassword?.trim() ||
          generate6CharPassword(learnerData.name, assignedAdm),
      };

      const reconciled = reconcileFamiliesFromLearners(
        [...prev.learners, newLearner],
        nextFamilies
      );

      return {
        ...prev,
        admNext: nextAdmIndex,
        admRegister: {
          ...prev.admRegister,
          [assignedAdm]: { inUse: true },
        },
        families: reconciled.families,
        learners: reconciled.learners,
      };
    });

    logActivity(`Admitted learner ${learnerData.name} as ${assignedAdm} and linked family account`);
    sound.playCompleteChime();
    window.dispatchEvent(new Event('lra_data_sync'));
    onShowToast(`${learnerData.name} admitted (${assignedAdm}) · Family & 6-char passwords ready`);
  };

  const handleBulkAdmitLearners = (
    learnersToAdmit: { name: string; grade: GradeName; stream: string }[]
  ) => {
    let currentNext = state.admNext;
    const newRegister = { ...state.admRegister };
    const createdLearners: Learner[] = [];

    learnersToAdmit.forEach((item) => {
      const adm = admFormat(currentNext);
      currentNext++;
      newRegister[adm] = { inUse: true };

      createdLearners.push({
        id: 'l_' + uid(),
        name: item.name,
        adm,
        grade: item.grade,
        stream: item.stream,
        parentPhone: '',
        familyId: null,
        permanentPassword: generate6CharPassword(item.name, adm),
      });
    });

    setState((prev) => {
      const reconciled = reconcileFamiliesFromLearners(
        [...prev.learners, ...createdLearners],
        prev.families
      );
      return {
        ...prev,
        admNext: currentNext,
        admRegister: newRegister,
        families: reconciled.families,
        learners: reconciled.learners,
      };
    });

    logActivity(`Bulk admitted ${createdLearners.length} pupils via CSV`);
    sound.playCompleteChime();
    onShowToast(`${createdLearners.length} pupils admitted & linked to Families`);
  };

  const handleDeleteLearner = (learnerId: string) => {
    const learner = state.learners.find((l) => l.id === learnerId);
    if (!learner) return;

    setState((prev) => {
      const reg = { ...prev.admRegister };
      if (reg[learner.adm]) {
        reg[learner.adm] = { inUse: false };
      }
      return {
        ...prev,
        admRegister: reg,
        learners: prev.learners.filter((l) => l.id !== learnerId),
      };
    });

    logActivity(`Permanently deleted learner ${learner.name} (${learner.adm})`);
    sound.playClick(400);
    onShowToast(`Learner ${learner.name} deleted; ${learner.adm} permanently retired`);
  };

  const handleUpdateLearner = (updatedLearner: Learner, parentPassword?: string) => {
    setState((prev) => {
      const candidatePhones = [
        updatedLearner.fatherPhone,
        updatedLearner.motherPhone,
        updatedLearner.parentPhone,
      ].filter(Boolean) as string[];

      let nextFamilies: Family[] = [...prev.families];
      let matchedIdx = updatedLearner.familyId
        ? nextFamilies.findIndex((f) => f.id === updatedLearner.familyId)
        : -1;

      if (matchedIdx === -1 && candidatePhones.length > 0) {
        matchedIdx = nextFamilies.findIndex((f) => {
          const fPhones = getFamilyPhones(f);
          return candidatePhones.some((cp) => fPhones.some((fp) => samePhone(cp, fp)));
        });
      }

      const cleanParentPw = parentPassword?.trim();

      if (matchedIdx !== -1) {
        const fam = { ...nextFamilies[matchedIdx] };
        const primary =
          updatedLearner.parentPhone ||
          updatedLearner.fatherPhone ||
          updatedLearner.motherPhone ||
          fam.phone;
        const otherPhone = candidatePhones.find((p) => !samePhone(p, primary));
        fam.phone = primary;
        fam.secondaryPhone = otherPhone || fam.secondaryPhone;
        if (updatedLearner.fatherRole) fam.fatherRole = updatedLearner.fatherRole;
        if (updatedLearner.fatherName !== undefined) fam.fatherName = updatedLearner.fatherName;
        if (updatedLearner.fatherPhone !== undefined) fam.fatherPhone = updatedLearner.fatherPhone;
        if (updatedLearner.motherRole) fam.motherRole = updatedLearner.motherRole;
        if (updatedLearner.motherName !== undefined) fam.motherName = updatedLearner.motherName;
        if (updatedLearner.motherPhone !== undefined) fam.motherPhone = updatedLearner.motherPhone;
        if (cleanParentPw) {
          fam.passHash = cleanParentPw;
          fam.passwordReset = false;
        }
        nextFamilies[matchedIdx] = fam;
      }

      const learnerWithFam: Learner = {
        ...updatedLearner,
        familyId:
          matchedIdx !== -1
            ? nextFamilies[matchedIdx].id
            : updatedLearner.familyId || null,
      };

      const nextLearners = prev.learners.map((l) =>
        l.id === updatedLearner.id ? learnerWithFam : l
      );

      const reconciled = reconcileFamiliesFromLearners(nextLearners, nextFamilies);

      // If a new family was just created for a previously unlinked learner and admin specified parentPassword, apply it
      let finalFamilies = reconciled.families;
      if (cleanParentPw && matchedIdx === -1) {
        const updatedL = reconciled.learners.find((l) => l.id === updatedLearner.id);
        if (updatedL?.familyId) {
          finalFamilies = finalFamilies.map((f) =>
            f.id === updatedL.familyId
              ? { ...f, passHash: cleanParentPw, passwordReset: false }
              : f
          );
        }
      }

      return {
        ...prev,
        families: finalFamilies,
        learners: reconciled.learners,
      };
    });

    logActivity(`Updated details for learner ${updatedLearner.name} (${updatedLearner.adm})`);
    sound.playCompleteChime();
    onShowToast(`Updated learner & guardian profile for ${updatedLearner.name}`);
  };

  // FAMILY HANDLERS
  const handleAddFamily = (familyData: {
    head: string;
    phone: string;
    secondaryPhone?: string;
    passHash?: string;
  }) => {
    const newId = `FAM-${String(state.families.length + 1).padStart(3, '0')}`;
    const newFamily: Family = {
      id: newId,
      head: familyData.head,
      phone: familyData.phone,
      secondaryPhone: familyData.secondaryPhone?.trim() || undefined,
      passHash:
        familyData.passHash?.trim() || generate6CharPassword(familyData.head, newId),
      passwordReset: false,
    };

    setState((prev) => ({
      ...prev,
      families: [...prev.families, newFamily],
    }));

    logActivity(`Created family account for ${newFamily.head} (${newId})`);
    sound.playCompleteChime();
    onShowToast(`Family ${newId} registered with 6-character shared password`);
  };

  const handleRegenerateFamilyPassword = (familyId: string) => {
    const family = state.families.find((f) => f.id === familyId);
    if (!family) return;
    const newPw = generate6CharPassword(family.head, `${family.id}_${Date.now()}`);
    setState((prev) => ({
      ...prev,
      families: prev.families.map((f) =>
        f.id === familyId ? { ...f, passHash: newPw, passwordReset: false } : f
      ),
    }));
    logActivity(`Generated new 6-character shared parent password for ${family.head} (${family.id})`);
    sound.playCompleteChime();
    onShowToast(`New 6-char shared password for ${family.head}: ${newPw}`);
  };

  const handleLinkSibling = (learnerId: string, familyId: string) => {
    const learner = state.learners.find((l) => l.id === learnerId);
    const family = state.families.find((f) => f.id === familyId);

    setState((prev) => ({
      ...prev,
      learners: prev.learners.map((l) =>
        l.id === learnerId ? { ...l, familyId } : l
      ),
    }));

    logActivity(`Linked pupil ${learner?.name} to family ${family?.head}`);
    sound.playCompleteChime();
    onShowToast(`${learner?.name} linked to ${family?.head}`);
  };

  const handleSendFamilyNotice = (familyId: string, message: string) => {
    const family = state.families.find((f) => f.id === familyId);
    const newNotice = {
      id: 'notif_' + uid(),
      from: 'School Administration',
      role: 'admin' as const,
      title: `Notice to Family (${family?.head})`,
      body: message,
      time: nairobiStamp(new Date()),
      unread: true,
      ref: familyId,
    };

    setState((prev) => ({
      ...prev,
      notices: [newNotice, ...prev.notices],
    }));

    logActivity(`Sent direct notice to ${family?.head}`);
    sound.playCompleteChime();
    onShowToast('Notice sent to family');
  };

  const handleUpdateFamily = (updatedFamily: Family) => {
    setState((prev) => {
      const nextFamilies = prev.families.map((f) =>
        f.id === updatedFamily.id ? updatedFamily : f
      );
      const nextLearners = prev.learners.map((l) => {
        if (l.familyId !== updatedFamily.id) return l;
        return {
          ...l,
          parentPhone:
            updatedFamily.phone ||
            updatedFamily.fatherPhone ||
            updatedFamily.motherPhone ||
            l.parentPhone,
          fatherRole: updatedFamily.fatherRole || l.fatherRole,
          fatherName:
            updatedFamily.fatherName !== undefined ? updatedFamily.fatherName : l.fatherName,
          fatherPhone:
            updatedFamily.fatherPhone !== undefined ? updatedFamily.fatherPhone : l.fatherPhone,
          motherRole: updatedFamily.motherRole || l.motherRole,
          motherName:
            updatedFamily.motherName !== undefined ? updatedFamily.motherName : l.motherName,
          motherPhone:
            updatedFamily.motherPhone !== undefined ? updatedFamily.motherPhone : l.motherPhone,
        };
      });
      return {
        ...prev,
        families: nextFamilies,
        learners: nextLearners,
      };
    });
    logActivity(`Updated family profile & phones for ${updatedFamily.head} (${updatedFamily.id})`);
    sound.playCompleteChime();
    onShowToast(`Updated ${updatedFamily.head} (${updatedFamily.phone})`);
  };

  const handleResetFamilyAccess = (familyId: string) => {
    const family = state.families.find((f) => f.id === familyId);
    setState((prev) => ({
      ...prev,
      families: prev.families.map((f) =>
        f.id === familyId ? { ...f, passwordReset: true } : f
      ),
    }));
    logActivity(`Reset access password for ${family?.head}`);
    onShowToast(`Access reset for ${family?.head}`);
  };

  const handleDeleteFamily = (familyId: string) => {
    const family = state.families.find((f) => f.id === familyId);
    setState((prev) => ({
      ...prev,
      families: prev.families.filter((f) => f.id !== familyId),
      learners: prev.learners.map((l) =>
        l.familyId === familyId ? { ...l, familyId: null } : l
      ),
    }));
    logActivity(`Deleted family ${family?.head} (${familyId})`);
    onShowToast(`Family ${familyId} deleted`);
  };

  const handleResolveCollision = (phoneDigits: string, choice: 'same' | 'separate') => {
    setState((prev) => ({
      ...prev,
      clashResolved: {
        ...(prev.clashResolved || {}),
        [phoneDigits]: choice,
      },
    }));
    logActivity(`Resolved phone collision on ${phoneDigits} as ${choice}`);
    onShowToast(choice === 'same' ? 'Marked as same household' : 'Marked as separate contact');
  };

  // TIMETABLE HANDLERS (Connects the 4 Portals: Admin, Teachers, Learners, Parents)
  const handleSaveTimetableCell = (
    day: string,
    slotKey: string,
    grade: GradeName,
    cell: TimetableCell | null
  ) => {
    const res = persistTimetableCellChange(day, slotKey, grade, cell);
    setState((prev) => ({
      ...prev,
      timetable: res.timetable,
      teachers: res.teachers,
      freeze: res.freeze,
    }));

    const teacherName = cell?.teacherId
      ? res.teachers.find((t) => t.id === cell.teacherId)?.name || 'Faculty Teacher'
      : '';

    if (cell) {
      logActivity(`Assigned ${grade} ${cell.subject} on ${day} (${slotKey}) to ${teacherName}`);
      onShowToast(`✓ Timetable saved: ${grade} · ${cell.subject} (${teacherName})`);
    } else {
      logActivity(`Cleared timetable slot for ${grade} on ${day} (${slotKey})`);
      onShowToast(`✓ Timetable slot cleared for ${grade}`);
    }
  };

  const handleSaveTimetableSlots = (slots: TimetableSlotDef[]) => {
    const res = persistTimetableSlotsChange(slots);
    setState((prev) => ({
      ...prev,
      timetableSlots: res.slots,
      timetable: res.timetable,
      teachers: res.teachers,
      freeze: res.freeze,
    }));
    logActivity(`Updated school timetable bell slots (${res.slots.length} periods)`);
    sound.playCompleteChime();
    onShowToast('✓ Timetable time slots saved & synced across all member portals');
  };

  const handleSetFreeze = (freeze: { from: string; to: string; why: string } | null) => {
    const res = persistTimetableFreezeChange(freeze);
    setState((prev) => ({
      ...prev,
      freeze: res.freeze,
      timetable: res.timetable,
      teachers: res.teachers,
    }));
    if (freeze) {
      logActivity(`Frozen timetable across all 4 portals from ${freeze.from} to ${freeze.to} (${freeze.why})`);
      onShowToast(`❄️ Timetable locked for ${freeze.why}`);
    } else {
      logActivity('Unfroze timetable schedule across all 4 portals');
      onShowToast('Timetable unfrozen. Normal lesson bells resumed.');
    }
  };

  // PROMOTION HANDLER (Starts/updates 30-day deletion window & advances grades cleanly)
  const handleExecutePromotion = () => {
    const now = Date.now();
    const snapBefore = getAcademicLifecycleSnapshot(state, now);

    setState((prev) => {
      const { updatedLearners } = promoteLearnersArrayNextClass(prev.learners, now);
      return markLocalAdminModified({
        ...prev,
        learners: updatedLearners,
        promotedAt: nairobiStamp(new Date(now)),
        promotedTimestamp: now,
        assessmentRetentionPurgedAt: null,
        completedPromotionCycleKey: null,
      });
    });

    syncAdminTermsToCalendarStorage(state.terms, now, snapBefore.academicYear + 1);
    const nextSnap = getAcademicLifecycleSnapshot(
      { ...state, promotedTimestamp: now, assessmentRetentionPurgedAt: null, completedPromotionCycleKey: null },
      now
    );
    dispatchTerm3CountdownNotifications(nextSnap, { forceManualReminder: true });
    logActivity('Executed CBC End-of-Year Promotion: learners moved to next class, 30-day assessment book deletion countdown started');
  };

  const handlePurgeOldAssessments = async () => {
    const res = await purgeAllAssessmentBooksAndRecords();
    const snap = getAcademicLifecycleSnapshot(state);
    setState((prev) =>
      markLocalAdminModified({
        ...prev,
        promotedTimestamp: null,
        assessmentRetentionPurgedAt: res.clearedAt,
        completedPromotionCycleKey: snap.term3CycleKey,
      })
    );
    const postSnap = getAcademicLifecycleSnapshot({
      ...state,
      assessmentRetentionPurgedAt: res.clearedAt,
      completedPromotionCycleKey: snap.term3CycleKey,
    });
    dispatchTerm3CountdownNotifications(postSnap);
    logActivity(`Completed 30-day assessment book erasure (${res.marksCleared} strand mark record(s) deleted across local, IndexedDB & cloud)`);
    onShowToast(`Deleted old assessment books (${res.marksCleared} record(s) cleared cleanly)`);
  };

  const handlePurgeOldMessages = () => {
    setState((prev) => {
      const { retained, purgedCount } = cleanExpiredMessages(prev.messages);
      if (purgedCount > 0) {
        logActivity(`Cleaned ${purgedCount} AI chat message(s) older than 24 hours`);
      }
      return {
        ...prev,
        messages: retained,
      };
    });
  };

  // STUDENT GOVERNMENT COUNCIL HANDLER
  const handleUpdateStudentCouncil = (updatedCouncil: Record<string, string | null>) => {
    setState((prev) => ({
      ...prev,
      studentCouncil: updatedCouncil,
    }));
    logActivity('Updated Student Government & Prefect Council appointments');
  };

  // BROADCAST NOTICE
  const handleBroadcastNotice = (title: string, body: string, recipient: string) => {
    const newNotice = {
      id: 'notif_' + uid(),
      from: 'School Administration',
      role: 'admin' as const,
      title,
      body: `${body} (${recipient})`,
      time: nairobiStamp(new Date()),
      unread: true,
      ref: null,
    };

    setState((prev) => ({
      ...prev,
      notices: [newNotice, ...prev.notices],
    }));

    logActivity(`Broadcasted notice: "${title}" to ${recipient}`);
  };

  // CLEAR CHAT BACKLOG
  const handleClearAllMessages = () => {
    setState((prev) => ({
      ...prev,
      messages: [
        {
          id: 'msg_welcome_' + Date.now(),
          from: 'ai' as const,
          text: '🌹 Chat history has been cleared to prevent memory buildup. All official faculty, pupil, timetable, and activity records remain completely intact. How can I assist you?',
          at: Date.now(),
          stamp: nairobiStamp(new Date()),
        },
      ],
    }));
    logActivity('Cleared ELSIE AI chat history');
    sound.playCompleteChime();
    onShowToast('✓ Chat history cleared successfully');
  };

  const handleApproveDraft = (messageId: string, draft: ProposedDraft) => {
    const payload = draft.payload || {};

    // 1. ADMIT LEARNER
    if (draft.type === 'admit_learner' || draft.type === 'admit') {
      const learnerName = payload.name || draft.name || 'New Learner';
      const gradeName = (payload.grade || draft.grade || 'Grade 1') as GradeName;
      const stream = '';
      const parentPhone = payload.parentPhone || '0711 000 000';
      handleAdmitLearner({
        name: learnerName,
        grade: gradeName,
        stream,
        parentPhone,
      });
    }
    // 2. DELETE LEARNER
    else if (draft.type === 'delete_learner') {
      const learnerId = payload.id || draft.id;
      if (learnerId) {
        handleDeleteLearner(learnerId);
      }
    }
    // 3. ADD TEACHER
    else if (draft.type === 'add_teacher') {
      const teacherName = payload.name || draft.name || 'New Teacher';
      const phone = payload.phone || '0722 000 000';
      const subjects = payload.subjects || ['Mathematics'];
      const grades = (payload.grades || ['Grade 4']) as GradeName[];
      const newTeacherId = 't_' + teacherName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) + '_' + Date.now().toString().slice(-4);
      const newTeacher: Teacher = {
        id: newTeacherId,
        name: teacherName.startsWith('Tr.') ? teacherName : `Tr. ${teacherName}`,
        phone,
        subjects,
        grades,
        color: '#7C3AED',
        photo: null,
        mustChangePw: false,
        passHash: (payload.passHash || generate6CharPassword(teacherName, phone)).trim(),
        files: {
          [`${newTeacherId}|${grades[0]}|${subjects[0]}|Schemes of work`]: [
            { name: `${grades[0]}_${subjects[0].split(' ')[0]}_Term1_Scheme.pdf`, ext: 'PDF' },
          ],
        },
      };
      setState((prev) => ({
        ...prev,
        teachers: [...prev.teachers, newTeacher],
      }));
      logActivity(`Added faculty member via approved draft: ${newTeacher.name} (${newTeacher.phone})`);
    }
    // 4. DELETE TEACHER
    else if (draft.type === 'delete_teacher') {
      const teacherId = payload.id || draft.id;
      if (teacherId) {
        handleDeleteTeacher(teacherId);
      }
    }
    // 5. FREEZE TIMETABLE
    else if (draft.type === 'freeze' || draft.type === 'freeze_timetable') {
      const fromStr = draft.from || payload.from || new Date().toISOString().slice(0, 10);
      const toDate = new Date(Date.now() + 14 * 864e5);
      const toStr = draft.to || payload.to || toDate.toISOString().slice(0, 10);
      handleSetFreeze({
        from: fromStr,
        to: toStr,
        why: draft.why || payload.why || 'Examinations Period',
      });
    }
    // 6. BROADCAST NOTICE
    else if (draft.type === 'notice' || draft.type === 'broadcast_notice') {
      const title = payload.title || 'Official School Notice';
      const content = payload.content || draft.summary;
      const recipient = payload.targetPortal || 'All Portals';
      handleBroadcastNotice(title, content, recipient);
    }
    // 7. PUSH RESOURCE OR CBC LESSON NOTES
    else if (draft.type === 'push_resource' || draft.type === 'lesson_notes') {
      const targetTeacher = state.teachers[0];
      if (targetTeacher) {
        const rawTitle = payload.title || draft.summary || 'CBC_Learning_Resource';
        const fileName = rawTitle.replace(/[^a-zA-Z0-9_-]/g, '_') + '.pdf';
        const folderKey = `${targetTeacher.id}|${targetTeacher.grades[0] || 'Grade 4'}|${targetTeacher.subjects[0] || 'Mathematics'}|Schemes of work`;
        setState((prev) => {
          const updated = prev.teachers.map((t) => {
            if (t.id !== targetTeacher.id) return t;
            const current = t.files[folderKey] || [];
            return {
              ...t,
              files: {
                ...t.files,
                [folderKey]: [...current, { name: fileName, ext: 'PDF' }],
              },
            };
          });
          return { ...prev, teachers: updated };
        });
        logActivity(`Pushed approved CBC resource: "${fileName}" to teacher lockers`);
      }
    }

    // Mark draft as approved and executed
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.id === messageId ? { ...m, done: 'Approved & executed in school records' } : m
      ),
    }));

    sound.playCompleteChime();
    onShowToast('✓ Action approved and updated in school records');
  };

  const handleRejectDraft = (messageId: string) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.id === messageId ? { ...m, done: 'Draft rejected. Nothing changed.' } : m
      ),
    }));
    onShowToast('Draft rejected');
  };

  const handleUpdateDraft = (messageId: string, updatedDraft: ProposedDraft) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.id === messageId ? { ...m, draft: updatedDraft } : m
      ),
    }));
  };

  // Determine Subtitle
  const getSubtitle = () => {
    if (subView === 'messages') return 'ELSIE · Learn • Love • Lead';
    if (subView === 'timetable') return 'Timetable & Conflict Engine';
    if (subView === 'calendar') return 'Calendar & EAT Live Clock';
    if (subView === 'resources') return 'Curriculum Resource Repository';
    if (subView === 'promotion') return 'CBC Term 3 Promotion Hub';
    if (subView === 'assessment') return 'CBC Assessment Pipeline & Moderation';
    if (subView === 'notices') return 'Broadcast Notice Center';
    if (subView === 'settings') return 'Settings & Governance';

    switch (state.tab) {
      case 'home':
        return 'Administrator Office · Nakuru';
      case 'teachers':
        return 'Teaching Faculty';
      case 'pupils':
        return 'Pupils Directory (Grades 1–6)';
      case 'families':
        return 'Parent & Guardian Households';
      case 'more':
        return 'Administrative Modules';
    }
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col overflow-hidden ${
        isDark ? 'bg-[#0A0F1F] text-[#EEF2FF]' : 'bg-[#EEF2FA] text-[#0F1B33]'
      }`}
    >
      {/* Header */}
      <header className="w-full max-w-full overflow-hidden bg-gradient-to-r from-[#0A1F4D] to-[#1A3A8F] text-white p-3 sm:px-4 sm:py-3.5 rounded-b-[26px] shadow-lg shrink-0 z-20">
        <div className="flex items-center justify-between gap-2 sm:gap-2.5 min-w-0">
          {/* Back button: only when inside an active subview (not on frontview) */}
          {subView && (
            <button
              onClick={handleBack}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-base font-bold shrink-0 cursor-pointer transition-colors"
              aria-label="Back"
            >
              ←
            </button>
          )}

          {/* School Crest */}
          <img
            src="/images/lra_crest.jpg"
            alt="Little Roses Academy crest"
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-pink-200 shrink-0 bg-white shadow-xs"
          />

          {/* Titles */}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-base font-extrabold truncate leading-tight">
              {state.school.name}
            </h1>
            <p className="text-[11px] text-[#C7D7FF] truncate font-medium mt-0.5">
              {getSubtitle()}
            </p>
          </div>

          {/* Single Scoped Admin Notification Bell */}
          <button
            type="button"
            onClick={() => {
              sound.playClick(520);
              window.dispatchEvent(
                new CustomEvent('lra-open-notification-setup', {
                  detail: {
                    portalId: 'admin',
                    userId: 'admin_office',
                    userName: 'Administrator',
                    initialView: 'inbox',
                  },
                })
              );
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-sm relative shrink-0 cursor-pointer transition-colors"
            title="Admin Notifications & Inbox"
            aria-label="Open Admin Notifications"
          >
            🔔
            {unreadNoticesCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center px-1 border-2 border-[#0A1F4D]">
                {unreadNoticesCount > 99 ? '99+' : unreadNoticesCount}
              </span>
            )}
          </button>

          {/* Password Requests Queue Button */}
          <button
            onClick={() => {
              sound.playClick(500);
              setShowPasswordRequestModal(true);
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-sm relative shrink-0 cursor-pointer transition-colors"
            title="Password Change Requests Queue"
          >
            🔐
            {pendingPasswordRequestsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center px-1 border-2 border-[#0A1F4D] animate-pulse">
                {pendingPasswordRequestsCount}
              </span>
            )}
          </button>
        </div>

        {/* Second Row: Term pill & Theme Toggle */}
        <div className="flex flex-wrap items-center justify-between mt-2.5 pt-1.5 border-t border-white/10 gap-1.5 text-xs min-w-0">
          <div className="flex items-center gap-1.5 bg-white/15 py-1 px-2.5 rounded-full text-[11px] font-bold min-w-0 max-w-[66%]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="truncate">
              {activeTerm ? `Current: ${activeTerm}` : 'Term dates Configured'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Theme switcher */}
            <div className="flex items-center bg-white/15 rounded-full p-0.5">
              <button
                onClick={() => handleToggleTheme('light')}
                className={`py-0.5 px-1.5 sm:px-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  !isDark ? 'bg-white text-slate-900 shadow-xs' : 'text-white/70'
                }`}
                title="Light theme"
              >
                ☀️
              </button>
              <button
                onClick={() => handleToggleTheme('dark')}
                className={`py-0.5 px-1.5 sm:px-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isDark ? 'bg-white text-slate-900 shadow-xs' : 'text-white/70'
                }`}
                title="Dark theme"
              >
                🌙
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 pb-4">
        {/* Subviews if navigated from quick actions or More */}
        {subView === 'ai_service' ? (
          <AdminAIService
            state={state}
            onUpdateTeachers={(teachers) => {
              setState((prev) => ({ ...prev, teachers }));
            }}
            onUpdateTimetable={(timetable) => {
              setState((prev) => ({ ...prev, timetable }));
            }}
            onUpdateInterPortalMessages={(interPortalMessages) => {
              setState((prev) => ({ ...prev, interPortalMessages }));
            }}
            onPurgeOldMessages={handlePurgeOldMessages}
            onClearAllMessages={handleClearAllMessages}
            onShowToast={onShowToast}
            onLogActivity={logActivity}
            onBackToMessages={() => setSubView('messages')}
          />
        ) : subView === 'messages' ? (
          <div className="h-full min-h-[420px] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm">
            <ElsieChatView
              identity={adminIdentity}
              onClose={() => setSubView(null)}
              quickPrompts={[
                "Track pending marks submissions",
                "Check term release readiness",
                "Review 30-day promotion status",
                "Summarize learner attendance across grades",
                "Habari za asubuhi",
              ]}
              theme={state.theme === "dark" ? "dark" : "light"}
            />
          </div>
        ) : subView === 'timetable' ? (
          <AdminTimetable
            state={state}
            onSaveTimetableCell={handleSaveTimetableCell}
            onSaveTimetableSlots={handleSaveTimetableSlots}
            onSetFreeze={handleSetFreeze}
            onShowToast={onShowToast}
          />
        ) : subView === 'calendar' ? (
          <AdminCalendar
            state={state}
            onOpenTermDates={() => setSubView('settings')}
          />
        ) : subView === 'resources' ? (
          <AdminResources
            state={state}
            onOpenAddResource={() => setShowQuickAddResource(true)}
          />
        ) : subView === 'promotion' ? (
          <AdminPromotion
            state={state}
            onExecutePromotion={handleExecutePromotion}
            onPurgeOldAssessments={handlePurgeOldAssessments}
            onOpenTermDates={() => setSubView('settings')}
            onOpenFreezeTimetable={() => setSubView('timetable')}
            onSendReminder={() => {
              const snap = getAcademicLifecycleSnapshot(state);
              const sent = dispatchTerm3CountdownNotifications(snap, { forceManualReminder: true });
              logActivity(`Sent Term 3 countdown reminder to Parents & Learners Notifications UI`);
              onShowToast(
                sent > 0
                  ? '✓ Sent 30-day download & promotion reminder to Parents & Learners'
                  : '✓ Reminder queued for Parents & Learners'
              );
            }}
            onShowToast={onShowToast}
          />
        ) : subView === 'assessment' ? (
          <div className="p-2 sm:p-4 animate-fade-in">
            <AssessmentPwaView
              initialRole="admin"
              onClose={() => setSubView(null)}
            />
          </div>
        ) : subView === 'notices' ? (
          <AdminNotices
            state={state}
            onBroadcastNotice={handleBroadcastNotice}
            onShowToast={onShowToast}
          />
        ) : subView === 'settings' ? (
          <AdminSettings
            state={state}
            onUpdateSchool={(profile) => {
              setState((prev) => markLocalAdminModified({ ...prev, school: profile }));
              logActivity('Updated school profile');
            }}
            onUpdateTerms={(terms) => {
              syncAdminTermsToCalendarStorage(terms, state.promotedTimestamp);
              setState((prev) => {
                const next = markLocalAdminModified({ ...prev, terms });
                runAcademicLifecycleAutomation({ currentAdminState: next }).catch(console.warn);
                return next;
              });
              logActivity('Updated academic term milestones (synced to Promotion & 30-Day Lifecycle)');
            }}
            onUpdateAdminAuth={(adminAuth) => {
              setState((prev) => ({ ...prev, admin: adminAuth }));
              logActivity('Updated Administrator security credentials and master password');
              onShowToast('Admin security credentials updated successfully');
            }}
            onUpdateAIServiceConfig={(cfg) => {
              setState((prev) => ({ ...prev, aiServiceConfig: cfg }));
              logActivity('Updated Elsie service and auto-purge settings');
            }}
            onUpdateLearners={(newLearners) => {
              setState((prev) => ({ ...prev, learners: newLearners }));
              logActivity('Updated learner permanent passwords and portal PINs');
            }}
            onToggleTheme={handleToggleTheme}
            onLeavePortal={onExitPortal}
            onShowToast={onShowToast}
          />
        ) : (
          /* Primary 5 Tabs */
          <>
            {state.tab === 'home' && (
              <AdminHome
                state={state}
                onNavigateTab={handleSwitchTab}
                onOpenQuickAction={(action) => {
                  if (action === 'records' || action === 'add_resource') {
                    setSubView('resources');
                  } else if (action === 'messages') {
                    setSubView('messages');
                  } else if (action === 'timetable') {
                    setSubView('timetable');
                  } else if (action === 'promotion') {
                    setSubView('promotion');
                  } else if (action === 'notices') {
                    window.dispatchEvent(
                      new CustomEvent('lra-open-notification-setup', {
                        detail: {
                          portalId: 'admin',
                          userId: 'admin_office',
                          userName: 'Administrator',
                          initialView: 'inbox',
                        },
                      })
                    );
                  } else if (action === 'activity_log') {
                    setSubView('settings');
                  } else if (action === 'password_requests') {
                    setShowPasswordRequestModal(true);
                  } else if (action === 'ai_service') {
                    setSubView('ai_service');
                  }
                }}
                unreadCount={unreadNoticesCount}
              />
            )}

            {state.tab === 'teachers' && (
              <AdminTeachers
                state={state}
                onAddTeacher={handleAddTeacher}
                onUpdateTeacherPhoto={handleUpdateTeacherPhoto}
                onUpdateTeacher={handleUpdateTeacher}
                onResetTeacherPassword={handleResetTeacherPassword}
                onDeleteTeacher={handleDeleteTeacher}
                onAddFilesToFolder={handleAddFilesToFolder}
                onRemoveFile={handleRemoveFile}
                onShowToast={onShowToast}
              />
            )}

            {state.tab === 'pupils' && (
              <AdminPupils
                state={state}
                onAdmitLearner={handleAdmitLearner}
                onBulkAdmitLearners={handleBulkAdmitLearners}
                onUpdateLearner={handleUpdateLearner}
                onDeleteLearner={handleDeleteLearner}
                onShowToast={onShowToast}
              />
            )}

            {state.tab === 'families' && (
              <AdminFamilies
                state={state}
                onAddFamily={handleAddFamily}
                onUpdateFamily={handleUpdateFamily}
                onLinkSibling={handleLinkSibling}
                onSendFamilyNotice={handleSendFamilyNotice}
                onResetFamilyAccess={handleResetFamilyAccess}
                onRegenerateFamilyPassword={handleRegenerateFamilyPassword}
                onDeleteFamily={handleDeleteFamily}
                onResolveCollision={handleResolveCollision}
                onShowToast={onShowToast}
              />
            )}

            {state.tab === 'more' && (
              <div className="space-y-4 animate-fade-in pb-4">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Administrative Modules
                </h2>

                <div className="grid grid-cols-2 gap-3">

                  <div
                    onClick={() => {
                      sound.playClick(500);
                      setSubView('timetable');
                    }}
                    className="p-4 rounded-2xl text-white shadow-sm cursor-pointer transition-transform hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, #2F6BFF, #60A5FA)' }}
                  >
                    <div className="text-2xl mb-1">🗓️</div>
                    <div className="font-black text-sm">Timetable & Schedule</div>
                    <div className="text-[10px] text-white/80 mt-0.5">
                      40-min slots & conflict alerts
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      sound.playClick(500);
                      setSubView('calendar');
                    }}
                    className="p-4 rounded-2xl text-white shadow-sm cursor-pointer transition-transform hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, #A855F7, #D946EF)' }}
                  >
                    <div className="text-2xl mb-1">📅</div>
                    <div className="font-black text-sm">Calendar & Nairobi Time</div>
                    <div className="text-[10px] text-white/80 mt-0.5">
                      Live clock & term milestones
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      sound.playClick(500);
                      setSubView('resources');
                    }}
                    className="p-4 rounded-2xl text-white shadow-sm cursor-pointer transition-transform hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, #22C55E, #86EFAC)' }}
                  >
                    <div className="text-2xl mb-1">📊</div>
                    <div className="font-black text-sm">Assessment & Attendance</div>
                    <div className="text-[10px] text-white/80 mt-0.5">
                      Learner CBC records & presence
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      sound.playClick(500);
                      setSubView('promotion');
                    }}
                    className="p-4 rounded-2xl text-white shadow-sm cursor-pointer transition-transform hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, #F59E0B, #FBBF24)' }}
                  >
                    <div className="text-2xl mb-1">🎓</div>
                    <div className="font-black text-sm">CBC Promotion</div>
                    <div className="text-[10px] text-white/80 mt-0.5">
                      End of Term 3 progression
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      sound.playClick(500);
                      setSubView('notices');
                    }}
                    className="p-4 rounded-2xl text-white shadow-sm cursor-pointer transition-transform hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, #EC4899, #F472B6)' }}
                  >
                    <div className="text-2xl mb-1">📢</div>
                    <div className="font-black text-sm">Notice Board</div>
                    <div className="text-[10px] text-white/80 mt-0.5">
                      Broadcast to school community
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      sound.playClick(500);
                      setShowStudentGovModal(true);
                    }}
                    className="p-4 rounded-2xl text-white shadow-sm cursor-pointer transition-transform hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)' }}
                  >
                    <div className="text-2xl mb-1">👑</div>
                    <div className="font-black text-sm">Student Government</div>
                    <div className="text-[10px] text-white/80 mt-0.5">
                      Prefect council & duties
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      sound.playClick(500);
                      setSubView('settings');
                    }}
                    className="p-4 rounded-2xl text-white shadow-sm cursor-pointer transition-transform hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, #0EA5E9, #38BDF8)' }}
                  >
                    <div className="text-2xl mb-1">⚙️</div>
                    <div className="font-black text-sm">System Settings</div>
                    <div className="text-[10px] text-white/80 mt-0.5">
                      School profile, terms & themes
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Docked Bottom Navigation Pill (Dark navy pill; docked below main so content never slides underneath) */}
      <div className="shrink-0 px-2.5 sm:px-3 pt-1 pb-2.5 z-30">
        <nav className="bg-gradient-to-r from-[#0A1F4D] to-[#14296B] rounded-[24px] p-1.5 shadow-[0_8px_22px_rgba(10,31,77,0.45)] flex items-center justify-between border border-white/10">
          <button
            onClick={() => handleSwitchTab('home')}
            className={`min-w-0 flex-1 py-1.5 px-0.5 rounded-2xl flex flex-col items-center gap-0.5 text-[10px] sm:text-[11px] font-extrabold cursor-pointer transition-all ${
              state.tab === 'home' && !subView
                ? 'bg-gradient-to-r from-[#2F6BFF] to-[#4F8BFF] text-white shadow-md'
                : 'text-[#B8C6E8] hover:text-white'
            }`}
          >
            <span className="text-base leading-none">🏠</span>
            <span className="w-full truncate text-center">Home</span>
          </button>

          <button
            onClick={() => handleSwitchTab('teachers')}
            className={`min-w-0 flex-1 py-1.5 px-0.5 rounded-2xl flex flex-col items-center gap-0.5 text-[10px] sm:text-[11px] font-extrabold cursor-pointer transition-all ${
              state.tab === 'teachers' && !subView
                ? 'bg-gradient-to-r from-[#2F6BFF] to-[#4F8BFF] text-white shadow-md'
                : 'text-[#B8C6E8] hover:text-white'
            }`}
          >
            <span className="text-base leading-none">👩‍🏫</span>
            <span className="w-full truncate text-center">Teachers</span>
          </button>

          <button
            onClick={() => handleSwitchTab('pupils')}
            className={`min-w-0 flex-1 py-1.5 px-0.5 rounded-2xl flex flex-col items-center gap-0.5 text-[10px] sm:text-[11px] font-extrabold cursor-pointer transition-all ${
              state.tab === 'pupils' && !subView
                ? 'bg-gradient-to-r from-[#2F6BFF] to-[#4F8BFF] text-white shadow-md'
                : 'text-[#B8C6E8] hover:text-white'
            }`}
          >
            <span className="text-base leading-none">🎓</span>
            <span className="w-full truncate text-center">Pupils</span>
          </button>

          <button
            onClick={() => handleSwitchTab('families')}
            className={`min-w-0 flex-1 py-1.5 px-0.5 rounded-2xl flex flex-col items-center gap-0.5 text-[10px] sm:text-[11px] font-extrabold cursor-pointer transition-all ${
              state.tab === 'families' && !subView
                ? 'bg-gradient-to-r from-[#2F6BFF] to-[#4F8BFF] text-white shadow-md'
                : 'text-[#B8C6E8] hover:text-white'
            }`}
          >
            <span className="text-base leading-none">👨‍👩‍👧</span>
            <span className="w-full truncate text-center">Families</span>
          </button>

          <button
            onClick={() => handleSwitchTab('more')}
            className={`min-w-0 flex-1 py-1.5 px-0.5 rounded-2xl flex flex-col items-center gap-0.5 text-[10px] sm:text-[11px] font-extrabold cursor-pointer transition-all ${
              state.tab === 'more' || subView
                ? 'bg-gradient-to-r from-[#2F6BFF] to-[#4F8BFF] text-white shadow-md'
                : 'text-[#B8C6E8] hover:text-white'
            }`}
          >
            <span className="text-base leading-none">⋯</span>
            <span className="w-full truncate text-center">More</span>
          </button>
        </nav>
      </div>

      {/* Portal exit prompt is managed centrally by App.tsx via phone Back button */}

      {/* Modal: Quick Add Resource Shortcut */}
      {showQuickAddResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl ${
              isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <h3 className="text-base font-black mb-1">Add Resource for Teacher</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Select the educator to open their curriculum resource explorer.
            </p>

            <div className="space-y-3 mb-4">
              <select
                value={quickResourceTeacherId}
                onChange={(e) => setQuickResourceTeacherId(e.target.value)}
                className={`w-full p-2.5 rounded-xl text-xs border font-bold ${
                  isDark ? 'bg-[#0A0F1F] border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <option value="">— Select a teacher —</option>
                {state.teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.subjects.join(', ')})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowQuickAddResource(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!quickResourceTeacherId) {
                    onShowToast('Please pick a teacher');
                    return;
                  }
                  setShowQuickAddResource(false);
                  setState((prev) => ({ ...prev, tab: 'teachers' }));
                  setSubView(null);
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#7C3AED] text-white"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Student Government */}
      {showStudentGovModal && (
        <StudentGovernmentModal
          onClose={() => setShowStudentGovModal(false)}
          isDark={isDark}
          learners={state.learners}
          studentCouncil={state.studentCouncil || {}}
          onUpdateCouncil={handleUpdateStudentCouncil}
          onShowToast={onShowToast}
        />
      )}

      {/* Modal: Password Change Request */}
      {showPasswordRequestModal && (
        <PasswordChangeRequestModal
          state={state}
          onClose={() => setShowPasswordRequestModal(false)}
          onSubmitRequest={handleSubmitPasswordRequest}
          onApproveRequest={handleApprovePasswordRequest}
          onRejectRequest={handleRejectPasswordRequest}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
