import React, { useState, useEffect, useMemo } from 'react';
import { DATA, GRADE_KEYS, TERM_KEYS } from '../../data/curriculumData';
import { AssessmentCoverView } from './AssessmentCoverView';
import { AssessmentBookView } from './AssessmentBookView';
import { AssessmentReportView } from './AssessmentReportView';
import {
  getCalendarAcademicYear,
  getStoredSubmissions,
  makeSubmissionKey,
} from '../../utils/cbcAssessmentEngine';
import {
  getStoredLearners,
  submitSubject,
  releaseSubject,
  reopenSubject,
  startPromotion,
  LearnerRecord,
} from '../../utils/lraSupabase';
import { getAcademicLifecycleSnapshot } from '../../utils/academicLifecycle';
import { getCachedLearnersFromIndexedDB } from '../../utils/indexedDBStorage';
import { downloadAssessmentDocument } from '../../utils/bookletDownload';

export interface NativeAssessmentBookletProps {
  role?: 'teacher' | 'admin' | 'parent' | 'learner';
  initialRole?: 'teacher' | 'admin' | 'parent' | 'learner';
  teacherId?: string;
  teacherName?: string;
  initialTeacherKey?: string;
  assignedSubjects?: string[];
  gradeSubjects?: Record<string, string[]>;
  assignedGrades?: string[];
  currentLearnerId?: string;
  allowedLearners?: LearnerRecord[];
  embedded?: boolean;
  learner?: {
    id: string;
    name: string;
    adm: string;
    grade: string;
    stream?: string;
    [key: string]: any;
  };
  initialGrade?: string;
  initialTab?: 'book' | 'report';
  initialTerm?: string;
  onClose?: () => void;
  onExit?: () => void;
  onNavigateToFocusZone?: () => void;
  onShowToast?: (msg: string) => void;
}

function canonicalSubjectKey(name: string): string {
  const n = String(name || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\s+/g, ' ')
    .trim();
  if (n === 'cre' || n === 'c.r.e' || n.includes('christian religious')) {
    return 'christian religious education';
  }
  if (n === 'ire' || n.includes('islamic religious')) {
    return 'islamic religious education';
  }
  if (n === 'hre' || n.includes('hindu religious')) {
    return 'hindu religious education';
  }
  if (n.includes('environmental')) return 'environmental activities';
  if (n.includes('creative arts') || n.includes('creative activities')) return 'creative';
  return n;
}

function matchesTaughtSubject(areaName: string, taughtList: string[]): boolean {
  const areaCanon = canonicalSubjectKey(areaName);
  return taughtList.some((raw) => {
    const s = canonicalSubjectKey(raw);
    if (!s) return false;
    return s === areaCanon || areaCanon.includes(s) || s.includes(areaCanon);
  });
}

export const NativeAssessmentBooklet: React.FC<NativeAssessmentBookletProps> = ({
  role: propRole,
  initialRole,
  teacherId,
  teacherName = 'Lead Teacher',
  assignedSubjects,
  gradeSubjects,
  assignedGrades,
  currentLearnerId,
  allowedLearners,
  embedded = false,
  learner,
  initialGrade,
  initialTab = 'book',
  initialTerm = 'Term 1',
  onClose,
  onExit,
  onShowToast,
}) => {
  const effectiveRole = propRole || initialRole || 'admin';
  const handleExitAction = onClose || onExit;
  const isTeacher = effectiveRole === 'teacher';
  const isAdmin = effectiveRole === 'admin';
  const isStaff = isAdmin || isTeacher;

  const [selectedGrade, setSelectedGrade] = useState<string>(() => {
    if (learner?.grade) return learner.grade;
    if (allowedLearners && allowedLearners.length > 0) return allowedLearners[0].grade;
    if (initialGrade) return initialGrade;
    if (assignedGrades && assignedGrades.length > 0) return assignedGrades[0];
    return 'Grade 1';
  });
  const [activeTab, setActiveTab] = useState<'book' | 'report'>(initialTab);
  const [selectedTerm, setSelectedTerm] = useState<string>(initialTerm);
  const [learners, setLearners] = useState<LearnerRecord[]>(() => {
    const list = getStoredLearners();
    if (learner && !list.some((l) => l.id === learner.id || l.adm === learner.adm)) {
      return [
        {
          id: learner.id,
          name: learner.name,
          adm: learner.adm,
          grade: learner.grade,
          stream: '',
        },
        ...list,
      ];
    }
    return list;
  });
  const [activeLearnerIndex, setActiveLearnerIndex] = useState<number>(0);
  const [parentKidIndex, setParentKidIndex] = useState<number>(() => {
    if (learner && allowedLearners && allowedLearners.length > 0) {
      const idx = allowedLearners.findIndex((k) => k.id === learner.id || k.adm === learner.adm);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });
  const [submissions, setSubmissions] = useState(() => getStoredSubmissions());
  const [isPromoting, setIsPromoting] = useState<boolean>(false);
  const [confirmPromote, setConfirmPromote] = useState<boolean>(false);
  const [isPushingAll, setIsPushingAll] = useState<boolean>(false);

  // Sync learners and submissions whenever Admin updates records or offline cache is active
  useEffect(() => {
    const handleSync = () => {
      const stored = getStoredLearners();
      if (stored.length > 0) {
        setLearners(stored);
      } else {
        getCachedLearnersFromIndexedDB().then((cached) => {
          if (cached && cached.length > 0) setLearners(cached);
        });
      }
      setSubmissions(getStoredSubmissions());
    };

    if (learners.length === 0) {
      getCachedLearnersFromIndexedDB().then((cached) => {
        if (cached && cached.length > 0) setLearners(cached);
      });
    }

    window.addEventListener('lra_data_sync', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('lra_data_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Academic year sourced dynamically from calendar
  const academicYear = getCalendarAcademicYear();

  // Parent-scoped household children list (NEVER school-wide learners)
  const parentScopedLearners: LearnerRecord[] = useMemo(() => {
    if (allowedLearners && allowedLearners.length > 0) return allowedLearners;
    if (learner) {
      return [
        {
          id: learner.id,
          name: learner.name,
          adm: learner.adm,
          grade: learner.grade,
          stream: '',
          parentPhone: learner.parentPhone || '',
          familyId: learner.familyId || '',
        },
      ];
    }
    return [];
  }, [allowedLearners, learner]);

  // Filter learners for the selected grade (Staff only)
  const gradeLearners = useMemo(() => {
    return learners.filter((l) => l.grade === selectedGrade);
  }, [learners, selectedGrade]);

  // Current active learner strictly scoped by role
  const activeLearner: LearnerRecord | undefined = useMemo(() => {
    if (effectiveRole === 'learner') {
      if (learner) {
        return {
          id: learner.id,
          name: learner.name,
          adm: learner.adm,
          grade: learner.grade,
          stream: '',
          parentPhone: learner.parentPhone || '',
          familyId: learner.familyId || '',
        };
      }
      if (currentLearnerId) {
        return learners.find((l) => l.id === currentLearnerId || l.adm === currentLearnerId);
      }
      return undefined;
    }

    if (effectiveRole === 'parent') {
      if (parentScopedLearners.length > 0) {
        return parentScopedLearners[Math.min(parentKidIndex, parentScopedLearners.length - 1)];
      }
      return undefined;
    }

    // Teacher / Admin
    if (learner && learner.grade === selectedGrade) {
      const idx = gradeLearners.findIndex((l) => l.id === learner.id || l.adm === learner.adm);
      if (idx >= 0 && activeLearnerIndex === 0) {
        return gradeLearners[idx];
      }
    }
    if (currentLearnerId) {
      const found = learners.find((l) => l.id === currentLearnerId || l.adm === currentLearnerId);
      if (found) return found;
    }
    if (gradeLearners.length > 0) {
      return gradeLearners[Math.min(activeLearnerIndex, gradeLearners.length - 1)];
    }
    if (learner) {
      return {
        id: learner.id,
        name: learner.name,
        adm: learner.adm,
        grade: learner.grade,
        stream: '',
        parentPhone: learner.parentPhone || '',
        familyId: learner.familyId || '',
      };
    }
    return undefined;
  }, [
    effectiveRole,
    learner,
    learners,
    parentScopedLearners,
    parentKidIndex,
    gradeLearners,
    activeLearnerIndex,
    currentLearnerId,
    selectedGrade,
  ]);

  // Keep selectedGrade strictly matched to activeLearner's grade for Parent & Learner portals
  useEffect(() => {
    if (!isStaff && activeLearner?.grade && activeLearner.grade !== selectedGrade) {
      setSelectedGrade(activeLearner.grade);
    }
  }, [isStaff, activeLearner?.id, activeLearner?.grade]);

  // Live 30-day Term 3 deletion & promotional window synced to Terms & Academic Year
  const lifecycleSnapshot = useMemo(() => {
    return getAcademicLifecycleSnapshot();
  }, [isPromoting]);
  const promotionInfo = lifecycleSnapshot.term3Countdown;

  // Curriculum learning areas for current grade and term
  const learningAreas = useMemo(() => {
    const gd = DATA.grades[selectedGrade];
    if (!gd || !gd.terms) return [];
    return gd.terms[selectedTerm] || [];
  }, [selectedGrade, selectedTerm]);

  // Resolve teacher's taught subjects (per-grade first, with admin storage fallback)
  const resolvedTeacherConfig = useMemo(() => {
    if (!isTeacher) {
      return {
        gradeMap: undefined as Record<string, string[]> | undefined,
        flatSubjects: undefined as string[] | undefined,
        grades: undefined as string[] | undefined,
      };
    }

    let gradeMap = gradeSubjects && Object.keys(gradeSubjects).length > 0 ? gradeSubjects : undefined;
    let flatSubjects = assignedSubjects && assignedSubjects.length > 0 ? assignedSubjects : undefined;
    let grades = assignedGrades && assignedGrades.length > 0 ? assignedGrades : undefined;

    if (!gradeMap || !flatSubjects) {
      try {
        const raw = localStorage.getItem('lra_admin_v3');
        if (raw) {
          const parsed = JSON.parse(raw);
          const teachers = Array.isArray(parsed?.teachers) ? parsed.teachers : [];
          const found = teachers.find(
            (t: any) =>
              (teacherId && t.id === teacherId) ||
              (teacherName && String(t.name || '').toLowerCase() === teacherName.toLowerCase())
          );
          if (found) {
            if (!gradeMap && found.gradeSubjects && Object.keys(found.gradeSubjects).length > 0) {
              gradeMap = found.gradeSubjects;
            }
            if (!flatSubjects && Array.isArray(found.subjects) && found.subjects.length > 0) {
              flatSubjects = found.subjects;
            }
            if (!grades && Array.isArray(found.grades) && found.grades.length > 0) {
              grades = found.grades;
            }
          }
        }
      } catch {
        // ignore storage fallback errors
      }
    }

    return { gradeMap, flatSubjects, grades };
  }, [isTeacher, gradeSubjects, assignedSubjects, assignedGrades, teacherId, teacherName]);

  const teacherSubjectsForGrade: string[] | undefined = useMemo(() => {
    if (!isTeacher) return undefined;
    const { gradeMap, flatSubjects, grades } = resolvedTeacherConfig;

    if (gradeMap && Object.keys(gradeMap).length > 0) {
      const explicitForGrade = gradeMap[selectedGrade];
      if (Array.isArray(explicitForGrade)) {
        return explicitForGrade;
      }
      // If teacher has explicit grades configured and does not teach selectedGrade, show none
      if (grades && grades.length > 0 && !grades.includes(selectedGrade)) {
        return [];
      }
      return [];
    }

    if (grades && grades.length > 0 && !grades.includes(selectedGrade)) {
      return [];
    }

    return flatSubjects;
  }, [isTeacher, resolvedTeacherConfig, selectedGrade]);

  // Switch grade
  const handleSelectGrade = (g: string) => {
    setSelectedGrade(g);
    setActiveLearnerIndex(0);
  };

  // Teacher submits subject
  const handleSubmitSubject = async (subjectName: string) => {
    if (!activeLearner || !isTeacher) return;
    const res = await submitSubject(activeLearner.id, selectedGrade, selectedTerm, subjectName, teacherName);
    setSubmissions(getStoredSubmissions());
    if (onShowToast) onShowToast(res.message);
  };

  // Admin releases subject to parents (Push Only)
  const handleReleaseSubject = async (subjectName: string) => {
    if (!activeLearner || !isAdmin) return;
    const res = await releaseSubject(activeLearner.id, selectedGrade, selectedTerm, subjectName);
    setSubmissions(getStoredSubmissions());
    if (onShowToast) onShowToast(res.message);
  };

  // Admin pushes all subjects for active learner to parents in one click
  const handlePushAllSubjects = async () => {
    if (!activeLearner || !isAdmin || learningAreas.length === 0) return;
    setIsPushingAll(true);
    try {
      for (const area of learningAreas) {
        await releaseSubject(activeLearner.id, selectedGrade, selectedTerm, area.name);
      }
      setSubmissions(getStoredSubmissions());
      if (onShowToast) {
        onShowToast(`Pushed all ${learningAreas.length} ${selectedGrade} subjects (${selectedTerm}) for ${activeLearner.name} to Parents & Learners.`);
      }
    } finally {
      setIsPushingAll(false);
    }
  };

  // Admin reopens subject for teacher editing
  const handleReopenSubject = async (subjectName: string) => {
    if (!activeLearner || !isAdmin) return;
    const res = await reopenSubject(activeLearner.id, selectedGrade, selectedTerm, subjectName);
    setSubmissions(getStoredSubmissions());
    if (onShowToast) onShowToast(res.message);
  };

  // Admin triggers annual promotion (booklets remain permanently downloadable)
  const handlePromote = async () => {
    if (!confirmPromote) {
      setConfirmPromote(true);
      return;
    }
    setConfirmPromote(false);
    setIsPromoting(true);
    const res = await startPromotion();
    setIsPromoting(false);
    if (onShowToast) onShowToast(res.message);
  };

  // Download official Assessment Book or Report (works anytime across devices/PWA)
  const handleDownloadBookletFile = () => {
    if (!activeLearner) {
      if (onShowToast) onShowToast('No learner record selected to download.');
      return;
    }
    const res = downloadAssessmentDocument({
      learner: {
        id: activeLearner.id,
        name: activeLearner.name,
        adm: activeLearner.adm,
        grade: selectedGrade || activeLearner.grade,
        stream: activeLearner.stream,
      },
      mode: activeTab,
      term: selectedTerm,
      academicYear,
      allowedSubjects: isTeacher ? visibleLearningAreas.map((a) => a.name) : undefined,
      submissions,
    });
    if (onShowToast) {
      onShowToast(
        `Downloaded ${activeTab === 'book' ? 'Assessment Book' : 'Assessment Report'} (${res.filename})`
      );
    }
  };

  // Print booklet (or save as PDF)
  const handlePrintBooklet = () => {
    window.print();
  };

  // Filter learning areas by role:
  // - Teachers see ONLY the subjects they teach in the selected grade
  // - Admin sees full book/report read-only to review & push
  // - Parents and Learners see all subjects automatically without waiting for Admin push
  const visibleLearningAreas = useMemo(() => {
    if (isTeacher) {
      if (teacherSubjectsForGrade === undefined) return learningAreas;
      if (teacherSubjectsForGrade.length === 0) return [];
      return learningAreas.filter((area) => matchesTaughtSubject(area.name, teacherSubjectsForGrade));
    }

    return learningAreas;
  }, [learningAreas, isTeacher, teacherSubjectsForGrade]);

  const wrapperClass =
    handleExitAction && !embedded
      ? 'fixed inset-0 z-50 overflow-y-auto bg-[#EEF2FA] text-[#0F1B33] font-sans antialiased pb-12'
      : 'w-full min-h-screen bg-[#EEF2FA] text-[#0F1B33] font-sans antialiased pb-12';

  return (
    <div className={wrapperClass}>
      {/* 480px Centered Mobile-First Container */}
      <div className="w-full max-w-[520px] mx-auto p-2.5 sm:p-3.5 flex flex-col">
        {/* TOP BAR: School Crest, School Name, and Back/Close */}
        <header className="w-full bg-[#0F1B33] text-white rounded-2xl p-2.5 mb-2.5 flex items-center justify-between gap-2 shadow-md border border-slate-700 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            {handleExitAction && !embedded && (
              <button
                type="button"
                onClick={handleExitAction}
                className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-black text-xs shrink-0 cursor-pointer"
                title="Back to portal"
              >
                ← Back
              </button>
            )}
            <div className="w-9 h-9 rounded-full bg-white p-0.5 shadow-xs flex items-center justify-center shrink-0 border border-slate-600">
              <img
                src="/images/lra_crest.jpg"
                alt="Little Roses Academy Crest"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-black text-xs sm:text-sm tracking-wide leading-tight text-white uppercase truncate">
                Little Roses Academy
              </span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider truncate">
                Nakuru · {selectedGrade} CBC Record
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {typeof navigator !== 'undefined' && !navigator.onLine && (
              <span className="text-[9.5px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded shadow-xs">
                Offline
              </span>
            )}
            <span className="text-[10px] font-black px-2 py-1 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30">
              {academicYear}
            </span>
          </div>
        </header>

        {/* 30-Day Term 3 / Promotion Countdown Banner */}
        {(promotionInfo.active || promotionInfo.isPurgedCompleted) && (
          <div className={`w-full border-2 rounded-xl p-2.5 mb-2.5 shadow-sm text-xs flex flex-col gap-1 print:hidden ${
            promotionInfo.isPurgedCompleted
              ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
              : promotionInfo.daysRemaining <= 7
              ? 'bg-amber-50 border-amber-500 text-amber-950'
              : 'bg-indigo-50 border-indigo-500 text-indigo-950'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-black uppercase tracking-wide">
                {promotionInfo.isPurgedCompleted
                  ? '🎓 Promotion & 30-Day Cleanup Complete'
                  : '⏳ Term 3 30-Day Download Window'}
              </span>
              <span className="bg-slate-900 text-white font-black font-mono tabular-nums px-2 py-0.5 rounded-full text-[10px]">
                {promotionInfo.isPurgedCompleted
                  ? 'Books Cleared'
                  : `${promotionInfo.daysRemaining}d ${promotionInfo.hoursRemaining}h left`}
              </span>
            </div>
            <p className="text-[11px] leading-snug opacity-90">
              {promotionInfo.isPurgedCompleted
                ? 'Assessment books from the previous Term 3 cycle were cleared after 30 days and learners advanced to their next class.'
                : `Assessment Books & Reports appear automatically without waiting for Admin push. Download before ${promotionInfo.expiresAtDateLabel || 'Day 30'}, when old books are deleted and learners move to the next class.`}
            </p>
          </div>
        )}

        {/* LEARNER ROLE: Dedicated Single-Pupil Banner (Strictly scoped to logged-in learner) */}
        {effectiveRole === 'learner' && activeLearner && (
          <div className="w-full bg-gradient-to-r from-[#0F1B33] to-[#1E293B] text-white rounded-2xl p-3 mb-2.5 shadow-sm border border-slate-700 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center font-black text-xs text-purple-300 shrink-0">
                {activeLearner.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-xs text-white truncate">{activeLearner.name}</div>
                <div className="text-[10px] text-purple-200 truncate">
                  {activeLearner.adm} • {activeLearner.grade}
                </div>
              </div>
            </div>
            <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 shrink-0">
              My Record
            </span>
          </div>
        )}

        {/* PARENT ROLE: Strictly scoped to THIS Household's Children ONLY */}
        {effectiveRole === 'parent' && activeLearner && (
          <div className="w-full bg-white rounded-2xl p-2.5 mb-2.5 shadow-xs border border-slate-200 space-y-2 print:hidden">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-[#0F1B33]">
                {parentScopedLearners.length > 1
                  ? `Your Household Children (${parentScopedLearners.length})`
                  : 'Your Child’s Official Record'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {activeLearner.grade}
              </span>
            </div>

            {parentScopedLearners.length > 1 ? (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {parentScopedLearners.map((kid, idx) => (
                  <button
                    key={kid.id}
                    type="button"
                    onClick={() => setParentKidIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      parentKidIndex === idx
                        ? 'bg-[#0F1B33] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {kid.name} ({kid.grade})
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-[11px] font-semibold text-slate-600">
                {activeLearner.name} &bull; {activeLearner.adm} &bull; {activeLearner.grade}
              </div>
            )}
          </div>
        )}

        {/* GRADE SELECTOR BUTTONS (Teachers/Admin only — NEVER Parents or Learners) */}
        {isStaff && (
          <div className="flex flex-wrap gap-1 mb-2 print:hidden">
            {GRADE_KEYS.map((g) => {
              const teacherCountInGrade = isTeacher
                ? resolvedTeacherConfig.gradeMap?.[g]?.length ??
                  (resolvedTeacherConfig.grades
                    ? resolvedTeacherConfig.grades.includes(g)
                      ? resolvedTeacherConfig.flatSubjects?.length || 0
                      : 0
                    : undefined)
                : undefined;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => handleSelectGrade(g)}
                  className={`flex-1 min-w-[30%] border-0 rounded-xl py-2 px-1 text-center font-extrabold text-xs transition-all shadow-xs cursor-pointer ${
                    selectedGrade === g
                      ? 'bg-[#2F6BFF] text-white shadow-md'
                      : 'bg-white text-[#0F1B33] hover:bg-slate-100'
                  }`}
                >
                  <span>{g.replace('Grade ', 'Gr ')}</span>
                  {typeof teacherCountInGrade === 'number' && teacherCountInGrade > 0 && (
                    <span
                      className={`ml-1 text-[9.5px] px-1.5 py-0.2 rounded-full font-black ${
                        selectedGrade === g
                          ? 'bg-white/25 text-white'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {teacherCountInGrade}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* PUPIL SELECTOR (Teachers/Admin only — NEVER Parents or Learners) */}
        {isStaff && (
          <div className="w-full bg-white rounded-xl p-2.5 mb-2 shadow-xs border border-slate-200 flex flex-col gap-2 print:hidden">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-[#0F1B33]">
                {selectedGrade} Pupils ({gradeLearners.length})
              </span>
            </div>

            {gradeLearners.length > 0 ? (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {gradeLearners.map((lrn, idx) => (
                  <button
                    key={lrn.id}
                    type="button"
                    onClick={() => setActiveLearnerIndex(idx)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      activeLearner?.id === lrn.id
                        ? 'bg-[#0F1B33] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span className="font-black mr-1 text-[10px] opacity-80">{lrn.adm}</span>
                    {lrn.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-2 text-slate-400 text-xs italic">
                No pupils currently enrolled in {selectedGrade}. Enrolled pupils from the Administration Portal appear here automatically.
              </div>
            )}
          </div>
        )}

        {/* ASSESSMENT BOOK vs ASSESSMENT REPORT SWITCH */}
        <div className="flex gap-1.5 mb-2 print:hidden">
          <button
            id="tb"
            type="button"
            onClick={() => setActiveTab('book')}
            className={`flex-1 border-0 rounded-xl py-2.5 px-2 font-extrabold text-xs transition-all shadow-xs cursor-pointer ${
              activeTab === 'book'
                ? 'bg-[#0F1B33] text-white shadow-md'
                : 'bg-white text-[#0F1B33] hover:bg-slate-100'
            }`}
          >
            📘 Assessment Book
          </button>
          <button
            id="tr"
            type="button"
            onClick={() => setActiveTab('report')}
            className={`flex-1 border-0 rounded-xl py-2.5 px-2 font-extrabold text-xs transition-all shadow-xs cursor-pointer ${
              activeTab === 'report'
                ? 'bg-[#0F1B33] text-white shadow-md'
                : 'bg-white text-[#0F1B33] hover:bg-slate-100'
            }`}
          >
            📊 Assessment Report
          </button>
        </div>

        {/* TERM SELECTOR BUTTONS: Term 1, Term 2, Term 3 */}
        <div className="flex gap-1 mb-2 bg-slate-200 p-1 rounded-xl print:hidden">
          {TERM_KEYS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedTerm(t)}
              className={`flex-1 py-1.5 px-2 rounded-lg font-black text-xs transition-all cursor-pointer ${
                selectedTerm === t
                  ? 'bg-white text-[#0F1B33] shadow-sm'
                  : 'text-slate-600 hover:text-[#0F1B33]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* WORKING DOWNLOAD & PRINT ACTION BAR (All Roles, Always Available) */}
        {activeLearner && (
          <div className="flex gap-2 mb-3 print:hidden">
            <button
              type="button"
              onClick={handleDownloadBookletFile}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-sm cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 transition-transform"
            >
              <span>📥</span>
              <span>Download {activeTab === 'book' ? 'Book' : 'Report'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrintBooklet}
              className="py-2.5 px-3.5 rounded-xl bg-[#0F1B33] hover:bg-slate-800 text-white font-black text-xs shadow-sm cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 transition-transform"
            >
              <span>🖨️</span>
              <span>Print / PDF</span>
            </button>
          </div>
        )}

        {/* COVER PRESENTATION */}
        <AssessmentCoverView
          grade={selectedGrade}
          viewMode={activeTab}
          learnerName={activeLearner?.name || '—'}
          admissionNumber={activeLearner?.adm || '—'}
          academicYear={academicYear}
          stream={activeLearner?.stream}
          className="mb-3"
        />

        {/* Role-Specific Action Bar */}
        {isTeacher && activeLearner && (
          <div className="w-full bg-blue-50 border border-blue-200 rounded-xl p-2.5 mb-3 text-xs flex flex-col gap-2 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-1 font-bold text-blue-900">
              <span>Educator Workspace: {teacherName}</span>
              <span className="text-[10.5px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-extrabold">
                Only Your Taught Subject(s) ({visibleLearningAreas.length})
              </span>
            </div>
            {visibleLearningAreas.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {visibleLearningAreas.map((area) => (
                  <button
                    key={area.name}
                    type="button"
                    onClick={() => handleSubmitSubject(area.name)}
                    className="bg-[#2F6BFF] hover:bg-blue-700 text-white font-extrabold text-[10.5px] px-2.5 py-1 rounded-lg shadow-xs cursor-pointer"
                  >
                    Submit {area.name} to Admin
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-blue-800">
                No subjects assigned to you in {selectedGrade}. Select one of your taught grades above to view and submit marks for its learners.
              </div>
            )}
          </div>
        )}

        {isAdmin && activeLearner && (
          <div className="w-full bg-slate-800 text-white rounded-xl p-2.5 mb-3 text-xs flex flex-col gap-2 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 font-bold">
              <div>
                <span className="uppercase tracking-wider text-emerald-400 font-extrabold block">
                  Admin Push Console ({selectedTerm}) · Marks Read-Only
                </span>
                <span className="text-[10px] text-slate-300 font-medium">
                  Admin can push or reopen subjects only — marks are edited exclusively by subject teachers.
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={isPushingAll}
                  onClick={handlePushAllSubjects}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-[10px] px-2.5 py-1 rounded-lg cursor-pointer"
                >
                  {isPushingAll ? 'Pushing...' : '🚀 Push All to Parents'}
                </button>
                {confirmPromote ? (
                  <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-purple-400">
                    <span className="text-[10px] text-purple-200">Promote cycle?</span>
                    <button
                      type="button"
                      onClick={handlePromote}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmPromote(false)}
                      className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-[10px] px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handlePromote}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] px-2 py-1 rounded-lg cursor-pointer"
                  >
                    Promote Cohort
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              {learningAreas.map((area) => {
                const key = makeSubmissionKey(activeLearner.id, selectedGrade, selectedTerm, area.name);
                const sub = submissions[key];
                const isReleased = sub?.status === 'released';
                const isSubmitted = sub?.status === 'submitted';

                return (
                  <div key={area.name} className="flex items-center justify-between bg-slate-900/60 p-1.5 rounded-lg">
                    <span className="font-semibold text-slate-200">{area.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
                          isReleased
                            ? 'bg-emerald-600 text-white'
                            : isSubmitted
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {isReleased ? 'Pushed' : isSubmitted ? 'Submitted' : 'Pending'}
                      </span>
                      {!isReleased ? (
                        <button
                          type="button"
                          onClick={() => handleReleaseSubject(area.name)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2 py-0.5 rounded shadow-xs cursor-pointer"
                        >
                          Push / Release
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReopenSubject(area.name)}
                          className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-[10px] px-2 py-0.5 rounded cursor-pointer"
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ASSESSMENT BOOK OR REPORT TABLE */}
        {activeLearner ? (
          visibleLearningAreas.length > 0 ? (
            activeTab === 'book' ? (
              <AssessmentBookView
                learnerId={activeLearner.id}
                learnerAdm={activeLearner.adm}
                gradeLabel={selectedGrade}
                learningAreas={visibleLearningAreas}
                term={selectedTerm}
                editable={isTeacher}
                readOnlyLabel={isAdmin ? 'Admin Push-Only (Read-Only Marks)' : 'Official Read-Only'}
              />
            ) : (
              <AssessmentReportView
                learnerId={activeLearner.id}
                learnerAdm={activeLearner.adm}
                learningAreas={visibleLearningAreas}
                term={selectedTerm}
                canEdit={isTeacher}
                assignedSubjects={teacherSubjectsForGrade}
              />
            )
          ) : isTeacher ? (
            <div className="w-full bg-white rounded-xl p-6 text-center text-slate-600 shadow-sm border border-slate-200 space-y-2">
              <div className="font-black text-sm text-[#0F1B33]">
                No Assigned Subjects in {selectedGrade}
              </div>
              <p className="text-xs text-slate-500">
                The Assessment Book & Report only show learning areas you are assigned to teach for {selectedGrade}.
              </p>
              {resolvedTeacherConfig.grades && resolvedTeacherConfig.grades.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                  {resolvedTeacherConfig.grades.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => handleSelectGrade(g)}
                      className="px-3 py-1.5 rounded-lg bg-[#2F6BFF] hover:bg-blue-700 text-white text-xs font-extrabold cursor-pointer"
                    >
                      Open {g}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full bg-white rounded-xl p-8 text-center text-slate-500 shadow-sm border border-slate-200">
              <div className="font-black text-sm text-[#0F1B33] mb-1">
                No Assessment Marks Entered Yet
              </div>
              <p className="text-xs text-slate-500">
                Subject teachers have not yet recorded CBC strand scores for {selectedGrade} ({selectedTerm}). Marks appear here automatically as soon as they are saved.
              </p>
            </div>
          )
        ) : (
          <div className="w-full bg-white rounded-xl p-8 text-center text-slate-500 shadow-sm border border-slate-200">
            <div className="font-black text-sm text-[#0F1B33] mb-1">
              No Pupil Selected
            </div>
            <p className="text-xs text-slate-500">
              Select or enroll a pupil above to view and fill their official CBC assessment book and report.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
