import React, { useState, useMemo } from 'react';
import { Learner, GradeName, GRADES } from './types';
import { sound } from '../../utils/sound';
import {
  generate6CharPassword,
  isValid6CharPassword,
  normalize6CharPassword,
} from '../../utils/learnerPasswordUtils';

interface AdminLearnerPasswordsProps {
  learners: Learner[];
  onSaveLearners: (updatedLearners: Learner[]) => void;
  onBack: () => void;
  onShowToast: (msg: string) => void;
  isDark?: boolean;
}

export const AdminLearnerPasswords: React.FC<AdminLearnerPasswordsProps> = ({
  learners,
  onSaveLearners,
  onBack,
  onShowToast,
  isDark = false,
}) => {
  const [learnerList, setLearnerList] = useState<Learner[]>(() => {
    // Ensure every learner has at least a 6-character password initialized
    return learners.map((l) => ({
      ...l,
      permanentPassword: l.permanentPassword && l.permanentPassword.length === 6
        ? l.permanentPassword
        : generate6CharPassword(l.name, l.adm),
    }));
  });

  const [selectedGrade, setSelectedGrade] = useState<'All' | GradeName>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Filtered learners
  const filteredLearners = useMemo(() => {
    return learnerList.filter((l) => {
      const matchesGrade = selectedGrade === 'All' || l.grade === selectedGrade;
      const cleanSearch = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !cleanSearch ||
        l.name.toLowerCase().includes(cleanSearch) ||
        l.adm.toLowerCase().includes(cleanSearch);
      return matchesGrade && matchesSearch;
    });
  }, [learnerList, selectedGrade, searchTerm]);

  // Statistics
  const totalCount = learnerList.length;
  const compliantCount = learnerList.filter((l) => isValid6CharPassword(l.permanentPassword)).length;

  // Toggle visible password for a learner
  const toggleVisibility = (id: string) => {
    sound.playClick(400);
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Update password for a single learner
  const handleUpdatePassword = (id: string, newPass: string) => {
    const clean = newPass.toUpperCase().slice(0, 6);
    setLearnerList((prev) =>
      prev.map((l) => (l.id === id ? { ...l, permanentPassword: clean } : l))
    );
    setHasUnsavedChanges(true);
  };

  // Generate 6-char password for single learner
  const handleGenerateSingle = (learner: Learner) => {
    sound.playClick(500);
    const newPass = generate6CharPassword(learner.name, learner.adm);
    handleUpdatePassword(learner.id, newPass);
    setVisiblePasswords((prev) => ({ ...prev, [learner.id]: true }));
    onShowToast(`Generated 6-char password "${newPass}" for ${learner.name}`);
  };

  // Bulk generate 6-char passwords for all learners
  const handleGenerateAll = () => {
    if (!window.confirm('Generate fresh unique 6-character passwords for ALL learners in the school?')) {
      return;
    }
    sound.playCompleteChime();
    const used = new Set<string>();
    const updated = learnerList.map((l) => {
      let pass = generate6CharPassword(l.name, l.adm);
      while (used.has(pass)) {
        pass = generate6CharPassword(l.name, l.adm);
      }
      used.add(pass);
      return {
        ...l,
        permanentPassword: pass,
      };
    });
    setLearnerList(updated);
    setHasUnsavedChanges(true);
    onShowToast(`Generated distinct 6-character passwords for all ${updated.length} learners!`);
  };

  // Copy password to clipboard
  const handleCopy = (pass: string, learnerName: string) => {
    sound.playClick(500);
    navigator.clipboard?.writeText(pass);
    onShowToast(`Copied ${learnerName}'s PIN: ${pass}`);
  };

  // Save changes to parent state and localStorage
  const handleSaveAll = () => {
    sound.playCompleteChime();
    // Validate that all passwords are 6 characters
    const invalid = learnerList.filter((l) => !isValid6CharPassword(l.permanentPassword));
    if (invalid.length > 0) {
      onShowToast(`Warning: ${invalid.length} learner(s) have passwords that are not 6 characters. Please fix before saving.`);
      return;
    }

    onSaveLearners(learnerList);
    setHasUnsavedChanges(false);
    onShowToast(`✓ All learner passwords successfully saved and updated across portals!`);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
        <button
          type="button"
          onClick={() => {
            sound.playClick(400);
            if (hasUnsavedChanges) {
              if (window.confirm('You have unsaved password changes. Discard and go back?')) {
                onBack();
              }
            } else {
              onBack();
            }
          }}
          className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
        >
          <span>←</span>
          <span>Back to Settings</span>
        </button>

        <span className="text-[10.5px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
          6-Character PIN Standard
        </span>
      </div>

      {/* Title & Introduction */}
      <div className="bg-gradient-to-r from-[#0A1F4D] to-[#1E3A8A] text-white rounded-2xl p-4 shadow-md border border-indigo-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-300 text-2xl flex items-center justify-center font-black shrink-0 border border-amber-400/30">
            🔐
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-black m-0 leading-tight">
              Learner Portal Passwords & PINs
            </h2>
            <p className="text-xs text-indigo-200 m-0 mt-0.5">
              Manage 6-character access credentials for all enrolled learners across Grade 1 to 6
            </p>
          </div>
        </div>

        {/* Save button in header */}
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={!hasUnsavedChanges}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md transition-all shrink-0 ${
            hasUnsavedChanges
              ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black animate-pulse'
              : 'bg-white/10 text-white/50 cursor-not-allowed'
          }`}
        >
          <span>💾</span>
          <span>{hasUnsavedChanges ? 'Save Changes' : 'Saved'}</span>
        </button>
      </div>

      {/* Metric Cards & Bulk Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className={`p-3 rounded-2xl border ${isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="text-[10.5px] text-slate-400 font-bold uppercase">Total Pupils</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{totalCount}</div>
        </div>

        <div className={`p-3 rounded-2xl border ${isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="text-[10.5px] text-emerald-500 font-bold uppercase">6-Char Compliant</div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {compliantCount} / {totalCount}
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerateAll}
          className="p-3 rounded-2xl border border-amber-400/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-all col-span-1"
        >
          <span className="text-base">⚡</span>
          <span>Generate All (6-Char)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playClick(400);
            window.print();
          }}
          className="p-3 rounded-2xl border border-indigo-400/50 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-black text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-all col-span-1"
        >
          <span className="text-base">🖨️</span>
          <span>Print Roster</span>
        </button>
      </div>

      {/* Grade Filters & Search Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
        {/* Grade tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {(['All', ...GRADES] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                sound.playClick(400);
                setSelectedGrade(g as any);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                selectedGrade === g
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : isDark
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative min-w-[200px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search learner or ADM..."
            className={`w-full py-1.5 pl-8 pr-3 rounded-xl text-xs border ${
              isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          />
          <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
        </div>
      </div>

      {/* Learners Credentials List */}
      <div className="space-y-2.5">
        {filteredLearners.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border ${isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'}`}>
            <p className="text-xs text-slate-400 m-0">No learners match the current grade or search filter.</p>
          </div>
        ) : (
          filteredLearners.map((learner) => {
            const pass = learner.permanentPassword || '';
            const isValid = isValid6CharPassword(pass);
            const isVisible = visiblePasswords[learner.id] ?? false;

            return (
              <div
                key={learner.id}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                {/* Learner Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                    {learner.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate flex items-center gap-2">
                      <span>{learner.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        {learner.adm}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span className="font-bold text-slate-600 dark:text-slate-300">{learner.grade}</span>
                    </div>
                  </div>
                </div>

                {/* 6-Character Password Field & Controls */}
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
                  {/* Password Input Box */}
                  <div className="relative flex items-center">
                    <input
                      type={isVisible ? 'text' : 'password'}
                      value={pass}
                      maxLength={6}
                      onChange={(e) => handleUpdatePassword(learner.id, e.target.value)}
                      placeholder="6-CHARS"
                      className={`w-28 sm:w-32 py-1.5 pl-2.5 pr-7 rounded-xl font-mono text-xs font-black tracking-widest text-center border uppercase transition-colors ${
                        isValid
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                          : 'border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility(learner.id)}
                      className="absolute right-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                      title={isVisible ? 'Hide Password' : 'Show Password'}
                    >
                      {isVisible ? '🙈' : '👁️'}
                    </button>
                  </div>

                  {/* Character Length Pill */}
                  <span
                    className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isValid
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {pass.length}/6
                  </span>

                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={() => handleCopy(pass, learner.name)}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-xs cursor-pointer text-slate-600 dark:text-slate-300"
                    title="Copy PIN"
                  >
                    📋
                  </button>

                  {/* Re-generate 6-Char Button */}
                  <button
                    type="button"
                    onClick={() => handleGenerateSingle(learner)}
                    className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-700 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-[11px] font-black cursor-pointer flex items-center gap-1 transition-all"
                    title="Generate new 6-char PIN"
                  >
                    <span>🔄</span>
                    <span className="hidden sm:inline">New PIN</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Save Banner (when changes exist) */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto p-3.5 rounded-2xl bg-slate-900 text-white shadow-2xl border-2 border-emerald-400 flex items-center justify-between z-40 animate-bounce">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span className="text-xs font-black">You have unsaved password updates!</span>
          </div>
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs cursor-pointer shadow-md"
          >
            Save All Now
          </button>
        </div>
      )}
    </div>
  );
};
