import React, { useState, useMemo } from 'react';
import { AdminState, GradeName, GRADES, GRADE_COLORS, SUBJECTS, Teacher, Learner } from './types';
import { sound } from '../../utils/sound';
import { DATA } from '../../data/curriculumData';
import { LEVEL_COLORS, getStoredMarks, makeMarkKey, resultOf, band, getStoredSubmissions } from '../../utils/cbcAssessmentEngine';
import { NativeAssessmentBooklet } from '../common/NativeAssessmentBooklet';

interface AdminResourcesProps {
  state: AdminState;
  onOpenAddResource?: () => void;
}

export const AdminResources: React.FC<AdminResourcesProps> = ({ state }) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeName>('Grade 1');
  const [selectedTerm, setSelectedTerm] = useState<'Term 1' | 'Term 2' | 'Term 3'>('Term 1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLearnerModal, setSelectedLearnerModal] = useState<Learner | null>(null);
  const [bookletTab, setBookletTab] = useState<'book' | 'report'>('book');
  const isDark = state.theme === 'dark';

  // Live stored marks from teachers
  const [storedMarks] = useState(() => getStoredMarks());
  const [storedSubmissions] = useState(() => getStoredSubmissions());

  // Read genuine teacher state from localStorage (lra_teacher_v1)
  const teacherState = useMemo(() => {
    try {
      const stored = localStorage.getItem('lra_teacher_v1');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse teacher state in AdminResources:', e);
    }
    return null;
  }, []);

  // Filter learners for the selected grade
  const learnersInSelectedGrade = useMemo(() => {
    return state.learners.filter((l) => l.grade === selectedGrade);
  }, [state.learners, selectedGrade]);

  // Filtered by search query
  const displayedLearners = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return learnersInSelectedGrade;
    return learnersInSelectedGrade.filter(
      (l) => l.name.toLowerCase().includes(q) || l.adm.toLowerCase().includes(q)
    );
  }, [learnersInSelectedGrade, searchQuery]);

  // Count learners per grade
  const gradeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    GRADES.forEach((g) => {
      counts[g] = state.learners.filter((l) => l.grade === g).length;
    });
    return counts;
  }, [state.learners]);

  // Curriculum learning areas for selected grade and term
  const curriculumLearningAreas = useMemo(() => {
    try {
      const gradeDef = DATA.grades[selectedGrade];
      if (gradeDef?.terms && gradeDef.terms[selectedTerm]) {
        return gradeDef.terms[selectedTerm];
      }
    } catch (e) {
      console.warn('Failed to load curriculum learning areas:', e);
    }
    return [];
  }, [selectedGrade, selectedTerm]);

  // All strands in this grade and term
  const allGradeStrands = useMemo(() => {
    return curriculumLearningAreas.flatMap((la) => la.strands || []);
  }, [curriculumLearningAreas]);

  // Calculate genuine assessment and attendance stats per learner
  const learnerDetailedStats = useMemo(() => {
    return displayedLearners.map((learner) => {
      // 1. Assessment Book evaluation
      const evaluatedStrands: Array<{
        sid: string;
        name: string;
        score: number;
        band: 'EE' | 'ME' | 'AE' | 'BE';
      }> = [];

      allGradeStrands.forEach((str) => {
        const markKey = makeMarkKey(learner.id, str.sid);
        const record = storedMarks[markKey];
        const res = resultOf(record);
        if (res) {
          const b = band(res.f) || 'BE';
          evaluatedStrands.push({
            sid: str.sid,
            name: str.name,
            score: res.f,
            band: b,
          });
        }
      });

      const isAssessmentMarked = evaluatedStrands.length > 0;
      const avgScore = isAssessmentMarked
        ? Math.round(
            evaluatedStrands.reduce((acc, s) => acc + s.score, 0) / evaluatedStrands.length
          )
        : null;
      const overallBand = avgScore !== null ? band(avgScore) : null;

      // 2. Attendance Roll Call evaluation from teacher state
      // Look through all class attendance records matching this grade
      let markedDatesCount = 0;
      let presentCount = 0;

      if (teacherState?.classes) {
        Object.entries(teacherState.classes).forEach(([clsKey, clsData]: [string, any]) => {
          if (clsKey.includes(selectedGrade)) {
            const att = clsData?.att || {};
            const dates = Object.keys(att);
            dates.forEach((d) => {
              markedDatesCount++;
              if (att[d]?.[learner.id] !== false) {
                presentCount++;
              }
            });
          }
        });
      }

      const isAttendanceMarked = markedDatesCount > 0;
      const attendancePct = isAttendanceMarked
        ? Math.round((presentCount / markedDatesCount) * 100)
        : null;

      // 3. Assessment Report Submissions
      const submissionsForLearner = Object.values(storedSubmissions).filter(
        (sub: any) => sub.learnerId === learner.id && sub.grade === selectedGrade
      );

      return {
        learner,
        isAssessmentMarked,
        evaluatedStrands,
        avgScore,
        overallBand,
        isAttendanceMarked,
        presentDays: presentCount,
        totalDays: markedDatesCount,
        attendancePct,
        submissionsCount: submissionsForLearner.length,
      };
    });
  }, [displayedLearners, allGradeStrands, storedMarks, storedSubmissions, teacherState, selectedGrade]);

  const handleOpenBooklet = (learner: Learner, tab: 'book' | 'report') => {
    sound.playClick(450);
    setSelectedLearnerModal(learner);
    setBookletTab(tab);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>📊</span>
            <span>Assessment &amp; Attendance Registry</span>
          </h2>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Official continuous assessment books, termly reports &amp; morning roll call attendance by grade
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Term Switcher */}
          <div className="flex bg-slate-200 dark:bg-black/40 rounded-xl p-0.5 text-[11px] font-bold">
            {(['Term 1', 'Term 2', 'Term 3'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  sound.playClick(400);
                  setSelectedTerm(t);
                }}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedTerm === t
                    ? 'bg-purple-600 text-white shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grade Selector Bar with Learner Counts */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Select Grade:
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {GRADES.map((g) => {
            const isSelected = selectedGrade === g;
            const count = gradeCounts[g] || 0;
            return (
              <button
                key={g}
                type="button"
                onClick={() => {
                  sound.playClick(450);
                  setSelectedGrade(g);
                }}
                style={isSelected ? { backgroundColor: GRADE_COLORS[g] } : {}}
                className={`p-2.5 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer border ${
                  isSelected
                    ? 'text-white border-transparent shadow-md scale-[1.02]'
                    : isDark
                    ? 'bg-[#141C33] text-slate-300 border-white/10 hover:bg-white/5'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-black">{g}</span>
                <span
                  className={`text-[10px] font-bold mt-0.5 px-2 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-black/25 text-white'
                      : count > 0
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-400'
                  }`}
                >
                  {count} {count === 1 ? 'learner' : 'learners'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grade Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className={`p-3 rounded-2xl border ${isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'} shadow-xs`}>
          <div className="text-[10.5px] font-bold text-slate-400 uppercase">Enrolled in {selectedGrade}</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
            {learnersInSelectedGrade.length}
          </div>
          <div className="text-[10.5px] text-slate-500 mt-0.5">
            Active roster learners
          </div>
        </div>

        <div className={`p-3 rounded-2xl border ${isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'} shadow-xs`}>
          <div className="text-[10.5px] font-bold text-slate-400 uppercase">Assessment Books Marked</div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
            {learnerDetailedStats.filter((s) => s.isAssessmentMarked).length} / {learnersInSelectedGrade.length}
          </div>
          <div className="text-[10.5px] text-slate-500 mt-0.5">
            Continuous CATs &amp; Assignments recorded
          </div>
        </div>

        <div className={`p-3 rounded-2xl border ${isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'} shadow-xs`}>
          <div className="text-[10.5px] font-bold text-slate-400 uppercase">Roll Call Attendance Logged</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {learnerDetailedStats.filter((s) => s.isAttendanceMarked).length} / {learnersInSelectedGrade.length}
          </div>
          <div className="text-[10.5px] text-slate-500 mt-0.5">
            Pupils with teacher daily roll entries
          </div>
        </div>
      </div>

      {/* Search Input */}
      {learnersInSelectedGrade.length > 2 && (
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${selectedGrade} learners by name or admission number...`}
            className={`w-full py-2 px-3 text-xs rounded-xl border ${
              isDark
                ? 'bg-[#141C33] border-white/10 text-white placeholder-slate-500'
                : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
            } focus:outline-none focus:ring-2 focus:ring-purple-500`}
          />
        </div>
      )}

      {/* LEARNERS IN GRADE: INDIVIDUAL ASSESSMENT BOOKS, REPORTS & ATTENDANCE */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 m-0">
            <span>🎒</span>
            <span>{selectedGrade} Learners — Assessment Books, Reports &amp; Attendance</span>
          </h3>
          <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
            {displayedLearners.length} {displayedLearners.length === 1 ? 'Pupil' : 'Pupils'}
          </span>
        </div>

        {displayedLearners.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border ${isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'} text-slate-400 text-xs`}>
            {searchQuery
              ? `No learners found matching "${searchQuery}" in ${selectedGrade}.`
              : `No learners enrolled in ${selectedGrade} yet. Use the Pupils Management tab to admit students.`}
          </div>
        ) : (
          <div className="space-y-3">
            {learnerDetailedStats.map(
              ({
                learner,
                isAssessmentMarked,
                evaluatedStrands,
                avgScore,
                overallBand,
                isAttendanceMarked,
                presentDays,
                totalDays,
                attendancePct,
              }) => {
                return (
                  <div
                    key={learner.id}
                    className={`rounded-2xl border p-4 shadow-sm transition-all ${
                      isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                    } space-y-3.5`}
                  >
                    {/* Learner Identity & Action Buttons Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-white/10">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-purple-600/20 text-purple-600 dark:text-purple-300 font-black text-sm flex items-center justify-center shrink-0 border border-purple-500/30">
                          {learner.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-sm text-slate-900 dark:text-white truncate m-0">
                            {learner.name}
                          </h4>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                              {learner.adm}
                            </span>
                            <span>•</span>
                            <span>{learner.grade} ({learner.stream || 'East'})</span>
                            {learner.parentPhone && (
                              <>
                                <span>•</span>
                                <span>📞 {learner.parentPhone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Launch Buttons for Assessment Book and Report */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenBooklet(learner, 'book')}
                          className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
                        >
                          <span>📖</span>
                          <span>Assessment Book</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenBooklet(learner, 'report')}
                          className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-extrabold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
                        >
                          <span>📊</span>
                          <span>Assessment Report</span>
                        </button>
                      </div>
                    </div>

                    {/* Three Dedicated Columns: 1. Assessment Book, 2. Assessment Report, 3. Attendance */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* CARD 1: ASSESSMENT BOOK STATUS */}
                      <div className={`p-3 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                        <div className="flex items-center justify-between">
                          <div className="font-extrabold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                            <span>📘</span>
                            <span>Assessment Book</span>
                          </div>
                          {isAssessmentMarked && overallBand && (
                            <span
                              className="text-[9.5px] font-black px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: LEVEL_COLORS[overallBand] || '#2563EB' }}
                            >
                              {avgScore}% · {overallBand}
                            </span>
                          )}
                        </div>

                        {/* "well marked by teachers if not marked don't show" */}
                        {isAssessmentMarked ? (
                          <div className="space-y-1.5">
                            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              {evaluatedStrands.length} Strands evaluated by teachers
                            </div>
                            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                              {evaluatedStrands.slice(0, 3).map((st) => (
                                <div
                                  key={st.sid}
                                  className="text-[10px] flex items-center justify-between p-1 rounded bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5"
                                >
                                  <span className="truncate max-w-[140px] text-slate-700 dark:text-slate-300 font-medium">
                                    {st.name}
                                  </span>
                                  <span className="font-bold text-blue-600 dark:text-blue-400">
                                    {st.score.toFixed(0)}% ({st.band})
                                  </span>
                                </div>
                              ))}
                            </div>
                            {evaluatedStrands.length > 3 && (
                              <div className="text-[9.5px] text-slate-400 text-center">
                                +{evaluatedStrands.length - 3} more strands in full book
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="py-3 px-2 text-center rounded-lg bg-amber-500/5 border border-dashed border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px]">
                            ⏳ No teacher continuous marks recorded yet for this session.
                          </div>
                        )}
                      </div>

                      {/* CARD 2: ASSESSMENT REPORT STATUS */}
                      <div className={`p-3 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                        <div className="flex items-center justify-between">
                          <div className="font-extrabold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                            <span>📊</span>
                            <span>Assessment Report</span>
                          </div>
                          <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-pink-500/10 text-pink-700 dark:text-pink-300">
                            {selectedTerm}
                          </span>
                        </div>

                        {/* Report status */}
                        {isAssessmentMarked ? (
                          <div className="space-y-1.5">
                            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <span>✓</span>
                              <span>Termly continuous assessment generated</span>
                            </div>
                            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 m-0 leading-relaxed">
                              Evaluated with official 60/40 CBC weighting (60% Formative CATs + 40% Assignments).
                            </p>
                            <button
                              type="button"
                              onClick={() => handleOpenBooklet(learner, 'report')}
                              className="w-full py-1 text-[10.5px] font-extrabold text-pink-600 hover:text-pink-700 dark:text-pink-400 text-center underline cursor-pointer"
                            >
                              Review Official Report Booklet →
                            </button>
                          </div>
                        ) : (
                          <div className="py-3 px-2 text-center rounded-lg bg-slate-100 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10 text-slate-400 text-[11px]">
                            📄 Report pending teacher assessment release.
                          </div>
                        )}
                      </div>

                      {/* CARD 3: ATTENDANCE STATUS (well marked by teachers; if not marked don't show) */}
                      <div className={`p-3 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                        <div className="flex items-center justify-between">
                          <div className="font-extrabold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                            <span>✅</span>
                            <span>Attendance</span>
                          </div>
                          {isAttendanceMarked && attendancePct !== null && (
                            <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                              {attendancePct}% Present
                            </span>
                          )}
                        </div>

                        {/* "attendance that is well marked by teachers if not marked don't show" */}
                        {isAttendanceMarked && attendancePct !== null ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500 dark:text-slate-400">Roll Call Sessions:</span>
                              <span className="font-mono font-black text-slate-800 dark:text-white">
                                {presentDays} / {totalDays} Days Present
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500 transition-all"
                                style={{ width: `${attendancePct}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <span>✓</span>
                              <span>Official morning roll call recorded by class teacher</span>
                            </div>
                          </div>
                        ) : (
                          <div className="py-3 px-2 text-center rounded-lg bg-slate-100 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10 text-slate-400 text-[11px]">
                            📅 Roll call not yet marked by teacher for this session.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* FULL NATIVE ASSESSMENT BOOKLET / REPORT MODAL */}
      {selectedLearnerModal && (
        <NativeAssessmentBooklet
          role="admin"
          initialTab={bookletTab}
          learner={{
            id: selectedLearnerModal.id,
            name: selectedLearnerModal.name,
            adm: selectedLearnerModal.adm,
            grade: selectedLearnerModal.grade,
            stream: selectedLearnerModal.stream || 'East',
            parentPhone: selectedLearnerModal.parentPhone || '',
            familyId: selectedLearnerModal.familyId || 'FAM-001',
          }}
          onClose={() => setSelectedLearnerModal(null)}
        />
      )}
    </div>
  );
};
