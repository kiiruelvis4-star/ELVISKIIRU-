import React, { useState } from 'react';
import {
  AdminState,
  GradeName,
  GRADES,
  GRADE_COLORS,
  SUBJECTS,
  SLOTS,
  DAYS,
  LOWER_GRADES,
  TimetableCell,
  TimetableSlotDef,
} from './types';
import { sound } from '../../utils/sound';
import { useBackHandler } from '../../utils/navigationHistory';

interface AdminTimetableProps {
  state: AdminState;
  onSaveTimetableCell: (day: string, slotKey: string, grade: GradeName, cell: TimetableCell | null) => void;
  onSaveTimetableSlots?: (slots: TimetableSlotDef[]) => void;
  onSetFreeze: (freeze: { from: string; to: string; why: string } | null) => void;
  onShowToast: (msg: string) => void;
}

export const AdminTimetable: React.FC<AdminTimetableProps> = ({
  state,
  onSaveTimetableCell,
  onSaveTimetableSlots,
  onSetFreeze,
  onShowToast,
}) => {
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('All');
  const [editingCell, setEditingCell] = useState<{ day: string; slotKey: string } | null>(null);

  // Editable Time Slots Modal State
  const activeSlots: TimetableSlotDef[] =
    Array.isArray(state.timetableSlots) && state.timetableSlots.length > 0
      ? state.timetableSlots
      : SLOTS;
  const [showSlotsModal, setShowSlotsModal] = useState(false);
  const [draftSlots, setDraftSlots] = useState<TimetableSlotDef[]>(activeSlots);

  // Freeze Modal State
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [freezeFrom, setFreezeFrom] = useState(state.freeze?.from || '');
  const [freezeTo, setFreezeTo] = useState(state.freeze?.to || '');
  const [freezeWhy, setFreezeWhy] = useState(state.freeze?.why || 'Mid-term & End of Term Examinations');

  // Phone back handlers for timetable
  useBackHandler(
    () => {
      sound.playClick(400);
      setShowSlotsModal(false);
      return true;
    },
    showSlotsModal,
    46,
    'timetable_slots_modal'
  );
  useBackHandler(
    () => {
      sound.playClick(400);
      setShowFreezeModal(false);
      return true;
    },
    showFreezeModal,
    45,
    'timetable_freeze_modal'
  );

  useBackHandler(
    () => {
      sound.playClick(400);
      setEditingCell(null);
      return true;
    },
    editingCell !== null,
    35,
    'timetable_edit_cell'
  );

  const isDark = state.theme === 'dark';

  const isFrozen = !!(
    state.freeze &&
    new Date() >= new Date(state.freeze.from) &&
    new Date() <= new Date(state.freeze.to)
  );

  // Teacher double-booking conflict detection
  const conflicts: Record<string, boolean> = {};
  activeSlots.filter((s) => s.lesson).forEach((s) => {
    DAYS.forEach((d) => {
      const teacherAssignments: Record<string, GradeName> = {};
      GRADES.forEach((g) => {
        const cell = state.timetable[`${d}|${s.k}|${g}`];
        if (cell && cell.teacherId) {
          if (teacherAssignments[cell.teacherId]) {
            const firstGrade = teacherAssignments[cell.teacherId];
            conflicts[`${d}|${s.k}|${g}`] = true;
            conflicts[`${d}|${s.k}|${firstGrade}`] = true;
          } else {
            teacherAssignments[cell.teacherId] = g;
          }
        }
      });
    });
  });

  const conflictCount = Object.keys(conflicts).length;

  const getTeacherName = (id: string) => {
    const t = state.teachers.find((x) => x.id === id);
    return t ? t.name : 'Unknown Teacher';
  };

  const gradeHasSlot = (g: GradeName, lesson?: number) => {
    if (lesson === 7 && LOWER_GRADES.includes(g)) return false;
    return true;
  };

  const handleCellClick = (day: string, slotKey: string) => {
    if (isFrozen) {
      onShowToast('Timetable is currently frozen for examinations. Modifications are locked.');
      return;
    }
    sound.playClick(500);
    setEditingCell({ day, slotKey });
  };

  return (
    <div className="space-y-4 animate-fade-in pb-4">
      {/* Title, Edit Time Slots & Freeze Control */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            CBC Bell Schedule & Timetable
          </h2>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Synced live to all teachers, parents & learners ({activeSlots[0]?.t?.split('–')[0]?.trim() || '8:20'} – {activeSlots[activeSlots.length - 1]?.t?.split('–')[1]?.trim() || '3:00'})
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onSaveTimetableSlots && (
            <button
              type="button"
              onClick={() => {
                sound.playClick(550);
                setDraftSlots(activeSlots.map((s) => ({ ...s })));
                setShowSlotsModal(true);
              }}
              className="py-2 px-3 text-xs font-black rounded-xl border border-indigo-500/30 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer flex items-center gap-1"
            >
              <span>🕒 Edit Time Slots</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              sound.playClick(600);
              setShowFreezeModal(true);
            }}
            className={`py-2 px-3 text-xs font-black rounded-xl border shadow-xs cursor-pointer flex items-center gap-1.5 ${
              isFrozen
                ? 'bg-amber-500 text-slate-950 border-amber-600'
                : 'bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-white/10'
            }`}
          >
            <span>{isFrozen ? '❄️ Frozen' : '❄️ Freeze'}</span>
          </button>
        </div>
      </div>

      {/* Freeze Active Notice */}
      {isFrozen && state.freeze && (
        <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs">
          <div className="font-extrabold flex items-center gap-1.5 mb-0.5">
            <span>❄️</span>
            <span>Active Timetable Freeze ({state.freeze.why})</span>
          </div>
          <div>
            Locked from {state.freeze.from} to {state.freeze.to}. During this period, classes are not marked missed.
          </div>
        </div>
      )}

      {/* Double-Booking Alert */}
      {conflictCount > 0 && (
        <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-900 dark:text-rose-200 text-xs animate-fade-in">
          <div className="font-extrabold flex items-center gap-1.5 mb-0.5">
            <span>⚠️</span>
            <span>Teacher Double-Booking Conflict Detected</span>
          </div>
          <div>
            A teacher is assigned to multiple classes at the same time. The affected cells are outlined with alert rings below. Tap any slot to reassign.
          </div>
        </div>
      )}

      {/* Grade Selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {['All', ...GRADES].map((g) => {
          const isSelected = selectedGrade === g;
          return (
            <button
              key={g}
              onClick={() => {
                sound.playClick(450);
                setSelectedGrade(g);
              }}
              className={`py-1.5 px-3 rounded-full text-xs font-black shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? 'text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200'
              }`}
              style={{
                backgroundColor: isSelected
                  ? g === 'All'
                    ? '#0A1F4D'
                    : GRADE_COLORS[g as GradeName]
                  : undefined,
              }}
            >
              {g === 'All' ? 'All Grades' : g.replace('Grade ', 'G')}
            </button>
          );
        })}
      </div>

      {/* Teacher Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
        <span className="text-slate-400 font-bold shrink-0 text-[10px] uppercase">Educator:</span>
        <button
          onClick={() => {
            sound.playClick(450);
            setSelectedTeacherFilter('All');
          }}
          className={`py-1 px-2.5 rounded-full text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
            selectedTeacherFilter === 'All'
              ? 'bg-[#7C3AED] text-white shadow-2xs'
              : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          All Faculty
        </button>
        {state.teachers.map((t) => {
          const isSel = selectedTeacherFilter === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                sound.playClick(450);
                setSelectedTeacherFilter(t.id);
              }}
              className={`py-1 px-2.5 rounded-full text-[11px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                isSel
                  ? 'text-white shadow-2xs ring-2 ring-white/40'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
              style={{
                backgroundColor: isSel ? t.color || '#7C3AED' : undefined,
              }}
            >
              <span>{t.name.split(' ')[1] || t.name}</span>
            </button>
          );
        })}
      </div>

      {/* Interactive Timetable Grid */}
      <div
        className={`rounded-2xl border overflow-hidden shadow-xs ${
          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[11px] table-fixed min-w-[580px]">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-wider">
                <th className="p-2 w-24">Time / Slot</th>
                {DAYS.map((day) => (
                  <th key={day} className="p-2 text-center">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {activeSlots.map((slot) => {
                // Break rows (Health break, Lunch, Dismissal)
                if (slot.brk) {
                  return (
                    <tr
                      key={slot.k}
                      className="bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 font-extrabold text-[10px] text-center"
                    >
                      <td colSpan={6} className="py-1.5 px-2">
                        {slot.brk} · {slot.t}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={slot.k} className="align-top">
                    {/* Time Header */}
                    <td className="p-2 bg-slate-50 dark:bg-white/5 text-[10px] font-bold border-r border-slate-100 dark:border-white/5">
                      <div className="font-extrabold text-slate-800 dark:text-slate-200">
                        {slot.t}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">
                        {slot.lesson === 7
                          ? 'Lesson 7 (G4–6)'
                          : `Lesson ${slot.lesson}`}
                      </div>
                    </td>

                    {/* Days */}
                    {DAYS.map((day) => {
                      const gradesToShow = GRADES.filter(
                        (g) => selectedGrade === 'All' || selectedGrade === g
                      );

                      return (
                        <td
                          key={day}
                          onClick={() => handleCellClick(day, slot.k)}
                          className="p-1.5 border-r border-slate-100 dark:border-white/5 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors"
                        >
                          <div className="space-y-1">
                            {gradesToShow.map((g) => {
                              // If Grade 1-3 at lesson 7: Clubs
                              if (!gradeHasSlot(g, slot.lesson)) {
                                if (selectedGrade === g) {
                                  return (
                                    <div
                                      key={g}
                                      className="rounded-lg p-1 text-[9px] font-extrabold bg-teal-600 text-white text-center shadow-2xs"
                                    >
                                      {g.replace('Grade ', 'G')} Clubs
                                    </div>
                                  );
                                }
                                return null;
                              }

                              const cellKey = `${day}|${slot.k}|${g}`;
                              const entry = state.timetable[cellKey];
                              const isClash = conflicts[cellKey];

                              if (!entry) {
                                if (selectedGrade === g) {
                                  return (
                                    <div
                                      key={g}
                                      className="rounded-lg p-1 text-[9px] font-bold border border-dashed border-slate-300 dark:border-white/20 text-slate-400 text-center"
                                    >
                                      + Add
                                    </div>
                                  );
                                }
                                return null;
                              }

                              const isMatchTeacher = selectedTeacherFilter !== 'All' && entry?.teacherId === selectedTeacherFilter;
                              const isDimmed = selectedTeacherFilter !== 'All' && entry && entry.teacherId !== selectedTeacherFilter && selectedGrade === 'All';

                              return (
                                <div
                                  key={g}
                                  className={`rounded-lg p-1 text-[9px] font-extrabold text-white shadow-xs transition-transform hover:scale-[1.02] ${
                                    isClash
                                      ? 'ring-2 ring-rose-500 ring-offset-1'
                                      : isMatchTeacher
                                      ? 'ring-2 ring-amber-400 ring-offset-1 scale-[1.03]'
                                      : ''
                                  } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
                                  style={{
                                    backgroundColor: GRADE_COLORS[g],
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-0.5">
                                    <span className="opacity-90">
                                      {g.replace('Grade ', 'G')}
                                    </span>
                                    {entry.subject === 'PPI (praying)' && (
                                      <span>🙏</span>
                                    )}
                                  </div>
                                  <div className="truncate font-black">
                                    {entry.subject}
                                  </div>
                                  <div className="text-[8px] opacity-90 truncate font-medium">
                                    {getTeacherName(entry.teacherId)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
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

      {/* Modal: Edit Lesson Slot */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className={`w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 border shadow-2xl max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-black">
                  Edit Lesson · {editingCell.day} ({activeSlots.find((s) => s.k === editingCell.slotKey)?.t})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Assign CBC subjects & teachers per grade. Includes weekly PPI (praying).
                </p>
              </div>
              <button
                onClick={() => setEditingCell(null)}
                className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* 4-Portal Real-Time Connectivity Banner */}
            <div className="mb-3 p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-[11px] text-indigo-900 dark:text-indigo-200">
              <div className="font-extrabold flex items-center gap-1.5 mb-0.5">
                <span>⚡</span>
                <span>Live 4-Portal Synchronized Connection</span>
              </div>
              <p className="text-[10px] text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed m-0">
                Changes made here immediately update this <strong>Grade's</strong> schedule in the <strong>Learner</strong> &amp; <strong>Parent</strong> Portals, and update the assigned <strong>Teacher's</strong> personal schedule and class registers in the <strong>Teachers</strong> Portal.
              </p>
            </div>

            <div className="space-y-3 py-1">
              {GRADES.map((g) => {
                const currentSlotDef = activeSlots.find((s) => s.k === editingCell.slotKey);
                if (!gradeHasSlot(g, currentSlotDef?.lesson)) {
                  return (
                    <div
                      key={g}
                      className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300 text-xs font-bold"
                    >
                      {g}: Designated for Co-Curricular & Club Activities (Lower Primary CBC)
                    </div>
                  );
                }

                const cellKey = `${editingCell.day}|${editingCell.slotKey}|${g}`;
                const entry = state.timetable[cellKey];

                return (
                  <div
                    key={g}
                    className="p-3 rounded-2xl border border-slate-100 dark:border-white/10 space-y-2 bg-slate-50/50 dark:bg-white/5"
                  >
                    <div
                      className="text-xs font-black flex items-center gap-1.5"
                      style={{ color: GRADE_COLORS[g] }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GRADE_COLORS[g] }} />
                      <span>{g}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                          Subject
                        </label>
                        <select
                          value={entry?.subject || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) {
                              onSaveTimetableCell(editingCell.day, editingCell.slotKey, g, null);
                            } else {
                              onSaveTimetableCell(editingCell.day, editingCell.slotKey, g, {
                                subject: val,
                                teacherId: entry?.teacherId || state.teachers[0]?.id || '',
                              });
                            }
                          }}
                          className={`w-full p-2 rounded-xl text-xs border font-medium ${
                            isDark ? 'bg-[#0A0F1F] border-white/10 text-white' : 'bg-white border-slate-200'
                          }`}
                        >
                          <option value="">— Free Slot —</option>
                          <option value="PPI (praying)">🙏 PPI (praying)</option>
                          {SUBJECTS[g].map((sub) => (
                            <option key={sub} value={sub}>
                              {sub}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                          Teacher
                        </label>
                        <select
                          value={entry?.teacherId || ''}
                          onChange={(e) => {
                            const teacherId = e.target.value;
                            if (entry) {
                              onSaveTimetableCell(editingCell.day, editingCell.slotKey, g, {
                                ...entry,
                                teacherId,
                              });
                            } else if (teacherId) {
                              onSaveTimetableCell(editingCell.day, editingCell.slotKey, g, {
                                subject: SUBJECTS[g][0],
                                teacherId,
                              });
                            }
                          }}
                          className={`w-full p-2 rounded-xl text-xs border font-medium ${
                            isDark ? 'bg-[#0A0F1F] border-white/10 text-white' : 'bg-white border-slate-200'
                          }`}
                        >
                          <option value="">— Select Teacher —</option>
                          {state.teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3">
              <button
                onClick={() => {
                  sound.playCompleteChime();
                  setEditingCell(null);
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#16A34A] text-white shadow-xs"
              >
                Done Editing Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Freeze Control */}
      {showFreezeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl ${
              isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <h3 className="text-sm font-black mb-1">Timetable Freeze Controls</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
              During exam periods, the timetable can be frozen so that lessons are not marked missed and teacher changes are locked.
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Freeze From Date
                </label>
                <input
                  type="date"
                  value={freezeFrom}
                  onChange={(e) => setFreezeFrom(e.target.value)}
                  className={`w-full p-2 rounded-xl text-xs border ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Freeze To Date
                </label>
                <input
                  type="date"
                  value={freezeTo}
                  onChange={(e) => setFreezeTo(e.target.value)}
                  className={`w-full p-2 rounded-xl text-xs border ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Reason for Freeze
                </label>
                <input
                  type="text"
                  value={freezeWhy}
                  onChange={(e) => setFreezeWhy(e.target.value)}
                  placeholder="e.g. End of Term 3 Examinations"
                  className={`w-full p-2 rounded-xl text-xs border ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
            </div>

            <div className="flex gap-2">
              {state.freeze && (
                <button
                  onClick={() => {
                    onSetFreeze(null);
                    setShowFreezeModal(false);
                  }}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30"
                >
                  Unfreeze
                </button>
              )}
              <button
                onClick={() => setShowFreezeModal(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15"
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (!freezeFrom || !freezeTo) {
                    onShowToast('Select both start and end dates');
                    return;
                  }
                  onSetFreeze({ from: freezeFrom, to: freezeTo, why: freezeWhy.trim() });
                  setShowFreezeModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950"
              >
                Save Freeze
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit School Time Slots */}
      {showSlotsModal && onSaveTimetableSlots && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div
            className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 border shadow-2xl max-h-[90vh] flex flex-col ${
              isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div>
                <h3 className="text-base font-black">Edit School Timetable Time Slots</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Changes sync live to Teachers, Parents, Learners & Supabase.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSlotsModal(false)}
                className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
              {draftSlots.map((slot, idx) => {
                const isBreak = Boolean(slot.brk);
                return (
                  <div
                    key={`${slot.k}_${idx}`}
                    className={`p-2.5 rounded-2xl border space-y-2 ${
                      isDark ? 'bg-black/30 border-white/10' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                        {slot.k}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={isBreak ? 'break' : 'lesson'}
                          onChange={(e) => {
                            const kind = e.target.value;
                            setDraftSlots((prev) =>
                              prev.map((s, i) => {
                                if (i !== idx) return s;
                                if (kind === 'break') {
                                  return { k: s.k, t: s.t, brk: s.brk || 'Health break' };
                                }
                                return { k: s.k, t: s.t, lesson: s.lesson || idx + 1 };
                              })
                            );
                          }}
                          className={`p-1 rounded-lg text-[10px] font-bold border ${
                            isDark ? 'bg-[#0A0F1F] border-white/15 text-white' : 'bg-white border-slate-300'
                          }`}
                        >
                          <option value="lesson">Lesson</option>
                          <option value="break">Break / Event</option>
                        </select>
                        {draftSlots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              sound.playClick(400);
                              setDraftSlots((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="px-2 py-1 rounded-lg bg-rose-500/15 text-rose-500 text-[10px] font-bold"
                            title="Remove slot"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">
                          Time Window
                        </label>
                        <input
                          type="text"
                          value={slot.t}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraftSlots((prev) =>
                              prev.map((s, i) => (i === idx ? { ...s, t: val } : s))
                            );
                          }}
                          placeholder="e.g. 8:20 – 9:00"
                          className={`w-full p-2 rounded-xl text-xs border font-mono ${
                            isDark ? 'bg-[#0A0F1F] border-white/15 text-white' : 'bg-white border-slate-200'
                          }`}
                        />
                      </div>

                      {isBreak ? (
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">
                            Break / Event Label
                          </label>
                          <input
                            type="text"
                            value={slot.brk || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraftSlots((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, brk: val } : s))
                              );
                            }}
                            placeholder="e.g. Health break"
                            className={`w-full p-2 rounded-xl text-xs border ${
                              isDark ? 'bg-[#0A0F1F] border-white/15 text-white' : 'bg-white border-slate-200'
                            }`}
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">
                            Lesson Number
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={slot.lesson || 1}
                            onChange={(e) => {
                              const num = Math.max(1, parseInt(e.target.value || '1', 10));
                              setDraftSlots((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, lesson: num } : s))
                              );
                            }}
                            className={`w-full p-2 rounded-xl text-xs border font-mono ${
                              isDark ? 'bg-[#0A0F1F] border-white/15 text-white' : 'bg-white border-slate-200'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2 shrink-0">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextNum = draftSlots.filter((s) => s.lesson).length + 1;
                    setDraftSlots((prev) => [
                      ...prev,
                      { k: `L${nextNum}`, t: '3:00 – 3:40', lesson: nextNum },
                    ]);
                  }}
                  className="flex-1 py-2 rounded-xl text-[11px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30"
                >
                  ＋ Add Lesson Slot
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const bNum = draftSlots.filter((s) => s.brk).length + 1;
                    setDraftSlots((prev) => [
                      ...prev,
                      { k: `B${bNum}`, t: '3:40 – 4:00', brk: 'Short Break' },
                    ]);
                  }}
                  className="flex-1 py-2 rounded-xl text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30"
                >
                  ＋ Add Break Slot
                </button>
                <button
                  type="button"
                  onClick={() => setDraftSlots(SLOTS.map((s) => ({ ...s })))}
                  className="py-2 px-3 rounded-xl text-[11px] font-bold border border-slate-300 dark:border-white/15"
                >
                  ↺ Reset
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSlotsModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cleaned = draftSlots
                      .map((s) => ({
                        ...s,
                        t: s.t.trim() || '8:20 – 9:00',
                        brk: s.brk ? s.brk.trim() : undefined,
                      }))
                      .filter((s) => s.k && s.t);
                    if (cleaned.length === 0) {
                      onShowToast('Keep at least one timetable slot');
                      return;
                    }
                    onSaveTimetableSlots(cleaned);
                    setShowSlotsModal(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black bg-[#16A34A] text-white shadow-sm cursor-pointer"
                >
                  ✓ Save & Sync All Portals
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
