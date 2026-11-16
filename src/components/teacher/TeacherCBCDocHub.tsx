import React, { useState, useEffect } from 'react';
import {
  SchemeOfWorkItem,
  LessonPlanItem,
  LessonNoteItem,
  RecordOfWorkItem,
  TeacherCATUploadItem,
  CATExaminationResult,
  CATGeneratedDraft,
  CATQuestionItem,
} from '../../types/cbcDocuments';
import {
  CBC_SYLLABUS_TOPICS,
  generateCBCSchemeOfWork,
  generateCBCLessonPlan,
} from '../../data/cbcCurriculumData';
import { ecosystemSync } from '../../utils/ecosystemSync';
import {
  readUploadedDocument,
  formatFileSize,
  AttachedDocument,
} from '../../utils/documentReader';
import { sound } from '../../utils/sound';
import { DocumentReaderModal } from '../DocumentReaderModal';
import { KICD_PAST_PAPERS_COLLECTION, KICDPastPaper } from '../../data/kicdPastPapersData';
import { TeacherPushHomeworkModal } from './TeacherPushHomeworkModal';
import { getPushedAssignments, PushedCATAssignment } from '../../utils/aiQuestionParser';

interface TeacherCBCDocHubProps {
  teacherId: string;
  teacherName: string;
  myClasses: Array<{ grade: string; subject: string }>;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  isDark?: boolean;
  initialTab?: 'upload_cat' | 'pushed_cats' | 'kicd_bank' | 'schemes' | 'lesson_plans' | 'notes' | 'records';
}

export const TeacherCBCDocHub: React.FC<TeacherCBCDocHubProps> = ({
  teacherId,
  teacherName,
  myClasses,
  onClose,
  onShowToast,
  isDark = false,
  initialTab = 'upload_cat',
}) => {
  const [activeTab, setActiveTab] = useState<'upload_cat' | 'pushed_cats' | 'kicd_bank' | 'schemes' | 'lesson_plans' | 'notes' | 'records'>(initialTab);
  const [showPushModal, setShowPushModal] = useState(false);
  const [pushedAssignmentsList, setPushedAssignmentsList] = useState<PushedCATAssignment[]>(() => getPushedAssignments());
  const [viewingKICDPaper, setViewingKICDPaper] = useState<KICDPastPaper | null>(null);

  useEffect(() => {
    const handleUpdate = () => setPushedAssignmentsList(getPushedAssignments());
    window.addEventListener('lra-pushed-assignments-updated', handleUpdate);
    return () => window.removeEventListener('lra-pushed-assignments-updated', handleUpdate);
  }, []);

  // Eco state
  const eco = ecosystemSync.getState();
  const [cats, setCats] = useState<TeacherCATUploadItem[]>(eco.teacherCATs || []);
  const [schemes, setSchemes] = useState<SchemeOfWorkItem[]>(eco.cbcSchemes || []);
  const [lessonPlans, setLessonPlans] = useState<LessonPlanItem[]>(eco.cbcLessonPlans || []);
  const [lessonNotes, setLessonNotes] = useState<LessonNoteItem[]>(eco.cbcLessonNotes || []);
  const [recordsOfWork, setRecordsOfWork] = useState<RecordOfWorkItem[]>(eco.cbcRecordsOfWork || []);

  // Selected class for generation / filtering
  const defaultCls = myClasses[0] || { grade: 'Grade 4', subject: 'Mathematics' };
  const [selGrade, setSelGrade] = useState<string>(defaultCls.grade);
  const [selSubject, setSelSubject] = useState<string>(defaultCls.subject);
  const [selTerm, setSelTerm] = useState<'Term 1' | 'Term 2' | 'Term 3'>('Term 3');

  // Upload CAT form state
  const [catTitle, setCatTitle] = useState('');
  const [catKind, setCatKind] = useState<'CAT' | 'Assignment'>('CAT');
  const [catStrand, setCatStrand] = useState('Numbers');
  const [catSubStrand, setCatSubStrand] = useState('Fractions & Decimals');
  const [catDueDate, setCatDueDate] = useState('Friday, 2:00 PM');
  const [catTotalMarks, setCatTotalMarks] = useState(10);
  const [catQuestionsCount, setCatQuestionsCount] = useState(10);
  const [catInstructions, setCatInstructions] = useState('Solve all questions neatly. Parents please supervise and sign upon completion.');
  const [catDocs, setCatDocs] = useState<AttachedDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [whatsappShareModal, setWhatsappShareModal] = useState<TeacherCATUploadItem | null>(null);

  // Document Reader modal state
  const [readingDoc, setReadingDoc] = useState<AttachedDocument | null>(null);

  // AI Examination state
  const [isExaminingDoc, setIsExaminingDoc] = useState(false);
  const [examinationResult, setExaminationResult] = useState<CATExaminationResult | null>(null);
  const [examinedDocName, setExaminedDocName] = useState('');

  // AI CAT Generation & Teacher Approval state
  const [isGeneratingCat, setIsGeneratingCat] = useState(false);
  const [pendingApprovalDraft, setPendingApprovalDraft] = useState<CATGeneratedDraft | null>(null);
  const [draftAttachedDocs, setDraftAttachedDocs] = useState<AttachedDocument[]>([]);

  // View full question paper & marking key modal
  const [viewingCATDetail, setViewingCATDetail] = useState<TeacherCATUploadItem | null>(null);

  // New Note state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteStrand, setNoteStrand] = useState('Numbers');
  const [noteSubStrand, setNoteSubStrand] = useState('Fractions');
  const [noteContent, setNoteContent] = useState('');
  const [noteExamples, setNoteExamples] = useState('');
  const [noteExercises, setNoteExercises] = useState('');
  const [showNewNoteForm, setShowNewNoteForm] = useState(false);

  // View item detail modals
  const [viewingScheme, setViewingScheme] = useState<SchemeOfWorkItem | null>(null);
  const [viewingPlan, setViewingPlan] = useState<LessonPlanItem | null>(null);

  // Available strands for currently selected subject
  const currentSubjectTopics = CBC_SYLLABUS_TOPICS.filter((t) => t.subject === selSubject);

  // Handle uploading CAT file
  const handleUploadCATFile = async (file: File) => {
    setIsUploading(true);
    sound.playClick(400);
    try {
      const doc = await readUploadedDocument(file);
      setCatDocs((prev) => [...prev, doc]);
      if (!catTitle) {
        const cleanName = doc.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setCatTitle(`${cleanName} (${catKind})`);
      }
      sound.playCompleteChime();
      onShowToast(`Uploaded ${doc.name} (${doc.ext})`);
    } catch (e: any) {
      onShowToast(`Upload failed: ${e.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // AI Document Examination
  const handleExamineDocument = async (doc: AttachedDocument) => {
    setIsExaminingDoc(true);
    setExaminedDocName(doc.name);
    sound.playClick(600);
    try {
      const res = await fetch('/api/ai/examine-cat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: doc.extractedText || doc.name,
          title: doc.name,
          grade: selGrade,
          subject: selSubject,
          strand: catStrand,
        }),
      });
      const data = await res.json();
      if (data.examination) {
        setExaminationResult(data.examination);
        sound.playCompleteChime();
        onShowToast(`✓ Examination Complete: Quality Score ${data.examination.qualityScore}/100`);
      } else {
        throw new Error(data.error || 'Failed to examine document');
      }
    } catch (err: any) {
      onShowToast(`Examination notice: ${err.message}`);
    } finally {
      setIsExaminingDoc(false);
    }
  };

  // AI Generate CAT from uploaded document or topic
  const handleGenerateCAT = async (doc?: AttachedDocument) => {
    setIsGeneratingCat(true);
    sound.playClick(600);
    const targetDoc = doc || catDocs[0];
    try {
      const res = await fetch('/api/ai/generate-cat-from-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: targetDoc?.extractedText || '',
          title: targetDoc?.name || `${selGrade} ${selSubject} Curriculum Module`,
          grade: selGrade,
          subject: selSubject,
          strand: catStrand,
          subStrand: catSubStrand,
          questionsCount: catQuestionsCount,
          totalMarks: catTotalMarks,
          teacherName,
        }),
      });
      const data = await res.json();
      if (data.catDraft) {
        setPendingApprovalDraft(data.catDraft);
        setDraftAttachedDocs(targetDoc ? [targetDoc] : catDocs);
        sound.playCompleteChime();
        onShowToast(`✓ AI Draft ready! Review questions and approve before publishing.`);
      } else {
        throw new Error(data.error || 'Failed to generate assessment draft');
      }
    } catch (err: any) {
      onShowToast(`Generation notice: ${err.message}`);
    } finally {
      setIsGeneratingCat(false);
    }
  };

  // Teacher Reviews & Officially Approves the CAT Draft
  const handleApproveAndPublishDraft = () => {
    if (!pendingApprovalDraft) return;
    sound.playClick(500);

    const newCat: TeacherCATUploadItem = {
      id: `cat_${Date.now()}`,
      teacherId,
      teacherName,
      cls: `${pendingApprovalDraft.grade}|${pendingApprovalDraft.subject}`,
      grade: pendingApprovalDraft.grade,
      subject: pendingApprovalDraft.subject,
      strand: pendingApprovalDraft.strand,
      subStrand: pendingApprovalDraft.subStrand,
      title: pendingApprovalDraft.title,
      kind: catKind,
      dueDate: catDueDate.trim(),
      totalMarks: pendingApprovalDraft.totalMarks,
      questionsCount: pendingApprovalDraft.questions.length,
      instructions: pendingApprovalDraft.instructions,
      documents: draftAttachedDocs,
      status: 'published',
      publishedAt: 'Approved by Tr. ' + teacherName,
      sharedWithParents: true,
      whatsappMessage:
        pendingApprovalDraft.whatsappAlert ||
        `*LITTLE ROSES ACADEMY — ASSESSMENT ALERT* 🌹\nDear ${pendingApprovalDraft.grade} Parents,\nTr. ${teacherName} has verified and published *${pendingApprovalDraft.title}* (${catKind}) online.\n\n📚 *Subject:* ${pendingApprovalDraft.subject} (Strand: ${pendingApprovalDraft.strand})\n⏱ *Due Date:* ${catDueDate}\n💯 *Max Marks:* ${pendingApprovalDraft.totalMarks} Marks\n📝 *Instructions:* ${pendingApprovalDraft.instructions}\n\nPlease check Parent and Learner Portals.\n_Much from Little · Little Roses Academy_`,
      learnerSubmissionsCount: 0,
      questions: pendingApprovalDraft.questions,
      markingGuide: pendingApprovalDraft.markingGuide,
      approvedByTeacher: true,
      aiExamined: true,
      aiQualityScore: examinationResult?.qualityScore || 94,
    };

    ecosystemSync.publishTeacherCAT(newCat);
    setCats((prev) => [newCat, ...prev.filter((c) => c.id !== newCat.id)]);
    sound.playCompleteChime();
    onShowToast(`✓ ${catKind} approved by Tr. ${teacherName} & published to Parents!`);
    setPendingApprovalDraft(null);
    setWhatsappShareModal(newCat);

    // Reset standard form if needed
    setCatTitle('');
    setCatDocs([]);
  };

  // Direct Teacher Manual Upload & Publish (Without AI draft)
  const handlePublishCAT = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catTitle.trim()) {
      onShowToast('Please enter an assessment title');
      return;
    }

    const newCat: TeacherCATUploadItem = {
      id: `cat_${Date.now()}`,
      teacherId,
      teacherName,
      cls: `${selGrade}|${selSubject}`,
      grade: selGrade,
      subject: selSubject,
      strand: catStrand,
      subStrand: catSubStrand,
      title: catTitle.trim(),
      kind: catKind,
      dueDate: catDueDate.trim(),
      totalMarks: catTotalMarks,
      questionsCount: catQuestionsCount,
      instructions: catInstructions.trim(),
      documents: catDocs,
      status: 'published',
      publishedAt: 'Tr. ' + teacherName,
      sharedWithParents: true,
      whatsappMessage: `*LITTLE ROSES ACADEMY — ASSESSMENT ALERT* 🌹\nDear ${selGrade} Parents,\nTr. ${teacherName} has uploaded *${catTitle}* (${catKind}) online.\n\n📚 *Subject:* ${selSubject} (Strand: ${catStrand})\n⏱ *Due Date:* ${catDueDate}\n💯 *Max Score:* ${catTotalMarks} Marks\n📝 *Instructions:* ${catInstructions}\n\nQuestions paper and revision notes are now accessible on the Parent and Learner Portals.\n_Much from Little · Little Roses Academy_`,
      learnerSubmissionsCount: 0,
      approvedByTeacher: true,
    };

    ecosystemSync.publishTeacherCAT(newCat);
    setCats((prev) => [newCat, ...prev.filter((c) => c.id !== newCat.id)]);
    sound.playCompleteChime();
    onShowToast(`✓ ${catKind} published online to Parents & Focus Zone!`);
    setWhatsappShareModal(newCat);

    // Reset form
    setCatTitle('');
    setCatDocs([]);
  };

  // 1-Click Generate Scheme of Work
  const handleGenerateScheme = () => {
    sound.playClick(500);
    const newScheme = generateCBCSchemeOfWork(selGrade, selSubject, selTerm, teacherId, teacherName);
    ecosystemSync.saveCBCScheme(newScheme);
    setSchemes((prev) => [newScheme, ...prev]);
    sound.playCompleteChime();
    onShowToast(`Generated full 12-week Scheme of Work for ${selGrade} ${selSubject}!`);
    setViewingScheme(newScheme);
  };

  // 1-Click Generate Lesson Plan
  const handleGenerateLessonPlan = (topic?: (typeof CBC_SYLLABUS_TOPICS)[0]) => {
    sound.playClick(500);
    const targetTopic = topic || currentSubjectTopics[0] || CBC_SYLLABUS_TOPICS[0];
    const newPlan = generateCBCLessonPlan(selGrade, selSubject, targetTopic, teacherId, teacherName);
    ecosystemSync.saveCBCLessonPlan(newPlan);
    setLessonPlans((prev) => [newPlan, ...prev]);
    sound.playCompleteChime();
    onShowToast(`Generated CBC Lesson Plan for ${targetTopic.subStrand}!`);
    setViewingPlan(newPlan);
  };

  // Save new lesson note to Focus Zone
  const handleSaveLessonNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) {
      onShowToast('Please provide both title and notes content');
      return;
    }

    const newNote: LessonNoteItem = {
      id: `note_${Date.now()}`,
      teacherId,
      teacherName,
      grade: selGrade,
      subject: selSubject,
      strand: noteStrand,
      subStrand: noteSubStrand,
      title: noteTitle.trim(),
      content: noteContent.trim(),
      workedExamples: noteExamples.trim(),
      learnerExercises: noteExercises.trim(),
      publishedToFocusZone: true,
      publishedAt: 'Just now',
    };

    ecosystemSync.saveCBCLessonNote(newNote);
    setLessonNotes((prev) => [newNote, ...prev]);
    sound.playCompleteChime();
    onShowToast(`✓ Saved & published directly to Learner Focus Zone!`);
    setShowNewNoteForm(false);
    setNoteTitle('');
    setNoteContent('');
    setNoteExamples('');
    setNoteExercises('');
  };

  // Quick WhatsApp Share URL builder
  const getWhatsAppShareUrl = (cat: TeacherCATUploadItem) =>
    `https://wa.me/?text=${encodeURIComponent(cat.whatsappMessage)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div
        className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-[#0F172A] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* HEADER */}
        <div className="p-3 sm:p-5 bg-gradient-to-r from-[#1E3A8A] via-[#1D4ED8] to-[#2563EB] text-white flex flex-wrap items-center justify-between gap-2.5 shrink-0 shadow-md">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <span className="text-xl sm:text-3xl shrink-0">📚</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-lg font-black tracking-tight leading-snug">
                  CBC Professional Documents & Online Assessment Hub
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/25 whitespace-nowrap">
                  Official CBC Suite
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-blue-100 mt-0.5 line-clamp-2">
                Upload & examine CATs, AI assessment creator with teacher approval, Schemes, Plans & Focus Zone notes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => {
                sound.playClick(600);
                setShowPushModal(true);
              }}
              className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
            >
              <span>⚡ Push Homework / CAT</span>
            </button>

            <button
              onClick={() => {
                sound.playClick(400);
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer shrink-0"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className={`flex border-b overflow-x-auto text-xs font-bold shrink-0 ${isDark ? 'border-white/10 bg-slate-900/60' : 'border-slate-200 bg-slate-50'}`}>
          <button
            onClick={() => {
              sound.playClick(400);
              setActiveTab('kicd_bank');
            }}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'kicd_bank'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>🇰🇪 KICD Past Papers & Model Bank</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200 font-mono">
              G1–G6
            </span>
          </button>

          <button
            onClick={() => {
              sound.playClick(400);
              setActiveTab('pushed_cats');
            }}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'pushed_cats'
                ? 'border-orange-500 text-orange-600 bg-orange-50/50 dark:bg-orange-950/30 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>⚡ Pushed Homework & Automated CATs</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200">
              {pushedAssignmentsList.length}
            </span>
          </button>

          <button
            onClick={() => {
              sound.playClick(400);
              setActiveTab('upload_cat');
            }}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'upload_cat'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-950/30 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>📤 Upload & Send CAT to Parents</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
              {cats.length}
            </span>
          </button>

          <button
            onClick={() => {
              sound.playClick(400);
              setActiveTab('schemes');
            }}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'schemes'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-950/30 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>📋 Schemes of Work</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {schemes.length}
            </span>
          </button>

          <button
            onClick={() => {
              sound.playClick(400);
              setActiveTab('lesson_plans');
            }}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'lesson_plans'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-950/30 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>📝 Lesson Plans</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {lessonPlans.length}
            </span>
          </button>

          <button
            onClick={() => {
              sound.playClick(400);
              setActiveTab('notes');
            }}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'notes'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-950/30 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>📖 Lesson Notes (Focus Zone)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {lessonNotes.length}
            </span>
          </button>

          <button
            onClick={() => {
              sound.playClick(400);
              setActiveTab('records');
            }}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'records'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-950/30 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>✍️ Records of Work Covered</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {recordsOfWork.length}
            </span>
          </button>
        </div>

        {/* CLASS & SUBJECT BAR */}
        <div className={`p-3 px-5 flex flex-wrap items-center justify-between gap-3 text-xs border-b ${isDark ? 'border-white/10 bg-slate-900/40' : 'border-slate-100 bg-slate-50/80'}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-bold">Target Grade & Subject:</span>
            <select
              value={selGrade}
              onChange={(e) => setSelGrade(e.target.value)}
              className={`p-1.5 px-2.5 rounded-lg border font-bold ${
                isDark ? 'bg-slate-800 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            <select
              value={selSubject}
              onChange={(e) => {
                setSelSubject(e.target.value);
                const firstTopic = CBC_SYLLABUS_TOPICS.find((t) => t.subject === e.target.value);
                if (firstTopic) {
                  setCatStrand(firstTopic.strand);
                  setCatSubStrand(firstTopic.subStrand);
                }
              }}
              className={`p-1.5 px-2.5 rounded-lg border font-bold ${
                isDark ? 'bg-slate-800 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              {[
                'Mathematics',
                'Science & Technology',
                'English',
                'Kiswahili',
                'Social Studies',
                'Agriculture & Nutrition',
                'Creative Arts',
                'CRE',
              ].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={selTerm}
              onChange={(e) => setSelTerm(e.target.value as any)}
              className={`p-1.5 px-2.5 rounded-lg border font-bold ${
                isDark ? 'bg-slate-800 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3 (Active)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>Teacher: <strong className="text-blue-500 font-bold">{teacherName}</strong></span>
          </div>
        </div>

        {/* TAB CONTENTS (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB: KICD PAST PAPER & REVISION BANK */}
          {activeTab === 'kicd_bank' && (
            <div className="space-y-5 animate-fade-in">
              {/* Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🇰🇪</span>
                  <div>
                    <h3 className="text-sm sm:text-base font-black">
                      KICD Curriculum Assessment & Past Paper Repository
                    </h3>
                    <p className="text-xs text-indigo-200 mt-0.5">
                      Standardized model assessment papers for Grades 1 to 6 with marking guides & instant CAT adoption
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(600);
                    setShowPushModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0 transition-all active:scale-95"
                >
                  <span>⚡ Push Custom CAT</span>
                </button>
              </div>

              {/* Papers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {KICD_PAST_PAPERS_COLLECTION.map((paper) => (
                  <div
                    key={paper.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isDark ? 'bg-slate-900/90 border-white/10' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                        Grade {paper.grade} &bull; {paper.subject}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        {paper.term} ({paper.year})
                      </span>
                    </div>

                    <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white mb-1 leading-snug">
                      {paper.title}
                    </h4>

                    <p className="text-[11.5px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                      {paper.description}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mb-3 pt-2 border-t border-slate-100 dark:border-white/5">
                      <span>⏱ {paper.timeAllowed}</span>
                      <span>📝 {paper.totalQuestions} ABCD Questions</span>
                      <span>✓ Official Scheme</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick(500);
                          setViewingKICDPaper(paper);
                        }}
                        className="flex-1 py-1.5 px-3 rounded-xl border border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-bold transition-all cursor-pointer text-center"
                      >
                        Preview Paper & Key
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick(600);
                          setShowPushModal(true);
                        }}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer text-center"
                      >
                        Push to Class ↗
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: PUSHED HOMEWORK & AUTOMATED CATS */}
          {activeTab === 'pushed_cats' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                <div>
                  <h3 className="text-sm sm:text-base font-black flex items-center gap-2">
                    <span>⚡ Pushed Homework & Automated CATs</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-mono font-bold">
                      Auto-fills Assessment Book
                    </span>
                  </h3>
                  <p className="text-xs text-orange-100 mt-0.5">
                    Questions with ABCD choices pushed to learners. When submitted, scores and rubrics automatically populate the Assessment Book and Terminal Report!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(600);
                    setShowPushModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-black text-white font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer shrink-0 transition-all active:scale-95"
                >
                  <span>＋ Push New CAT / Homework</span>
                </button>
              </div>

              {pushedAssignmentsList.length === 0 ? (
                <div className={`p-8 text-center rounded-2xl border ${isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'}`}>
                  <div className="text-3xl mb-2">⚡</div>
                  <div className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                    No Pushed CATs Broadcast Yet
                  </div>
                  <div className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Click "Push New CAT / Homework" to type questions with ABCD choices. AI will auto-detect answers and push them to learners!
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPushModal(true)}
                    className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                  >
                    Create First Pushed CAT
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {pushedAssignmentsList.map((cat) => {
                    const completedKeys = Object.keys(cat.completedByLearners || {});
                    return (
                      <div
                        key={cat.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-orange-500/20 text-orange-600 dark:text-orange-400">
                              {cat.targetGrade}
                            </span>
                            <span className="text-xs font-bold text-slate-400">&bull;</span>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                              {cat.subject}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                              ✓ Auto-Recorded to Assessment Book
                            </span>
                          </div>

                          <span className="text-[11px] font-mono text-slate-400">
                            Due: {cat.dueDate}
                          </span>
                        </div>

                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mb-1">
                          {cat.title}
                        </h4>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
                          <span>Educator: <b>{cat.teacherName}</b></span>
                          <span>&bull;</span>
                          <span>Questions: <b>{cat.questions.length} (ABCD MCQs)</b></span>
                          <span>&bull;</span>
                          <span>Max Marks: <b>{cat.totalMarks}</b></span>
                          <span>&bull;</span>
                          <span>Submissions: <b className="text-emerald-600 font-mono font-bold">{completedKeys.length} Learner(s)</b></span>
                        </div>

                        {/* Completed learners summary */}
                        {completedKeys.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/30 text-xs mb-3 space-y-1">
                            <div className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                              <span>Learner Submissions (Auto-Graded):</span>
                              <span className="text-[10px] text-emerald-600">Sync Active</span>
                            </div>
                            <div className="space-y-1">
                              {completedKeys.map((adm) => {
                                const entry = cat.completedByLearners![adm];
                                return (
                                  <div key={adm} className="flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300">
                                    <span>Adm: <b>{adm}</b> (Faith Wanjiku)</span>
                                    <span className="font-mono font-bold">
                                      Score: {entry.score}/{entry.total} ({entry.percentage}%) &bull; Band: {entry.band}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                          <button
                            type="button"
                            onClick={() => {
                              sound.playClick(400);
                              onShowToast(`Viewing ${cat.questions.length} questions for "${cat.title}"`);
                            }}
                            className="px-3 py-1 rounded-xl border border-slate-200 dark:border-white/20 text-slate-600 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                          >
                            View Questions
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 1: UPLOAD & SEND CAT ONLINE TO PARENTS */}
          {activeTab === 'upload_cat' && (
            <div className="space-y-6">
              {/* Form Card */}
              <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-sm font-extrabold flex items-center gap-2">
                      <span>📤 Upload Assessment / CAT Online</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                        Instant Parent Alert + WhatsApp Ready
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload PDF/Word question papers, have AI examine curriculum quality, or auto-generate CBC CATs with teacher approval.
                    </p>
                  </div>

                  {/* 1-Click AI Generate CAT draft button */}
                  <button
                    type="button"
                    onClick={() => handleGenerateCAT()}
                    disabled={isGeneratingCat}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>🤖✨</span>
                    <span>{isGeneratingCat ? 'Generating CAT…' : `AI Create CAT for ${selSubject}`}</span>
                  </button>
                </div>

                <form onSubmit={handlePublishCAT} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Assessment Type
                      </label>
                      <div className="flex rounded-xl overflow-hidden border border-slate-300 dark:border-white/20 p-0.5">
                        <button
                          type="button"
                          onClick={() => setCatKind('CAT')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                            catKind === 'CAT'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                          }`}
                        >
                          Continuous Assessment Test (CAT)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCatKind('Assignment')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                            catKind === 'Assignment'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                          }`}
                        >
                          Homework / Assignment
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Assessment Title
                      </label>
                      <input
                        type="text"
                        value={catTitle}
                        onChange={(e) => setCatTitle(e.target.value)}
                        placeholder="e.g. Fractions & Decimals CAT 1 (Term 3)"
                        className={`w-full p-2.5 rounded-xl border text-xs ${
                          isDark ? 'bg-slate-800 border-white/20 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Curriculum Strand (Focus Zone Link)
                      </label>
                      <input
                        type="text"
                        value={catStrand}
                        onChange={(e) => setCatStrand(e.target.value)}
                        placeholder="e.g. Numbers, Living Things"
                        className={`w-full p-2.5 rounded-xl border text-xs ${
                          isDark ? 'bg-slate-800 border-white/20 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Sub-Strand / Topic
                      </label>
                      <input
                        type="text"
                        value={catSubStrand}
                        onChange={(e) => setCatSubStrand(e.target.value)}
                        placeholder="e.g. Fractions Addition"
                        className={`w-full p-2.5 rounded-xl border text-xs ${
                          isDark ? 'bg-slate-800 border-white/20 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Due Date & Time
                      </label>
                      <input
                        type="text"
                        value={catDueDate}
                        onChange={(e) => setCatDueDate(e.target.value)}
                        placeholder="e.g. Friday, 2:00 PM"
                        className={`w-full p-2.5 rounded-xl border text-xs ${
                          isDark ? 'bg-slate-800 border-white/20 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Total Marks
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={catTotalMarks}
                        onChange={(e) => setCatTotalMarks(parseInt(e.target.value, 10) || 10)}
                        className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold ${
                          isDark ? 'bg-slate-800 border-white/20 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Questions Count
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={catQuestionsCount}
                        onChange={(e) => setCatQuestionsCount(parseInt(e.target.value, 10) || 10)}
                        className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold ${
                          isDark ? 'bg-slate-800 border-white/20 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Instructions for Parents & Learners
                    </label>
                    <textarea
                      value={catInstructions}
                      onChange={(e) => setCatInstructions(e.target.value)}
                      rows={2}
                      className={`w-full p-2.5 rounded-xl border text-xs ${
                        isDark ? 'bg-slate-800 border-white/20 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Document Upload & AI Reader / Examiner Area */}
                  <div className="space-y-2 p-3.5 rounded-2xl border border-dashed border-blue-400/50 bg-blue-50/20 dark:bg-blue-950/20">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-bold flex items-center gap-2">
                        <span>📎 Attach Question Paper / Resource</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold">
                          PDF · Word .docx · TXT
                        </span>
                      </div>
                      <label className="px-3 py-1 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs">
                        <span>＋ Upload File</span>
                        <input
                          type="file"
                          accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadCATFile(file);
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {isUploading && (
                      <div className="text-xs text-blue-500 flex items-center gap-2 py-1">
                        <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span>Extracting document text and metadata…</span>
                      </div>
                    )}

                    {catDocs.length > 0 && (
                      <div className="space-y-2 pt-2">
                        {catDocs.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-600">
                                {doc.ext}
                              </span>
                              <span className="text-xs font-bold truncate max-w-[200px]">{doc.name}</span>
                              <span className="text-[10px] text-slate-400">({formatFileSize(doc.size)} • {doc.wordCount} words)</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Read Document */}
                              <button
                                type="button"
                                onClick={() => {
                                  sound.playClick(400);
                                  setReadingDoc(doc);
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 cursor-pointer flex items-center gap-1"
                              >
                                <span>📖</span>
                                <span>Read Doc</span>
                              </button>

                              {/* AI Examine Content */}
                              <button
                                type="button"
                                onClick={() => handleExamineDocument(doc)}
                                disabled={isExaminingDoc}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 cursor-pointer flex items-center gap-1 disabled:opacity-50"
                              >
                                <span>🤖🔍</span>
                                <span>{isExaminingDoc && examinedDocName === doc.name ? 'Examining…' : 'AI Examine Quality'}</span>
                              </button>

                              {/* AI Generate CAT from this Doc */}
                              <button
                                type="button"
                                onClick={() => handleGenerateCAT(doc)}
                                disabled={isGeneratingCat}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer flex items-center gap-1 shadow-xs disabled:opacity-50"
                              >
                                <span>✨⚡</span>
                                <span>AI CAT Draft</span>
                              </button>

                              {/* Remove */}
                              <button
                                type="button"
                                onClick={() => setCatDocs((prev) => prev.filter((d) => d.id !== doc.id))}
                                className="text-xs text-rose-500 hover:text-rose-600 p-1 font-bold ml-1 cursor-pointer"
                                title="Remove file"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-3 px-4 rounded-xl font-black text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg cursor-pointer flex items-center justify-center gap-2 transition-all"
                    >
                      <span>🚀 Publish CAT Directly to Parents & Focus Zone</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Published CATs List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold flex items-center gap-2">
                    <span>Active Online CATs & Assignments</span>
                    <span className="text-xs text-slate-500 font-normal">({cats.length} currently active)</span>
                  </h3>
                  <span className="text-xs text-slate-400">Synchronized across Parents & Focus Zone</span>
                </div>

                {cats.length === 0 ? (
                  <div className="p-8 text-center border rounded-2xl text-slate-400 text-xs">
                    No active assessments uploaded yet. Upload a question paper or use the AI CAT generator above.
                  </div>
                ) : (
                  cats.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200 shadow-xs'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                item.kind === 'CAT'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              }`}
                            >
                              {item.kind}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-400">
                              {item.grade} · {item.subject}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                              <span>✓</span>
                              <span>Teacher Approved & Published</span>
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1">
                            {item.title}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Strand: <strong>{item.strand}</strong> ({item.subStrand || 'Core'}) · Total: <strong>{item.totalMarks} Marks</strong> ({item.questionsCount} questions) · Due: <strong className="text-blue-500">{item.dueDate}</strong> · {item.publishedAt}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* View Question Paper & Marking Key */}
                          <button
                            type="button"
                            onClick={() => {
                              sound.playClick(400);
                              setViewingCATDetail(item);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center gap-1.5 border border-blue-200 dark:border-blue-800 cursor-pointer"
                          >
                            <span>📄</span>
                            <span>Questions & Marking Scheme</span>
                          </button>

                          {/* WhatsApp Share */}
                          <a
                            href={getWhatsAppShareUrl(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => sound.playClick(500)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <span>💬 Send on WhatsApp</span>
                          </a>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => {
                              sound.playClick(400);
                              ecosystemSync.deleteTeacherCAT(item.id);
                              setCats((prev) => prev.filter((c) => c.id !== item.id));
                              onShowToast('Assessment deleted');
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                            title="Delete Assessment"
                          >
                            🗑
                          </button>
                        </div>
                      </div>

                      {item.documents && item.documents.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-400">Attached files:</span>
                          {item.documents.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => {
                                sound.playClick(400);
                                setReadingDoc(d);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40 cursor-pointer"
                            >
                              <span>📄</span>
                              <span>{d.name}</span>
                              <span className="text-[9px] opacity-75">({d.ext})</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SCHEMES OF WORK */}
          {activeTab === 'schemes' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/20">
                <div>
                  <h3 className="text-sm font-black">CBC Schemes of Work Management</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generate or customize 14-week termly schemes with outcomes, inquiry questions, resources and assessment.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateScheme}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <span>⚡ 1-Click Generate Term Scheme ({selGrade} {selSubject})</span>
                </button>
              </div>

              <div className="space-y-3">
                {schemes.map((scheme) => (
                  <div
                    key={scheme.id}
                    className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-500">
                            {scheme.term} · {scheme.year}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 font-bold">
                            ✓ HOD Approved
                          </span>
                        </div>
                        <h4 className="text-sm font-black mt-1">
                          {scheme.grade} {scheme.subject} Scheme of Work
                        </h4>
                        <p className="text-xs text-slate-500">
                          {scheme.rows.length} total lessons mapped across 12-14 weeks · Educator: {scheme.teacherName}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick(400);
                            setViewingScheme(scheme);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
                        >
                          View Table & Print
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick(400);
                            ecosystemSync.deleteCBCDocument('scheme', scheme.id);
                            setSchemes((prev) => prev.filter((s) => s.id !== scheme.id));
                            onShowToast('Scheme deleted');
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: LESSON PLANS */}
          {activeTab === 'lesson_plans' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/20">
                <div>
                  <h3 className="text-sm font-black">CBC Daily Lesson Plans (5-Step Structure)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Covers Introduction (5m), Step 1-3 Development (30m), Conclusion (5m), and Self-Reflection.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleGenerateLessonPlan()}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <span>⚡ 1-Click Generate Plan for {selSubject}</span>
                </button>
              </div>

              <div className="space-y-3">
                {lessonPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-mono font-bold text-purple-500">
                          {plan.grade} · {plan.subject} · {plan.time}
                        </div>
                        <h4 className="text-sm font-black mt-1">
                          {plan.strand}: {plan.subStrand}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Key Inquiry: "{plan.keyInquiryQuestion}"
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick(400);
                            setViewingPlan(plan);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer"
                        >
                          View Full Plan
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick(400);
                            ecosystemSync.deleteCBCDocument('plan', plan.id);
                            setLessonPlans((prev) => prev.filter((p) => p.id !== plan.id));
                            onShowToast('Lesson plan deleted');
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: LESSON NOTES (FEED INTO LEARNER FOCUS ZONE) */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-900/20 to-teal-900/20 border border-emerald-500/20">
                <div>
                  <h3 className="text-sm font-black flex items-center gap-2">
                    <span>📖 Lesson Notes & Focus Zone Feeder</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-black">
                      Direct to Learner Portal
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Any note created or uploaded here immediately appears in the Learner's Focus Zone for that strand!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(400);
                    setShowNewNoteForm(!showNewNoteForm);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <span>{showNewNoteForm ? '✕ Close Form' : '＋ Create New Lesson Note'}</span>
                </button>
              </div>

              {/* New Note Form */}
              {showNewNoteForm && (
                <form
                  onSubmit={handleSaveLessonNote}
                  className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-slate-900 border-white/15' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <h4 className="text-xs font-black uppercase text-emerald-600 tracking-wider">
                    Compose Topic Lesson Notes for Learners
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Note Title
                      </label>
                      <input
                        type="text"
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                        placeholder="e.g. Masterclass on Proper Fractions & Number Lines"
                        className={`w-full p-2.5 rounded-xl border text-xs ${
                          isDark ? 'bg-slate-800 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Strand
                        </label>
                        <input
                          type="text"
                          value={noteStrand}
                          onChange={(e) => setNoteStrand(e.target.value)}
                          className={`w-full p-2.5 rounded-xl border text-xs ${
                            isDark ? 'bg-slate-800 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Sub-Strand
                        </label>
                        <input
                          type="text"
                          value={noteSubStrand}
                          onChange={(e) => setNoteSubStrand(e.target.value)}
                          className={`w-full p-2.5 rounded-xl border text-xs ${
                            isDark ? 'bg-slate-800 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Lesson Notes Body & Concept Explanations
                    </label>
                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      rows={4}
                      placeholder="Explain the topic clearly with definitions, rules, and core concepts for learners to read..."
                      className={`w-full p-2.5 rounded-xl border text-xs ${
                        isDark ? 'bg-slate-800 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Worked Examples (Step-by-step solutions)
                      </label>
                      <textarea
                        value={noteExamples}
                        onChange={(e) => setNoteExamples(e.target.value)}
                        rows={3}
                        placeholder="e.g. Example 1: Add 3/8 + 2/8 = 5/8..."
                        className={`w-full p-2.5 rounded-xl border text-xs ${
                          isDark ? 'bg-slate-800 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Learner Practice Questions
                      </label>
                      <textarea
                        value={noteExercises}
                        onChange={(e) => setNoteExercises(e.target.value)}
                        rows={3}
                        placeholder="1. Solve 4/9 + 3/9 = ?&#10;2. Find equivalent fraction for 1/3..."
                        className={`w-full p-2.5 rounded-xl border text-xs ${
                          isDark ? 'bg-slate-800 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md cursor-pointer"
                  >
                    Save & Broadcast to Learner Focus Zone
                  </button>
                </form>
              )}

              {/* Notes List */}
              <div className="space-y-3">
                {lessonNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-emerald-600">
                            {note.grade} · {note.subject}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                            Live in Focus Zone
                          </span>
                        </div>
                        <h4 className="text-sm font-black mt-1">{note.title}</h4>
                        <p className="text-xs text-slate-500">
                          Strand: {note.strand} ({note.subStrand}) · Updated {note.publishedAt}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick(400);
                          ecosystemSync.deleteCBCDocument('note', note.id);
                          setLessonNotes((prev) => prev.filter((n) => n.id !== note.id));
                          onShowToast('Note removed from Focus Zone');
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        🗑
                      </button>
                    </div>

                    <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-black/30 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto font-sans leading-relaxed">
                      {note.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: RECORDS OF WORK COVERED */}
          {activeTab === 'records' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-500/20">
                <h3 className="text-sm font-black">Official Record of Work Covered</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Maintained for Ministry and TSC quality assurance audits. Log work taught per week and track HOD stamps.
                </p>
              </div>

              <div className="space-y-3">
                {recordsOfWork.map((record) => (
                  <div
                    key={record.id}
                    className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-amber-600">
                            Week {record.week} · Date: {record.date}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                            ✓ {record.hodStatus}
                          </span>
                        </div>
                        <h4 className="text-sm font-black mt-1">
                          {record.grade} {record.subject}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                          <strong>Work Covered:</strong> {record.workCovered}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Learners Present: {record.learnersPresent} / {record.totalLearners} • Remarks: {record.teacherRemarks}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MODAL 1: AI QUALITY EXAMINATION RESULT MODAL                              */}
        {/* ========================================================================= */}
        {examinationResult && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-fade-in">
            <div
              className={`w-full max-w-3xl max-h-[88vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
                isDark ? 'bg-[#0F172A] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm sm:text-base">
                        ✨ AI Content &amp; CBC Curriculum Examination
                      </h3>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/20">
                        Examined: {examinedDocName || 'Resource'}
                      </span>
                    </div>
                    <p className="text-xs text-purple-200 mt-0.5">
                      Quality audit against Kenya KICD Primary Curriculum & Formative Assessment standards
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setExaminationResult(null)}
                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
                {/* Score & Recommendation Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                      {examinationResult.qualityScore}
                    </div>
                    <div>
                      <div className="text-[10.5px] uppercase font-bold text-slate-500">Quality Score</div>
                      <div className="text-xs font-black text-purple-700 dark:text-purple-300">
                        {examinationResult.qualityScore >= 80 ? 'Grade A Assessment' : 'Needs Minor Revision'}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                    <span className="text-2xl">🎯</span>
                    <div>
                      <div className="text-[10.5px] uppercase font-bold text-slate-500">Curriculum Target</div>
                      <div className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                        {examinationResult.detectedGrade} · {examinationResult.detectedStrand}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center gap-3">
                    <span className="text-2xl">🛡️</span>
                    <div>
                      <div className="text-[10.5px] uppercase font-bold text-slate-500">Action Status</div>
                      <div className="text-xs font-black text-blue-700 dark:text-blue-300">
                        {examinationResult.recommendedAction}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Executive Summary */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 space-y-1.5">
                  <h4 className="font-black text-slate-700 dark:text-slate-300 uppercase text-[11px] tracking-wider">
                    Executive Evaluation Summary
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                    {examinationResult.executiveSummary}
                  </p>
                  <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold pt-1">
                    ⚖️ {examinationResult.curriculumAlignment}
                  </p>
                </div>

                {/* Question-by-Question Review */}
                <div className="space-y-2">
                  <h4 className="font-black text-slate-700 dark:text-slate-300 uppercase text-[11px] tracking-wider">
                    Question Items Inspection & Marking Key Verification
                  </h4>
                  <div className="space-y-2">
                    {examinationResult.questionReview.map((q) => (
                      <div
                        key={q.num}
                        className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            Q{q.num} ({q.marks} Mark{q.marks > 1 ? 's' : ''})
                          </span>
                          <div className="flex items-center gap-2">
                            {q.competency && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {q.competency}
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                q.clarity === 'High'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              Clarity: {q.clarity}
                            </span>
                          </div>
                        </div>

                        <div className="text-slate-800 dark:text-slate-200 font-medium">
                          {q.questionText}
                        </div>

                        {q.answerKey && (
                          <div className="text-[11px] p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/40">
                            <strong>Marking Scheme Guide:</strong> {q.answerKey}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strengths & Pedagogical Suggestions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-1">
                    <h5 className="font-bold text-emerald-800 dark:text-emerald-300">✓ Pedagogical Strengths</h5>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-300">
                      {examinationResult.strengths.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-1">
                    <h5 className="font-bold text-amber-800 dark:text-amber-300">💡 Suggestions for Teacher</h5>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-300">
                      {examinationResult.suggestions.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setExaminationResult(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/20 text-xs font-bold"
                >
                  Close Examination
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const doc = catDocs.find((d) => d.name === examinedDocName) || catDocs[0];
                    setExaminationResult(null);
                    handleGenerateCAT(doc);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-black text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <span>⚡ Create CAT Draft for Teacher Approval</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: TEACHER REVIEW & APPROVAL STUDIO FOR AI-GENERATED CAT DRAFTS      */}
        {/* ========================================================================= */}
        {pendingApprovalDraft && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/85 backdrop-blur-xs animate-fade-in">
            <div
              className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
                isDark ? 'bg-[#0F172A] border-amber-500/40 text-white' : 'bg-white border-amber-300 text-slate-900'
              }`}
            >
              {/* Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🛡️</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm sm:text-base">
                        Teacher Review & Approval Studio
                      </h3>
                      <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-white/25 text-white">
                        Pending Teacher Signature
                      </span>
                    </div>
                    <p className="text-xs text-amber-100 mt-0.5">
                      Review, edit, or adjust questions before publishing to parents and the learner's Focus Zone.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setPendingApprovalDraft(null)}
                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Warning Notice Banner */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2 shrink-0">
                <span className="text-base">⚠️</span>
                <span>
                  <strong>Teacher Scrutiny Enforced:</strong> This assessment will NOT be visible to parents or pupils until you verify the questions, answer keys, and click <strong>"Approve & Publish Online"</strong>.
                </span>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
                {/* Meta Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Assessment Title
                    </label>
                    <input
                      type="text"
                      value={pendingApprovalDraft.title}
                      onChange={(e) =>
                        setPendingApprovalDraft({ ...pendingApprovalDraft, title: e.target.value })
                      }
                      className={`w-full p-2 rounded-xl border font-bold text-xs ${
                        isDark ? 'bg-slate-800 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Target Class & Strand
                    </label>
                    <div className="p-2 rounded-xl border bg-white dark:bg-slate-800 text-xs font-bold text-blue-600 dark:text-blue-400">
                      {pendingApprovalDraft.grade} · {pendingApprovalDraft.subject} ({pendingApprovalDraft.strand}: {pendingApprovalDraft.subStrand})
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Due Date & Time
                    </label>
                    <input
                      type="text"
                      value={catDueDate}
                      onChange={(e) => setCatDueDate(e.target.value)}
                      className={`w-full p-2 rounded-xl border text-xs ${
                        isDark ? 'bg-slate-800 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Total Formative Marks (Calculated)
                    </label>
                    <div className="p-2 rounded-xl border bg-white dark:bg-slate-800 text-xs font-mono font-black text-emerald-600">
                      {pendingApprovalDraft.questions.reduce((acc, q) => acc + (q.marks || 1), 0)} Marks ({pendingApprovalDraft.questions.length} Questions)
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Pupil & Parent Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={pendingApprovalDraft.instructions}
                    onChange={(e) =>
                      setPendingApprovalDraft({ ...pendingApprovalDraft, instructions: e.target.value })
                    }
                    className={`w-full p-2.5 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-800 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                {/* Questions Review & Editing List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-slate-800 dark:text-slate-200 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                      <span>📝 Assessment Questions & Expected Solutions</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        (Editable by Tr. {teacherName})
                      </span>
                    </h4>

                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick(400);
                        const newQ: CATQuestionItem = {
                          num: pendingApprovalDraft.questions.length + 1,
                          question: 'New question prompt...',
                          marks: 1,
                          answerKey: 'Expected marking scheme solution',
                          competency: 'Critical Thinking',
                        };
                        setPendingApprovalDraft({
                          ...pendingApprovalDraft,
                          questions: [...pendingApprovalDraft.questions, newQ],
                          totalMarks: pendingApprovalDraft.totalMarks + 1,
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] cursor-pointer"
                    >
                      ＋ Add Question
                    </button>
                  </div>

                  <div className="space-y-3">
                    {pendingApprovalDraft.questions.map((q, qIdx) => (
                      <div
                        key={q.num}
                        className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/40 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-black text-blue-600 dark:text-blue-400 text-xs">
                            Question {qIdx + 1}
                          </span>

                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-bold text-[11px]">Marks:</span>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={q.marks}
                              onChange={(e) => {
                                const newMarks = parseInt(e.target.value, 10) || 1;
                                const updated = [...pendingApprovalDraft.questions];
                                updated[qIdx] = { ...updated[qIdx], marks: newMarks };
                                setPendingApprovalDraft({
                                  ...pendingApprovalDraft,
                                  questions: updated,
                                  totalMarks: updated.reduce((sum, item) => sum + item.marks, 0),
                                });
                              }}
                              className={`w-14 p-1 rounded-lg border font-mono font-bold text-center text-xs ${
                                isDark ? 'bg-slate-800 border-white/20 text-white' : 'bg-white border-slate-300'
                              }`}
                            />

                            <button
                              type="button"
                              onClick={() => {
                                const filtered = pendingApprovalDraft.questions
                                  .filter((_, i) => i !== qIdx)
                                  .map((item, idx) => ({ ...item, num: idx + 1 }));
                                setPendingApprovalDraft({
                                  ...pendingApprovalDraft,
                                  questions: filtered,
                                  totalMarks: filtered.reduce((sum, item) => sum + item.marks, 0),
                                });
                              }}
                              className="text-rose-500 hover:text-rose-600 p-1 font-bold cursor-pointer"
                              title="Delete Question"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* Question Textarea */}
                        <textarea
                          rows={2}
                          value={q.question}
                          onChange={(e) => {
                            const updated = [...pendingApprovalDraft.questions];
                            updated[qIdx] = { ...updated[qIdx], question: e.target.value };
                            setPendingApprovalDraft({ ...pendingApprovalDraft, questions: updated });
                          }}
                          className={`w-full p-2 rounded-xl border text-xs ${
                            isDark ? 'bg-slate-800 border-white/20 text-white' : 'bg-white border-slate-300'
                          }`}
                        />

                        {/* Answer Key / Solution */}
                        <div>
                          <label className="block text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">
                            Expected Answer / Solution (Marking Scheme):
                          </label>
                          <input
                            type="text"
                            value={q.answerKey || ''}
                            onChange={(e) => {
                              const updated = [...pendingApprovalDraft.questions];
                              updated[qIdx] = { ...updated[qIdx], answerKey: e.target.value };
                              setPendingApprovalDraft({ ...pendingApprovalDraft, questions: updated });
                            }}
                            className={`w-full p-1.5 px-2.5 rounded-lg border text-xs text-emerald-800 dark:text-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preformatted WhatsApp Alert Preview */}
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <span>💬 WhatsApp Parent Broadcast Preview</span>
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                      Auto-synced
                    </span>
                  </div>
                  <div className="text-[11px] whitespace-pre-wrap font-sans text-emerald-950 dark:text-emerald-100 bg-white/60 dark:bg-black/30 p-2.5 rounded-xl border border-emerald-500/20 leading-relaxed">
                    {pendingApprovalDraft.whatsappAlert}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setPendingApprovalDraft(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/20 text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  ✕ Discard Draft
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApproveAndPublishDraft}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg cursor-pointer flex items-center gap-2"
                  >
                    <span>✓</span>
                    <span>Approve & Publish to Parents & Focus Zone</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: VIEW PUBLISHED CAT QUESTION PAPER & MARKING SCHEME               */}
        {/* ========================================================================= */}
        {viewingCATDetail && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/85 backdrop-blur-xs animate-fade-in">
            <div
              className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
                isDark ? 'bg-[#0F172A] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="p-4 bg-blue-600 text-white flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm sm:text-base">
                      {viewingCATDetail.title}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20">
                      {viewingCATDetail.kind} · {viewingCATDetail.totalMarks} Marks
                    </span>
                  </div>
                  <p className="text-xs text-blue-100 mt-0.5">
                    {viewingCATDetail.grade} · {viewingCATDetail.subject} (Strand: {viewingCATDetail.strand}) • Verified by {viewingCATDetail.teacherName}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold cursor-pointer"
                  >
                    🖨 Print Paper
                  </button>
                  <button
                    onClick={() => setViewingCATDetail(null)}
                    className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
                {/* Instructions Box */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 space-y-1">
                  <div className="font-bold text-slate-600 dark:text-slate-300">Examination Instructions:</div>
                  <div className="text-slate-800 dark:text-slate-200 font-sans">{viewingCATDetail.instructions}</div>
                  <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-1">Due Date: {viewingCATDetail.dueDate}</div>
                </div>

                {/* Questions List */}
                {viewingCATDetail.questions && viewingCATDetail.questions.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="font-black uppercase text-[11px] text-blue-600 tracking-wider">
                      Question Paper Items & Official Answers
                    </h4>
                    {viewingCATDetail.questions.map((q) => (
                      <div
                        key={q.num}
                        className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-1.5"
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-blue-600">Question {q.num}</span>
                          <span className="text-slate-500">{q.marks} Mark{q.marks > 1 ? 's' : ''}</span>
                        </div>
                        <div className="text-slate-800 dark:text-slate-200 text-sm font-medium">
                          {q.question}
                        </div>
                        {q.answerKey && (
                          <div className="mt-1.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-sans">
                            <strong>Marking Guide:</strong> {q.answerKey}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 border rounded-2xl">
                    Standard question paper uploaded as attached file. Click below to view the attached document.
                  </div>
                )}

                {/* Attached Files */}
                {viewingCATDetail.documents && viewingCATDetail.documents.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
                    <div className="font-bold text-slate-500">Attached Documents & Worksheets:</div>
                    <div className="flex flex-wrap gap-2">
                      {viewingCATDetail.documents.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            sound.playClick(400);
                            setReadingDoc(d);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center gap-1.5 border border-blue-200 cursor-pointer"
                        >
                          <span>📖</span>
                          <span>Open {d.name} ({d.ext})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 4: DOCUMENT READER MODAL                                            */}
        {/* ========================================================================= */}
        {readingDoc && (
          <DocumentReaderModal
            document={readingDoc}
            onClose={() => setReadingDoc(null)}
            assessmentKind={catKind}
            onGenerateCATDraft={(doc) => {
              setReadingDoc(null);
              handleGenerateCAT(doc);
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* MODAL 5: VIEW SCHEME OF WORK DETAIL                                       */}
        {/* ========================================================================= */}
        {viewingScheme && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-fade-in">
            <div
              className={`w-full max-w-4xl max-h-[88vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
                isDark ? 'bg-[#0F172A] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="p-4 bg-blue-600 text-white flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-black text-sm sm:text-base">
                    {viewingScheme.grade} {viewingScheme.subject} — Scheme of Work ({viewingScheme.term})
                  </h3>
                  <p className="text-xs text-blue-100">
                    Official CBC 14-Week Curriculum Matrix • Teacher: {viewingScheme.teacherName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold cursor-pointer"
                  >
                    🖨 Print Scheme
                  </button>
                  <button
                    onClick={() => setViewingScheme(null)}
                    className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b">
                        <th className="p-2 border">Wk/Les</th>
                        <th className="p-2 border">Strand / Sub-strand</th>
                        <th className="p-2 border">Specific Learning Outcomes</th>
                        <th className="p-2 border">Key Inquiry Questions</th>
                        <th className="p-2 border">Learning Experiences</th>
                        <th className="p-2 border">Assessment Methods</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingScheme.rows.slice(0, 25).map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-blue-50/20">
                          <td className="p-2 border font-mono font-bold">W{row.week} L{row.lesson}</td>
                          <td className="p-2 border font-bold text-blue-600">{row.strand} &bull; {row.subStrand}</td>
                          <td className="p-2 border">{row.specificLearningOutcomes}</td>
                          <td className="p-2 border italic text-slate-500">{row.keyInquiryQuestions}</td>
                          <td className="p-2 border">{row.learningExperiences}</td>
                          <td className="p-2 border">{row.assessmentMethods}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 6: VIEW LESSON PLAN DETAIL                                          */}
        {/* ========================================================================= */}
        {viewingPlan && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-fade-in">
            <div
              className={`w-full max-w-2xl max-h-[88vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
                isDark ? 'bg-[#0F172A] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="p-4 bg-purple-600 text-white flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-black text-sm sm:text-base">
                    CBC Daily Lesson Plan: {viewingPlan.subStrand}
                  </h3>
                  <p className="text-xs text-purple-100">
                    {viewingPlan.grade} · {viewingPlan.subject} · Time: {viewingPlan.time}
                  </p>
                </div>
                <button
                  onClick={() => setViewingPlan(null)}
                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                  <div><strong>Educator:</strong> {viewingPlan.teacherName}</div>
                  <div><strong>Roll:</strong> {viewingPlan.roll}</div>
                  <div><strong>Strand:</strong> {viewingPlan.strand}</div>
                  <div><strong>Date:</strong> {viewingPlan.date}</div>
                </div>

                <div>
                  <h4 className="font-black text-purple-600 uppercase text-[11px] mb-1">Specific Learning Outcomes:</h4>
                  <p className="p-2.5 rounded-xl border bg-slate-50 dark:bg-black/20">{viewingPlan.specificLearningOutcomes}</p>
                </div>

                <div>
                  <h4 className="font-black text-purple-600 uppercase text-[11px] mb-1">Key Inquiry Question:</h4>
                  <p className="p-2.5 rounded-xl border bg-slate-50 dark:bg-black/20 italic">"{viewingPlan.keyInquiryQuestion}"</p>
                </div>

                <div>
                  <h4 className="font-black text-purple-600 uppercase text-[11px] mb-1">Step-by-Step Lesson Development:</h4>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl border">
                      <strong>Introduction (5 mins):</strong> {viewingPlan.introduction}
                    </div>
                    {viewingPlan.steps.map((s, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl border space-y-1">
                        <div className="font-bold text-purple-600">{s.step} ({s.duration})</div>
                        <div><strong>Teacher Activity:</strong> {s.teacherActivity}</div>
                        <div><strong>Learner Activity:</strong> {s.learnerActivity}</div>
                      </div>
                    ))}
                    <div className="p-2.5 rounded-xl border">
                      <strong>Conclusion (5 mins):</strong> {viewingPlan.conclusion}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-black text-purple-600 uppercase text-[11px] mb-1">Teacher Self-Reflection:</h4>
                  <p className="p-2.5 rounded-xl border bg-purple-50/50 dark:bg-purple-950/20 italic">{viewingPlan.selfReflection}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 7: WHATSAPP SHARE BROADCAST                                         */}
        {/* ========================================================================= */}
        {whatsappShareModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-fade-in">
            <div
              className={`w-full max-w-md rounded-3xl p-5 border shadow-2xl space-y-4 ${
                isDark ? 'bg-slate-900 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💬</span>
                  <h3 className="font-black text-sm">Broadcast CAT to Parents on WhatsApp</h3>
                </div>
                <button
                  onClick={() => setWhatsappShareModal(null)}
                  className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-950 dark:text-emerald-100 whitespace-pre-wrap font-sans leading-relaxed">
                {whatsappShareModal.whatsappMessage}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setWhatsappShareModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 font-bold text-xs cursor-pointer"
                >
                  Done
                </button>
                <a
                  href={getWhatsAppShareUrl(whatsappShareModal)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    sound.playClick(500);
                    setWhatsappShareModal(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>📲 Open WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 8: PUSH HOMEWORK / CAT BUILDER MODAL                                */}
        {/* ========================================================================= */}
        {showPushModal && (
          <TeacherPushHomeworkModal
            teacherName={teacherName}
            myClasses={myClasses}
            onClose={() => setShowPushModal(false)}
            onSuccess={(cat) => {
              setPushedAssignmentsList((prev) => [cat, ...prev.filter((c) => c.id !== cat.id)]);
              setActiveTab('pushed_cats');
            }}
            onShowToast={onShowToast}
          />
        )}

        {/* ========================================================================= */}
        {/* MODAL 9: VIEW KICD PAST PAPER & MARKING SCHEME                            */}
        {/* ========================================================================= */}
        {viewingKICDPaper && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-fade-in">
            <div
              className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
                isDark ? 'bg-slate-900 border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-700 to-purple-800 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇰🇪</span>
                  <div>
                    <h3 className="font-black text-sm sm:text-base leading-tight">
                      {viewingKICDPaper.title}
                    </h3>
                    <p className="text-xs text-indigo-200 mt-0.5">
                      Grade {viewingKICDPaper.grade} &bull; {viewingKICDPaper.subject} &bull; {viewingKICDPaper.term} &bull; Time: {viewingKICDPaper.timeAllowed}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingKICDPaper(null)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
                  <b>Curriculum Framework:</b> Standard KICD CBC Assessment Paper. All questions evaluated under competency rubrics with complete answer keys.
                </div>

                <div className="space-y-4">
                  {viewingKICDPaper.questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                          <span className="text-indigo-600 dark:text-indigo-400 font-mono mr-1.5 font-bold">
                            {idx + 1}.
                          </span>
                          {q.stem}
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold shrink-0">
                          {q.competency}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                          const isCorrect = q.correctAnswer === optKey;
                          return (
                            <div
                              key={optKey}
                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                                isCorrect
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-bold'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                                    isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  {optKey}
                                </span>
                                <span>{q.options[optKey]}</span>
                              </div>
                              {isCorrect && (
                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                                  ✓ Marking Key
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <b>Official Marking Guide:</b> {q.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setViewingKICDPaper(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(600);
                    setViewingKICDPaper(null);
                    setShowPushModal(true);
                  }}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <span>⚡ Adopt Questions & Push to Learners</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
