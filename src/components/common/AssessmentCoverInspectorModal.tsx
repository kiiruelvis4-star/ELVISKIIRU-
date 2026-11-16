import React, { useState } from 'react';
import { AssessmentCoverView } from './AssessmentCoverView';
import { GRADES, GradeName } from '../admin/types';
import { sound } from '../../utils/sound';
import { INITIAL_ADMIN_STATE } from '../admin/initialData';

interface LearnerOption {
  id: string;
  name: string;
  adm: string;
  grade: string;
  stream?: string;
}

interface AssessmentCoverInspectorModalProps {
  isOpen?: boolean;
  learners?: LearnerOption[];
  initialGrade?: string;
  initialMode?: 'book' | 'report';
  initialLearnerId?: string;
  onClose: () => void;
}

export const AssessmentCoverInspectorModal: React.FC<AssessmentCoverInspectorModalProps> = ({
  isOpen = true,
  learners = INITIAL_ADMIN_STATE.learners,
  initialGrade = 'Grade 1',
  initialMode = 'book',
  initialLearnerId,
  onClose,
}) => {
  if (!isOpen) return null;

  const [selectedGrade, setSelectedGrade] = useState<string>(initialGrade);
  const [selectedMode, setSelectedMode] = useState<'book' | 'report'>(initialMode);
  const [selectedLearnerId, setSelectedLearnerId] = useState<string>(() => {
    if (initialLearnerId) return initialLearnerId;
    const match = learners.find((l) => l.grade === initialGrade);
    return match ? match.id : learners[0]?.id || 'custom';
  });

  // Custom preview overrides
  const [customMode, setCustomMode] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('Ann Rovey');
  const [customAdm, setCustomAdm] = useState<string>('LRA/0010');
  const [customYear, setCustomYear] = useState<string>(String(new Date().getFullYear()));
  const [showGuides, setShowGuides] = useState<boolean>(false);

  // Active learner details
  const activeLearner = learners.find((l) => l.id === selectedLearnerId) || learners[0];

  const currentName = customMode ? customName : activeLearner?.name || 'Ann Rovey';
  const currentAdm = customMode ? customAdm : activeLearner?.adm || 'LRA/0010';
  const currentGrade = customMode ? selectedGrade : activeLearner?.grade || selectedGrade;
  const currentYear = customMode ? customYear : String(new Date().getFullYear());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--card,#FFFFFF)] rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[var(--line,#E2E8F0)] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0A1F4D] via-[#14296B] to-[#1E3A8A] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/images/lra_crest.jpg"
              alt="Little Roses Academy"
              className="w-10 h-10 rounded-full bg-white p-0.5 border border-amber-400 object-cover shrink-0 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-wider font-bold text-amber-300">
                  Little Roses Academy Nakuru
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950">
                  CBC Certified
                </span>
              </div>
              <h3 className="font-black text-sm sm:text-base m-0 leading-tight">
                Official CBC Covers & Particulars Calibrator
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playClick(400);
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-xs font-bold cursor-pointer text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body: Two column layout on desktop */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-4">
            {/* 1. Cover Type Switcher */}
            <div>
              <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                1. Select Document Cover
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(450);
                    setSelectedMode('book');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                    selectedMode === 'book'
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                  }`}
                >
                  <span>📘</span>
                  <span>Assessment Book</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(450);
                    setSelectedMode('report');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                    selectedMode === 'report'
                      ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                  }`}
                >
                  <span>📊</span>
                  <span>Assessment Report</span>
                </button>
              </div>
            </div>

            {/* 2. Grade Switcher */}
            <div>
              <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                2. Select Grade (Style varies by Grade 1 to 6)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {GRADES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      sound.playClick(400);
                      setSelectedGrade(g);
                      // Auto-select a learner in that grade if available
                      const inGrade = learners.find((l) => l.grade === g);
                      if (inGrade) setSelectedLearnerId(inGrade.id);
                    }}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      selectedGrade === g
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Learner Selection Mode */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase m-0">
                  3. Inscribed Learner Particulars
                </label>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(400);
                    setCustomMode(!customMode);
                  }}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {customMode ? '← Pick from Roster' : '✏️ Test Custom Name'}
                </button>
              </div>

              {!customMode ? (
                <div>
                  <select
                    value={selectedLearnerId}
                    onChange={(e) => {
                      sound.playClick(400);
                      setSelectedLearnerId(e.target.value);
                      const chosen = learners.find((l) => l.id === e.target.value);
                      if (chosen) setSelectedGrade(chosen.grade);
                    }}
                    className="w-full p-2.5 rounded-xl text-xs font-black border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {learners.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} — {l.adm} ({l.grade})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 m-0 mt-1">
                    Pick any learner to verify how their name and admission number fit on the cover lines.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Full Name</label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Ann Rovey"
                      className="w-full p-2 rounded-lg text-xs font-bold border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white uppercase"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Admission Number</label>
                      <input
                        type="text"
                        value={customAdm}
                        onChange={(e) => setCustomAdm(e.target.value)}
                        placeholder="LRA/0010"
                        className="w-full p-2 rounded-lg text-xs font-mono font-bold border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Academic Year</label>
                      <input
                        type="text"
                        value={customYear}
                        onChange={(e) => setCustomYear(e.target.value)}
                        placeholder="2026"
                        className="w-full p-2 rounded-lg text-xs font-mono font-bold border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  sound.playClick(450);
                  setShowGuides(!showGuides);
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                  showGuides
                    ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 text-amber-800 dark:text-amber-200'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                }`}
              >
                {showGuides ? 'Hide Pixel Guides' : '📐 Show Pixel Guides'}
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick(450);
                  window.print();
                }}
                className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <span>🖨️</span>
                <span>Print Cover</span>
              </button>
            </div>
          </div>

          {/* Cover Live Canvas Column */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center p-3 sm:p-5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10">
            <div className="w-full max-w-[380px]">
              <AssessmentCoverView
                grade={currentGrade}
                viewMode={selectedMode}
                learnerName={currentName}
                admissionNumber={currentAdm}
                academicYear={currentYear}
                showGuides={showGuides}
              />
            </div>
            <div className="text-center mt-3">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Live rendering on official {selectedGrade} {selectedMode === 'book' ? 'Assessment Book' : 'Assessment Report'} cover
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
