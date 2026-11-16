import React, { useState, useEffect } from 'react';
import { GradeName } from '../admin/types';
import { Strand, SubStrand, AssessmentRecord } from './types';
import { sound } from '../../utils/sound';

export interface StrandModalData {
  mode: 'add' | 'edit';
  strandId?: string;
  name: string;
  grade: GradeName;
  subject: string;
}

export interface SubStrandModalData {
  mode: 'add' | 'edit';
  strandId: string;
  strandName: string;
  subStrandId?: string;
  name: string;
}

export interface AssessmentModalData {
  mode: 'add' | 'edit';
  strandId: string;
  subStrandId: string;
  subStrandName: string;
  kind: 'CAT' | 'Assignment';
  assessmentId?: string;
  title: string;
  maxMarks: number;
  date: string;
}

interface AssessmentModalsProps {
  isDark: boolean;
  strandModal: StrandModalData | null;
  onCloseStrandModal: () => void;
  onSaveStrand: (data: StrandModalData) => void;

  subStrandModal: SubStrandModalData | null;
  onCloseSubStrandModal: () => void;
  onSaveSubStrand: (data: SubStrandModalData) => void;

  assessmentModal: AssessmentModalData | null;
  onCloseAssessmentModal: () => void;
  onSaveAssessment: (data: AssessmentModalData) => void;
  onDeleteAssessment?: (strandId: string, subStrandId: string, assessmentId: string) => void;
}

export const AssessmentModals: React.FC<AssessmentModalsProps> = ({
  isDark,
  strandModal,
  onCloseStrandModal,
  onSaveStrand,
  subStrandModal,
  onCloseSubStrandModal,
  onSaveSubStrand,
  assessmentModal,
  onCloseAssessmentModal,
  onSaveAssessment,
  onDeleteAssessment,
}) => {
  // Local state for Strand Modal
  const [strandName, setStrandName] = useState('');

  // Local state for Sub-Strand Modal
  const [subStrandName, setSubStrandName] = useState('');

  // Local state for Assessment Modal
  const [assessTitle, setAssessTitle] = useState('');
  const [assessMaxMarks, setAssessMaxMarks] = useState(20);
  const [assessDate, setAssessDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (strandModal) {
      setStrandName(strandModal.name || '');
    }
  }, [strandModal]);

  useEffect(() => {
    if (subStrandModal) {
      setSubStrandName(subStrandModal.name || '');
    }
  }, [subStrandModal]);

  useEffect(() => {
    if (assessmentModal) {
      setAssessTitle(assessmentModal.title || '');
      setAssessMaxMarks(assessmentModal.maxMarks || (assessmentModal.kind === 'CAT' ? 20 : 10));
      setAssessDate(assessmentModal.date || new Date().toISOString().slice(0, 10));
    }
  }, [assessmentModal]);

  return (
    <>
      {/* 1. STRAND MODAL */}
      {strandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div
            className={`w-full max-w-md rounded-3xl p-5 border shadow-2xl space-y-4 ${
              isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌿</span>
                <h3 className="text-base font-black">
                  {strandModal.mode === 'add' ? 'Add Curriculum Strand' : 'Edit Strand'}
                </h3>
              </div>
              <button
                type="button"
                onClick={onCloseStrandModal}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-400">
              Learning Area: <strong className="text-slate-200">{strandModal.grade} · {strandModal.subject}</strong>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Strand Name (e.g. 1.0 NUMBERS, 2.0 MEASUREMENT)
              </label>
              <input
                type="text"
                value={strandName}
                onChange={(e) => setStrandName(e.target.value)}
                placeholder="Enter strand title…"
                className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                  isDark
                    ? 'bg-black/50 border-white/20 text-white placeholder:text-slate-500'
                    : 'bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400'
                }`}
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onCloseStrandModal}
                className="flex-1 py-2.5 rounded-xl border border-white/20 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!strandName.trim()}
                onClick={() => {
                  sound.playCompleteChime();
                  onSaveStrand({
                    ...strandModal,
                    name: strandName.trim(),
                  });
                }}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black text-xs shadow-md cursor-pointer"
              >
                {strandModal.mode === 'add' ? '＋ Create Strand' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. SUB-STRAND MODAL */}
      {subStrandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div
            className={`w-full max-w-md rounded-3xl p-5 border shadow-2xl space-y-4 ${
              isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">📑</span>
                <h3 className="text-base font-black">
                  {subStrandModal.mode === 'add' ? 'Add Sub-strand' : 'Edit Sub-strand'}
                </h3>
              </div>
              <button
                type="button"
                onClick={onCloseSubStrandModal}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-400">
              Under Strand: <strong className="text-purple-300">{subStrandModal.strandName}</strong>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Sub-strand Name (e.g. 1.1 Fractions & Decimals)
              </label>
              <input
                type="text"
                value={subStrandName}
                onChange={(e) => setSubStrandName(e.target.value)}
                placeholder="Enter sub-strand title…"
                className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                  isDark
                    ? 'bg-black/50 border-white/20 text-white placeholder:text-slate-500'
                    : 'bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400'
                }`}
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onCloseSubStrandModal}
                className="flex-1 py-2.5 rounded-xl border border-white/20 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!subStrandName.trim()}
                onClick={() => {
                  sound.playCompleteChime();
                  onSaveSubStrand({
                    ...subStrandModal,
                    name: subStrandName.trim(),
                  });
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs shadow-md cursor-pointer"
              >
                {subStrandModal.mode === 'add' ? '＋ Create Sub-strand' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ASSESSMENT MODAL (ADD / EDIT CAT OR ASSIGNMENT) */}
      {assessmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div
            className={`w-full max-w-md rounded-3xl p-5 border shadow-2xl space-y-4 ${
              isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {assessmentModal.kind === 'CAT' ? '📝' : '📘'}
                </span>
                <h3 className="text-base font-black">
                  {assessmentModal.mode === 'add'
                    ? `Add ${assessmentModal.kind}`
                    : `Edit ${assessmentModal.kind}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={onCloseAssessmentModal}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-400">
              Sub-strand: <strong className="text-blue-300">{assessmentModal.subStrandName}</strong>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Assessment Title
                </label>
                <input
                  type="text"
                  value={assessTitle}
                  onChange={(e) => setAssessTitle(e.target.value)}
                  placeholder={`e.g. ${assessmentModal.kind} on Equivalent Fractions`}
                  className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                    isDark
                      ? 'bg-black/50 border-white/20 text-white placeholder:text-slate-500'
                      : 'bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400'
                  }`}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Maximum Marks
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={assessMaxMarks}
                    onChange={(e) => setAssessMaxMarks(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold text-center ${
                      isDark
                        ? 'bg-black/50 border-white/20 text-white'
                        : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Date Administered
                  </label>
                  <input
                    type="date"
                    value={assessDate}
                    onChange={(e) => setAssessDate(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                      isDark
                        ? 'bg-black/50 border-white/20 text-white'
                        : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                💡 Teachers can add up to <strong>100 CATs</strong> and <strong>100 Assignments</strong> per sub-strand. Scores automatically compute the CBC performance band in the Assessment Book.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              {assessmentModal.mode === 'edit' && onDeleteAssessment && assessmentModal.assessmentId && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(400);
                    onDeleteAssessment(
                      assessmentModal.strandId,
                      assessmentModal.subStrandId,
                      assessmentModal.assessmentId!
                    );
                    onCloseAssessmentModal();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs cursor-pointer border border-rose-500/30 transition-colors"
                >
                  Delete
                </button>
              )}

              <button
                type="button"
                onClick={onCloseAssessmentModal}
                className="flex-1 py-2.5 rounded-xl border border-white/20 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!assessTitle.trim()}
                onClick={() => {
                  sound.playCompleteChime();
                  onSaveAssessment({
                    ...assessmentModal,
                    title: assessTitle.trim(),
                    maxMarks: assessMaxMarks,
                    date: assessDate,
                  });
                }}
                className={`flex-1 py-2.5 rounded-xl font-black text-xs text-white shadow-md cursor-pointer disabled:opacity-50 ${
                  assessmentModal.kind === 'CAT'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {assessmentModal.mode === 'add'
                  ? `＋ Add ${assessmentModal.kind}`
                  : 'Save Assessment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
