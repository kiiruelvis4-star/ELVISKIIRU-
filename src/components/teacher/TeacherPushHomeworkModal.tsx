import React, { useState } from 'react';
import { sound } from '../../utils/sound';
import {
  parseTeacherQuestionText,
  savePushedAssignment,
  SAMPLE_TEACHER_TEMPLATES,
  PushedCATAssignment,
} from '../../utils/aiQuestionParser';
import { KICDQuestion } from '../../data/kicdPastPapersData';
import { ecosystemSync } from '../../utils/ecosystemSync';

interface TeacherPushHomeworkModalProps {
  teacherName: string;
  myClasses: Array<{ grade: string; subject: string }>;
  onClose: () => void;
  onSuccess: (cat: PushedCATAssignment) => void;
  onShowToast: (msg: string) => void;
}

export const TeacherPushHomeworkModal: React.FC<TeacherPushHomeworkModalProps> = ({
  teacherName,
  myClasses,
  onClose,
  onSuccess,
  onShowToast,
}) => {
  const defaultClass = myClasses[0] || { grade: 'Grade 4', subject: 'Science & Technology' };

  const [title, setTitle] = useState('Holiday Assessment: Photosynthesis & Plants');
  const [targetGrade, setTargetGrade] = useState(defaultClass.grade);
  const [subject, setSubject] = useState(defaultClass.subject);
  const [dueDate, setDueDate] = useState('Tomorrow, 4:00 PM');
  const [instructions, setInstructions] = useState('Answer all multiple choice questions. Scores are recorded automatically in your Assessment Book.');

  const [rawText, setRawText] = useState(SAMPLE_TEACHER_TEMPLATES[0].text);
  const [parsedQuestions, setParsedQuestions] = useState<KICDQuestion[]>(() =>
    parseTeacherQuestionText(SAMPLE_TEACHER_TEMPLATES[0].text, defaultClass.subject)
  );

  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState<'compose' | 'preview'>('compose');

  // Parse questions with AI detection
  const handleRunAiDetection = () => {
    sound.playClick(600);
    setIsAiProcessing(true);

    setTimeout(() => {
      const result = parseTeacherQuestionText(rawText, subject);
      setParsedQuestions(result);
      setIsAiProcessing(false);
      if (result.length > 0) {
        sound.playCompleteChime();
        setActiveStep('preview');
        onShowToast(`AI detected ${result.length} questions with ABCD choices and answers!`);
      } else {
        onShowToast('Could not find questions with ABCD choices. Please check your text format.');
      }
    }, 450);
  };

  // Change answer key manually
  const handleChangeAnswerKey = (qIndex: number, newKey: 'A' | 'B' | 'C' | 'D') => {
    sound.playClick(500);
    setParsedQuestions((prev) => {
      const copy = [...prev];
      copy[qIndex] = {
        ...copy[qIndex],
        correctAnswer: newKey,
        explanation: `Teacher updated answer key to Option ${newKey}.`,
      };
      return copy;
    });
  };

  // Load sample template
  const handleLoadTemplate = (tpl: typeof SAMPLE_TEACHER_TEMPLATES[0]) => {
    sound.playClick(500);
    setRawText(tpl.text);
    setSubject(tpl.subject);
    setTargetGrade(tpl.grade);
    setTitle(`CAT: ${tpl.name}`);
    const parsed = parseTeacherQuestionText(tpl.text, tpl.subject);
    setParsedQuestions(parsed);
    onShowToast(`Loaded ${tpl.name}`);
  };

  // Broadcast & Push to learners
  const handlePushToLearners = () => {
    if (parsedQuestions.length === 0) {
      onShowToast('Please add at least 1 question before pushing.');
      return;
    }

    sound.playClick(700);

    const newAssignment: PushedCATAssignment = {
      id: `pushed_cat_${Date.now()}`,
      title: title.trim() || `${targetGrade} ${subject} CAT`,
      subject,
      targetGrade,
      teacherName,
      dueDate,
      createdAt: new Date().toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }),
      totalMarks: parsedQuestions.length * 2,
      instructions,
      questions: parsedQuestions,
      isAutomatedCAT: true,
      completedByLearners: {},
    };

    // Save in ecosystem & local storage
    savePushedAssignment(newAssignment);

    // Also push to ecosystemSync homework queue so parents and learners receive the announcement
    ecosystemSync.publishTeacherCAT({
      id: newAssignment.id,
      teacherId: 'tr_pushed',
      teacherName,
      cls: `${targetGrade}|${subject}`,
      grade: targetGrade,
      subject,
      strand: 'CBC Holiday & Term Assessments',
      subStrand: 'Automated ABCD CAT',
      title: newAssignment.title,
      kind: 'CAT',
      dueDate: newAssignment.dueDate,
      totalMarks: newAssignment.totalMarks,
      questionsCount: newAssignment.questions.length,
      instructions: newAssignment.instructions,
      documents: [],
      status: 'published',
      publishedAt: 'Just now',
      sharedWithParents: true,
      whatsappMessage: `*LITTLE ROSES ACADEMY — NEW ASSESSMENT ALERT* 🌹\nTr. ${teacherName} has pushed *${newAssignment.title}* to ${targetGrade} learners.\nQuestions: ${newAssignment.questions.length} ABCD MCQs\nDue: ${newAssignment.dueDate}\nScores are auto-graded and recorded in the Assessment Book!`,
      approvedByTeacher: true,
    });

    sound.playCompleteChime();
    onSuccess(newAssignment);
    onClose();
    onShowToast(`Pushed "${newAssignment.title}" to ${targetGrade} learners!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-2xl border border-white/20">
              🤖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight">Push Text Homework / CAT</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/25 border border-emerald-300/40 text-emerald-200 uppercase">
                  ✨ AI Answer Detector
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium mt-0.5">
                Type or paste questions with ABCD choices. AI identifies answers, and scores auto-fill into the Assessment Book!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playClick(400);
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer font-bold transition-all"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                sound.playClick(400);
                setActiveStep('compose');
              }}
              className={`px-4 py-2 font-black text-xs rounded-t-xl transition-all cursor-pointer border-b-2 ${
                activeStep === 'compose'
                  ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              1. Type / Paste Questions
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playClick(400);
                setActiveStep('preview');
              }}
              className={`px-4 py-2 font-black text-xs rounded-t-xl transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
                activeStep === 'preview'
                  ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>🤖 2. AI Answer Key &amp; Preview</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-mono">
                {parsedQuestions.length}
              </span>
            </button>
          </div>

          {/* Quick preset templates */}
          <div className="hidden sm:flex items-center gap-1.5 pb-2">
            <span className="text-[11px] font-bold text-slate-400">Sample:</span>
            {SAMPLE_TEACHER_TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleLoadTemplate(tpl)}
                className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500 cursor-pointer transition-all"
              >
                {tpl.subject.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeStep === 'compose' ? (
            <div className="space-y-4">
              {/* Metadata Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Target Grade
                  </label>
                  <select
                    value={targetGrade}
                    onChange={(e) => setTargetGrade(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Subject / Learning Area
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {[
                      'Mathematics',
                      'English',
                      'Kiswahili',
                      'Science & Technology',
                      'Social Studies',
                      'Agriculture & Nutrition',
                      'Creative Arts',
                    ].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Due Date & Time
                  </label>
                  <input
                    type="text"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    placeholder="e.g. Tomorrow, 4:00 PM"
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Assignment Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Grade 4 Midterm Revision CAT 1"
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Text Area for Typing / Pasting Questions */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase">
                    Questions with ABCD Choices (Type or Paste Below)
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Format: 1. Question... A) opt B) opt C) opt D) opt
                  </span>
                </div>
                <textarea
                  rows={10}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`1. What is the capital city of Kenya?
A) Nakuru
B) Nairobi (Correct)
C) Mombasa
D) Kisumu

2. Which part of a plant makes food?
A) Root
B) Leaf (Correct)
C) Flower
D) Stem`}
                  className="w-full text-xs font-mono p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 leading-relaxed focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Action Button to run AI Detection */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-500">
                  🤖 ✨ AI will detect questions, separate ABCD choices, and infer the correct answers automatically.
                </div>

                <button
                  type="button"
                  onClick={handleRunAiDetection}
                  disabled={isAiProcessing || !rawText.trim()}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAiProcessing ? (
                    <>
                      <span className="animate-spin text-sm">⏳</span>
                      <span>AI Analyzing Questions...</span>
                    </>
                  ) : (
                    <>
                      <span>✨ AI Detect Answers & Preview</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* PREVIEW & AI ANSWER KEY STEP */
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-black text-indigo-900 dark:text-indigo-200">
                    AI Question Verification & Answer Key
                  </div>
                  <div className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-0.5">
                    Click any ABCD button below if you wish to adjust the correct answer before pushing.
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-indigo-600 text-white shadow-xs">
                    {parsedQuestions.length} Questions ({parsedQuestions.length * 2} Marks)
                  </span>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-3">
                {parsedQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                        <span className="text-indigo-600 dark:text-indigo-400 font-mono mr-1.5">
                          {idx + 1}.
                        </span>
                        {q.stem}
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 shrink-0">
                        {q.competency}
                      </span>
                    </div>

                    {/* ABCD Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                        const isCorrect = q.correctAnswer === optKey;
                        return (
                          <div
                            key={optKey}
                            onClick={() => handleChangeAnswerKey(idx, optKey)}
                            className={`p-2 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                              isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-bold shadow-xs'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {optKey}
                              </span>
                              <span className="truncate">{q.options[optKey]}</span>
                            </div>
                            {isCorrect && (
                              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                <span>✓</span>
                                <span className="hidden sm:inline">Answer</span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* AI Explanation note */}
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      💡 <b>Curriculum Note:</b> {q.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              sound.playClick(400);
              if (activeStep === 'preview') {
                setActiveStep('compose');
              } else {
                onClose();
              }
            }}
            className="px-4 py-2 rounded-xl text-xs font-extrabold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 cursor-pointer transition-all"
          >
            {activeStep === 'preview' ? '← Back to Editor' : 'Cancel'}
          </button>

          <div className="flex items-center gap-2">
            {activeStep === 'compose' ? (
              <button
                type="button"
                onClick={handleRunAiDetection}
                disabled={!rawText.trim()}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer shadow-md disabled:opacity-50"
              >
                Next: AI Preview →
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePushToLearners}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer shadow-md flex items-center gap-1.5 transition-all"
              >
                <span>🚀 Push to {targetGrade} Learners</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
