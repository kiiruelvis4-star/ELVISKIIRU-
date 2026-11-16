import React, { useState, useMemo } from 'react';
import { Learner, GradeName } from './types';
import { STUDENT_COUNCIL_ROLES } from './studentGovernmentData';
import { sound } from '../../utils/sound';

interface StudentGovernmentModalProps {
  onClose: () => void;
  isDark: boolean;
  learners: Learner[];
  studentCouncil: Record<string, string | null>;
  onUpdateCouncil: (updatedCouncil: Record<string, string | null>) => void;
  onShowToast?: (msg: string) => void;
}

export const StudentGovernmentModal: React.FC<StudentGovernmentModalProps> = ({
  onClose,
  isDark,
  learners,
  studentCouncil,
  onUpdateCouncil,
  onShowToast,
}) => {
  // Local state for appointments so admin can stage or immediately save changes
  const [appointments, setAppointments] = useState<Record<string, string | null>>(() => {
    // Fill in default initial appointments if empty, or map existing
    const initial: Record<string, string | null> = {};
    STUDENT_COUNCIL_ROLES.forEach((r) => {
      initial[r.key] = studentCouncil[r.key] !== undefined ? studentCouncil[r.key] : null;
    });
    return initial;
  });

  // Track if there are unsaved modifications
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Filter tabs
  const [activeTab, setActiveTab] = useState<'all' | 'executive' | 'school' | 'class'>('all');

  // Currently open picker for a role
  const [activeRoleKey, setActiveRoleKey] = useState<string | null>(null);

  // Search query inside the learner picker
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<'All' | GradeName>('All');

  // Council roll print/overview preview modal
  const [showRosterSummary, setShowRosterSummary] = useState(false);

  // Quick lookup map for learners by id
  const learnerMap = useMemo(() => {
    const map = new Map<string, Learner>();
    learners.forEach((l) => map.set(l.id, l));
    return map;
  }, [learners]);

  // Reverse map: which learner has which role?
  const learnerRoleMap = useMemo(() => {
    const map = new Map<string, string>();
    Object.entries(appointments).forEach(([roleKey, learnerId]) => {
      if (learnerId) {
        const roleDef = STUDENT_COUNCIL_ROLES.find((r) => r.key === roleKey);
        if (roleDef) {
          map.set(learnerId, roleDef.title);
        }
      }
    });
    return map;
  }, [appointments]);

  // Active role definition when picker is open
  const activeRoleDef = useMemo(() => {
    if (!activeRoleKey) return null;
    return STUDENT_COUNCIL_ROLES.find((r) => r.key === activeRoleKey) || null;
  }, [activeRoleKey]);

  // Open the learner selection picker for a role
  const handleOpenPicker = (roleKey: string) => {
    sound.playClick(500);
    const roleDef = STUDENT_COUNCIL_ROLES.find((r) => r.key === roleKey);
    setActiveRoleKey(roleKey);
    setSearchQuery('');
    // If it's a class prefect, auto-filter to that grade
    if (roleDef?.targetGrade) {
      setGradeFilter(roleDef.targetGrade);
    } else {
      setGradeFilter('All');
    }
  };

  // Assign a learner to the active role
  const handleAssignLearner = (learnerId: string | null) => {
    if (!activeRoleKey) return;
    sound.playCompleteChime();
    setAppointments((prev) => ({
      ...prev,
      [activeRoleKey]: learnerId,
    }));
    setHasUnsavedChanges(true);
    setActiveRoleKey(null);

    const roleDef = STUDENT_COUNCIL_ROLES.find((r) => r.key === activeRoleKey);
    const targetLearner = learnerId ? learnerMap.get(learnerId) : null;

    if (onShowToast) {
      if (targetLearner) {
        onShowToast(`Assigned ${targetLearner.name} as ${roleDef?.title}`);
      } else {
        onShowToast(`Vacated position: ${roleDef?.title}`);
      }
    }
  };

  // Save changes to AdminState & trigger persistence
  const handleSaveChanges = () => {
    sound.playCompleteChime();
    onUpdateCouncil(appointments);
    setHasUnsavedChanges(false);
    if (onShowToast) {
      onShowToast('✓ Student Government appointments saved successfully');
    }
  };

  // Filtered roles based on category tab
  const displayedRoles = useMemo(() => {
    if (activeTab === 'all') return STUDENT_COUNCIL_ROLES;
    return STUDENT_COUNCIL_ROLES.filter((r) => r.category === activeTab);
  }, [activeTab]);

  // Filtered learners in the picker
  const filteredLearners = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return learners.filter((l) => {
      const matchGrade = gradeFilter === 'All' || l.grade === gradeFilter;
      if (!matchGrade) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.adm.toLowerCase().includes(q) ||
        l.stream.toLowerCase().includes(q)
      );
    });
  }, [learners, searchQuery, gradeFilter]);

  // Stats
  const assignedCount = Object.values(appointments).filter(Boolean).length;
  const totalRoles = STUDENT_COUNCIL_ROLES.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
      <div
        className={`w-full max-w-2xl rounded-3xl p-4 sm:p-6 border shadow-2xl max-h-[92vh] flex flex-col ${
          isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Student Government & Prefect Council"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xl shadow-inner">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">Student Government Council</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  Admin Managed
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official Little Roses Academy student leadership appointments ({assignedCount}/{totalRoles} filled)
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick(400);
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Unsaved changes banner */}
        {hasUnsavedChanges && (
          <div className="my-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between flex-shrink-0">
            <span className="flex items-center gap-1.5 font-medium">
              <span>⚠️</span> You have unsaved appointment changes.
            </span>
            <button
              onClick={handleSaveChanges}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[11px] transition-colors cursor-pointer shadow-md"
            >
              Save Now
            </button>
          </div>
        )}

        {/* Filter Tabs & Quick Action Bar */}
        <div className="flex items-center justify-between gap-2 py-2 flex-shrink-0 flex-wrap">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => {
                sound.playClick(450);
                setActiveTab('all');
              }}
              className={`px-3 py-1 rounded-xl font-bold transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              All ({totalRoles})
            </button>
            <button
              onClick={() => {
                sound.playClick(450);
                setActiveTab('executive');
              }}
              className={`px-3 py-1 rounded-xl font-bold transition-colors cursor-pointer ${
                activeTab === 'executive'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              Executive (2)
            </button>
            <button
              onClick={() => {
                sound.playClick(450);
                setActiveTab('school');
              }}
              className={`px-3 py-1 rounded-xl font-bold transition-colors cursor-pointer ${
                activeTab === 'school'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              Prefects (5)
            </button>
            <button
              onClick={() => {
                sound.playClick(450);
                setActiveTab('class');
              }}
              className={`px-3 py-1 rounded-xl font-bold transition-colors cursor-pointer ${
                activeTab === 'class'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              Class Prefects (6)
            </button>
          </div>

          <button
            onClick={() => {
              sound.playClick(500);
              setShowRosterSummary(true);
            }}
            className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-xl border border-indigo-500/20 cursor-pointer"
          >
            <span>📜 Parade Roster</span>
          </button>
        </div>

        {/* Roles List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
          {displayedRoles.map((role) => {
            const appointedLearnerId = appointments[role.key];
            const learner = appointedLearnerId ? learnerMap.get(appointedLearnerId) : null;

            return (
              <div
                key={role.key}
                className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 space-y-2.5 transition-all hover:border-slate-300 dark:hover:border-white/20"
              >
                {/* Role Header & Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl flex-shrink-0">{role.badge}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-[13px] font-black" style={{ color: role.color }}>
                          {role.title}
                        </span>
                        {role.targetGrade && (
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded font-semibold bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                            {role.targetGrade}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {role.category === 'executive'
                          ? 'Supreme Student Council Executive'
                          : role.category === 'school'
                          ? 'School-Wide Student Prefect'
                          : `Class Level Leader (${role.targetGrade})`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleOpenPicker(role.key)}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-colors shadow-xs"
                      title="Choose learner from admin register"
                    >
                      {learner ? 'Change' : 'Choose Learner'}
                    </button>
                    {learner && (
                      <button
                        onClick={() => {
                          sound.playClick(350);
                          handleAssignLearner(null);
                        }}
                        className="px-2 py-1 rounded-xl text-[11px] font-semibold text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                        title="Remove appointment"
                      >
                        Vacate
                      </button>
                    )}
                  </div>
                </div>

                {/* Appointed Learner Card */}
                {learner ? (
                  <div className="p-2.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shadow-xs"
                        style={{ backgroundColor: role.color }}
                      >
                        {learner.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{learner.name}</span>
                          <span className="font-mono text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.2 rounded">
                            {learner.adm}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
                          {learner.grade} · {learner.stream}
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex-shrink-0">
                      ✓ Appointed
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-dashed border-amber-500/30 text-amber-300 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-medium flex items-center gap-1.5">
                      <span>⚠️</span> No learner appointed yet.
                    </span>
                    <button
                      onClick={() => handleOpenPicker(role.key)}
                      className="text-[11px] font-bold text-amber-400 hover:underline cursor-pointer"
                    >
                      Choose from registered learners →
                    </button>
                  </div>
                )}

                {/* Duties */}
                <div className="pl-4 space-y-1 pt-1 border-t border-slate-200/50 dark:border-white/5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Key Responsibilities:
                  </div>
                  {role.duties.map((duty, dIdx) => (
                    <div
                      key={dIdx}
                      className="text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5 leading-snug"
                    >
                      <span className="text-slate-400">•</span>
                      <span>{duty}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Total learners registered: <strong className="text-slate-900 dark:text-white">{learners.length}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playClick(400);
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleSaveChanges}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <span>💾</span> Save Appointments
            </button>
          </div>
        </div>
      </div>

      {/* LEARNER PICKER MODAL */}
      {activeRoleDef && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div
            className={`w-full max-w-md rounded-3xl p-5 border shadow-2xl max-h-[85vh] flex flex-col ${
              isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            role="dialog"
            aria-modal="true"
          >
            {/* Picker Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{activeRoleDef.badge}</span>
                <div>
                  <h4 className="text-sm font-black" style={{ color: activeRoleDef.color }}>
                    Select {activeRoleDef.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Choose from learners admitted by administration only.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  sound.playClick(400);
                  setActiveRoleKey(null);
                }}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 text-xs font-bold text-slate-700 dark:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Recommended Target Grade Note */}
            {activeRoleDef.targetGrade && (
              <div className="my-2 p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] flex items-center gap-2">
                <span>ℹ️</span> Recommended: Select a learner enrolled in <strong>{activeRoleDef.targetGrade}</strong>.
              </div>
            )}

            {/* Search Input */}
            <div className="py-2 flex-shrink-0">
              <input
                type="text"
                placeholder="Search learner name or admission no. (e.g. LRA/0001)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>

            {/* Grade Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2 text-[10.5px] flex-shrink-0">
              {(['All', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGradeFilter(g)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer flex-shrink-0 ${
                    gradeFilter === g
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            {/* Enrolled Learners List */}
            <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
              {filteredLearners.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  <div className="text-3xl mb-1">🔍</div>
                  No learners found matching "{searchQuery || gradeFilter}".
                  <div className="text-[10px] mt-1 text-slate-500">
                    Only learners added in the admin Pupils section appear here.
                  </div>
                </div>
              ) : (
                filteredLearners.map((l) => {
                  const currentAppointedId = appointments[activeRoleDef.key];
                  const isSelected = currentAppointedId === l.id;
                  const existingRole = learnerRoleMap.get(l.id);

                  return (
                    <button
                      key={l.id}
                      onClick={() => handleAssignLearner(l.id)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/15 text-white'
                          : 'border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 hover:border-indigo-400 dark:hover:border-indigo-500/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-xs font-black text-indigo-400 flex-shrink-0">
                          {l.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                            <span className="truncate">{l.name}</span>
                            <span className="font-mono text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-1.5 rounded flex-shrink-0">
                              {l.adm}
                            </span>
                          </div>
                          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                            {l.grade} · {l.stream}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        {isSelected ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md">
                            Selected
                          </span>
                        ) : existingRole ? (
                          <span className="text-[9.5px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-medium">
                            Holds: {existingRole}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-indigo-400 hover:underline">
                            Appoint →
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Picker Footer */}
            <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between flex-shrink-0">
              <button
                onClick={() => handleAssignLearner(null)}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer py-1"
              >
                Clear / Vacate Position
              </button>
              <button
                onClick={() => {
                  sound.playClick(400);
                  setActiveRoleKey(null);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PARADE ROSTER PREVIEW MODAL */}
      {showRosterSummary && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div
            className={`w-full max-w-lg rounded-3xl p-5 border shadow-2xl max-h-[85vh] flex flex-col ${
              isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div>
                <h4 className="text-sm font-black">Official Parade Leadership Roll</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Little Roses Academy · Morning Assembly & Inspection
                </p>
              </div>
              <button
                onClick={() => setShowRosterSummary(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-3">
              {STUDENT_COUNCIL_ROLES.map((role) => {
                const appointedId = appointments[role.key];
                const l = appointedId ? learnerMap.get(appointedId) : null;
                return (
                  <div
                    key={role.key}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span>{role.badge}</span>
                      <span className="font-bold">{role.title}</span>
                    </div>
                    {l ? (
                      <div className="text-right">
                        <span className="font-bold text-indigo-400">{l.name}</span>
                        <span className="text-[10px] text-slate-400 block">{l.grade} · {l.adm}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-amber-400 italic">Vacant</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex justify-end">
              <button
                onClick={() => setShowRosterSummary(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
