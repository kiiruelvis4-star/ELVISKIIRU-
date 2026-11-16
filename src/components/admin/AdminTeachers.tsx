import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  AdminState,
  Teacher,
  TaughtLessonLog,
  GradeName,
  GRADES,
  GRADE_COLORS,
  SUBJECTS,
  FOLDERS,
} from './types';
import { initials, currentTerm } from './adminUtils';
import { sound } from '../../utils/sound';
import { useBackHandler, triggerAppBack } from '../../utils/navigationHistory';
import { generate6CharPassword } from '../../utils/learnerPasswordUtils';
import { DATA } from '../../data/curriculumData';
import { getStoredMarks, makeMarkKey } from '../../utils/cbcAssessmentEngine';
import type { StrandAssessmentRecord } from '../../types/cbcAssessment';

const SUBJECT_SYNONYMS: Record<string, string[]> = {
  cre: ['cre', 'christian religious education'],
  'christian religious education': ['cre', 'christian religious education'],
  'creative activities': ['creative activities', 'creative arts'],
  'creative arts': ['creative arts', 'creative activities'],
  'science & technology': ['science & technology', 'science and technology'],
  'science and technology': ['science and technology', 'science & technology'],
  'agriculture & nutrition': ['agriculture & nutrition', 'agriculture and nutrition'],
  'agriculture and nutrition': ['agriculture and nutrition', 'agriculture & nutrition'],
};

function subjectsMatch(a: string, b: string): boolean {
  const na = (a || '').trim().toLowerCase();
  const nb = (b || '').trim().toLowerCase();
  if (!na || !nb) return false;
  if (na === nb) return true;
  const synsA = SUBJECT_SYNONYMS[na] || [na];
  const synsB = SUBJECT_SYNONYMS[nb] || [nb];
  return synsA.some((s) => synsB.includes(s));
}

interface AdminTeachersProps {
  state: AdminState;
  onAddTeacher: (
    teacher: Omit<Teacher, 'id' | 'files' | 'color' | 'mustChangePw'> & { photo?: string | null },
    tempPw: string
  ) => void;
  onUpdateTeacherPhoto: (teacherId: string, photoDataUrl: string) => void;
  onUpdateTeacher?: (teacher: Teacher) => void;
  onResetTeacherPassword: (teacherId: string, tempPw: string) => void;
  onDeleteTeacher: (teacherId: string) => void;
  onAddFilesToFolder: (teacherId: string, key: string, files: File[]) => void;
  onRemoveFile: (teacherId: string, key: string, fileIdx: number) => void;
  onShowToast: (msg: string) => void;
}

export const AdminTeachers: React.FC<AdminTeachersProps> = ({
  state,
  onAddTeacher,
  onUpdateTeacherPhoto,
  onUpdateTeacher,
  onResetTeacherPassword,
  onDeleteTeacher,
  onAddFilesToFolder,
  onRemoveFile,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  // Drilldown states for selected teacher
  const [activeGrade, setActiveGrade] = useState<GradeName | null>(null);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  // New teacher form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newSubjects, setNewSubjects] = useState('');
  const [newGrades, setNewGrades] = useState<GradeName[]>(['Grade 4', 'Grade 5']);
  const [newGradeSubjects, setNewGradeSubjects] = useState<Partial<Record<GradeName, string[]>>>({
    'Grade 4': ['Mathematics'],
    'Grade 5': ['Mathematics'],
  });
  const [newPassword, setNewPassword] = useState(() => generate6CharPassword('Teacher'));
  const [newPhoto, setNewPhoto] = useState<string | null>(null);

  // Edit teacher modal state
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSubjects, setEditSubjects] = useState('');
  const [editGrades, setEditGrades] = useState<GradeName[]>([]);
  const [editGradeSubjects, setEditGradeSubjects] = useState<Partial<Record<GradeName, string[]>>>({});
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState('');

  // Password reset modal state
  const [resetTeacherId, setResetTeacherId] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState('');

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Centered post-add teacher confirmation popup
  const [addedTeacherPopup, setAddedTeacherPopup] = useState<{
    name: string;
    phone: string;
    grades: GradeName[];
    subjects: string[];
    password: string;
  } | null>(null);

  // Quick mark lesson state inside teacher detail view
  const [adminMarkTopic, setAdminMarkTopic] = useState('');

  // Live Assessment Book marks snapshot
  const [marksSnapshot, setMarksSnapshot] = useState<Record<string, StrandAssessmentRecord>>(() =>
    getStoredMarks()
  );

  useEffect(() => {
    const refreshMarks = () => setMarksSnapshot(getStoredMarks());
    window.addEventListener('lra_data_sync', refreshMarks);
    window.addEventListener('storage', refreshMarks);
    return () => {
      window.removeEventListener('lra_data_sync', refreshMarks);
      window.removeEventListener('storage', refreshMarks);
    };
  }, []);

  useBackHandler(
    () => {
      sound.playClick(400);
      setAddedTeacherPopup(null);
      return true;
    },
    addedTeacherPopup !== null,
    46,
    'teachers_added_popup'
  );

  // --- PHONE BACK NAVIGATION WITHIN TEACHERS TAB ---
  // 1. Delete confirmation modal (priority 45)
  useBackHandler(
    () => {
      sound.playClick(400);
      setConfirmDeleteId(null);
      return true;
    },
    confirmDeleteId !== null,
    45,
    'teachers_confirm_delete'
  );

  // 1b. Edit teacher modal (priority 45)
  useBackHandler(
    () => {
      sound.playClick(400);
      setEditingTeacher(null);
      return true;
    },
    editingTeacher !== null,
    45,
    'teachers_edit_modal'
  );

  // 2. Reset password modal (priority 45)
  useBackHandler(
    () => {
      sound.playClick(400);
      setResetTeacherId(null);
      return true;
    },
    resetTeacherId !== null,
    45,
    'teachers_reset_pw'
  );

  // 3. Add teacher modal (priority 45)
  useBackHandler(
    () => {
      sound.playClick(400);
      setShowAddModal(false);
      return true;
    },
    showAddModal,
    45,
    'teachers_add_modal'
  );

  // 4. Folder file cabinet drilldown (priority 35)
  useBackHandler(
    () => {
      sound.playClick(400);
      setActiveFolder(null);
      return true;
    },
    activeFolder !== null,
    35,
    'teachers_active_folder'
  );

  // 5. Subject drilldown (priority 34)
  useBackHandler(
    () => {
      sound.playClick(400);
      setActiveSubject(null);
      return true;
    },
    activeFolder === null && activeSubject !== null,
    34,
    'teachers_active_subject'
  );

  // 6. Grade drilldown (priority 33)
  useBackHandler(
    () => {
      sound.playClick(400);
      setActiveGrade(null);
      return true;
    },
    activeFolder === null && activeSubject === null && activeGrade !== null,
    33,
    'teachers_active_grade'
  );

  // 7. Teacher details drawer (priority 30)
  useBackHandler(
    () => {
      sound.playClick(400);
      setSelectedTeacherId(null);
      setActiveGrade(null);
      setActiveSubject(null);
      setActiveFolder(null);
      return true;
    },
    selectedTeacherId !== null &&
      activeFolder === null &&
      activeSubject === null &&
      activeGrade === null,
    30,
    'teachers_details_drawer'
  );

  const isDark = state.theme === 'dark';

  const computeTeacherMetrics = (teacher: Teacher) => {
    // 1. Lessons taught metric (from teacher.taughtLessons synced from Teachers Portal or Admin drawer)
    const taughtLogs = Array.isArray(teacher.taughtLessons) ? teacher.taughtLessons : [];
    const taughtWeight = taughtLogs.reduce((acc, log) => {
      if (log.status === 'Taught') return acc + 1;
      if (log.status === 'Partly taught') return acc + 0.5;
      return acc;
    }, 0);

    const timetableSlotsCount = Object.values(state.timetable || {}).filter(
      (c) => c && c.teacherId === teacher.id
    ).length;

    // Derive assigned (grade, subject) pairs
    const pairMap = new Map<string, { grade: GradeName; subject: string }>();
    (teacher.grades || []).forEach((g) => {
      const subs =
        teacher.gradeSubjects?.[g] && teacher.gradeSubjects[g]!.length > 0
          ? teacher.gradeSubjects[g]!
          : teacher.subjects || [];
      subs.forEach((s) => pairMap.set(`${g}|${s}`, { grade: g, subject: s }));
    });
    Object.entries(state.timetable || {}).forEach(([key, cell]) => {
      if (cell && cell.teacherId === teacher.id && cell.subject) {
        const g = key.split('|')[2] as GradeName;
        if (g) pairMap.set(`${g}|${cell.subject}`, { grade: g, subject: cell.subject });
      }
    });
    const assignedPairs = Array.from(pairMap.values());

    const targetLessons =
      timetableSlotsCount > 0 ? timetableSlotsCount : Math.max(1, assignedPairs.length * 4);

    const lessonsPending = taughtWeight <= 0;
    const lessonsPct = lessonsPending
      ? 0
      : Math.min(100, Math.max(1, Math.round((taughtWeight / targetLessons) * 100)));

    // 2. Marked CATs metric strictly from Assessment Books (lra_cbc_marks_v1)
    const activeTermName = currentTerm(state.terms) || 'Term 1';
    const dataGrades = (DATA as any)?.grades || {};

    const countCatsForTerm = (termName: string) => {
      let totalExpected = 0;
      let markedCount = 0;
      const seenKeys = new Set<string>();

      assignedPairs.forEach(({ grade, subject }) => {
        const gradeLearners = (state.learners || []).filter((l) => l.grade === grade);
        const areas = (dataGrades?.[grade]?.terms?.[termName] || []) as any[];
        const matchingAreas = areas.filter((a) => subjectsMatch(subject, a?.name));

        matchingAreas.forEach((area) => {
          (area.strands || []).forEach((strand: any) => {
            if (!strand?.sid) return;
            gradeLearners.forEach((lrn) => {
              const dedupKey = `${lrn.id}|${strand.sid}`;
              if (seenKeys.has(dedupKey)) return;
              seenKeys.add(dedupKey);
              totalExpected += 1;

              const rec =
                marksSnapshot[makeMarkKey(lrn.id, strand.sid)] ||
                (lrn.adm ? marksSnapshot[makeMarkKey(lrn.adm, strand.sid)] : undefined);

              const hasMarkedCat =
                rec &&
                Array.isArray(rec.cats) &&
                rec.cats.some(
                  (c) =>
                    Number(c?.t) > 0 &&
                    c?.s !== undefined &&
                    c?.s !== null &&
                    String(c.s) !== ''
                );
              if (hasMarkedCat) markedCount += 1;
            });
          });
        });
      });

      return { totalExpected, markedCount };
    };

    let catEval = countCatsForTerm(activeTermName);
    if (catEval.markedCount === 0) {
      for (const fallbackTerm of ['Term 1', 'Term 2', 'Term 3']) {
        if (fallbackTerm === activeTermName) continue;
        const alt = countCatsForTerm(fallbackTerm);
        if (alt.markedCount > 0) {
          catEval = alt;
          break;
        }
      }
    }

    const catsPending = catEval.markedCount === 0;
    const catsPct = catsPending
      ? 0
      : Math.min(
          100,
          Math.max(1, Math.round((catEval.markedCount / Math.max(1, catEval.totalExpected)) * 100))
        );

    return {
      lessonsPending,
      lessonsPct,
      taughtCount: taughtLogs.filter((l) => l.status !== 'Not taught').length,
      targetLessons,
      catsPending,
      catsPct,
      markedCatsCount: catEval.markedCount,
      totalCatsExpected: catEval.totalExpected,
    };
  };

  const handleMarkLessonUnderTeacher = (
    targetTeacher: Teacher,
    grade: GradeName,
    subject: string,
    day?: string,
    slotKey?: string,
    topic?: string
  ) => {
    if (!onUpdateTeacher) return;
    const stamp = new Date().toLocaleString('en-GB', {
      timeZone: 'Africa/Nairobi',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const logEntry: TaughtLessonLog = {
      id: `tl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      grade,
      subject,
      topic: (topic || adminMarkTopic).trim() || `${subject} Competency Lesson`,
      day,
      slotKey,
      date: new Date().toISOString().slice(0, 10),
      stamp,
      status: 'Taught',
    };
    const updatedTeacher: Teacher = {
      ...targetTeacher,
      taughtLessons: [logEntry, ...(targetTeacher.taughtLessons || [])],
    };
    onUpdateTeacher(updatedTeacher);
    setAdminMarkTopic('');
    sound.playCompleteChime();
    onShowToast(`Marked ${grade} ${subject} taught under ${targetTeacher.name}`);
  };

  const filteredTeachers = state.teachers.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.phone.includes(q) ||
      t.subjects.some((s) => s.toLowerCase().includes(q)) ||
      t.grades.some((g) => g.toLowerCase().includes(q))
    );
  });

  const selectedTeacher = state.teachers.find((t) => t.id === selectedTeacherId);

  const processImageFile = (file: File, callback: (dataUrl: string) => void) => {
    if (file.size > 5 * 1024 * 1024) {
      onShowToast('Photo must be under 5 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 180;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const k = Math.min(img.width, img.height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            img,
            (img.width - k) / 2,
            (img.height - k) / 2,
            k,
            k,
            0,
            0,
            size,
            size
          );
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          callback(dataUrl);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const buildTeacherSubjectMapping = (
    gradesList: GradeName[],
    gsMap: Partial<Record<GradeName, string[]>>,
    extraCommaSubjects: string
  ): { grades: GradeName[]; gradeSubjects: Partial<Record<GradeName, string[]>>; subjects: string[] } => {
    const orderedGrades = GRADES.filter((g) => gradesList.includes(g));
    const finalGrades: GradeName[] = orderedGrades.length > 0 ? orderedGrades : ['Grade 4'];
    const extraSubs = extraCommaSubjects
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const finalGradeSubjects: Partial<Record<GradeName, string[]>> = {};
    const allSubsSet = new Set<string>();

    finalGrades.forEach((g) => {
      const picked = [...(gsMap[g] || [])];
      if (picked.length === 0 && extraSubs.length > 0) {
        picked.push(...extraSubs);
      }
      if (picked.length === 0) {
        picked.push('Mathematics');
      }
      const uniqueForGrade = Array.from(new Set(picked));
      finalGradeSubjects[g] = uniqueForGrade;
      uniqueForGrade.forEach((s) => allSubsSet.add(s));
    });
    extraSubs.forEach((s) => allSubsSet.add(s));

    return {
      grades: finalGrades,
      gradeSubjects: finalGradeSubjects,
      subjects: Array.from(allSubsSet),
    };
  };

  const toggleGradeSubject = (
    setter: React.Dispatch<React.SetStateAction<Partial<Record<GradeName, string[]>>>>,
    grade: GradeName,
    subject: string
  ) => {
    sound.playClick(450);
    setter((prev) => {
      const current = prev[grade] || [];
      const next = current.includes(subject)
        ? current.filter((s) => s !== subject)
        : [...current, subject];
      return { ...prev, [grade]: next };
    });
  };

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      onShowToast('Enter the teacher full name');
      return;
    }
    if (newPhone.replace(/\D/g, '').length < 9) {
      onShowToast('Enter a valid mobile phone number');
      return;
    }
    if (newPassword.length < 6) {
      onShowToast('Access password must be at least 6 characters');
      return;
    }
    if (newGrades.length === 0) {
      onShowToast('Select at least one CBC grade for this teacher');
      return;
    }

    const mapped = buildTeacherSubjectMapping(newGrades, newGradeSubjects, newSubjects);
    const createdName = newName.trim();
    const createdPhone = newPhone.trim();
    const createdPassword = newPassword;

    onAddTeacher(
      {
        name: createdName,
        phone: createdPhone,
        subjects: mapped.subjects,
        grades: mapped.grades,
        gradeSubjects: mapped.gradeSubjects,
        photo: newPhoto,
      },
      createdPassword
    );

    // Reset form
    setNewName('');
    setNewPhone('');
    setNewSubjects('');
    setNewGrades(['Grade 4', 'Grade 5']);
    setNewGradeSubjects({ 'Grade 4': ['Mathematics'], 'Grade 5': ['Mathematics'] });
    setNewPassword(generate6CharPassword('Teacher'));
    setNewPhoto(null);
    setShowAddModal(false);

    // Show centered confirmation popup with educator credentials
    setAddedTeacherPopup({
      name: createdName,
      phone: createdPhone,
      grades: mapped.grades,
      subjects: mapped.subjects,
      password: createdPassword,
    });
  };

  const handleOpenEditTeacher = (teacher: Teacher) => {
    sound.playClick(500);
    setEditingTeacher(teacher);
    setEditName(teacher.name);
    setEditPhone(teacher.phone);
    setEditSubjects('');
    const tGrades = [...teacher.grades];
    setEditGrades(tGrades);
    const initialMap: Partial<Record<GradeName, string[]>> = {};
    tGrades.forEach((g) => {
      initialMap[g] =
        teacher.gradeSubjects?.[g] && teacher.gradeSubjects[g]!.length > 0
          ? [...teacher.gradeSubjects[g]!]
          : [...teacher.subjects];
    });
    setEditGradeSubjects(initialMap);
    setEditPhoto(teacher.photo);
    setEditPassword(
      teacher.passHash && teacher.passHash.trim().length >= 6
        ? teacher.passHash.trim().toUpperCase()
        : generate6CharPassword(teacher.name)
    );
  };

  const handleSaveEditTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    if (!editName.trim()) {
      onShowToast('Teacher name cannot be empty');
      return;
    }
    if (editPhone.replace(/\D/g, '').length < 9) {
      onShowToast('Enter a valid mobile phone number');
      return;
    }
    if (editGrades.length === 0) {
      onShowToast('Select at least one grade for this teacher');
      return;
    }
    if (editPassword.trim().length > 0 && editPassword.trim().length < 6) {
      onShowToast('Teacher password must be at least 6 characters');
      return;
    }

    const mapped = buildTeacherSubjectMapping(editGrades, editGradeSubjects, editSubjects);
    const finalPw =
      editPassword.trim().length >= 6
        ? editPassword.trim().toUpperCase()
        : editingTeacher.passHash || generate6CharPassword(editName.trim());

    const updated: Teacher = {
      ...editingTeacher,
      name: editName.trim(),
      phone: editPhone.trim(),
      subjects: mapped.subjects,
      grades: mapped.grades,
      gradeSubjects: mapped.gradeSubjects,
      photo: editPhoto,
      passHash: finalPw,
      mustChangePw: false,
    };

    if (onUpdateTeacher) {
      onUpdateTeacher(updated);
    } else {
      if (editPhoto !== editingTeacher.photo && editPhoto) {
        onUpdateTeacherPhoto(editingTeacher.id, editPhoto);
      }
    }

    setEditingTeacher(null);
    sound.playCompleteChime();
    onShowToast(`Updated details for ${updated.name}`);
  };

  const handlePhotoUpload = (teacherId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file, (dataUrl) => {
      onUpdateTeacherPhoto(teacherId, dataUrl);
      sound.playCompleteChime();
    });
  };

  // If viewing teacher details
  if (selectedTeacher) {
    return (
      <div className="space-y-4 animate-fade-in pb-4">
        {/* Back breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              triggerAppBack();
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            <span>← Back to All Teachers</span>
          </button>
        </div>

        {/* Teacher profile banner */}
        <div className={`rounded-2xl p-4 border shadow-sm ${
          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-start gap-3.5">
            <div className="relative">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-white text-lg overflow-hidden shadow-md"
                style={{ backgroundColor: selectedTeacher.color }}
              >
                {selectedTeacher.photo ? (
                  <img
                    src={selectedTeacher.photo}
                    alt={selectedTeacher.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials(selectedTeacher.name)
                )}
              </div>
              <label
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs flex items-center justify-center shadow-md border border-slate-200 dark:border-white/20 cursor-pointer hover:scale-110"
                title="Change Photo"
              >
                📷
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(selectedTeacher.id, e)}
                />
              </label>
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                {selectedTeacher.name}
              </h2>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                📞 {selectedTeacher.phone}
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {selectedTeacher.subjects.map((sub, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                  >
                    {sub}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-white/10">
            <button
              onClick={() => handleOpenEditTeacher(selectedTeacher)}
              className="flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <span>✏️</span>
              <span>Edit Name, Phone, Photo &amp; Password</span>
            </button>
            <button
              onClick={() => {
                sound.playClick(400);
                setConfirmDeleteId(selectedTeacher.id);
              }}
              className="py-2 px-3 text-xs font-bold rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 cursor-pointer"
            >
              🗑️ Delete
            </button>
          </div>
        </div>

        {/* Teacher Academic Allocations & Class Overview */}
        <div className={`rounded-2xl p-4 border shadow-sm space-y-4 ${
          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
        }`}>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-1">
              Curriculum Allocations & Assigned Grades
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Classes and CBC learning areas supervised by {selectedTeacher.name}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedTeacher.grades.map((grade) => {
              const gradeSubs =
                selectedTeacher.gradeSubjects?.[grade] && selectedTeacher.gradeSubjects[grade]!.length > 0
                  ? selectedTeacher.gradeSubjects[grade]!
                  : selectedTeacher.subjects;
              return (
                <div
                  key={grade}
                  className="p-3.5 rounded-2xl border bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="px-2.5 py-0.5 rounded-md text-[11px] font-black text-white shadow-xs"
                      style={{ backgroundColor: GRADE_COLORS[grade] || '#7C3AED' }}
                    >
                      {grade}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      {gradeSubs.length} Subject{gradeSubs.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Assigned Subjects:
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {gradeSubs.map((sub) => (
                      <span
                        key={sub}
                        className="px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold text-[11px]"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Timetable Lessons Scheduled */}
          <div className="pt-2 border-t border-slate-100 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Weekly Timetable Assignments
              </h4>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                {Object.entries(state.timetable || {}).filter(([_, c]) => c && c.teacherId === selectedTeacher.id).length} lessons/week
              </span>
            </div>

            {(() => {
              const assignedLessons = Object.entries(state.timetable || {})
                .filter(([_, c]) => c && c.teacherId === selectedTeacher.id)
                .map(([key, cell]) => {
                  const [day, slotK, g] = key.split('|');
                  return { day, slotK, grade: g as GradeName, subject: cell.subject };
                });

              if (assignedLessons.length === 0) {
                return (
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10 text-xs text-slate-500 text-center">
                    No timetable lessons assigned yet. Tap "Timetable" in Admin to assign periods to {selectedTeacher.name}.
                  </div>
                );
              }

              return (
                <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                  {assignedLessons.map((l, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-extrabold text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 shrink-0">
                          {l.day} {l.slotK}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {l.subject}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className="text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: GRADE_COLORS[l.grade] || '#7C3AED' }}
                        >
                          {l.grade}
                        </span>
                        {onUpdateTeacher && (
                          <button
                            type="button"
                            onClick={() =>
                              handleMarkLessonUnderTeacher(selectedTeacher, l.grade, l.subject, l.day, l.slotK)
                            }
                            className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 cursor-pointer"
                            title="Mark this lesson as taught under this teacher"
                          >
                            ✓ Mark Taught
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Live Lessons Taught & Marked CATs Summary inside Drawer */}
          {(() => {
            const metrics = computeTeacherMetrics(selectedTeacher);
            const logs = selectedTeacher.taughtLessons || [];
            return (
              <div className="pt-3 border-t border-slate-100 dark:border-white/10 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Lessons Taught</div>
                    <div className="text-sm font-black text-blue-600 dark:text-blue-400">
                      {metrics.lessonsPending ? 'Pending' : `${metrics.lessonsPct}% (${metrics.taughtCount}/${metrics.targetLessons})`}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Marked CATs (Books)</div>
                    <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {metrics.catsPending ? 'Pending' : `${metrics.catsPct}% (${metrics.markedCatsCount}/${metrics.totalCatsExpected})`}
                    </div>
                  </div>
                </div>

                {logs.length > 0 && (
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Recent Lessons Marked ({logs.length})
                    </div>
                    {logs.slice(0, 8).map((log) => (
                      <div
                        key={log.id}
                        className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px]"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{log.grade} · {log.subject}</span>
                          <span className="text-slate-400 ml-1.5">— {log.topic}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 shrink-0">
                          {log.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in pb-4">
      {/* Title & Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            Teaching Faculty
          </h2>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {state.teachers.length} registered CBC educators
          </div>
        </div>

        <button
          onClick={() => {
            sound.playClick(600);
            setNewPassword(generate6CharPassword(newName.trim() || 'Teacher'));
            setShowAddModal(true);
          }}
          className="py-2 px-3 text-xs font-black rounded-xl bg-[#22C55E] hover:bg-emerald-600 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
        >
          <span>＋ Add Teacher</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search teachers by name, subject, or grade…"
          className={`w-full py-2.5 pl-9 pr-3.5 rounded-2xl text-xs border focus:outline-none transition-colors ${
            isDark
              ? 'bg-[#141C33] border-white/10 text-white placeholder-slate-500 focus:border-purple-400'
              : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-purple-500'
          }`}
        />
        <span className="absolute left-3 top-2.5 text-xs text-slate-400">
          🔍
        </span>
      </div>

      {/* Teachers List */}
      <div className="space-y-3">
        {filteredTeachers.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            No teachers found matching your search.
          </div>
        ) : (
          filteredTeachers.map((teacher) => {
            const filesCount = Object.values(teacher.files || {}).reduce(
              (acc, f) => acc + f.length,
              0
            );

            return (
              <div
                key={teacher.id}
                className={`rounded-2xl p-4 border shadow-xs transition-all ${
                  isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div
                      className="w-13 h-13 rounded-2xl flex items-center justify-center font-black text-white text-base overflow-hidden shadow-xs"
                      style={{ backgroundColor: teacher.color }}
                    >
                      {teacher.photo ? (
                        <img
                          src={teacher.photo}
                          alt={teacher.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        initials(teacher.name)
                      )}
                    </div>
                    {/* Status dot */}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#141C33] ${
                        teacher.mustChangePw ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      title={
                        teacher.mustChangePw
                          ? 'Must change password'
                          : 'Active signed-in'
                      }
                    />
                  </div>

                  {/* Body Info */}
                  <div
                    onClick={() => {
                      sound.playClick(500);
                      setSelectedTeacherId(teacher.id);
                    }}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                        {teacher.name}
                      </h3>
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">
                        📁 {filesCount} files
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <span>📞 {teacher.phone}</span>
                      {teacher.passHash && (
                        <span
                          className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
                          title="Teacher 6-character login password"
                        >
                          🔑 {teacher.passHash}
                        </span>
                      )}
                    </div>

                    {/* Per-Grade Subjects or Overall Subjects & Grades Chips */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {teacher.gradeSubjects && Object.keys(teacher.gradeSubjects).length > 0 ? (
                        teacher.grades.map((g) => {
                          const gSubs = teacher.gradeSubjects?.[g] || teacher.subjects;
                          return (
                            <span
                              key={g}
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200"
                            >
                              <span
                                className="px-1.5 py-0.2 rounded text-[9px] font-black text-white"
                                style={{ backgroundColor: GRADE_COLORS[g] || '#7C3AED' }}
                              >
                                {g.replace('Grade ', 'G')}
                              </span>
                              <span>{gSubs.join(', ')}</span>
                            </span>
                          );
                        })
                      ) : (
                        <>
                          {teacher.subjects.map((sub, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                            >
                              {sub}
                            </span>
                          ))}
                          {teacher.grades.map((g, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md text-white"
                              style={{ backgroundColor: GRADE_COLORS[g] || '#7C3AED' }}
                            >
                              {g.replace('Grade ', 'G')}
                            </span>
                          ))}
                        </>
                      )}
                    </div>

                    {/* Live Progress indicators: Pending until marked */}
                    {(() => {
                      const metrics = computeTeacherMetrics(teacher);
                      return (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/5 space-y-1.5">
                          <div>
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-slate-500 dark:text-slate-400">Lessons taught</span>
                              <span
                                className={
                                  metrics.lessonsPending
                                    ? 'text-amber-500 dark:text-amber-400'
                                    : 'text-blue-600 dark:text-blue-400'
                                }
                              >
                                {metrics.lessonsPending ? 'Pending' : `${metrics.lessonsPct}%`}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden mt-0.5">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  metrics.lessonsPending ? 'bg-amber-400/40' : 'bg-blue-600'
                                }`}
                                style={{ width: `${metrics.lessonsPct}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-slate-500 dark:text-slate-400">Marked CATs (Assessment Books)</span>
                              <span
                                className={
                                  metrics.catsPending
                                    ? 'text-amber-500 dark:text-amber-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }
                              >
                                {metrics.catsPending ? 'Pending' : `${metrics.catsPct}%`}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden mt-0.5">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  metrics.catsPending ? 'bg-amber-400/40' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${metrics.catsPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Actions column */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditTeacher(teacher)}
                      className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs cursor-pointer hover:bg-blue-100 transition-colors"
                      title="Edit Teacher Name, Phone & Classes"
                    >
                      ✏️
                    </button>

                    <label
                      className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs cursor-pointer hover:bg-emerald-100 transition-colors"
                      title="Upload photo"
                    >
                      📷
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(teacher.id, e)}
                      />
                    </label>

                    <button
                      onClick={() => {
                        sound.playClick(400);
                        setConfirmDeleteId(teacher.id);
                      }}
                      className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs cursor-pointer hover:bg-rose-100 transition-colors"
                      title="Delete Teacher"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Add Teacher (Centered via Portal) */}
      {showAddModal &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
            <div
              className={`w-full max-w-md rounded-3xl border shadow-2xl max-h-[85dvh] flex flex-col overflow-hidden ${
                isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/70 dark:border-white/10 shrink-0">
                <h3 className="text-base font-black">Add Teacher</h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateTeacher} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Mr. John Otieno"
                  className={`w-full p-2.5 rounded-xl text-xs border ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Mobile Phone Number
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g. 0712 345 678"
                  className={`w-full p-2.5 rounded-xl text-xs border ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  1. Select CBC Grades Taught (Grade 1 to 6)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {GRADES.map((g) => {
                    const isSelected = newGrades.includes(g);
                    return (
                      <button
                        type="button"
                        key={g}
                        onClick={() => {
                          sound.playClick(450);
                          setNewGrades((prev) =>
                            prev.includes(g)
                              ? prev.filter((x) => x !== g)
                              : [...prev, g]
                          );
                        }}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-extrabold border transition-all cursor-pointer ${
                          isSelected
                            ? 'text-white border-transparent'
                            : 'bg-transparent text-slate-400 border-slate-200 dark:border-white/10'
                        }`}
                        style={{
                          backgroundColor: isSelected ? GRADE_COLORS[g] : undefined,
                        }}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Per-Grade Subject Picker */}
              {newGrades.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">
                    2. Assign Subjects Per Grade (e.g. G1 Maths, G2 English)
                  </label>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {GRADES.filter((g) => newGrades.includes(g)).map((g) => {
                      const picked = newGradeSubjects[g] || [];
                      return (
                        <div
                          key={g}
                          className={`p-2.5 rounded-xl border ${
                            isDark ? 'bg-black/25 border-white/10' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-black text-white"
                              style={{ backgroundColor: GRADE_COLORS[g] }}
                            >
                              {g}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {picked.length} selected
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {SUBJECTS[g].map((sub) => {
                              const active = picked.includes(sub);
                              return (
                                <button
                                  type="button"
                                  key={sub}
                                  onClick={() => toggleGradeSubject(setNewGradeSubjects, g, sub)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                    active
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                      : isDark
                                      ? 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {active ? '✓ ' : '+ '}
                                  {sub}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Additional / Custom Subjects (optional, comma separated)
                </label>
                <input
                  type="text"
                  value={newSubjects}
                  onChange={(e) => setNewSubjects(e.target.value)}
                  placeholder="e.g. French, Coding & Robotics"
                  className={`w-full p-2.5 rounded-xl text-xs border ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <span>Teacher AI-Generated Password</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                      newPassword.trim().length >= 6 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {newPassword.trim().length}/6 CHARS
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick(600);
                      setNewPassword(generate6CharPassword(newName.trim() || 'Teacher'));
                    }}
                    className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-bold cursor-pointer"
                  >
                    🎲 Generate 6-Char Password
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={12}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
                  placeholder="e.g. TR4829"
                  className={`w-full p-2.5 rounded-xl text-xs border font-mono font-bold tracking-widest ${
                    isDark ? 'bg-black/30 border-white/10 text-emerald-400' : 'bg-slate-50 border-slate-200 text-purple-700'
                  }`}
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Auto-generated 6-character password (like learners) created by Admin for direct Teachers Portal sign-in.
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#22C55E] text-white shadow-xs cursor-pointer"
                >
                  Save Teacher
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Centered Post-Add Teacher Confirmation Popup */}
      {addedTeacherPopup &&
        createPortal(
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <div
              className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl text-center space-y-3 ${
                isDark ? 'bg-[#141C33] border-emerald-400/40 text-white' : 'bg-white border-emerald-200 text-slate-900'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl mx-auto">
                👩‍🏫
              </div>
              <div>
                <h3 className="text-base font-black text-emerald-500">Teacher Added!</h3>
                <p className="text-xs font-extrabold mt-0.5">{addedTeacherPopup.name}</p>
                <p className="text-[11px] text-slate-400 font-mono">{addedTeacherPopup.phone}</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 space-y-2 text-xs text-left">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold shrink-0">Grades:</span>
                  <span className="font-bold text-right">{addedTeacherPopup.grades.join(', ')}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold shrink-0">Subjects:</span>
                  <span className="font-bold text-right">{addedTeacherPopup.subjects.join(', ')}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/70 dark:border-white/10">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">Login Password:</span>
                  <span className="font-mono font-black text-purple-500 tracking-wider">{addedTeacherPopup.password}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playClick(500);
                  setAddedTeacherPopup(null);
                }}
                className="w-full py-2.5 rounded-xl text-xs font-black bg-[#22C55E] hover:bg-emerald-600 text-white shadow-md cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Edit Teacher & Per-Grade Subjects (Centered via Portal) */}
      {editingTeacher &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
            <div
              className={`w-full max-w-md rounded-3xl border shadow-2xl max-h-[85dvh] flex flex-col overflow-hidden ${
                isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/70 dark:border-white/10 shrink-0">
                <h3 className="text-base font-black">Edit Teacher & Classes</h3>
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEditTeacher} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {/* Photo Row */}
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-sm overflow-hidden shrink-0"
                  style={{ backgroundColor: editingTeacher.color }}
                >
                  {editPhoto ? (
                    <img src={editPhoto} alt={editName} className="w-full h-full object-cover" />
                  ) : (
                    initials(editName || editingTeacher.name)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-extrabold truncate">{editName || editingTeacher.name}</div>
                  <div className="text-[10px] text-slate-400">Update educator portrait photo</div>
                </div>
                <label className="px-2.5 py-1.5 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-300 text-[11px] font-bold cursor-pointer hover:bg-blue-500/25 shrink-0">
                  📷 Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) processImageFile(f, (dataUrl) => setEditPhoto(dataUrl));
                    }}
                  />
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs border font-bold ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Mobile Phone Number
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs border font-mono ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                  required
                />
              </div>

              {/* 6-Char Teacher Login Password */}
              <div className="p-3 rounded-2xl border border-purple-500/25 bg-purple-500/10 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase">
                    🔑 6-Char Teacher Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick(600);
                      setEditPassword(generate6CharPassword(editName.trim() || 'Teacher'));
                    }}
                    className="text-[10px] font-black px-2 py-1 rounded-lg bg-purple-600 text-white cursor-pointer"
                  >
                    🎲 Generate 6-Char
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={12}
                  value={editPassword}
                  onChange={(e) =>
                    setEditPassword(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
                  }
                  placeholder="6-character password"
                  className={`w-full p-2 rounded-xl text-xs font-mono font-bold tracking-widest border ${
                    isDark ? 'bg-black/30 border-white/10 text-emerald-400' : 'bg-white border-slate-200 text-purple-700'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Assigned CBC Grades
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {GRADES.map((g) => {
                    const isSelected = editGrades.includes(g);
                    return (
                      <button
                        type="button"
                        key={g}
                        onClick={() => {
                          sound.playClick(450);
                          setEditGrades((prev) =>
                            prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
                          );
                        }}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-extrabold border transition-all cursor-pointer ${
                          isSelected
                            ? 'text-white border-transparent'
                            : 'bg-transparent text-slate-400 border-slate-200 dark:border-white/10'
                        }`}
                        style={{
                          backgroundColor: isSelected ? GRADE_COLORS[g] : undefined,
                        }}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              {editGrades.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">
                    Subjects Taught Per Grade
                  </label>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {GRADES.filter((g) => editGrades.includes(g)).map((g) => {
                      const picked = editGradeSubjects[g] || [];
                      return (
                        <div
                          key={g}
                          className={`p-2.5 rounded-xl border ${
                            isDark ? 'bg-black/25 border-white/10' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-black text-white"
                              style={{ backgroundColor: GRADE_COLORS[g] }}
                            >
                              {g}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {picked.length} selected
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {SUBJECTS[g].map((sub) => {
                              const active = picked.includes(sub);
                              return (
                                <button
                                  type="button"
                                  key={sub}
                                  onClick={() => toggleGradeSubject(setEditGradeSubjects, g, sub)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                    active
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                      : isDark
                                      ? 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {active ? '✓ ' : '+ '}
                                  {sub}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Additional Subjects (optional, comma separated)
                </label>
                <input
                  type="text"
                  value={editSubjects}
                  onChange={(e) => setEditSubjects(e.target.value)}
                  placeholder="e.g. French, Coding"
                  className={`w-full p-2.5 rounded-xl text-xs border ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Password Reset (Centered via Portal) */}
      {resetTeacherId &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div
              className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl ${
                isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-black">Set Teacher Password</h3>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(600);
                    const target = state.teachers.find((t) => t.id === resetTeacherId);
                    setTempPassword(generate6CharPassword(target?.name || 'Teacher'));
                  }}
                  className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-bold cursor-pointer"
                >
                  🎲 Generate 6-Char
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Administrator sets or AI-generates a 6-character permanent password for the educator.
              </p>

              <input
                type="text"
                maxLength={12}
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
                placeholder="6-character password (e.g. TR4829)"
                className={`w-full p-2.5 rounded-xl text-xs border font-mono font-bold tracking-widest mb-4 ${
                  isDark ? 'bg-black/30 border-white/10 text-emerald-400' : 'bg-slate-50 border-slate-200 text-purple-700'
                }`}
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setResetTeacherId(null)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (tempPassword.length < 6) {
                      onShowToast('Password must be at least 6 characters');
                      return;
                    }
                    onResetTeacherPassword(resetTeacherId, tempPassword);
                    setResetTeacherId(null);
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 cursor-pointer"
                >
                  Save Password
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Delete Confirmation (Complete Deletion, Centered via Portal) */}
      {confirmDeleteId &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div
              className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl ${
                isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="text-rose-500 font-black text-sm mb-1">
                ⚠️ Complete Deletion Confirmation
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                This action will permanently delete this teacher along with all their linked resource files, assignments, and access credentials. <strong>This cannot be undone.</strong>
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15 cursor-pointer"
                >
                  Keep Teacher
                </button>
                <button
                  onClick={() => {
                    onDeleteTeacher(confirmDeleteId);
                    setConfirmDeleteId(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 text-white cursor-pointer"
                >
                  Delete Completely
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
