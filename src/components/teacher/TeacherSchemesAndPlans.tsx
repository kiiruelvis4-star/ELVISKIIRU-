import React, { useState, useMemo } from 'react';
import { GradeName, TimetableCell, SLOTS, DAYS, TimetableSlotDef } from '../admin/types';
import { Strand, SubStrand, LessonPlanItem, CATQuestion, FormativeAssessment } from './types';
import { sound } from '../../utils/sound';

interface TeacherSchemesAndPlansProps {
  isDark: boolean;
  grade: GradeName;
  subject: string;
  teacherId: string;
  teacherName: string;
  strands: Strand[];
  timetable: Record<string, TimetableCell>;
  onMarkLessonTaught: (topic: string) => void;
  onAddGeneratedCAT: (strandId: string, subStrandId: string, cat: FormativeAssessment) => void;
  onNavigateToAssessmentBook: () => void;
  onNavigateToReport: () => void;
  onClose: () => void;
}

export const TeacherSchemesAndPlans: React.FC<TeacherSchemesAndPlansProps> = ({
  isDark,
  grade,
  subject,
  teacherId,
  teacherName,
  strands,
  timetable,
  onMarkLessonTaught,
  onAddGeneratedCAT,
  onNavigateToAssessmentBook,
  onNavigateToReport,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'schemes' | 'plans' | 'notes' | 'cats'>('schemes');
  const [selectedSubStrandId, setSelectedSubStrandId] = useState<string | null>(null);
  const [selectedLessonNumber, setSelectedLessonNumber] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter strands for this grade and subject
  const currentStrands = useMemo(() => {
    return strands.filter(
      (s) => s.grade === grade && s.subject.toLowerCase() === subject.toLowerCase()
    );
  }, [strands, grade, subject]);

  // Find all scheduled timetable slots for this teacher, grade, and subject
  const timetableSlots = useMemo(() => {
    const slots: { day: string; slotKey: string; time: string; lessonNum: number }[] = [];
    DAYS.forEach((day) => {
      SLOTS.forEach((bell: TimetableSlotDef) => {
        if (!bell.lesson) return;
        const key = `${day}|${bell.k}|${grade}`;
        const cell = timetable[key];
        if (cell && cell.teacherId === teacherId && cell.subject?.toLowerCase() === subject.toLowerCase()) {
          slots.push({
            day,
            slotKey: bell.k,
            time: bell.t,
            lessonNum: bell.lesson,
          });
        }
      });
    });
    return slots;
  }, [timetable, teacherId, grade, subject]);

  // Flattened sub-strands
  const allSubStrands = useMemo(() => {
    const list: { strand: Strand; subStrand: SubStrand }[] = [];
    currentStrands.forEach((st) => {
      st.subStrands.forEach((sub) => {
        list.push({ strand: st, subStrand: sub });
      });
    });
    return list;
  }, [currentStrands]);

  // Active sub-strand
  const activeSubStrand = useMemo(() => {
    if (selectedSubStrandId) {
      for (const item of allSubStrands) {
        if (item.subStrand.id === selectedSubStrandId) return item;
      }
    }
    return allSubStrands[0] || null;
  }, [allSubStrands, selectedSubStrandId]);

  // Check if sub-strand is complete (has CATs or assignments)
  const isSubStrandComplete = (sub: SubStrand) => {
    return (sub.assessments && sub.assessments.length > 0);
  };

  // Generate 10-Question CAT from sub-strand
  const handleGenerateCAT = (strand: Strand, sub: SubStrand) => {
    sound.playCompleteChime();

    const sampleKPSEAQuestions: CATQuestion[] = [
      {
        number: 1,
        prompt: `In ${sub.name}, what is the foundational place value or primary unit of analysis tested in national KPSEA benchmarks?`,
        options: ['A) Concrete representation', 'B) Abstract reasoning', 'C) Standard algorithmic computation', 'D) Real-world contextual modeling'],
        correctAnswer: 'A',
        rubricCriteria: 'Assesses learner recall and conceptual grasp of foundational principles.',
        sourceExam: 'KPSEA Past Paper',
      },
      {
        number: 2,
        prompt: `A learner is asked to solve a real-life situation involving ${sub.name}. Which step should be executed first?`,
        options: ['A) Identifying the key parameters', 'B) Guessing the outcome', 'C) Disregarding units', 'D) Skipping verification'],
        correctAnswer: 'A',
        rubricCriteria: 'Evaluates systematic inquiry and problem-solving methodology.',
        sourceExam: 'KPSEA Past Paper',
      },
      {
        number: 3,
        prompt: `Which of the following competencies is demonstrated when a learner accurately explains the core rule of ${sub.name}?`,
        options: ['A) Critical thinking & problem solving', 'B) Passive memorization', 'C) Isolated computation', 'D) Inaccurate estimation'],
        correctAnswer: 'A',
        rubricCriteria: 'CBC Core Competency assessment (Communication & Collaboration).',
        sourceExam: 'CBC Formative Bank',
      },
      {
        number: 4,
        prompt: `Convert and calculate the standard value when applied to ${sub.name} practical exercises:`,
        options: ['A) Value satisfies standard equivalence', 'B) Value exceeds upper limit', 'C) Value is non-standard', 'D) Value cannot be determined'],
        correctAnswer: 'A',
        rubricCriteria: 'Tests mathematical/scientific computational accuracy.',
        sourceExam: 'KNEC Standard',
      },
      {
        number: 5,
        prompt: `During a classroom experiment on ${sub.name}, what environmental or learning resource is best utilized?`,
        options: ['A) Locally available recycled materials', 'B) High-cost specialized machinery', 'C) Digital simulator only', 'D) Theoretical chalkboard drawing only'],
        correctAnswer: 'A',
        rubricCriteria: 'Assesses resourcefulness and practical environmental interaction.',
        sourceExam: 'KPSEA Past Paper',
      },
      {
        number: 6,
        prompt: `Which of the following errors is most common among learners who score in the Approaching Expectations (AE) band for ${sub.name}?`,
        options: ['A) Misinterpreting multi-step word problems', 'B) Flawless calculation', 'C) Perfect spatial alignment', 'D) Complete mastery'],
        correctAnswer: 'A',
        rubricCriteria: 'Diagnostic evaluation for Focus Zone identification.',
        sourceExam: 'CBC Formative Bank',
      },
      {
        number: 7,
        prompt: `In a KPSEA examination scenario, what is the best strategy to verify answers in ${sub.name}?`,
        options: ['A) Working backwards with inverse operations', 'B) Leaving blanks', 'C) Relying on intuition alone', 'D) Re-reading without checking'],
        correctAnswer: 'A',
        rubricCriteria: 'Tests metacognitive checking and accuracy verification.',
        sourceExam: 'KPSEA Past Paper',
      },
      {
        number: 8,
        prompt: `Explain the practical application of ${sub.name} in Kenyan community life and household management:`,
        options: ['A) Efficient budgeting, measurement, and resource stewardship', 'B) Theoretical discussion only', 'C) Occasional reference', 'D) No domestic application'],
        correctAnswer: 'A',
        rubricCriteria: 'Connects CBC curriculum to community service learning.',
        sourceExam: 'KNEC Standard',
      },
      {
        number: 9,
        prompt: `A learner solves 8 out of 10 items correctly in this assessment. Which CBC rubric level does this achieve?`,
        options: ['A) Exceeding Expectations (EE - 80% to 100%)', 'B) Meeting Expectations (ME)', 'C) Approaching Expectations (AE)', 'D) Below Expectations (BE)'],
        correctAnswer: 'A',
        rubricCriteria: 'Standard KNEC 4-tier rubric calibration.',
        sourceExam: 'CBC Formative Bank',
      },
      {
        number: 10,
        prompt: `Consolidation task: Combine the foundational concepts of ${sub.name} to propose a creative solution for a community need:`,
        options: ['A) Clear, structured, and evidence-based proposal', 'B) Incomplete outline', 'C) Irrelevant response', 'D) Generic statement'],
        correctAnswer: 'A',
        rubricCriteria: 'Synthesizes high-order creative thinking competencies.',
        sourceExam: 'KPSEA Past Paper',
      },
    ];

    const catNumber = (sub.assessments || []).filter((a) => (a.kind || a.type) === 'CAT').length + 1;
    const newCAT: FormativeAssessment = {
      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      strandId: strand.id,
      subStrandId: sub.id,
      type: 'CAT',
      kind: 'CAT',
      number: catNumber,
      title: `CAT ${catNumber}: ${sub.name} (10 Questions · KPSEA Aligned)`,
      maxMarks: 20,
      date: new Date().toISOString().slice(0, 10),
      questionsList: sampleKPSEAQuestions,
      scores: {},
    };

    onAddGeneratedCAT(strand.id, sub.id, newCAT);
    alert(`Generated 10-Question CAT: "${newCAT.title}"! It has been saved to your Assessment Book and Assessment Report.`);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-900/60 to-indigo-900/60 p-4 rounded-3xl border border-blue-500/30 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            <h2 className="text-base sm:text-lg font-black text-white">
              Schemes of Work & 40-Min Lesson Plans
            </h2>
          </div>
          <p className="text-xs text-blue-200 mt-0.5">
            {grade} · {subject} · Tr. {teacherName} · Full-Year CBC Pipeline
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="py-2 px-3 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs cursor-pointer flex items-center gap-1.5"
            title="Print Schemes & Lesson Plans"
          >
            <span>🖨 Print Scheme</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToAssessmentBook}
            className="py-2 px-3 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-500 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <span>📘 Assess Book</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToReport}
            className="py-2 px-3 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-500 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <span>📊 Report</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Timetable Allocation Banner */}
      <div
        className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-black">
            🗓️
          </div>
          <div>
            <div className="font-extrabold text-xs">
              Weekly Timetable Allocations (40-Minute Periods)
            </div>
            <div className="text-[11px] text-slate-400">
              Allocated by Administration for {grade} {subject}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {timetableSlots.length === 0 ? (
            <span className="text-xs text-amber-400 font-medium">
              No specific bell slots configured in admin timetable yet
            </span>
          ) : (
            timetableSlots.map((slot, idx) => (
              <span
                key={idx}
                className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30"
              >
                {slot.day} {slot.slotKey} ({slot.time})
              </span>
            ))
          )}
        </div>
      </div>

      {/* Main 4 Mode Tabs */}
      <div className="flex border-b border-white/10 gap-2 pb-1 text-xs">
        <button
          onClick={() => {
            sound.playClick(400);
            setActiveTab('schemes');
          }}
          className={`py-2 px-3.5 rounded-xl font-extrabold cursor-pointer transition-all ${
            activeTab === 'schemes'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          📅 Schemes of Work
        </button>

        <button
          onClick={() => {
            sound.playClick(400);
            setActiveTab('plans');
          }}
          className={`py-2 px-3.5 rounded-xl font-extrabold cursor-pointer transition-all ${
            activeTab === 'plans'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          📝 40-Min Lesson Plans
        </button>

        <button
          onClick={() => {
            sound.playClick(400);
            setActiveTab('notes');
          }}
          className={`py-2 px-3.5 rounded-xl font-extrabold cursor-pointer transition-all ${
            activeTab === 'notes'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          📖 Enlarged Learner Notes & Q&A
        </button>

        <button
          onClick={() => {
            sound.playClick(400);
            setActiveTab('cats');
          }}
          className={`py-2 px-3.5 rounded-xl font-extrabold cursor-pointer transition-all ${
            activeTab === 'cats'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          🎯 10-Question CATs (KPSEA)
        </button>
      </div>

      {/* Sub-strand Selector Pill List */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
        {allSubStrands.map(({ strand, subStrand }) => {
          const isSelected = activeSubStrand?.subStrand.id === subStrand.id;
          return (
            <button
              key={subStrand.id}
              onClick={() => {
                sound.playClick(400);
                setSelectedSubStrandId(subStrand.id);
                setSelectedLessonNumber(1);
              }}
              className={`shrink-0 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-purple-600 text-white shadow-md border border-purple-400'
                  : isDark
                  ? 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <span>{subStrand.name}</span>
            </button>
          );
        })}
      </div>

      {/* Active Sub-strand Content */}
      {activeSubStrand ? (
        <div className="space-y-4">
          {/* TAB 1: SCHEMES OF WORK */}
          {activeTab === 'schemes' && (
            <div
              className={`p-4 rounded-3xl border space-y-4 ${
                isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] font-mono text-purple-400 uppercase font-black tracking-wider">
                    Strand: {activeSubStrand.strand.name}
                  </span>
                  <h3 className="text-base font-black text-white">
                    Scheme of Work: {activeSubStrand.subStrand.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Total Curriculum Lessons: {activeSubStrand.subStrand.totalLessons || 8} periods · Term {activeSubStrand.subStrand.term || 1}
                  </p>
                </div>

                <button
                  onClick={() => onMarkLessonTaught(activeSubStrand.subStrand.name)}
                  className="py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs cursor-pointer self-start sm:self-auto"
                >
                  ✓ Mark Lesson Taught
                </button>
              </div>

              {/* Schemes Table */}
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-white/10 bg-black/30 text-[11px] font-black text-slate-300">
                      <th className="p-2.5 w-12 text-center">Wk</th>
                      <th className="p-2.5 w-12 text-center">Les</th>
                      <th className="p-2.5 min-w-[140px]">Specific Learning Outcome</th>
                      <th className="p-2.5 min-w-[140px]">Key Inquiry Question</th>
                      <th className="p-2.5 min-w-[160px]">Learning Experiences</th>
                      <th className="p-2.5 min-w-[120px]">Learning Resources</th>
                      <th className="p-2.5 min-w-[100px]">Assessment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: activeSubStrand.subStrand.totalLessons || 8 }).map((_, i) => {
                      const lesNum = i + 1;
                      const plan = activeSubStrand.subStrand.lessonPlans?.[i];
                      return (
                        <tr
                          key={lesNum}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="p-2.5 text-center font-mono font-bold text-purple-400">
                            {Math.ceil(lesNum / 3)}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-white">
                            {lesNum}
                          </td>
                          <td className="p-2.5">
                            <div className="font-bold text-white">
                              {plan?.outcome || `By the end of lesson ${lesNum}, learner should identify and apply concepts in ${activeSubStrand.subStrand.name}.`}
                            </div>
                          </td>
                          <td className="p-2.5 text-slate-300 italic">
                            "{plan?.keyInquiryQuestion || `How do we apply ${activeSubStrand.subStrand.name} in daily activities?`}"
                          </td>
                          <td className="p-2.5 text-slate-300">
                            {plan?.development || `Learners observe illustrations, practice in pairs, and record observations in exercise books.`}
                          </td>
                          <td className="p-2.5 text-slate-400">
                            {plan?.learningResources || 'Curriculum handbook, charts, local realia, flashcards.'}
                          </td>
                          <td className="p-2.5 text-emerald-400 font-bold">
                            Oral Q&A, Written exercises, Observation
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: 40-MINUTE LESSON PLANS */}
          {activeTab === 'plans' && (
            <div
              className={`p-5 rounded-3xl border space-y-4 ${
                isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] font-mono text-purple-400 uppercase font-black tracking-wider">
                    Standard 40-Minute CBC Lesson Plan
                  </span>
                  <h3 className="text-base font-black text-white">
                    {activeSubStrand.subStrand.name} · Lesson {selectedLessonNumber} of {activeSubStrand.subStrand.totalLessons || 8}
                  </h3>
                </div>

                {/* Lesson Selector buttons */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  {Array.from({ length: activeSubStrand.subStrand.totalLessons || 8 }).map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => {
                        sound.playClick(400);
                        setSelectedLessonNumber(i + 1);
                      }}
                      className={`w-8 h-8 rounded-xl font-mono text-xs font-bold cursor-pointer transition-all ${
                        selectedLessonNumber === i + 1
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white/10 text-slate-300 hover:bg-white/20'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lesson Plan Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column: Metadata & Inquiry */}
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-black/20 border border-white/5 space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Specific Learning Outcome:</span>
                      <p className="font-extrabold text-white mt-0.5">
                        By the end of the 40-minute period, the learner should be able to comprehend, explain, and solve tasks involving {activeSubStrand.subStrand.name} with accuracy.
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Key Inquiry Question:</span>
                      <p className="font-extrabold text-amber-300 italic mt-0.5">
                        "Why is understanding {activeSubStrand.subStrand.name} essential for our daily problem-solving?"
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Core Competencies:</span>
                      <p className="text-slate-300 mt-0.5">
                        Communication and collaboration, Critical thinking and problem solving, Self-efficacy.
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Learning Resources:</span>
                      <p className="text-slate-300 mt-0.5">
                        Approved KICD course book, realia, charts, flashcards, digital tablet display.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Step-by-Step 40-Minute Bell Timing */}
                <div className="space-y-2 text-xs">
                  {/* Step 1: Introduction */}
                  <div className="p-3 rounded-2xl bg-blue-950/30 border border-blue-500/20">
                    <div className="flex items-center justify-between font-black text-blue-300 mb-1">
                      <span>1. Introduction & Hook</span>
                      <span className="font-mono text-[10px] bg-blue-500/20 px-2 py-0.5 rounded-md">5 Minutes</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      Teacher guides learners to review the previous competency through a quick warm-up drill. Introduce the Key Inquiry Question and state the lesson objective clearly.
                    </p>
                  </div>

                  {/* Step 2: Lesson Development */}
                  <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/20">
                    <div className="flex items-center justify-between font-black text-purple-300 mb-1">
                      <span>2. Lesson Development (Guided & Independent Practice)</span>
                      <span className="font-mono text-[10px] bg-purple-500/20 px-2 py-0.5 rounded-md">25 Minutes</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      Demonstrate core concepts with tangible concrete materials. Learners work in collaborative pairs to solve 3 guided examples. Teacher circulates to offer targeted scaffolding and support.
                    </p>
                  </div>

                  {/* Step 3: Conclusion & Reflection */}
                  <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/20">
                    <div className="flex items-center justify-between font-black text-emerald-300 mb-1">
                      <span>3. Conclusion, Reflection & Summary</span>
                      <span className="font-mono text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-md">10 Minutes</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      Summarize the key takeaway through rapid-fire question checks. Learners log their reflection in workbooks. Homework and self-practice tasks assigned.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ENLARGED LEARNER NOTES & CHECK Q&A */}
          {activeTab === 'notes' && (
            <div
              className={`p-5 rounded-3xl border space-y-4 ${
                isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="border-b border-white/10 pb-3">
                <span className="text-[10px] font-mono text-purple-400 uppercase font-black tracking-wider">
                  Comprehensive Learner-Language Notes
                </span>
                <h3 className="text-base font-black text-white">
                  {activeSubStrand.subStrand.name} · Master Study Notes
                </h3>
              </div>

              {/* Extended Notes in clear learner friendly prose */}
              <div className="p-4 rounded-2xl bg-black/25 border border-white/10 space-y-3 text-sm leading-relaxed text-slate-200">
                <p className="font-bold text-white text-base">
                  1. What is {activeSubStrand.subStrand.name}?
                </p>
                <p>
                  {activeSubStrand.subStrand.learnerNotes ||
                    `In this learning area, we explore how ${activeSubStrand.subStrand.name} functions in both mathematics and the environment around us. We learn to count, categorize, observe, and apply precise principles.`}
                </p>

                <p className="font-bold text-white text-base mt-3">
                  2. Key Step-by-Step Rules & Examples
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-300">
                  <li><strong>Step 1:</strong> Always read the task thoroughly to identify given facts and unknown quantities.</li>
                  <li><strong>Step 2:</strong> Organize your working neatly on paper using standard units.</li>
                  <li><strong>Step 3:</strong> Perform the calculation or experiment step-by-step without skipping lines.</li>
                  <li><strong>Step 4:</strong> Check your final answer using the inverse operation or checking rules.</li>
                </ul>

                <p className="font-bold text-white text-base mt-3">
                  3. Teacher Check Questions & Answers (Verification of Understanding)
                </p>
                <div className="space-y-2 mt-2">
                  {(activeSubStrand.subStrand.checkQuestions || [
                    {
                      question: `What is the primary rule to remember when solving tasks in ${activeSubStrand.subStrand.name}?`,
                      answer: 'Always verify place value and standard units before performing arithmetic operations.',
                    },
                    {
                      question: 'How do you check whether your answer is reasonable?',
                      answer: 'Use rounding or inverse calculations to ensure the result matches the magnitude of the problem.',
                    },
                  ]).map((cq, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs">
                      <div className="font-bold text-purple-200">Q{idx + 1}: {cq.question}</div>
                      <div className="font-mono text-emerald-300 mt-1">✓ Answer: {cq.answer}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 10-QUESTION CATS (KPSEA ALIGNED) */}
          {activeTab === 'cats' && (
            <div
              className={`p-5 rounded-3xl border space-y-4 ${
                isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] font-mono text-purple-400 uppercase font-black tracking-wider">
                    Standard Continuous Assessment Tests (10 Questions Each)
                  </span>
                  <h3 className="text-base font-black text-white">
                    CATs for {activeSubStrand.subStrand.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Researched from previous KNEC KPSEA exams and CBC national item banks. Created once a sub-strand is complete.
                  </p>
                </div>

                <button
                  onClick={() => handleGenerateCAT(activeSubStrand.strand, activeSubStrand.subStrand)}
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <span>＋ Generate 10-Question KPSEA CAT</span>
                </button>
              </div>

              {/* Existing CATs list for this sub-strand */}
              <div className="space-y-3">
                {(activeSubStrand.subStrand.assessments || []).length === 0 ? (
                  <div className="p-8 rounded-2xl border text-center space-y-2 border-dashed border-white/20">
                    <div className="text-2xl">📝</div>
                    <div className="font-bold text-sm">No CAT generated yet for this sub-strand</div>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Tap "＋ Generate 10-Question KPSEA CAT" above to create an authentic 10-question assessment based on this completed sub-strand.
                    </p>
                  </div>
                ) : (
                  (activeSubStrand.subStrand.assessments || []).map((assess) => (
                    <div
                      key={assess.id}
                      className="p-4 rounded-2xl border border-white/10 bg-black/25 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                            {assess.kind || assess.type} {assess.number}
                          </span>
                          <h4 className="font-black text-sm text-white">{assess.title}</h4>
                        </div>
                        <span className="font-mono text-xs text-amber-300">
                          Total: {assess.maxMarks} Marks
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span>Created: {assess.date}</span>
                        <span>•</span>
                        <span>Enrolled in Assessment Book</span>
                      </div>

                      {/* Display sample questions if available */}
                      {assess.questionsList && assess.questionsList.length > 0 && (
                        <div className="pt-2 border-t border-white/10 space-y-2 mt-2">
                          <div className="text-[11px] font-black uppercase tracking-wider text-purple-300">
                            10 KPSEA Formative Questions:
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            {assess.questionsList.map((q) => (
                              <div
                                key={q.number}
                                className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1"
                              >
                                <div className="font-bold text-white">
                                  {q.number}. {q.prompt}
                                </div>
                                {q.options && (
                                  <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-300 pl-2">
                                    {q.options.map((opt, oi) => (
                                      <span key={oi}>{opt}</span>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 pt-0.5">
                                  <span>Key: {q.correctAnswer}</span>
                                  <span className="text-slate-400">{q.sourceExam}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400">
          No strands registered for {grade} {subject}. Tap "＋ Add Strand" in the Assessment Book to register learning areas.
        </div>
      )}
    </div>
  );
};
