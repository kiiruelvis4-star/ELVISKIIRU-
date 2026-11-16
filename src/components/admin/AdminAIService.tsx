import React, { useState, useEffect, useMemo } from 'react';
import {
  AdminState,
  Teacher,
  TimetableCell,
  GradeName,
  InterPortalMessage,
  InterPortalRequestType,
} from './types';
import { sound } from '../../utils/sound';
import { nairobiStamp, uid } from './adminUtils';
import { useBackHandler } from '../../utils/navigationHistory';

interface AdminAIServiceProps {
  state: AdminState;
  onUpdateTeachers: (teachers: Teacher[]) => void;
  onUpdateTimetable: (timetable: Record<string, TimetableCell>) => void;
  onUpdateInterPortalMessages: (messages: InterPortalMessage[]) => void;
  onPurgeOldMessages: () => void;
  onClearAllMessages: () => void;
  onShowToast: (msg: string) => void;
  onLogActivity: (action: string) => void;
  onBackToMessages?: () => void;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export const AdminAIService: React.FC<AdminAIServiceProps> = ({
  state,
  onUpdateTeachers,
  onUpdateTimetable,
  onUpdateInterPortalMessages,
  onPurgeOldMessages,
  onClearAllMessages,
  onShowToast,
  onLogActivity,
  onBackToMessages,
}) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'queue' | 'lifecycle'>('requests');
  const [filterPortal, setFilterPortal] = useState<'all' | 'teachers' | 'parents' | 'learners'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved'>('all');

  // Preview / Inspector Modal
  const [previewMessage, setPreviewMessage] = useState<InterPortalMessage | null>(null);

  // New Simulation Modal
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simTeacherId, setSimTeacherId] = useState(state.teachers[0]?.id || '');
  const [simRequestType, setSimRequestType] = useState<InterPortalRequestType>('lesson_notes');
  const [simTopic, setSimTopic] = useState('Photosynthesis & Plant Nutrition');
  const [simGrade, setSimGrade] = useState<GradeName>('Grade 5');
  const [simSubject, setSimSubject] = useState('Science & Technology');

  // Compose Inter-Portal Message Modal
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState<'teachers' | 'parents' | 'learners'>('teachers');
  const [composeTitle, setComposeTitle] = useState('');
  const [composeBody, setComposeBody] = useState('');

  // 24-Hour Automated Background Purge Engine Timer
  const [secondsUntilNextSweep, setSecondsUntilNextSweep] = useState(60);
  const [autoPurgeEnabled, setAutoPurgeEnabled] = useState(
    state.aiServiceConfig?.autoPurge24h ?? true
  );

  useBackHandler(
    () => {
      sound.playClick(400);
      if (previewMessage) setPreviewMessage(null);
      else if (showSimulateModal) setShowSimulateModal(false);
      else if (showComposeModal) setShowComposeModal(false);
      return true;
    },
    Boolean(previewMessage) || showSimulateModal || showComposeModal,
    45,
    'admin_ai_service_modals'
  );

  const messages = useMemo(() => {
    return state.interPortalMessages || [];
  }, [state.interPortalMessages]);

  // Automated background sweep interval (runs every 60s)
  useEffect(() => {
    if (!autoPurgeEnabled) return;

    const timer = setInterval(() => {
      setSecondsUntilNextSweep((prev) => {
        if (prev <= 1) {
          executeAutomatedPurge(false);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoPurgeEnabled, messages]);

  // Purge routine
  const executeAutomatedPurge = (userInitiated = false) => {
    const now = Date.now();
    const cutoff = now - TWENTY_FOUR_HOURS_MS;

    const validMessages = messages.filter((m) => m.createdAt >= cutoff);
    const purgedCount = messages.length - validMessages.length;

    if (purgedCount > 0 || userInitiated) {
      onUpdateInterPortalMessages(validMessages);
      onPurgeOldMessages(); // Cleans regular chat messages older than 24h

      if (purgedCount > 0) {
        onLogActivity(`AI Service automated 24h sweep: Purged ${purgedCount} expired inter-portal message(s)`);
      }
      if (userInitiated) {
        sound.playCompleteChime();
        onShowToast(`✓ 24-Hour Purge Complete: ${purgedCount} expired items cleaned. Zero backlog achieved.`);
      }
    } else if (userInitiated) {
      sound.playClick(400);
      onShowToast('✓ All messages are within the 24-hour retention window. Backlog optimal.');
    }
  };

  // 1. PROCESS TEACHER REQUEST: LESSON NOTES
  const handleProcessLessonNotes = (msg: InterPortalMessage) => {
    sound.playClick(500);
    const teacher = state.teachers.find((t) => t.id === msg.senderId);
    if (!teacher) {
      onShowToast('Teacher not found in active faculty registry');
      return;
    }

    const grade = msg.payload?.grade || teacher.grades[0] || 'Grade 5';
    const subject = msg.payload?.subject || teacher.subjects[0] || 'Science & Technology';
    const topic = msg.payload?.topic || msg.title || 'CBC Learning Strand';

    // Synthesize structured CBC notes
    const sanitizedTopicName = topic.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24);
    const fileName = `${grade.replace(' ', '')}_${subject.split(' ')[0]}_${sanitizedTopicName}_Notes.pdf`;
    const folderKey = `${teacher.id}|${grade}|${subject}|Lesson notes`;

    const generatedBody = `### LITTLE ROSES ACADEMY
**CBC LESSON NOTES & INSTRUCTIONAL GUIDE**
**Grade Level:** ${grade}
**Learning Area:** ${subject}
**Strand Focus:** ${topic}
**Class Stream:** CBC Integrated Primary (Day School)

---
#### 1. Specific Learning Outcomes
By the end of this sub-strand, the pupil will be able to:
1. Explain the fundamental principles and real-world relevance of ${topic}.
2. Demonstrate investigative skills through group observation and digital learning tools.
3. Apply concepts to environmental conservation and community life around Nakuru.

#### 2. Key Inquiry Questions
- Why is understanding ${topic} essential in our daily environment?
- How do living things and modern tools interact during this process?

#### 3. Core Competencies & Values Developed
- **Critical Thinking & Problem Solving:** Formulating hypotheses and recording findings.
- **Digital Literacy:** Interacting with phonics, multimedia diagrams, and revision quizzes.
- **Unity & Collaboration:** Active peer support in group research tasks.

#### 4. Formative Assessment Rubric (CAT)
- **Exceeding Expectations (4):** Mastered concepts independently with innovative application.
- **Meeting Expectations (3):** Accurately executes all core learning tasks.
- **Approaching Expectations (2):** Requires occasional prompts from subject teacher.
- **Below Expectations (1):** Needs remedial review and guided peer tutoring.

---
*Synthesized and deposited by Rose Master AI Service Hub.*`;

    // Push file to teacher's files
    const updatedTeachers = state.teachers.map((t) => {
      if (t.id !== teacher.id) return t;
      const currentFiles = t.files[folderKey] || [];
      return {
        ...t,
        files: {
          ...t.files,
          [folderKey]: [...currentFiles, { name: fileName, ext: 'PDF' }],
        },
      };
    });

    onUpdateTeachers(updatedTeachers);

    // Update message status
    const updatedMessages = messages.map((m) => {
      if (m.id !== msg.id) return m;
      return {
        ...m,
        status: 'delivered' as const,
        payload: {
          ...m.payload,
          generatedNotes: {
            title: `CBC Notes: ${topic}`,
            grade,
            subject,
            body: generatedBody,
          },
        },
        aiResolution: {
          actionTaken: `Generated CBC lesson notes and deposited into ${teacher.name}'s folder`,
          resolvedAt: nairobiStamp(new Date()),
          responseSentToPortal: `✓ Lesson notes for "${topic}" generated and placed into your ${subject} Lesson Notes folder.`,
          pushedFileName: fileName,
        },
      };
    });

    onUpdateInterPortalMessages(updatedMessages);
    onLogActivity(`AI Service generated & pushed lesson notes "${fileName}" to ${teacher.name}`);
    sound.playCompleteChime();
    onShowToast(`✓ Notes pushed to ${teacher.name}'s document locker!`);
  };

  // 2. PROCESS TEACHER REQUEST: SCHEDULE UPDATE / TIMETABLE SWAP
  const handleProcessScheduleUpdate = (msg: InterPortalMessage) => {
    sound.playClick(500);
    const teacher = state.teachers.find((t) => t.id === msg.senderId);
    if (!teacher) {
      onShowToast('Teacher not found in active faculty registry');
      return;
    }

    const current = msg.payload?.currentSlot;
    const proposed = msg.payload?.proposedSlot;

    if (!current || !proposed) {
      onShowToast('Schedule update details incomplete');
      return;
    }

    const currentKey = `${current.day}|${current.slotKey}|${current.grade}`;
    const proposedKey = `${proposed.day}|${proposed.slotKey}|${proposed.grade}`;

    // Apply the timetable move
    const newTimetable = { ...state.timetable };
    delete newTimetable[currentKey];
    newTimetable[proposedKey] = {
      subject: proposed.subject,
      teacherId: teacher.id,
    };

    onUpdateTimetable(newTimetable);

    // Update message status
    const updatedMessages = messages.map((m) => {
      if (m.id !== msg.id) return m;
      return {
        ...m,
        status: 'approved' as const,
        aiResolution: {
          actionTaken: `Rescheduled ${proposed.grade} ${proposed.subject} from ${current.day} ${current.slotKey} to ${proposed.day} ${proposed.slotKey}`,
          resolvedAt: nairobiStamp(new Date()),
          responseSentToPortal: `✓ Schedule updated: ${proposed.grade} ${proposed.subject} successfully moved to ${proposed.day} ${proposed.slotKey}.`,
        },
      };
    });

    onUpdateInterPortalMessages(updatedMessages);
    onLogActivity(`AI Service approved schedule change for ${teacher.name}: ${currentKey} → ${proposedKey}`);
    sound.playCompleteChime();
    onShowToast(`✓ Schedule updated: Moved to ${proposed.day} ${proposed.slotKey}!`);
  };

  // 3. REJECT / DISMISS REQUEST
  const handleRejectRequest = (msgId: string) => {
    sound.playClick(400);
    const updated = messages.map((m) => {
      if (m.id !== msgId) return m;
      return {
        ...m,
        status: 'rejected' as const,
        aiResolution: {
          actionTaken: 'Request reviewed and declined by administrator',
          resolvedAt: nairobiStamp(new Date()),
          responseSentToPortal: 'Your request was reviewed. Please contact administration for further clarification.',
        },
      };
    });
    onUpdateInterPortalMessages(updated);
    onShowToast('Request dismissed');
  };

  // 4. SIMULATE NEW TEACHER REQUEST
  const handleSimulateRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = state.teachers.find((t) => t.id === simTeacherId);
    if (!teacher) return;

    const now = Date.now();
    let newMsg: InterPortalMessage;

    if (simRequestType === 'lesson_notes') {
      newMsg = {
        id: 'msg_ip_' + uid(),
        senderType: 'teacher',
        senderId: teacher.id,
        senderName: teacher.name,
        senderRole: `${simGrade} ${simSubject} Teacher`,
        recipientPortal: 'admin',
        type: 'lesson_notes',
        title: `${simGrade} ${simSubject}: ${simTopic}`,
        body: `Kindly generate CBC notes and inquiry assessment rubrics for ${simTopic} so I can prepare practical demonstrations for tomorrow's class.`,
        priority: 'urgent',
        createdAt: now,
        createdStamp: nairobiStamp(new Date(now)),
        expiresAt: now + TWENTY_FOUR_HOURS_MS,
        status: 'pending',
        payload: {
          grade: simGrade,
          subject: simSubject,
          topic: simTopic,
        },
      };
    } else {
      // Schedule update request
      newMsg = {
        id: 'msg_ip_' + uid(),
        senderType: 'teacher',
        senderId: teacher.id,
        senderName: teacher.name,
        senderRole: `${simGrade} Faculty`,
        recipientPortal: 'admin',
        type: 'schedule_update',
        title: `Schedule Adjustment: Move ${simGrade} ${simSubject} to Thursday L3`,
        body: `Requesting to adjust our lesson slot to Thursday L3 (10:00 – 10:40) to accommodate science practical station setups.`,
        priority: 'normal',
        createdAt: now,
        createdStamp: nairobiStamp(new Date(now)),
        expiresAt: now + TWENTY_FOUR_HOURS_MS,
        status: 'pending',
        payload: {
          currentSlot: { day: 'Mon', slotKey: 'L2', grade: simGrade, subject: simSubject },
          proposedSlot: { day: 'Thu', slotKey: 'L3', grade: simGrade, subject: simSubject },
          conflictDetected: false,
        },
      };
    }

    onUpdateInterPortalMessages([newMsg, ...messages]);
    setShowSimulateModal(false);
    sound.playCompleteChime();
    onLogActivity(`Received new inter-portal request from ${teacher.name} (${newMsg.type})`);
    onShowToast(`✓ Inter-portal request received from ${teacher.name}`);
  };

  // 5. COMPOSE INTER-PORTAL MESSAGE
  const handleComposeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTitle.trim() || !composeBody.trim()) return;

    const now = Date.now();
    const newMsg: InterPortalMessage = {
      id: 'msg_ip_' + uid(),
      senderType: 'admin',
      senderId: 'admin_root',
      senderName: 'Chief School Administrator',
      senderRole: 'Executive Administration Office',
      recipientPortal: composeRecipient,
      type: 'general_inquiry',
      title: composeTitle,
      body: composeBody,
      priority: 'high',
      createdAt: now,
      createdStamp: nairobiStamp(new Date(now)),
      expiresAt: now + TWENTY_FOUR_HOURS_MS,
      status: 'delivered',
      aiResolution: {
        actionTaken: `Broadcasted directly to ${composeRecipient.toUpperCase()} Portal`,
        resolvedAt: nairobiStamp(new Date()),
        responseSentToPortal: 'Message delivered to portal notification center.',
      },
    };

    onUpdateInterPortalMessages([newMsg, ...messages]);
    setShowComposeModal(false);
    setComposeTitle('');
    setComposeBody('');
    sound.playCompleteChime();
    onLogActivity(`Admin broadcasted inter-portal message to ${composeRecipient}: "${composeTitle}"`);
    onShowToast(`✓ Dispatched to ${composeRecipient} portal!`);
  };

  // Filtered lists
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      const matchPortal =
        filterPortal === 'all' ||
        (filterPortal === 'teachers' && m.senderType === 'teacher') ||
        (filterPortal === 'parents' && m.senderType === 'parent') ||
        (filterPortal === 'learners' && m.senderType === 'learner');

      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'pending' && m.status === 'pending') ||
        (filterStatus === 'resolved' && (m.status === 'delivered' || m.status === 'approved'));

      return matchPortal && matchStatus;
    });
  }, [messages, filterPortal, filterStatus]);

  const teacherRequests = useMemo(() => {
    return messages.filter(
      (m) => m.senderType === 'teacher' && (m.type === 'lesson_notes' || m.type === 'schedule_update')
    );
  }, [messages]);

  const pendingCount = messages.filter((m) => m.status === 'pending').length;

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      {/* Top Breadcrumb & Return to Messages */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              ✨ AI Management Service
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Inter-portal messaging broker · Automated 24h backlog purger · Faculty request processor
            </p>
          </div>
        </div>

        {onBackToMessages && (
          <button
            onClick={onBackToMessages}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white cursor-pointer transition-colors shadow-xs"
          >
            ← Back to Chat
          </button>
        )}
      </div>

      {/* Hero Service Status Bar */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-purple-900/60 via-indigo-900/60 to-slate-900 border border-purple-500/30 text-white shadow-md">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-xl shadow-inner">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-white">ELSIE Service Engine v2.5</span>
                <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  ONLINE & ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-purple-200/90 font-medium mt-0.5">
                Broker active between Teachers, Parents, and Learners portals · Zero-Backlog Guarantee
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">

            <button
              onClick={() => setShowSimulateModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 cursor-pointer transition-colors"
            >
              ➕ Simulate Teacher Request
            </button>
            <button
              onClick={() => setShowComposeModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-500 hover:bg-purple-400 text-slate-950 cursor-pointer transition-colors shadow-sm font-black"
            >
              ✉️ Send to Portal
            </button>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-white/10 text-xs">
          <div className="p-2 rounded-xl bg-white/5 border border-white/5">
            <span className="text-[10px] text-purple-300 block">Pending Requests</span>
            <span className="text-sm font-black text-amber-300">{pendingCount} Waiting Action</span>
          </div>
          <div className="p-2 rounded-xl bg-white/5 border border-white/5">
            <span className="text-[10px] text-purple-300 block">Teacher Submissions</span>
            <span className="text-sm font-black text-white">{teacherRequests.length} Total</span>
          </div>
          <div className="p-2 rounded-xl bg-white/5 border border-white/5">
            <span className="text-[10px] text-purple-300 block">24h Purge Engine</span>
            <span className="text-sm font-black text-emerald-300">Sweep in {secondsUntilNextSweep}s</span>
          </div>
          <div className="p-2 rounded-xl bg-white/5 border border-white/5">
            <span className="text-[10px] text-purple-300 block">Total Messages in Queue</span>
            <span className="text-sm font-black text-white">{messages.length} Active</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold">
          <button
            onClick={() => {
              sound.playClick(400);
              setActiveTab('requests');
            }}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <span>👨‍🏫 Teacher Requests</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black">
              {teacherRequests.filter((t) => t.status === 'pending').length}
            </span>
          </button>

          <button
            onClick={() => {
              sound.playClick(400);
              setActiveTab('queue');
            }}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'queue'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <span>📬 Inter-Portal Queue</span>
            <span className="text-[10px] opacity-75">({messages.length})</span>
          </button>

          <button
            onClick={() => {
              sound.playClick(400);
              setActiveTab('lifecycle');
            }}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'lifecycle'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <span>⏳ 24h Auto-Purge Engine</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>

        <button
          onClick={() => executeAutomatedPurge(true)}
          className="text-[11px] font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 cursor-pointer bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20"
          title="Manually purge messages older than 24 hours"
        >
          <span>🧹 Purge Expired Now</span>
        </button>
      </div>

      {/* TAB 1: TEACHER REQUESTS (LESSON NOTES & SCHEDULE UPDATES) */}
      {activeTab === 'requests' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Faculty Requests ({teacherRequests.length})
            </h3>
            <span className="text-[11px] text-slate-500">
              Processed directly into teacher lockers & school timetables
            </span>
          </div>

          {teacherRequests.length === 0 ? (
            <div className="text-center py-12 rounded-3xl border border-dashed border-slate-300 dark:border-white/10 p-6 space-y-2">
              <span className="text-3xl block">🎉</span>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">All Teacher Requests Cleared!</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                No active requests waiting. Use the button below to simulate an incoming lesson note or timetable change request.
              </p>
              <button
                onClick={() => setShowSimulateModal(true)}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white cursor-pointer hover:bg-purple-500"
              >
                Simulate Teacher Request Now
              </button>
            </div>
          ) : (
            teacherRequests.map((req) => {
              const isNotes = req.type === 'lesson_notes';
              const isSchedule = req.type === 'schedule_update';
              const isPending = req.status === 'pending';

              return (
                <div
                  key={req.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 shadow-xs ${
                    isPending
                      ? 'bg-slate-50 dark:bg-white/5 border-purple-500/40 dark:border-purple-500/40'
                      : 'bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 opacity-90'
                  }`}
                >
                  {/* Request Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{isNotes ? '📝' : '🗓️'}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {req.senderName}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded-md bg-purple-500/10 text-purple-400 font-bold border border-purple-500/20">
                            {isNotes ? 'Lesson Notes Request' : 'Schedule Reschedule Request'}
                          </span>
                          {req.priority === 'urgent' && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400">
                              Urgent
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {req.senderRole} · Received {req.createdStamp}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      {req.status === 'delivered' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          ✓ Notes Delivered to Locker
                        </span>
                      ) : req.status === 'approved' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          ✓ Timetable Updated
                        </span>
                      ) : req.status === 'rejected' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400">
                          Declined
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 animate-pulse">
                          ⚡ Pending AI Action
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Request Content */}
                  <div className="p-3 rounded-xl bg-black/5 dark:bg-black/30 border border-slate-200 dark:border-white/5 space-y-1.5 text-xs">
                    <strong className="block text-slate-900 dark:text-white font-bold">
                      {req.title}
                    </strong>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11.5px]">
                      {req.body}
                    </p>

                    {/* Specific Payload Details */}
                    {isNotes && req.payload?.topic && (
                      <div className="pt-1 text-[11px] text-purple-600 dark:text-purple-300 flex items-center gap-1.5 font-medium">
                        <span>Target:</span>
                        <strong className="text-slate-900 dark:text-white">{req.payload.grade}</strong>
                        <span>›</span>
                        <strong className="text-slate-900 dark:text-white">{req.payload.subject}</strong>
                        <span>›</span>
                        <span className="italic">"{req.payload.topic}"</span>
                      </div>
                    )}

                    {isSchedule && req.payload?.currentSlot && req.payload?.proposedSlot && (
                      <div className="pt-1.5 grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                          <span className="text-[10px] text-slate-400 block">Current Slot:</span>
                          <strong>{req.payload.currentSlot.day} ({req.payload.currentSlot.slotKey})</strong> · {req.payload.currentSlot.subject}
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                          <span className="text-[10px] text-slate-400 block">Proposed Move:</span>
                          <strong>{req.payload.proposedSlot.day} ({req.payload.proposedSlot.slotKey})</strong> · {req.payload.proposedSlot.subject}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resolution Report if executed */}
                  {req.aiResolution && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span>✓</span>
                        <span>{req.aiResolution.actionTaken}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 pl-4">
                        Sent to Teachers Portal: "{req.aiResolution.responseSentToPortal}"
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                    <button
                      onClick={() => setPreviewMessage(req)}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <span>🔍 Inspect Details</span>
                    </button>

                    {isPending && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRejectRequest(req.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                        >
                          Dismiss
                        </button>

                        {isNotes && (
                          <button
                            onClick={() => handleProcessLessonNotes(req)}
                            className="px-4 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white shadow-md cursor-pointer flex items-center gap-1.5"
                          >
                            <span>⚡</span>
                            <span>Generate & Push Notes to Locker</span>
                          </button>
                        )}

                        {isSchedule && (
                          <button
                            onClick={() => handleProcessScheduleUpdate(req)}
                            className="px-4 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white shadow-md cursor-pointer flex items-center gap-1.5"
                          >
                            <span>✓</span>
                            <span>Approve & Apply Timetable Swap</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: INTER-PORTAL MESSAGE QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-3">
          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs">
              {(['all', 'teachers', 'parents', 'learners'] as const).map((portal) => (
                <button
                  key={portal}
                  onClick={() => setFilterPortal(portal)}
                  className={`px-3 py-1 rounded-lg font-bold capitalize cursor-pointer transition-colors ${
                    filterPortal === portal
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {portal}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 text-xs">
              {(['all', 'pending', 'resolved'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-lg font-semibold capitalize cursor-pointer transition-colors ${
                    filterStatus === st
                      ? 'bg-slate-800 dark:bg-white/20 text-white font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Queue List */}
          <div className="space-y-2.5">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">
                No inter-portal messages matching filter.
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const now = Date.now();
                const remainingHours = Math.max(0, Math.floor((msg.expiresAt - now) / (3600 * 1000)));

                return (
                  <div
                    key={msg.id}
                    className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2 hover:border-purple-500/30 transition-all text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {msg.senderType === 'teacher' ? '👨‍🏫' : msg.senderType === 'parent' ? '🏡' : '🎒'}
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">{msg.senderName}</span>
                          <span className="text-[10px] text-slate-500 ml-1.5">({msg.senderRole})</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                          Expires in {remainingHours}h
                        </span>
                        <span
                          className={`text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            msg.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {msg.status}
                        </span>
                      </div>
                    </div>

                    <div className="pl-6 space-y-1">
                      <div className="font-extrabold text-slate-900 dark:text-white">{msg.title}</div>
                      <div className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                        {msg.body}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-white/5 text-[10.5px] text-slate-500">
                      <span>Received: {msg.createdStamp}</span>
                      <button
                        onClick={() => setPreviewMessage(msg)}
                        className="text-purple-400 hover:underline font-bold cursor-pointer"
                      >
                        Inspect & Process →
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: 24-HOUR AUTOMATED MESSAGE LIFECYCLE & PURGE ENGINE */}
      {activeTab === 'lifecycle' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">⏳</span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    24-Hour Automated Message Lifecycle
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Little Roses Academy Data Governance Policy: No conversational accumulation or memory bloat
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Auto-Sweep:</span>
                <button
                  onClick={() => setAutoPurgeEnabled(!autoPurgeEnabled)}
                  className={`px-3 py-1 rounded-full text-[11px] font-black cursor-pointer transition-colors ${
                    autoPurgeEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {autoPurgeEnabled ? 'ENABLED' : 'PAUSED'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-2xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Automated Cadence</span>
                <span className="text-base font-black text-purple-400">Every 60 Seconds</span>
                <span className="text-[10.5px] text-slate-500 block mt-0.5">Next cycle in {secondsUntilNextSweep}s</span>
              </div>
              <div className="p-3 rounded-2xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Retention Window</span>
                <span className="text-base font-black text-white">Exact 24 Hours</span>
                <span className="text-[10.5px] text-slate-500 block mt-0.5">Items drop at 86,400s threshold</span>
              </div>
              <div className="p-3 rounded-2xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Permanent Audit</span>
                <span className="text-base font-black text-emerald-400">Preserved in Log</span>
                <span className="text-[10.5px] text-slate-500 block mt-0.5">Transcripts drop, actions saved</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 leading-relaxed">
              <strong>Zero Backlog Architecture:</strong> In accordance with school requirements, messages are not allowed to stack indefinitely. The AI service tracks individual message lifecycles and safely removes aged conversational exchanges while retaining permanent school records (learner admissions, teacher locker files, timetable assignments) in the immutable Activity Log.
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => executeAutomatedPurge(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer transition-colors shadow-xs"
              >
                🧹 Run 24-Hour Purge Sweep Now
              </button>

              <button
                onClick={() => {
                  sound.playClick(400);
                  onClearAllMessages();
                  onUpdateInterPortalMessages([]);
                  onShowToast('✓ Complete backlog flush executed. Queue reset.');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition-colors shadow-xs"
              >
                Flush All Messages & Backlog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT & PROCESS MODAL */}
      {previewMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl p-5 sm:p-6 bg-[#141C33] border border-white/20 text-white shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {previewMessage.senderType === 'teacher' ? '👨‍🏫' : '🏡'}
                </span>
                <div>
                  <h4 className="text-sm font-black">{previewMessage.senderName}</h4>
                  <p className="text-[11px] text-slate-400">{previewMessage.senderRole}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewMessage(null)}
                className="w-7 h-7 rounded-full bg-white/10 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 py-3 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Request Subject:</span>
                <div className="font-bold text-white text-sm">{previewMessage.title}</div>
                <p className="text-slate-300 leading-relaxed text-[11.5px] pt-1">
                  {previewMessage.body}
                </p>
              </div>

              {/* Generated notes preview if available */}
              {previewMessage.payload?.generatedNotes && (
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-purple-300">Generated Lesson Notes:</span>
                  <div className="p-3 rounded-lg bg-black/40 font-mono text-[10.5px] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {previewMessage.payload.generatedNotes.body}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => setPreviewMessage(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-white/10 text-white"
              >
                Close
              </button>

              {previewMessage.status === 'pending' && (
                <div className="flex items-center gap-2">
                  {previewMessage.type === 'lesson_notes' && (
                    <button
                      onClick={() => {
                        handleProcessLessonNotes(previewMessage);
                        setPreviewMessage(null);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-500 text-white"
                    >
                      ⚡ Generate & Push Notes
                    </button>
                  )}
                  {previewMessage.type === 'schedule_update' && (
                    <button
                      onClick={() => {
                        handleProcessScheduleUpdate(previewMessage);
                        setPreviewMessage(null);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      ✓ Approve Schedule Swap
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SIMULATE TEACHER REQUEST MODAL */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <form
            onSubmit={handleSimulateRequestSubmit}
            className="w-full max-w-md rounded-3xl p-5 sm:p-6 bg-[#141C33] border border-white/20 text-white shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">👨‍🏫</span>
                <h4 className="text-sm font-black">Simulate Teacher Request</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowSimulateModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Select Faculty Member:</label>
              <select
                value={simTeacherId}
                onChange={(e) => setSimTeacherId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white focus:outline-none"
              >
                {state.teachers.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-900">
                    {t.name} ({t.subjects.join(', ')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Request Category:</label>
              <select
                value={simRequestType}
                onChange={(e) => setSimRequestType(e.target.value as InterPortalRequestType)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white focus:outline-none"
              >
                <option value="lesson_notes" className="bg-slate-900">Lesson Notes & CBC Scheme Request</option>
                <option value="schedule_update" className="bg-slate-900">Timetable / Slot Reschedule Request</option>
              </select>
            </div>

            {simRequestType === 'lesson_notes' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Grade Level:</label>
                    <select
                      value={simGrade}
                      onChange={(e) => setSimGrade(e.target.value as GradeName)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white focus:outline-none"
                    >
                      {(['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'] as const).map((g) => (
                        <option key={g} value={g} className="bg-slate-900">{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Learning Area:</label>
                    <select
                      value={simSubject}
                      onChange={(e) => setSimSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white focus:outline-none"
                    >
                      <option value="Science & Technology" className="bg-slate-900">Science & Technology</option>
                      <option value="Mathematics" className="bg-slate-900">Mathematics</option>
                      <option value="English" className="bg-slate-900">English</option>
                      <option value="Kiswahili" className="bg-slate-900">Kiswahili</option>
                      <option value="Social Studies" className="bg-slate-900">Social Studies</option>
                      <option value="Creative Arts" className="bg-slate-900">Creative Arts</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Specific Lesson Topic:</label>
                  <input
                    type="text"
                    value={simTopic}
                    onChange={(e) => setSimTopic(e.target.value)}
                    placeholder="e.g. Human Respiratory System"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white focus:outline-none"
                    required
                  />
                </div>
              </>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSimulateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-500 text-white shadow-md"
              >
                Dispatch to Inter-Portal Queue →
              </button>
            </div>
          </form>
        </div>
      )}

      {/* COMPOSE TO PORTAL MODAL */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <form
            onSubmit={handleComposeSubmit}
            className="w-full max-w-md rounded-3xl p-5 sm:p-6 bg-[#141C33] border border-white/20 text-white shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">✉️</span>
                <h4 className="text-sm font-black">Broadcast Inter-Portal Message</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowComposeModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Destination Portal:</label>
              <select
                value={composeRecipient}
                onChange={(e) => setComposeRecipient(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white focus:outline-none"
              >
                <option value="teachers" className="bg-slate-900">Teachers & Staff Portal</option>
                <option value="parents" className="bg-slate-900">Parents & Guardians Portal</option>
                <option value="learners" className="bg-slate-900">Learners Portal</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Announcement Title:</label>
              <input
                type="text"
                value={composeTitle}
                onChange={(e) => setComposeTitle(e.target.value)}
                placeholder="e.g. End of Term CBC Assessment Timetable"
                className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Message Body:</label>
              <textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Write message to broadcast to this portal…"
                rows={3}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white focus:outline-none resize-none"
                required
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowComposeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-500 text-white shadow-md"
              >
                Send to Portal →
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
