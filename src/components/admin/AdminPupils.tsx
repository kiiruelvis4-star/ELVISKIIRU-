import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AdminState, Learner, GradeName, GRADES, GRADE_COLORS, PaternalRole, MaternalRole } from './types';
import { admFormat, digitsOnly } from './adminUtils';
import { sound } from '../../utils/sound';
import { useBackHandler } from '../../utils/navigationHistory';
import { NativeAssessmentBooklet } from '../common/NativeAssessmentBooklet';
import { generate6CharPassword } from '../../utils/learnerPasswordUtils';

interface AdminPupilsProps {
  state: AdminState;
  onAdmitLearner: (
    learner: {
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
  ) => void;
  onBulkAdmitLearners: (
    learners: { name: string; grade: GradeName; stream: string }[]
  ) => void;
  onUpdateLearner?: (learner: Learner, parentPassword?: string) => void;
  onDeleteLearner: (learnerId: string) => void;
  onShowToast: (msg: string) => void;
}

export const AdminPupils: React.FC<AdminPupilsProps> = ({
  state,
  onAdmitLearner,
  onBulkAdmitLearners,
  onUpdateLearner,
  onDeleteLearner,
  onShowToast,
}) => {
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdmitModal, setShowAdmitModal] = useState(false);

  // Edit Learner State
  const [editingLearner, setEditingLearner] = useState<Learner | null>(null);
  const [editName, setEditName] = useState('');
  const [editGrade, setEditGrade] = useState<GradeName>('Grade 1');
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  const [editFatherRole, setEditFatherRole] = useState<PaternalRole>('Father');
  const [editFatherName, setEditFatherName] = useState('');
  const [editFatherPhone, setEditFatherPhone] = useState('');
  const [editMotherRole, setEditMotherRole] = useState<MaternalRole>('Mother');
  const [editMotherName, setEditMotherName] = useState('');
  const [editMotherPhone, setEditMotherPhone] = useState('');
  const [editPrimaryPhone, setEditPrimaryPhone] = useState('');
  const [editPermanentPassword, setEditPermanentPassword] = useState('');
  const [editParentPassword, setEditParentPassword] = useState('');

  // Native Booklet Viewer State
  const [viewingBookletLearner, setViewingBookletLearner] = useState<Learner | null>(null);

  // Admit form state
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<GradeName>('Grade 1');
  const [stream, setStream] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [fatherRole, setFatherRole] = useState<PaternalRole>('Father');
  const [fatherName, setFatherName] = useState('');
  const [fatherPhone, setFatherPhone] = useState('');
  const [motherRole, setMotherRole] = useState<MaternalRole>('Mother');
  const [motherName, setMotherName] = useState('');
  const [motherPhone, setMotherPhone] = useState('');
  const [permanentPassword, setPermanentPassword] = useState(() => generate6CharPassword('Learner', '0001'));
  const [parentPassword, setParentPassword] = useState(() => generate6CharPassword('Parent', 'FAM'));
  const [oldAdmNumber, setOldAdmNumber] = useState('');

  // CSV Preview State
  const [csvPreview, setCsvPreview] = useState<{
    valid: { name: string; grade: GradeName; stream: string }[];
    invalidCount: number;
  } | null>(null);

  // Delete modal confirmation
  const [confirmDeleteLearner, setConfirmDeleteLearner] = useState<Learner | null>(null);

  // Centered post-admit popup state
  const [admitSuccessPopup, setAdmitSuccessPopup] = useState<{
    name: string;
    adm: string;
    grade: GradeName;
    stream: string;
    permanentPassword: string;
    parentPassword: string;
  } | null>(null);

  useBackHandler(
    () => {
      sound.playClick(400);
      setAdmitSuccessPopup(null);
      return true;
    },
    admitSuccessPopup !== null,
    46,
    'pupils_admit_success'
  );

  // --- PHONE BACK NAVIGATION WITHIN PUPILS TAB ---
  // 1. Native Booklet viewer (priority 47)
  useBackHandler(
    () => {
      sound.playClick(400);
      setViewingBookletLearner(null);
      return true;
    },
    viewingBookletLearner !== null,
    47,
    'pupils_native_booklet'
  );

  // 2. Edit Learner modal (priority 46)
  useBackHandler(
    () => {
      sound.playClick(400);
      setEditingLearner(null);
      return true;
    },
    editingLearner !== null,
    46,
    'pupils_edit_learner'
  );

  // 3. Delete confirmation modal (priority 45)
  useBackHandler(
    () => {
      sound.playClick(400);
      setConfirmDeleteLearner(null);
      return true;
    },
    confirmDeleteLearner !== null,
    45,
    'pupils_confirm_delete'
  );

  // 4. CSV Bulk Admit Preview (priority 45)
  useBackHandler(
    () => {
      sound.playClick(400);
      setCsvPreview(null);
      return true;
    },
    csvPreview !== null,
    45,
    'pupils_csv_preview'
  );

  // 5. Admit Learner modal (priority 45)
  useBackHandler(
    () => {
      sound.playClick(400);
      setShowAdmitModal(false);
      return true;
    },
    showAdmitModal,
    45,
    'pupils_admit_modal'
  );

  const isDark = state.theme === 'dark';
  const nextNumberToAssign = admFormat(state.admNext);

  // Filter learners (guard qDigits so non-numeric text searches don't match every phone via "")
  const filteredLearners = state.learners.filter((l) => {
    if (selectedGrade !== 'All' && l.grade !== selectedGrade) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const qDigits = digitsOnly(q);
    const matchesText =
      (l.name || '').toLowerCase().includes(q) ||
      (l.adm || '').toLowerCase().includes(q) ||
      (l.grade || '').toLowerCase().includes(q) ||
      (l.stream || '').toLowerCase().includes(q) ||
      (l.fatherName || '').toLowerCase().includes(q) ||
      (l.motherName || '').toLowerCase().includes(q);
    const matchesPhone =
      qDigits.length > 0 &&
      (digitsOnly(l.parentPhone || '').includes(qDigits) ||
        digitsOnly(l.fatherPhone || '').includes(qDigits) ||
        digitsOnly(l.motherPhone || '').includes(qDigits));
    return matchesText || matchesPhone;
  });

  const getGradeCount = (g: string) => {
    if (g === 'All') return state.learners.length;
    return state.learners.filter((l) => l.grade === g).length;
  };

  const handleSingleAdmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onShowToast('Enter learner full name');
      return;
    }

    if (oldAdmNumber.trim()) {
      const cleanOld = oldAdmNumber.trim().toUpperCase();
      const existing = state.admRegister[cleanOld];
      if (existing && existing.inUse) {
        onShowToast(`Admission number ${cleanOld} is already active!`);
        return;
      }
    }

    const assignedAdm = oldAdmNumber.trim()
      ? oldAdmNumber.trim().toUpperCase()
      : nextNumberToAssign;

    const finalLearnerPin =
      permanentPassword.trim().length === 6
        ? permanentPassword.trim().toUpperCase()
        : generate6CharPassword(name.trim() || 'Learner', assignedAdm);
    const finalParentPass =
      parentPassword.trim().length >= 4
        ? parentPassword.trim().toUpperCase()
        : generate6CharPassword(fatherName.trim() || motherName.trim() || name.trim() || 'Parent', 'FAM');

    const admittedName = name.trim();
    const admittedGrade = grade;
    const admittedStream = stream.trim();

    onAdmitLearner(
      {
        name: admittedName,
        grade: admittedGrade,
        stream: admittedStream,
        parentPhone: fatherPhone.trim() || motherPhone.trim() || parentPhone.trim(),
        fatherRole,
        fatherName: fatherName.trim() || undefined,
        fatherPhone: fatherPhone.trim() || undefined,
        motherRole,
        motherName: motherName.trim() || undefined,
        motherPhone: motherPhone.trim() || undefined,
        permanentPassword: finalLearnerPin,
        parentPassword: finalParentPass,
      },
      oldAdmNumber.trim() ? oldAdmNumber.trim().toUpperCase() : undefined
    );

    // Reset
    setName('');
    setStream('');
    setParentPhone('');
    setFatherRole('Father');
    setFatherName('');
    setFatherPhone('');
    setMotherRole('Mother');
    setMotherName('');
    setMotherPhone('');
    setPermanentPassword(generate6CharPassword('Learner', '0000'));
    setParentPassword(generate6CharPassword('Parent', 'FAM'));
    setOldAdmNumber('');
    setShowAdmitModal(false);

    // Show centered confirmation popup with learner & parent credentials
    setAdmitSuccessPopup({
      name: admittedName,
      adm: assignedAdm,
      grade: admittedGrade,
      stream: admittedStream,
      permanentPassword: finalLearnerPin,
      parentPassword: finalParentPass,
    });
  };

  const processLearnerPhotoFile = (file: File, callback: (dataUrl: string) => void) => {
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
          callback(canvas.toDataURL('image/jpeg', 0.88));
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleStartEdit = (learner: Learner) => {
    sound.playClick(500);
    const linkedFam = state.families.find((f) => f.id === learner.familyId);
    setEditingLearner(learner);
    setEditName(learner.name);
    setEditGrade(learner.grade);
    setEditPhoto(learner.photo || null);
    setEditFatherRole(learner.fatherRole || 'Father');
    setEditFatherName(learner.fatherName || '');
    setEditFatherPhone(learner.fatherPhone || '');
    setEditMotherRole(learner.motherRole || 'Mother');
    setEditMotherName(learner.motherName || '');
    setEditMotherPhone(learner.motherPhone || '');
    setEditPrimaryPhone(learner.parentPhone || '');
    setEditPermanentPassword(
      learner.permanentPassword || generate6CharPassword(learner.name, learner.adm)
    );
    setEditParentPassword(
      linkedFam?.passHash || generate6CharPassword(learner.fatherName || learner.motherName || learner.name, 'FAM')
    );
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLearner) return;
    if (!editName.trim()) {
      onShowToast('Enter learner full name');
      return;
    }
    const finalEditPass =
      editPermanentPassword.trim().length === 6
        ? editPermanentPassword.trim().toUpperCase()
        : editingLearner.permanentPassword ||
          generate6CharPassword(editName.trim(), editingLearner.adm);
    const finalParentPass =
      editParentPassword.trim().length >= 4
        ? editParentPassword.trim().toUpperCase()
        : generate6CharPassword(editFatherName.trim() || editMotherName.trim() || editName.trim(), 'FAM');

    const updated: Learner = {
      ...editingLearner,
      name: editName.trim(),
      grade: editGrade,
      photo: editPhoto,
      fatherRole: editFatherRole,
      fatherName: editFatherName.trim() || undefined,
      fatherPhone: editFatherPhone.trim() || undefined,
      motherRole: editMotherRole,
      motherName: editMotherName.trim() || undefined,
      motherPhone: editMotherPhone.trim() || undefined,
      parentPhone:
        editFatherPhone.trim() ||
        editMotherPhone.trim() ||
        editPrimaryPhone.trim() ||
        editingLearner.parentPhone,
      permanentPassword: finalEditPass,
    };
    if (onUpdateLearner) {
      onUpdateLearner(updated, finalParentPass);
    }
    setEditingLearner(null);
    onShowToast(`Updated details & DP for ${updated.name}`);
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        onShowToast('CSV file is empty or missing headers');
        return;
      }

      const headers = lines[0].toLowerCase().split(',').map((h) => h.trim());
      const nameIdx = headers.indexOf('name');
      const gradeIdx = headers.indexOf('grade');
      const streamIdx = headers.indexOf('stream');

      if (nameIdx === -1 || gradeIdx === -1) {
        onShowToast('CSV must include "name" and "grade" columns');
        return;
      }

      const validRows: { name: string; grade: GradeName; stream: string }[] = [];
      let invalid = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim());
        const rowName = cols[nameIdx] || '';
        const rawGrade = cols[gradeIdx] || '';
        const rowStream = streamIdx !== -1 ? cols[streamIdx] || '' : '';

        // Normalize grade
        let matchedGrade: GradeName | null = null;
        for (const g of GRADES) {
          if (
            rawGrade.toLowerCase() === g.toLowerCase() ||
            rawGrade.toLowerCase() === g.replace('Grade ', 'g').toLowerCase() ||
            rawGrade === g.replace('Grade ', '')
          ) {
            matchedGrade = g;
            break;
          }
        }

        if (rowName && matchedGrade) {
          validRows.push({
            name: rowName,
            grade: matchedGrade,
            stream: rowStream,
          });
        } else {
          invalid++;
        }
      }

      if (validRows.length === 0) {
        onShowToast('No valid pupil rows found in CSV');
        return;
      }

      setCsvPreview({
        valid: validRows,
        invalidCount: invalid,
      });
      sound.playClick(600);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmBulkAdmit = () => {
    if (!csvPreview || csvPreview.valid.length === 0) return;
    onBulkAdmitLearners(csvPreview.valid);
    setCsvPreview(null);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-4">
      {/* Title & Action Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            Pupils Directory
          </h2>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {state.learners.length} enrolled across Grades 1–6
          </div>
        </div>

        <button
          onClick={() => {
            sound.playClick(600);
            setPermanentPassword(generate6CharPassword(name.trim() || 'Learner', nextNumberToAssign));
            setParentPassword(generate6CharPassword('Parent', nextNumberToAssign));
            setShowAdmitModal(true);
          }}
          className="py-2 px-3 text-xs font-black rounded-xl bg-[#22C55E] hover:bg-emerald-600 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
        >
          <span>＋ Admit Pupil</span>
        </button>
      </div>

      {/* Grade Segmented Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {['All', ...GRADES].map((g) => {
          const isSelected = selectedGrade === g;
          const count = getGradeCount(g);
          return (
            <button
              key={g}
              onClick={() => {
                sound.playClick(450);
                setSelectedGrade(g);
              }}
              className={`py-1.5 px-3 rounded-full text-xs font-black shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200'
              }`}
              style={{
                backgroundColor: isSelected
                  ? g === 'All'
                    ? '#2F6BFF'
                    : GRADE_COLORS[g as GradeName]
                  : undefined,
              }}
            >
              <span>{g === 'All' ? 'All Grades' : g.replace('Grade ', 'G')}</span>
              <span className="text-[10px] opacity-80 px-1.5 py-0.2 rounded-full bg-black/20">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar & CSV Admit */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ADM (LRA/0001), grade, or phone…"
            className={`w-full py-2.5 pl-9 pr-8 rounded-2xl text-xs border focus:outline-none transition-colors ${
              isDark
                ? 'bg-[#141C33] border-white/10 text-white placeholder-slate-500 focus:border-blue-400'
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
            }`}
          />
          <span className="absolute left-3 top-2.5 text-xs text-slate-400">
            🔍
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                sound.playClick(400);
                setSearchQuery('');
              }}
              className="absolute right-2.5 top-2 w-5 h-5 rounded-full bg-slate-200 dark:bg-white/15 text-slate-600 dark:text-white text-[10px] font-bold flex items-center justify-center cursor-pointer hover:opacity-80"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <label
          className="py-2.5 px-3 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-blue-500/25 shrink-0"
          title="Bulk Upload CSV"
        >
          <span>⬆ CSV</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleCsvFile}
          />
        </label>
      </div>

      {/* Pupils Table */}
      <div
        className={`rounded-2xl border overflow-hidden shadow-xs ${
          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/10 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-2.5 px-3">Pupil Name</th>
                <th className="py-2.5 px-3">ADM Number</th>
                <th className="py-2.5 px-3">Grade</th>
                <th className="py-2.5 px-3">Parent Contacts</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredLearners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    No pupils found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredLearners.map((learner) => (
                  <tr
                    key={learner.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-[11px] overflow-hidden shrink-0 border border-slate-200 dark:border-white/15"
                          style={{ backgroundColor: GRADE_COLORS[learner.grade] }}
                        >
                          {learner.photo ? (
                            <img src={learner.photo} alt={learner.name} className="w-full h-full object-cover" />
                          ) : (
                            (learner.name || 'L').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 dark:text-white truncate">
                            {learner.name}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                            <span>{learner.grade}</span>
                            {learner.alumni && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 font-black uppercase text-[9px]">
                                Alumni
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                          {learner.adm}
                        </span>
                        <span
                          className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center gap-1"
                          title="Learner 6-character portal password"
                        >
                          <span>🔑</span>
                          <span>{learner.permanentPassword || 'LR' + learner.adm.replace(/\D/g, '').padStart(4, '0')}</span>
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <span
                        className="text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: GRADE_COLORS[learner.grade] }}
                      >
                        {learner.grade.replace('Grade ', 'G')}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {(() => {
                        const fam = state.families.find((f) => f.id === learner.familyId);
                        const fRole = learner.fatherRole || 'Father';
                        const mRole = learner.motherRole || 'Mother';
                        return (
                          <div className="space-y-0.5 text-[11px]">
                            {learner.fatherName || learner.fatherPhone || learner.motherName || learner.motherPhone ? (
                              <>
                                {(learner.fatherName || learner.fatherPhone) && (
                                  <div className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200">
                                    <span className="text-[10px]">{fRole === 'Grandfather' ? '👴' : '👨'}</span>
                                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{fRole}:</span>
                                    <span>{learner.fatherName || '—'}</span>
                                    <span className="font-mono text-slate-500 dark:text-slate-400">{learner.fatherPhone || '—'}</span>
                                  </div>
                                )}
                                {(learner.motherName || learner.motherPhone) && (
                                  <div className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200">
                                    <span className="text-[10px]">{mRole === 'Grandmother' ? '👵' : '👩'}</span>
                                    <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400">{mRole}:</span>
                                    <span>{learner.motherName || '—'}</span>
                                    <span className="font-mono text-slate-500 dark:text-slate-400">{learner.motherPhone || '—'}</span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="font-mono text-[11px] text-slate-500">{learner.parentPhone || '—'}</span>
                            )}
                            {fam?.passHash && (
                              <div className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 mt-0.5">
                                <span>👪 Parent PW:</span>
                                <span>{fam.passHash}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            sound.playClick(500);
                            setViewingBookletLearner(learner);
                          }}
                          className="h-7 px-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 inline-flex items-center gap-1 text-[11px] font-bold hover:bg-blue-100 cursor-pointer"
                          title="Open CBC Assessment Book"
                        >
                          <span>📖</span>
                          <span className="hidden sm:inline">Book</span>
                        </button>

                        <button
                          onClick={() => handleStartEdit(learner)}
                          className="h-7 px-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 text-[11px] font-bold hover:bg-emerald-100 cursor-pointer"
                          title="Edit Pupil & Parents"
                        >
                          <span>✏️</span>
                          <span className="hidden sm:inline">Edit</span>
                        </button>

                        <button
                          onClick={() => {
                            sound.playClick(400);
                            setConfirmDeleteLearner(learner);
                          }}
                          className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 inline-flex items-center justify-center text-xs hover:bg-rose-100 cursor-pointer"
                          title="Delete Pupil"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Admit Pupil (Centered via Portal) */}
      {showAdmitModal &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
            <div
              className={`w-full max-w-md rounded-3xl border shadow-2xl max-h-[85dvh] flex flex-col overflow-hidden ${
                isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/70 dark:border-white/10 shrink-0">
                <div>
                  <h3 className="text-base font-black">Admit New Pupil</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Assigned permanent number will be <strong className="text-blue-500 font-mono">{nextNumberToAssign}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdmitModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSingleAdmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Learner Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Samuel Mwangi Kibaki"
                  className={`w-full p-2.5 rounded-xl text-xs border ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  CBC Grade (Grade 1 to 6)
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value as GradeName)}
                  className={`w-full p-2.5 rounded-xl text-xs border font-bold ${
                    isDark ? 'bg-[#0A0F1F] border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Guardian 1: Father or Grandfather */}
              <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <span>{fatherRole === 'Grandfather' ? '👴' : '👨'}</span>
                    <span>{fatherRole}&apos;s Details</span>
                  </div>
                  <div className="flex rounded-lg overflow-hidden border border-blue-200 dark:border-blue-800 text-[10px] font-black">
                    {(['Father', 'Grandfather'] as PaternalRole[]).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          sound.playClick(450);
                          setFatherRole(role);
                        }}
                        className={`px-2 py-0.5 cursor-pointer transition-colors ${
                          fatherRole === role
                            ? 'bg-blue-600 text-white'
                            : 'bg-transparent text-slate-500 dark:text-slate-300 hover:bg-blue-500/10'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder={`${fatherRole}'s Full Name`}
                    className={`w-full p-2 rounded-xl text-xs border ${
                      isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200'
                    }`}
                  />
                  <input
                    type="tel"
                    value={fatherPhone}
                    onChange={(e) => setFatherPhone(e.target.value)}
                    placeholder={`${fatherRole}'s Phone (e.g. 0712 345 678)`}
                    className={`w-full p-2 rounded-xl text-xs border font-mono ${
                      isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* Guardian 2: Mother or Grandmother */}
              <div className="p-3 rounded-2xl bg-pink-50/50 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-900/30 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-pink-600 dark:text-pink-400 flex items-center gap-1.5">
                    <span>{motherRole === 'Grandmother' ? '👵' : '👩'}</span>
                    <span>{motherRole}&apos;s Details</span>
                  </div>
                  <div className="flex rounded-lg overflow-hidden border border-pink-200 dark:border-pink-800 text-[10px] font-black">
                    {(['Mother', 'Grandmother'] as MaternalRole[]).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          sound.playClick(450);
                          setMotherRole(role);
                        }}
                        className={`px-2 py-0.5 cursor-pointer transition-colors ${
                          motherRole === role
                            ? 'bg-pink-600 text-white'
                            : 'bg-transparent text-slate-500 dark:text-slate-300 hover:bg-pink-500/10'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    placeholder={`${motherRole}'s Full Name`}
                    className={`w-full p-2 rounded-xl text-xs border ${
                      isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200'
                    }`}
                  />
                  <input
                    type="tel"
                    value={motherPhone}
                    onChange={(e) => setMotherPhone(e.target.value)}
                    placeholder={`${motherRole}'s Phone (e.g. 0722 889 900)`}
                    className={`w-full p-2 rounded-xl text-xs border font-mono ${
                      isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* Learner AI-Generated 6-Char PIN */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <span>Learner Permanent Password / PIN</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                      permanentPassword.trim().length === 6 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {permanentPassword.trim().length}/6 CHARS
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick(600);
                      setPermanentPassword(generate6CharPassword(name.trim() || 'Learner', oldAdmNumber.trim() || '0000'));
                    }}
                    className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-bold cursor-pointer"
                  >
                    🎲 Generate 6-Char PIN
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={permanentPassword}
                  onChange={(e) => setPermanentPassword(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
                  placeholder="e.g. LR0010"
                  className={`w-full p-2.5 rounded-xl text-xs border font-mono font-bold tracking-widest ${
                    isDark ? 'bg-black/30 border-white/10 text-emerald-400' : 'bg-slate-50 border-slate-200 text-purple-700'
                  }`}
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Strictly 6 characters. Learners use their admission number and this 6-character PIN to access the portal.
                </p>
              </div>

              {/* Shared Parent/Family AI-Generated 6-Char Password */}
              <div className="p-3 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/40">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase flex items-center gap-1.5">
                    <span>👪 Parents Shared Password</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                      parentPassword.trim().length === 6 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {parentPassword.trim().length}/6 CHARS
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick(600);
                      setParentPassword(
                        generate6CharPassword(fatherName.trim() || motherName.trim() || name.trim() || 'Parent', 'FAM')
                      );
                    }}
                    className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline font-bold cursor-pointer"
                  >
                    🎲 Generate 6-Char Password
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={parentPassword}
                  onChange={(e) => setParentPassword(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
                  placeholder="e.g. PR4829"
                  className={`w-full p-2.5 rounded-xl text-xs border font-mono font-bold tracking-widest ${
                    isDark ? 'bg-black/30 border-white/10 text-teal-300' : 'bg-white border-teal-200 text-teal-800'
                  }`}
                  required
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Auto-creates the Family under <strong>Families</strong> and recognizes BOTH {fatherRole} &amp; {motherRole} phone numbers with this single password.
                </p>
              </div>

              {/* Returning learner original number (optional) */}
              <div className="pt-2 border-t border-slate-100 dark:border-white/10">
                <label className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-1">
                  Returning Learner (Keep Original Number)
                </label>
                <input
                  type="text"
                  value={oldAdmNumber}
                  onChange={(e) => setOldAdmNumber(e.target.value)}
                  placeholder="e.g. LRA/0025 (leave empty for new learners)"
                  className={`w-full p-2.5 rounded-xl text-xs border font-mono ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Per school spec, returning learners retain their original number if it is inactive.
                </p>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdmitModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#22C55E] text-white shadow-xs cursor-pointer"
                >
                  Admit Learner
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Centered Post-Admit Confirmation Popup */}
      {admitSuccessPopup &&
        createPortal(
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <div
              className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl text-center space-y-3 ${
                isDark ? 'bg-[#141C33] border-emerald-400/40 text-white' : 'bg-white border-emerald-200 text-slate-900'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl mx-auto">
                🎓
              </div>
              <div>
                <h3 className="text-base font-black text-emerald-500">Pupil Admitted!</h3>
                <p className="text-xs font-extrabold mt-0.5">{admitSuccessPopup.name}</p>
                <p className="text-[11px] text-slate-400">
                  {admitSuccessPopup.grade}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 space-y-2 text-xs text-left">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">Admission No:</span>
                  <span className="font-mono font-black text-blue-500">{admitSuccessPopup.adm}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">Learner PIN:</span>
                  <span className="font-mono font-black text-purple-500 tracking-wider">{admitSuccessPopup.permanentPassword}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">Parents Password:</span>
                  <span className="font-mono font-black text-teal-500 tracking-wider">{admitSuccessPopup.parentPassword}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playClick(500);
                  setAdmitSuccessPopup(null);
                }}
                className="w-full py-2.5 rounded-xl text-xs font-black bg-[#22C55E] hover:bg-emerald-600 text-white shadow-md cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: CSV Preview Before Admitting */}
      {csvPreview &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div
              className={`w-full max-w-lg rounded-3xl p-5 border shadow-2xl max-h-[85dvh] flex flex-col ${
                isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div>
                <h3 className="text-base font-black">CSV Bulk Admission Preview</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {csvPreview.valid.length} valid learners ready for admission. Next ADM starts at{' '}
                  <strong className="text-blue-500 font-mono">{nextNumberToAssign}</strong>.
                </p>
              </div>
              <button
                onClick={() => setCsvPreview(null)}
                className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {csvPreview.invalidCount > 0 && (
              <div className="mb-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs shrink-0">
                ⚠️ {csvPreview.invalidCount} invalid rows were skipped (missing name or invalid grade outside G1–G6).
              </div>
            )}

            <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-white/10 rounded-xl my-2">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-white/5 sticky top-0 text-[10px] uppercase font-bold text-slate-400">
                  <tr>
                    <th className="p-2 text-left">Learner Name</th>
                    <th className="p-2 text-left">Grade</th>
                    <th className="p-2 text-left">Will Receive ADM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {csvPreview.valid.map((row, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-bold">{row.name}</td>
                      <td className="p-2">
                        <span
                          className="px-2 py-0.5 rounded text-white text-[10px] font-bold"
                          style={{ backgroundColor: GRADE_COLORS[row.grade] }}
                        >
                          {row.grade}
                        </span>
                      </td>
                      <td className="p-2 font-mono text-blue-500 font-bold">
                        {admFormat(state.admNext + idx)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 flex gap-2 shrink-0">
              <button
                onClick={() => setCsvPreview(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkAdmit}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#22C55E] text-white shadow-xs"
              >
                Admit {csvPreview.valid.length} Learners
              </button>
            </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Delete Pupil (Complete Deletion) */}
      {confirmDeleteLearner &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div
              className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl ${
                isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="text-rose-500 font-black text-sm mb-1">
                ⚠️ Permanently Delete Learner?
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-2 leading-relaxed">
                Are you sure you want to delete <strong>{confirmDeleteLearner.name}</strong> ({confirmDeleteLearner.adm})?
              </p>
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-[11px] text-slate-500 dark:text-slate-400 mb-4">
                Per school regulations: all marks, assignments, family links, and logins will be deleted completely. Number <strong className="font-mono">{confirmDeleteLearner.adm}</strong> is permanently retired and will never be reassigned.
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDeleteLearner(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteLearner(confirmDeleteLearner.id);
                    setConfirmDeleteLearner(null);
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

      {/* Modal: Edit Learner & Parent Contacts (Centered via Portal) */}
      {editingLearner &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
            <div
              className={`w-full max-w-lg rounded-3xl border shadow-2xl max-h-[85dvh] flex flex-col overflow-hidden ${
                isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/70 dark:border-white/10 shrink-0">
                <div>
                  <h3 className="text-base font-black flex items-center gap-2">
                    <span>✏️</span>
                    <span>Edit Pupil & Parent Details</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ADM <span className="font-mono font-bold text-blue-500">{editingLearner.adm}</span> • Matching phone numbers automatically unite siblings in the Families tab.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingLearner(null)}
                  className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 text-xs font-bold hover:bg-slate-300 dark:hover:bg-white/20 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 space-y-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Pupil Information &amp; Display Picture (DP)
                </div>

                {/* Learner DP Upload & Preview Setting */}
                <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white dark:bg-black/25 border border-slate-200/70 dark:border-white/10">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-sm overflow-hidden shrink-0 border-2 border-blue-400/50"
                    style={{ backgroundColor: GRADE_COLORS[editGrade] }}
                  >
                    {editPhoto ? (
                      <img src={editPhoto} alt={editName || editingLearner.name} className="w-full h-full object-cover" />
                    ) : (
                      (editName || editingLearner.name || 'L').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-extrabold truncate">{editName || editingLearner.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {editPhoto ? 'Learner DP set · Shown in Learners & Pupils view' : 'Set a display picture (DP) for this learner'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <label className="px-2.5 py-1.5 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-300 text-[11px] font-bold cursor-pointer hover:bg-blue-500/25">
                      📷 {editPhoto ? 'Change DP' : 'Set DP'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) processLearnerPhotoFile(f, (dataUrl) => setEditPhoto(dataUrl));
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {editPhoto && (
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick(400);
                          setEditPhoto(null);
                        }}
                        className="px-2 py-1.5 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-300 text-[11px] font-bold cursor-pointer hover:bg-rose-500/25"
                        title="Remove DP"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Learner Full Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={`w-full p-2.5 rounded-xl text-xs border font-bold ${
                      isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    CBC Grade
                  </label>
                  <select
                    value={editGrade}
                    onChange={(e) => setEditGrade(e.target.value as GradeName)}
                    className={`w-full p-2.5 rounded-xl text-xs border font-bold ${
                      isDark ? 'bg-[#0A0F1F] border-white/10 text-white' : 'bg-white border-slate-200'
                    }`}
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Father / Grandfather Details */}
              <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <span>{editFatherRole === 'Grandfather' ? '👴' : '👨'}</span>
                    <span>{editFatherRole}&apos;s Details</span>
                  </div>
                  <div className="flex rounded-lg overflow-hidden border border-blue-200 dark:border-blue-800 text-[10px] font-black">
                    {(['Father', 'Grandfather'] as PaternalRole[]).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          sound.playClick(450);
                          setEditFatherRole(role);
                        }}
                        className={`px-2 py-0.5 cursor-pointer transition-colors ${
                          editFatherRole === role
                            ? 'bg-blue-600 text-white'
                            : 'bg-transparent text-slate-500 dark:text-slate-300 hover:bg-blue-500/10'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      {editFatherRole}&apos;s Name
                    </label>
                    <input
                      type="text"
                      value={editFatherName}
                      onChange={(e) => setEditFatherName(e.target.value)}
                      placeholder="e.g. John Mwangi"
                      className={`w-full p-2.5 rounded-xl text-xs border ${
                        isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      {editFatherRole}&apos;s Phone Number
                    </label>
                    <input
                      type="tel"
                      value={editFatherPhone}
                      onChange={(e) => setEditFatherPhone(e.target.value)}
                      placeholder="e.g. 0712 345 678"
                      className={`w-full p-2.5 rounded-xl text-xs border font-mono ${
                        isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Mother / Grandmother Details */}
              <div className="p-3 rounded-2xl bg-pink-50/50 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-900/30 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-pink-600 dark:text-pink-400 flex items-center gap-1.5">
                    <span>{editMotherRole === 'Grandmother' ? '👵' : '👩'}</span>
                    <span>{editMotherRole}&apos;s Details</span>
                  </div>
                  <div className="flex rounded-lg overflow-hidden border border-pink-200 dark:border-pink-800 text-[10px] font-black">
                    {(['Mother', 'Grandmother'] as MaternalRole[]).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          sound.playClick(450);
                          setEditMotherRole(role);
                        }}
                        className={`px-2 py-0.5 cursor-pointer transition-colors ${
                          editMotherRole === role
                            ? 'bg-pink-600 text-white'
                            : 'bg-transparent text-slate-500 dark:text-slate-300 hover:bg-pink-500/10'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      {editMotherRole}&apos;s Name
                    </label>
                    <input
                      type="text"
                      value={editMotherName}
                      onChange={(e) => setEditMotherName(e.target.value)}
                      placeholder="e.g. Grace Wambui"
                      className={`w-full p-2.5 rounded-xl text-xs border ${
                        isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      {editMotherRole}&apos;s Phone Number
                    </label>
                    <input
                      type="tel"
                      value={editMotherPhone}
                      onChange={(e) => setEditMotherPhone(e.target.value)}
                      placeholder="e.g. 0722 889 900"
                      className={`w-full p-2.5 rounded-xl text-xs border font-mono ${
                        isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Learner Permanent Password / PIN */}
              <div className="p-3 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                    <span>🔑 Learner Access Password / PIN</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                      editPermanentPassword.trim().length === 6 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {editPermanentPassword.trim().length}/6 CHARS
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick(600);
                      setEditPermanentPassword(generate6CharPassword(editName.trim() || 'Learner', editingLearner.adm));
                    }}
                    className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-bold cursor-pointer"
                  >
                    🎲 Generate New 6-Char PIN
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={editPermanentPassword}
                  onChange={(e) => setEditPermanentPassword(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
                  placeholder="e.g. LR0010"
                  className={`w-full p-2.5 rounded-xl text-xs border font-mono font-bold tracking-widest ${
                    isDark ? 'bg-black/30 border-white/10 text-emerald-400' : 'bg-white border-slate-200 text-purple-700'
                  }`}
                  required
                />
                <p className="text-[10px] text-slate-400">
                  Strictly 6 characters. Used by the learner to access the Learners Portal permanently.
                </p>
              </div>

              {/* Shared Parents Password */}
              <div className="p-3 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
                    <span>👪 Parents Shared Password (Both Numbers)</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                      editParentPassword.trim().length === 6 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {editParentPassword.trim().length}/6 CHARS
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick(600);
                      setEditParentPassword(
                        generate6CharPassword(editFatherName.trim() || editMotherName.trim() || editName.trim(), editingLearner.adm)
                      );
                    }}
                    className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline font-bold cursor-pointer"
                  >
                    🎲 Generate New 6-Char Password
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={editParentPassword}
                  onChange={(e) => setEditParentPassword(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
                  placeholder="e.g. PR4829"
                  className={`w-full p-2.5 rounded-xl text-xs border font-mono font-bold tracking-widest ${
                    isDark ? 'bg-black/30 border-white/10 text-teal-300' : 'bg-white border-teal-200 text-teal-800'
                  }`}
                  required
                />
                <p className="text-[10px] text-slate-400">
                  Recognized by both {editFatherRole}&apos;s and {editMotherRole}&apos;s phone numbers for this learner&apos;s family.
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLearner(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Native Assessment Booklet (In-App View, NO PDF) */}
      {viewingBookletLearner &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex flex-col bg-slate-900/95 backdrop-blur-md overflow-hidden">
            <div className="flex items-center justify-between p-3.5 bg-slate-900 text-white border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">📖</span>
                <div>
                  <h2 className="text-sm font-black text-white">
                    Official CBC Assessment Book — {viewingBookletLearner.name}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    ADM {viewingBookletLearner.adm} • {viewingBookletLearner.grade} • Little Roses Academy • Academic Year {new Date().getFullYear()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  sound.playClick(400);
                  setViewingBookletLearner(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <span>✕ Close Book</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 sm:p-6 bg-slate-100 dark:bg-slate-950">
              <div className="max-w-4xl mx-auto">
                <NativeAssessmentBooklet
                  role="admin"
                  embedded={true}
                  learner={viewingBookletLearner}
                  onClose={() => setViewingBookletLearner(null)}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
