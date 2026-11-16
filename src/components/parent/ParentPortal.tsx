import React, { useState, useEffect, useRef, useMemo } from 'react';
import { sound } from '../../utils/sound';
import { useBackHandler } from '../../utils/navigationHistory';
import { ElsieChatView } from '../common/ElsieChatView';
import {
  UserIdentity,
  analyzeAssessmentPathways,
  ElsiePathwayAnalysisResult,
} from '../../utils/elsieEngine';
import { DocumentReaderModal } from '../DocumentReaderModal';
import {
  readUploadedDocument,
  formatFileSize,
  AttachedDocument,
} from '../../utils/documentReader';
import { ecosystemSync } from '../../utils/ecosystemSync';
import { pullSchoolStateFromCloud } from '../../utils/cloudSync';
import { TeacherCATUploadItem } from '../../types/cbcDocuments';
import {
  AssessmentBookCover,
  AssessmentReportCover,
  AssessmentDownloadNotice,
  getAcademicYear,
  getLearnerGradeDisplay,
  get30DayNoticeInfo,
} from '../common/AssessmentCovers';
import { OFFICIAL_BOOKLET_PDFS } from '../../data/officialCbcBooklets';
import {
  getLearnerFocusZoneItems,
  getStoredMarks,
  makeMarkKey,
  resultOf,
} from '../../utils/cbcCalculations';
import { useTimetableSync } from '../../utils/timetableSync';
import { SLOTS, DAYS, GradeName, GRADES, GRADE_COLORS, LOWER_GRADES } from '../admin/types';
import { NativeAssessmentBooklet } from '../common/NativeAssessmentBooklet';
import { DATA } from '../../data/curriculumData';
import { getStoredSubmissions } from '../../utils/cbcAssessmentEngine';
import {
  computeRealLearnerAssessmentSummary,
  buildLocalElsiePathwayAnalysis,
} from '../../utils/elsiePathways';
import {
  ElsiePathwayAdvisorCard,
  ElsiePathwayHomeSpotlight,
} from './ElsiePathwayAdvisorCard';
import {
  getFamilyPhones,
  getLearnerParentPhones,
  normPhone9,
  samePhone,
} from '../../utils/familySyncUtils';
import { downloadAssessmentDocument } from '../../utils/bookletDownload';
import { getNotificationPermissionState, getUnreadNotificationCount } from '../../utils/notifications';

interface ParentPortalProps {
  onExitPortal: () => void;
  onShowToast: (msg: string) => void;
}

// Pseudo-random number generator with deterministic seed
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// CBC Curriculum strand allocation plan matching official LRA DEMO
type StrandConfig = [string, number, number]; // [strandName, numCATs, numAssignments]

const PLAN: Record<string, StrandConfig[]> = {
  'Mathematics': [
    ['Numbers', 15, 3],
    ['Measurement', 4, 2],
    ['Geometry', 2, 2],
  ],
  'English': [
    ['Reading', 6, 2],
    ['Writing', 3, 2],
  ],
  'Kiswahili': [
    ['Kusikiliza na Kuongea', 5, 2],
    ['Kusoma', 3, 2],
  ],
  'Science & Technology': [
    ['Living Things', 4, 2],
    ['Matter', 3, 2],
  ],
  'Social Studies': [
    ['Our Country', 3, 2],
    ['Our Environment', 2, 2],
  ],
  'CRE': [
    ['Creation', 3, 2],
    ['The Church', 2, 2],
  ],
  'Agriculture & Nutrition': [
    ['Crop Production', 3, 2],
  ],
  'Creative Arts': [
    ['Drawing', 4, 2],
    ['Music', 3, 2],
  ],
};

export interface StrandDetail {
  name: string;
  cats: number[];
  asg: number[];
}

export interface SubjectDetail {
  name: string;
  strands: StrandDetail[];
  catPct: number;
  asgPct: number;
  pct: number;
}

export interface ChildProfile {
  id: string;
  name: string;
  adm: string;
  grade: string;
  stream: string;
  att: string;
  detail: SubjectDetail[];
  subj: [string, number][];
}

function buildChildSubjects(kidIndex: number, bias: number): SubjectDetail[] {
  const r = rng(1000 + kidIndex * 97);
  const subjects: SubjectDetail[] = Object.keys(PLAN).map((sn) => ({
    name: sn,
    strands: PLAN[sn].map(([stn, nc, na]) => ({
      name: stn,
      cats: Array.from({ length: nc }, () =>
        Math.max(2, Math.min(10, Math.round(bias + (r() * 6 - 3))))
      ),
      asg: Array.from({ length: na }, () =>
        Math.max(2, Math.min(10, Math.round(bias + (r() * 4 - 2))))
      ),
    })),
    catPct: 0,
    asgPct: 0,
    pct: 0,
  }));

  subjects.forEach((s) => {
    const c = s.strands.flatMap((t) => t.cats);
    const a = s.strands.flatMap((t) => t.asg);
    s.catPct = (c.reduce((x, y) => x + y, 0) / (c.length * 10)) * 100;
    s.asgPct = (a.reduce((x, y) => x + y, 0) / (a.length * 10)) * 100;
    s.pct = Math.round(s.catPct * 0.6 + s.asgPct * 0.4);
  });

  return subjects;
}

const INITIAL_KIDS: ChildProfile[] = [
  {
    id: 'l1',
    name: 'Faith Wanjiku',
    adm: 'LRA/0001',
    grade: 'Grade 4',
    stream: '',
    att: '92%',
    detail: buildChildSubjects(0, 7),
    subj: [],
  },
  {
    id: 'l2',
    name: 'Daniel Mwangi',
    adm: 'LRA/0002',
    grade: 'Grade 4',
    stream: '',
    att: '96%',
    detail: buildChildSubjects(1, 8),
    subj: [],
  },
];

INITIAL_KIDS.forEach((k) => {
  k.subj = k.detail.map((s) => [s.name, s.pct]);
});

const SUBJ_COLOR: Record<string, string> = {
  English: '#DB2777',
  Mathematics: '#7C3AED',
  Kiswahili: '#A21CAF',
  'Science & Technology': '#EA580C',
  'Science and Technology': '#EA580C',
  'Social Studies': '#9A5B2E',
  CRE: '#4C1D95',
  'Christian Religious Education': '#4C1D95',
  'Agriculture & Nutrition': '#14B8A6',
  'Agriculture and Nutrition': '#14B8A6',
  'Creative Arts': '#BE185D',
  'Creative Activities': '#BE185D',
  'Environmental Activities': '#16A34A',
};

const BNAME: Record<string, string> = {
  EE: 'Exceeding Expectations',
  ME: 'Meeting Expectations',
  AE: 'Approaching Expectations',
  BE: 'Below Expectations',
};

const BAND_COLOR: Record<string, string> = {
  EE: '#16A34A',
  ME: '#2563EB',
  AE: '#F5B301',
  BE: '#E11D48',
};

const NOTICES: [string, string][] = [
  ['Parent meeting', 'Friday 3:00 PM, all parents invited.'],
  ['Sports day', 'Please check the date on the school calendar.'],
  ['Term 1 Assessments', 'CBC assessment compilation ongoing by class teachers.'],
];

export const ParentPortal: React.FC<ParentPortalProps> = ({ onExitPortal, onShowToast }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currentChildIndex, setCurrentChildIndex] = useState(0);
  const [currentTab, setCurrentTab] = useState<'home' | 'timetable' | 'book' | 'report' | 'attend' | 'ask'>('home');
  const [selectedTimetableGrade, setSelectedTimetableGrade] = useState<GradeName>('Grade 4');

  // Live 4-Portal Timetable Synchronization Hook
  const {
    timetable: liveTimetable,
    slots: liveSlots,
    freeze: liveFreeze,
    teachers: liveFaculty,
    isFrozen: isTimetableFrozen,
    getTeacherName,
  } = useTimetableSync();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [ecoState, setEcoState] = useState(ecosystemSync.getState());
  const [whatsappShareModal, setWhatsappShareModal] = useState<TeacherCATUploadItem | null>(null);
  const [viewingOfficialCover, setViewingOfficialCover] = useState<'book' | 'report' | null>(null);
  const [showFullBooklet, setShowFullBooklet] = useState<boolean>(false);

  // Parent attached documents (CAT papers, homework worksheets)
  const [parentDocs, setParentDocs] = useState<AttachedDocument[]>([
    {
      id: 'doc_p_cat1',
      name: 'Faith_Wanjiku_Grade4_Mathematics_CAT1_Paper.pdf',
      size: 245000,
      type: 'application/pdf',
      ext: 'PDF',
      extractedText: `LITTLE ROSES ACADEMY — NAKURU
CONTINUOUS ASSESSMENT TEST (CAT 1) — TERM 3
Grade 4 Mathematics | Learner: Faith Wanjiku (LRA/0001)
Score: 9 / 10 | Rubric Band: EE (Exceeding Expectations)
Teacher: Tr. Peter Kibet`,
      wordCount: 38,
      pageCount: 1,
      uploadedAt: '20 Oct, 14:30',
      aiAnalysis: {
        summary: 'Official Grade 4 Mathematics CAT 1 paper for Faith Wanjiku with score 9/10.',
        questions: ['1. Numerator identification (3/5)', '2. Equivalent fractions (1/2 -> 4/8)', '3. Fraction additions'],
        competencyFocus: 'Numeracy & Problem Solving',
        rubricAdvice: 'Exceeding Expectations (EE) - exceptional mastery.',
      },
    },
    {
      id: 'doc_p_asg1',
      name: 'Weekend_Fractions_Homework_Sheet.docx',
      size: 128000,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ext: 'DOCX',
      extractedText: `LITTLE ROSES ACADEMY — HOMEWORK PACK
Grade 4 Mathematics | Due: Monday 8:00 AM
Parent Signature: Mr. James Mwangi (Verified)
Tasks completed: 5/5 fraction word problems solved accurately.`,
      htmlContent: `<h3>LITTLE ROSES ACADEMY — HOMEWORK PACK</h3><p><strong>Grade 4 Mathematics | Due: Monday 8:00 AM</strong></p><p><em>Parent Signature: Mr. James Mwangi (Verified)</em></p><p>Tasks completed: 5/5 fraction word problems solved accurately.</p>`,
      wordCount: 32,
      pageCount: 1,
      uploadedAt: '22 Oct, 18:15',
    },
  ]);
  const [readingDoc, setReadingDoc] = useState<AttachedDocument | null>(null);

  const handleUploadParentAssessmentDoc = async (file: File) => {
    sound.playClick(500);
    try {
      const doc = await readUploadedDocument(file);
      setParentDocs((prev) => [doc, ...prev]);
      sound.playCompleteChime();
      onShowToast(`Uploaded assessment document: ${doc.name}`);
    } catch (e: any) {
      onShowToast(`Failed to read file: ${e.message}`);
    }
  };

  useEffect(() => {
    const unsub = ecosystemSync.subscribe((next) => setEcoState(next));
    return () => {
      unsub();
    };
  }, []);

  const [adminData, setAdminData] = useState(() => {
    try {
      const s = localStorage.getItem('lra_admin_v3');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });

  const [allMarks, setAllMarks] = useState(() => getStoredMarks());
  const [allSubmissions, setAllSubmissions] = useState(() => getStoredSubmissions());

  useEffect(() => {
    const handleSync = () => {
      try {
        const s = localStorage.getItem('lra_admin_v3');
        if (s) setAdminData(JSON.parse(s));
      } catch (e) {
        console.warn(e);
      }
      setAllMarks(getStoredMarks());
      setAllSubmissions(getStoredSubmissions());
    };

    pullSchoolStateFromCloud().then(() => handleSync()).catch(() => {});

    window.addEventListener('lra_data_sync', handleSync);
    window.addEventListener('lra-admin-state-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('lra_data_sync', handleSync);
      window.removeEventListener('lra-admin-state-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const [sessionUser] = useState(() => {
    try {
      const s = localStorage.getItem('lra_session_user');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });

  // Resolve matching family and children
  const { parentDisplayName, parentGreetingName, kids, familyCode } = useMemo(() => {
    const rawPhone = normPhone9(sessionUser?.phone || sessionUser?.identifier);
    const allLearners: any[] = adminData?.learners || [];
    const allFamilies: any[] = adminData?.families || [];

    // 1. Match learners directly by fatherPhone/motherPhone/parentPhone (last 9 digits)
    let matchedLearners = rawPhone
      ? allLearners.filter((l) =>
          getLearnerParentPhones(l).some((p) => samePhone(p, rawPhone))
        )
      : [];

    // 2. Match family by ANY guardian phone (phone, secondaryPhone, fatherPhone, motherPhone) or id
    let matchedFamily = allFamilies.find(
      (f) =>
        (sessionUser?.id && f.id === sessionUser.id) ||
        (rawPhone && getFamilyPhones(f).some((p) => samePhone(p, rawPhone)))
    );

    if (!matchedFamily && matchedLearners.length > 0) {
      const fId = matchedLearners[0].familyId;
      if (fId) {
        matchedFamily = allFamilies.find((f) => f.id === fId);
      }
    }

    // Include all siblings belonging to the matchedFamily (via familyId OR any shared guardian phone)
    if (matchedFamily) {
      const famPhones = getFamilyPhones(matchedFamily);
      const famLearners = allLearners.filter(
        (l) =>
          l.familyId === matchedFamily.id ||
          getLearnerParentPhones(l).some((lp) => famPhones.some((fp) => samePhone(lp, fp)))
      );
      const seenIds = new Set(matchedLearners.map((x) => x.id));
      for (const fl of famLearners) {
        if (!seenIds.has(fl.id)) {
          seenIds.add(fl.id);
          matchedLearners.push(fl);
        }
      }
    }

    // 3. Fallback ONLY in preview mode (when no signed-in phone/id is present)
    if (matchedLearners.length === 0 && !rawPhone && !sessionUser?.id) {
      if (allFamilies.length > 0) {
        matchedFamily = allFamilies[0];
        matchedLearners = allLearners.filter((l) => l.familyId === matchedFamily.id);
      }
      if (matchedLearners.length === 0 && allLearners.length > 0) {
        matchedLearners = allLearners.slice(0, 2);
      }
    }

    // Build dynamic child profiles reading real assessment book marks where available
    const normalizeSubj = (s: string) =>
      s
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/christian religious education/g, 'cre')
        .replace(/[^a-z0-9]/g, '');

    const resolvedKids: ChildProfile[] =
      matchedLearners.length > 0
        ? matchedLearners.map((l, idx) => {
            const defaultSubs = buildChildSubjects(idx, 8);
            const gradeDef = DATA.grades[l.grade];

            // Collect official CBC strand SIDs per learning area across terms for this learner's grade
            const areaStrandMap = new Map<string, { name: string; sid: string }[]>();
            if (gradeDef?.terms) {
              Object.values(gradeDef.terms).forEach((areas) => {
                (areas || []).forEach((area) => {
                  const key = normalizeSubj(area.name);
                  const existing = areaStrandMap.get(key) || [];
                  area.strands.forEach((st) => {
                    if (!existing.some((x) => x.sid === st.sid)) {
                      existing.push({ name: st.name, sid: st.sid });
                    }
                  });
                  areaStrandMap.set(key, existing);
                });
              });
            }

            const detail: SubjectDetail[] = defaultSubs.map((subj) => {
              const normName = normalizeSubj(subj.name);
              const officialStrands = areaStrandMap.get(normName) || [];
              const liveCatPcts: number[] = [];
              const liveAsgPcts: number[] = [];
              const liveFinalPcts: number[] = [];
              const liveStrands: StrandDetail[] = [];

              for (const ost of officialStrands) {
                const k1 = makeMarkKey(l.id, ost.sid);
                const k2 = makeMarkKey(l.adm, ost.sid);
                const rec = allMarks[k1] || allMarks[k2];
                if (rec) {
                  const res = resultOf(rec);
                  if (res) {
                    liveCatPcts.push(res.c);
                    liveAsgPcts.push(res.a);
                    liveFinalPcts.push(res.f);
                    liveStrands.push({
                      name: ost.name,
                      cats: (rec.cats || []).map((x: any) => Math.round((x.s / Math.max(1, x.t)) * 10)),
                      asg: (rec.asg || []).map((x: any) => Math.round((x.s / Math.max(1, x.t)) * 10)),
                    });
                  }
                }
              }

              // Also check legacy fallback by strand name
              if (liveFinalPcts.length === 0) {
                subj.strands.forEach((st) => {
                  const sidVariants = [st.name.toLowerCase().replace(/\s+/g, '_'), st.name];
                  for (const sid of sidVariants) {
                    const k1 = makeMarkKey(l.id, sid);
                    const k2 = makeMarkKey(l.adm, sid);
                    const rec = allMarks[k1] || allMarks[k2];
                    if (rec) {
                      const res = resultOf(rec);
                      if (res) {
                        liveCatPcts.push(res.c);
                        liveAsgPcts.push(res.a);
                        liveFinalPcts.push(res.f);
                        break;
                      }
                    }
                  }
                });
              }

              if (liveFinalPcts.length > 0) {
                const avgCat = Math.round(liveCatPcts.reduce((a, b) => a + b, 0) / liveCatPcts.length);
                const avgAsg = Math.round(liveAsgPcts.reduce((a, b) => a + b, 0) / liveAsgPcts.length);
                const avgFinal = Math.round(liveFinalPcts.reduce((a, b) => a + b, 0) / liveFinalPcts.length);
                return {
                  ...subj,
                  strands: liveStrands.length > 0 ? liveStrands : subj.strands,
                  pct: avgFinal,
                  catPct: avgCat,
                  asgPct: avgAsg,
                };
              }
              return subj;
            });

            return {
              id: l.id,
              name: l.name,
              adm: l.adm,
              grade: l.grade,
              stream: '',
              att: '96%',
              detail,
              subj: detail.map((s) => [s.name, s.pct]),
            };
          })
        : INITIAL_KIDS;

    // Resolve name
    // Determine personalized guardian name matching the specific logged-in phone number
    let resolvedName: string | undefined = undefined;
    if (rawPhone) {
      const firstChild = matchedLearners[0];
      const fPhone = matchedFamily?.fatherPhone || firstChild?.fatherPhone;
      const mPhone = matchedFamily?.motherPhone || firstChild?.motherPhone;
      const fName = matchedFamily?.fatherName || firstChild?.fatherName;
      const mName = matchedFamily?.motherName || firstChild?.motherName;
      const fRole = matchedFamily?.fatherRole || firstChild?.fatherRole || 'Father';
      const mRole = matchedFamily?.motherRole || firstChild?.motherRole || 'Mother';

      if (fPhone && samePhone(rawPhone, fPhone) && fName) {
        resolvedName = `${fName} (${fRole})`;
      } else if (mPhone && samePhone(rawPhone, mPhone) && mName) {
        resolvedName = `${mName} (${mRole})`;
      }
    }

    if (!resolvedName) {
      resolvedName = sessionUser?.name;
    }
    if (!resolvedName || resolvedName === 'Parent / Guardian' || resolvedName === 'Parent' || resolvedName === 'Guardian') {
      resolvedName = matchedFamily?.head;
    }
    if (!resolvedName && matchedLearners.length > 0) {
      resolvedName = matchedLearners[0].fatherName || matchedLearners[0].motherName || `${matchedLearners[0].name}'s Parent`;
    }
    resolvedName = resolvedName || 'Parent / Guardian';

    const greetingName = resolvedName;

    return {
      parentDisplayName: resolvedName,
      parentGreetingName: greetingName,
      kids: resolvedKids,
      familyCode: matchedFamily?.id || (matchedLearners[0]?.familyId ?? 'FAM-001'),
    };
  }, [adminData, sessionUser, allMarks]);

  const activeKid = kids[currentChildIndex] || kids[0] || INITIAL_KIDS[0];
  const activeKidGrade = (activeKid.grade || 'Grade 4') as GradeName;

  const parentNotifScope = useMemo(
    () => ({
      portalId: 'parents' as const,
      userId: sessionUser?.id,
      userName: parentDisplayName,
      phone: sessionUser?.phone || sessionUser?.identifier,
      linkedLearnerIds: kids.flatMap((k) => [k.id, k.adm]).filter(Boolean),
      linkedLearnerNames: kids.map((k) => k.name).filter(Boolean),
    }),
    [sessionUser?.id, sessionUser?.phone, sessionUser?.identifier, parentDisplayName, kids]
  );

  const [parentNotifUnread, setParentNotifUnread] = useState<number>(() =>
    getUnreadNotificationCount({
      portalId: 'parents',
      userId: sessionUser?.id,
      userName: parentDisplayName,
      phone: sessionUser?.phone || sessionUser?.identifier,
      linkedLearnerIds: kids.flatMap((k) => [k.id, k.adm]).filter(Boolean),
      linkedLearnerNames: kids.map((k) => k.name).filter(Boolean),
    })
  );

  useEffect(() => {
    const refreshNotifs = () => {
      setParentNotifUnread(getUnreadNotificationCount(parentNotifScope));
    };
    refreshNotifs();
    window.addEventListener('lra_notifications_updated', refreshNotifs);
    window.addEventListener('lra_data_sync', refreshNotifs);
    return () => {
      window.removeEventListener('lra_notifications_updated', refreshNotifs);
      window.removeEventListener('lra_data_sync', refreshNotifs);
    };
  }, [parentNotifScope]);

  const todayDayName = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const d = days[new Date().getDay()];
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(d) ? d : 'Mon';
  }, []);

  const todayKidLessons = useMemo(() => {
    const lessons: { slotKey: string; time: string; lesson: number; subject: string; teacherName: string }[] = [];
    liveSlots.filter((s) => s.lesson).forEach((slot) => {
      const cellKey = `${todayDayName}|${slot.k}|${activeKidGrade}`;
      const entry = liveTimetable[cellKey];
      if (entry) {
        lessons.push({
          slotKey: slot.k,
          time: slot.t,
          lesson: slot.lesson!,
          subject: entry.subject,
          teacherName: getTeacherName(entry.teacherId),
        });
      }
    });
    return lessons;
  }, [todayDayName, activeKidGrade, liveTimetable, liveSlots, getTeacherName]);

  // Dynamic time-of-day greeting in Africa/Nairobi
  const getGreeting = () => {
    try {
      const hour = parseInt(
        new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Africa/Nairobi',
          hour: '2-digit',
          hour12: false,
        }).format(new Date()),
        10
      );
      if (hour < 12) return 'Good morning';
      if (hour < 17) return 'Good afternoon';
      return 'Good evening';
    } catch {
      const h = new Date().getHours();
      if (h < 12) return 'Good morning';
      if (h < 17) return 'Good afternoon';
      return 'Good evening';
    }
  };

  const getTimeEmoji = () => {
    const h = new Date().getHours();
    if (h < 12) return '☀️';
    if (h < 17) return '⛅';
    return '🌙';
  };

  // Elsie Parent Identity with Phone Number, Linked Children, and Real Admin-Released Assessment Summary
  const parentIdentity: UserIdentity = useMemo(() => {
    const rawPhone = (sessionUser?.phone || sessionUser?.identifier || '').replace(/\D/g, '') || '0722000000';
    const liveSummary = computeRealLearnerAssessmentSummary(
      { id: activeKid.id, adm: activeKid.adm, name: activeKid.name, grade: activeKid.grade },
      allMarks as any,
      allSubmissions,
      DATA.grades[activeKid.grade]?.terms,
      'parent'
    );

    return {
      role: 'parent',
      id: rawPhone,
      name: parentGreetingName,
      preferredTitle: parentGreetingName.startsWith('Madam') || parentGreetingName.startsWith('Mrs') ? 'Madam' : 'Mr.',
      preferredName: parentGreetingName,
      linkedLearners: kids.map((k) => ({
        id: k.id,
        adm: k.adm,
        name: k.name,
        grade: k.grade,
        stream: k.stream,
      })),
      assessmentSummary: liveSummary,
    };
  }, [sessionUser, activeKid, parentGreetingName, kids, allMarks, allSubmissions]);

  const [pathwayAnalysis, setPathwayAnalysis] = useState<ElsiePathwayAnalysisResult | null>(null);
  const [isAnalyzingPathways, setIsAnalyzingPathways] = useState<boolean>(false);
  const [elsieAutoPrompt, setElsieAutoPrompt] = useState<{ id: string; text: string } | null>(null);

  const reportSubjectsSnapshot = useMemo(
    () =>
      activeKid.detail.map((d) => ({
        name: d.name,
        pct: d.pct,
        catPct: d.catPct,
        asgPct: d.asgPct,
        strands: d.strands,
      })),
    [activeKid.detail]
  );

  const activeFocusItems = useMemo(
    () => getLearnerFocusZoneItems(activeKid.adm),
    [activeKid.adm, allMarks]
  );

  useEffect(() => {
    let cancelled = false;
    const learnerPayload = {
      id: activeKid.id,
      adm: activeKid.adm,
      name: activeKid.name,
      grade: activeKid.grade,
      stream: activeKid.stream,
    };

    // Instant baseline so parent sees data immediately while Gemini refines it
    const instantLocal = buildLocalElsiePathwayAnalysis({
      learnerName: activeKid.name,
      learnerAdm: activeKid.adm,
      grade: activeKid.grade,
      liveSummary: parentIdentity.assessmentSummary,
      reportSubjects: reportSubjectsSnapshot,
      focusItems: activeFocusItems,
      source: 'elsie_engine',
    });
    setPathwayAnalysis(instantLocal);
    setIsAnalyzingPathways(true);

    analyzeAssessmentPathways({
      learner: learnerPayload,
      parentName: parentGreetingName,
      liveSummary: parentIdentity.assessmentSummary,
      reportSubjects: reportSubjectsSnapshot,
      focusItems: activeFocusItems,
    })
      .then((res) => {
        if (!cancelled) {
          setPathwayAnalysis(res);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsAnalyzingPathways(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeKid.id,
    activeKid.adm,
    activeKid.name,
    activeKid.grade,
    activeKid.stream,
    parentGreetingName,
    parentIdentity.assessmentSummary,
    reportSubjectsSnapshot,
    activeFocusItems,
  ]);

  const handleRefreshPathwayAnalysis = () => {
    setIsAnalyzingPathways(true);
    analyzeAssessmentPathways({
      learner: {
        id: activeKid.id,
        adm: activeKid.adm,
        name: activeKid.name,
        grade: activeKid.grade,
        stream: activeKid.stream,
      },
      parentName: parentGreetingName,
      liveSummary: parentIdentity.assessmentSummary,
      reportSubjects: reportSubjectsSnapshot,
      focusItems: activeFocusItems,
      forceRefresh: true,
    })
      .then((res) => {
        setPathwayAnalysis(res);
        showLocalToast(`Elsie AI updated pathway recommendations for ${activeKid.name}`);
      })
      .finally(() => {
        setIsAnalyzingPathways(false);
      });
  };

  const handleOpenElsieWithPrompt = (promptText: string) => {
    setElsieAutoPrompt({ id: `prompt_${Date.now()}`, text: promptText });
    setCurrentTab('ask');
  };

  const handleOpenFullPathwayAnalysis = () => {
    setCurrentTab('report');
    setTimeout(() => {
      document.getElementById('elsie-pathway-advisor-panel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 120);
  };

  // When document or WhatsApp share modal is open (priority 48)
  useBackHandler(
    () => {
      sound.playClick(400);
      if (whatsappShareModal) setWhatsappShareModal(null);
      else if (readingDoc) setReadingDoc(null);
      return true;
    },
    Boolean(whatsappShareModal || readingDoc),
    48,
    'parents_other_modals'
  );

  // When full booklet modal is open (priority 46)
  useBackHandler(
    () => {
      sound.playClick(400);
      setShowFullBooklet(false);
      return true;
    },
    showFullBooklet,
    46,
    'parents_booklet_modal'
  );

  // When cover modal is open (priority 45)
  useBackHandler(
    () => {
      sound.playClick(400);
      setViewingOfficialCover(null);
      return true;
    },
    viewingOfficialCover !== null,
    45,
    'parents_official_cover_modal'
  );

  // When in another tab, back goes to 'home' (priority 18)
  useBackHandler(
    () => {
      sound.playClick(400);
      setCurrentTab('home');
      return true;
    },
    currentTab !== 'home',
    18,
    'parents_tab_back'
  );


  const showLocalToast = (msg: string) => {
    setToastMessage(msg);
    onShowToast(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const calculateAverage = (k: ChildProfile) => {
    if (!k.subj.length) return 0;
    return Math.round(k.subj.reduce((acc, curr) => acc + curr[1], 0) / k.subj.length);
  };

  const getBandOf = (score: number) => {
    if (score >= 80) return 'EE';
    if (score >= 71) return 'ME';
    if (score >= 50) return 'AE';
    return 'BE';
  };


  const [bookletInitialTab, setBookletInitialTab] = useState<'book' | 'report'>('book');

  const handleDownloadPDF = (docType: string) => {
    sound.playClick(600);
    const mode: 'book' | 'report' = docType.toLowerCase().includes('book') ? 'book' : 'report';
    const res = downloadAssessmentDocument({
      learner: {
        id: activeKid.id,
        name: activeKid.name,
        adm: activeKid.adm,
        grade: activeKid.grade,
        stream: activeKid.stream,
      },
      mode,
      term: 'Term 1',
      academicYear: getAcademicYear(),
    });
    showLocalToast(
      `Downloaded ${activeKid.grade} ${mode === 'book' ? 'Assessment Book' : 'Assessment Report'} (${res.filename})`
    );
  };

  // Color variables according to theme
  const isDark = theme === 'dark';
  const colors = {
    bg: isDark ? '#0A0F1F' : '#EEF2FA',
    card: isDark ? '#141C33' : '#FFFFFF',
    ink: isDark ? '#EEF2FF' : '#0F1B33',
    muted: isDark ? '#9AA7C7' : '#6B7A93',
    line: isDark ? '#26324F' : '#E4E9F4',
    sub: isDark ? '#1B2644' : '#F7F9FD',
    navy: '#0A1F4D',
    navy2: '#1A3A8F',
    chip: isDark ? '#1F2A4D' : '#EEF2FF',
    chipink: isDark ? '#C7D2FE' : '#3730A3',
  };

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden font-sans select-none"
      style={{
        backgroundColor: colors.bg,
        color: colors.ink,
      }}
    >
      {/* Top Header */}
      <div
        className="w-full max-w-full overflow-hidden shrink-0 text-white px-3 sm:px-3.5 pt-2.5 pb-3 rounded-b-[24px] shadow-lg transition-colors"
        style={{
          background: 'linear-gradient(120deg, #0A1F4D, #1A3A8F)',
          boxShadow: '0 8px 22px rgba(10,31,77,0.35)',
        }}
      >
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {/* Official Crest */}
          <img
            src="/images/lra_crest.jpg"
            alt="Little Roses Academy Crest"
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white border-2 border-pink-200 object-cover shrink-0 shadow-sm"
          />

          {/* Title & Greeting */}
          <div className="flex-1 min-w-0">
            <h1 className="text-[13.5px] sm:text-base font-extrabold truncate text-white leading-tight">
              {getGreeting()}, {parentGreetingName} {getTimeEmoji()}
            </h1>
            <p className="text-[11px] text-blue-200 truncate mt-0.5">
              Little Roses Academy · Family {familyCode} ({kids.length} child{kids.length === 1 ? '' : 'ren'})
            </p>
          </div>

          {/* Controls: Single Scoped Bell & Theme Switcher */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                sound.playClick(520);
                window.dispatchEvent(
                  new CustomEvent('lra-open-notification-setup', {
                    detail: {
                      ...parentNotifScope,
                      initialView: 'inbox',
                    },
                  })
                );
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-sm relative shrink-0 cursor-pointer transition-colors"
              title="Parent Notifications & Inbox"
              aria-label="Open Parent Notifications"
            >
              🔔
              {parentNotifUnread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center px-1 border-2 border-[#0A1F4D]">
                  {parentNotifUnread > 99 ? '99+' : parentNotifUnread}
                </span>
              )}
            </button>
            {/* Light / Dark Switcher */}
            <div className="flex bg-white/20 rounded-full p-0.5">
              <button
                onClick={() => {
                  sound.playClick(400);
                  setTheme('light');
                }}
                className={`text-xs px-1.5 sm:px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                  theme === 'light' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-white/80'
                }`}
                title="Light Theme"
              >
                ☀️
              </button>
              <button
                onClick={() => {
                  sound.playClick(400);
                  setTheme('dark');
                }}
                className={`text-xs px-1.5 sm:px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                  theme === 'dark' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-white/80'
                }`}
                title="Dark Theme"
              >
                🌙
              </button>
            </div>
          </div>
        </div>

        {/* Linked Children Pill Selector */}
        <div className="flex gap-2 overflow-x-auto mt-2.5 pb-0.5 no-scrollbar">
          {kids.map((k: ChildProfile, i: number) => {
            const isSelected = i === currentChildIndex;
            return (
              <button
                key={k.id}
                onClick={() => {
                  sound.playClick(500);
                  setCurrentChildIndex(i);
                }}
                className={`shrink-0 border-0 rounded-2xl px-3 py-1.5 text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-white text-[#1A3A8F] shadow-md scale-102'
                    : 'bg-white/20 text-white/90 hover:bg-white/30'
                }`}
              >
                <span>{i === 0 ? '👧' : '👦'}</span>
                <span>{k.name}</span>
                <span className="opacity-70 font-semibold text-[10px]">· {k.grade}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-3.5 pt-3.5 pb-4 space-y-3.5 text-xs">
        {/* TAB 1: HOME */}
        {currentTab === 'home' && (
          <div className="space-y-3.5 animate-fade-in">
            {/* Prompt parent to enable Pop-Up Assessment Alerts or highlight newly released books */}
            {(() => {
              const perm = getNotificationPermissionState();
              if (perm !== 'granted') {
                return (
                  <div className="rounded-2xl p-3 border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg shrink-0">🔔</span>
                      <div className="min-w-0">
                        <div className="font-extrabold text-[11.5px] text-amber-900 dark:text-amber-200 truncate">
                          Turn On Assessment Book Pop-Up Alerts
                        </div>
                        <div className="text-[10.5px] text-amber-800/80 dark:text-amber-300/80 leading-snug">
                          Get instant phone alerts when {activeKid.name}’s Assessment Book is released.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick(550);
                        window.dispatchEvent(
                          new CustomEvent('lra-open-notification-setup', {
                            detail: {
                              ...parentNotifScope,
                              initialView: 'setup',
                            },
                          })
                        );
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] shrink-0 cursor-pointer"
                    >
                      Enable
                    </button>
                  </div>
                );
              }
              const info = get30DayNoticeInfo();
              if (info.isPromotedActive && !info.isPurgedCompleted) {
                return (
                  <div
                    onClick={() => setCurrentTab('book')}
                    className="rounded-2xl p-3 border border-indigo-400/50 bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-between gap-2.5 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg shrink-0">⏳</span>
                      <div className="min-w-0">
                        <div className="font-extrabold text-[11.5px] text-indigo-900 dark:text-indigo-200 truncate">
                          Term 3 Assessment Book Ready · {info.daysRemaining}d {info.hoursRemaining}h Left
                        </div>
                        <div className="text-[10.5px] text-indigo-800/80 dark:text-indigo-300/80">
                          Download before {info.expiresAtDateLabel || 'Day 30'} before automatic deletion &amp; next-class move.
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 shrink-0">
                      Download →
                    </span>
                  </div>
                );
              }
              return (
                <div
                  onClick={() => setCurrentTab('book')}
                  className="rounded-2xl p-3 border border-emerald-400/40 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between gap-2.5 cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">📘</span>
                    <div className="min-w-0">
                      <div className="font-extrabold text-[11.5px] text-emerald-900 dark:text-emerald-200 truncate">
                        Assessment Book &amp; Report Live ({activeKid.grade})
                      </div>
                      <div className="text-[10.5px] text-emerald-800/80 dark:text-emerald-300/80">
                        Marks and reports appear automatically as teachers update them · Tap to view &amp; download
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 shrink-0">
                    Open →
                  </span>
                </div>
              );
            })()}

            {/* 30-Day Download Notification Window */}
            <AssessmentDownloadNotice
              onDownloadBook={() => {
                sound.playClick(450);
                setCurrentTab('book');
              }}
              onDownloadReport={() => {
                sound.playClick(450);
                setCurrentTab('report');
              }}
            />

            {/* Student Hero Card */}
            <div
              className="rounded-2xl p-3.5 text-white shadow-md relative overflow-hidden"
              style={{
                background: 'linear-gradient(120deg, #7C3AED, #EC4899)',
              }}
            >
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <div className="text-base font-black text-white">{activeKid.name}</div>
                  <div className="text-[11px] text-purple-100 font-semibold mt-0.5">
                    {activeKid.grade} · Adm {activeKid.adm}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg">
                  {currentChildIndex === 0 ? '👧' : '👦'}
                </div>
              </div>
            </div>

            {/* Today's Class Schedule & Bell Timetable Card */}
            <div
              className="p-3.5 rounded-2xl border shadow-sm transition-all"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.line,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🗓️</span>
                  <div>
                    <div className="font-extrabold text-xs" style={{ color: colors.ink }}>
                      Today's Class Schedule ({todayDayName})
                    </div>
                    <div className="text-[10px]" style={{ color: colors.muted }}>
                      {activeKid.grade} · 40-minute lesson periods
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(450);
                    setCurrentTab('timetable');
                  }}
                  className="text-xs font-bold text-[#2F6BFF] hover:underline cursor-pointer"
                >
                  View Timetable →
                </button>
              </div>

              {isTimetableFrozen ? (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300">
                  ❄️ <strong>Exam Freeze:</strong> {liveFreeze?.why || 'Examinations Period'}. Regular classes are locked for assessments.
                </div>
              ) : todayKidLessons.length === 0 ? (
                <div className="p-2.5 text-center text-xs" style={{ color: colors.muted }}>
                  No scheduled lessons found for {todayDayName}.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {todayKidLessons.slice(0, 4).map((l, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl border text-left flex flex-col justify-between"
                      style={{
                        backgroundColor: colors.chip,
                        borderColor: colors.line,
                      }}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold" style={{ color: colors.muted }}>
                        <span>L{l.lesson} · {l.time.split('–')[0]}</span>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SUBJ_COLOR[l.subject] || '#2F6BFF' }} />
                      </div>
                      <div className="font-black text-xs truncate mt-0.5" style={{ color: colors.ink }}>
                        {l.subject}
                      </div>
                      <div className="text-[10px] truncate" style={{ color: colors.muted }}>
                        {l.teacherName}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Real-time Teacher CATs & Assessments Alert */}
            {ecoState.teacherCATs && ecoState.teacherCATs.length > 0 && (
              <div
                className="p-3.5 rounded-2xl border shadow-sm space-y-2.5 transition-all"
                style={{
                  backgroundColor: isDark ? 'rgba(30, 58, 138, 0.25)' : '#EFF6FF',
                  borderColor: isDark ? 'rgba(59, 130, 246, 0.4)' : '#BFDBFE',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔔</span>
                    <span className="font-black text-xs text-blue-900 dark:text-blue-200">
                      Teacher CAT & Assessment Alerts ({ecoState.teacherCATs.length})
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                    Live Online
                  </span>
                </div>

                <div className="space-y-2">
                  {ecoState.teacherCATs.slice(0, 2).map((cat) => (
                    <div
                      key={cat.id}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9.5px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                            {cat.kind}
                          </span>
                          <span className="font-extrabold truncate" style={{ color: colors.ink }}>
                            {cat.title}
                          </span>
                        </div>
                        <div className="text-[10.5px] mt-0.5 text-slate-500">
                          {cat.subject} ({cat.strand}) · Max {cat.totalMarks} Mks · Due: <strong className="text-blue-600">{cat.dueDate}</strong> · Tr. {cat.teacherName}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {cat.documents && cat.documents.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              sound.playClick(400);
                              setReadingDoc(cat.documents[0]);
                            }}
                            className="px-2.5 py-1 text-[10.5px] font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                          >
                            📄 Read Paper
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick(500);
                            setWhatsappShareModal(cat);
                          }}
                          className="px-2.5 py-1 text-[10.5px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer flex items-center gap-1"
                        >
                          <span>💬 WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3 Stat KPI Tiles */}
            <div className="grid grid-cols-3 gap-2.5">
              <div
                className="rounded-2xl p-3 shadow-sm border"
                style={{
                  backgroundColor: isDark ? '#142E28' : '#DCFCE7',
                  borderColor: isDark ? '#1C4A3F' : '#BBF7D0',
                  color: isDark ? '#6EE7B7' : '#14532D',
                }}
              >
                <div className="text-xl font-black">{calculateAverage(activeKid)}%</div>
                <div
                  className="text-[10px] font-bold mt-0.5 uppercase tracking-wider"
                  style={{ color: isDark ? '#A7F3D0' : '#166534' }}
                >
                  Average
                </div>
              </div>

              <div
                className="rounded-2xl p-3 shadow-sm border"
                style={{
                  backgroundColor: isDark ? '#192C4D' : '#DBE7FF',
                  borderColor: isDark ? '#233F6E' : '#BFDBFE',
                  color: isDark ? '#93C5FD' : '#1E40AF',
                }}
              >
                <div className="text-xl font-black">{activeKid.att}</div>
                <div
                  className="text-[10px] font-bold mt-0.5 uppercase tracking-wider"
                  style={{ color: isDark ? '#BFDBFE' : '#1E3A8A' }}
                >
                  Attendance
                </div>
              </div>

              <div
                className="rounded-2xl p-3 shadow-sm border"
                style={{
                  backgroundColor: isDark ? '#3D3116' : '#FEF3C7',
                  borderColor: isDark ? '#59451C' : '#FDE68A',
                  color: isDark ? '#FCD34D' : '#92400E',
                }}
              >
                <div className="text-xl font-black">{NOTICES.length}</div>
                <div
                  className="text-[10px] font-bold mt-0.5 uppercase tracking-wider"
                  style={{ color: isDark ? '#FDE68A' : '#78350F' }}
                >
                  Notices
                </div>
              </div>
            </div>

            {/* Quick Action Tiles */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: colors.muted }}>
                Quick Access
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                <div
                  onClick={() => {
                    sound.playClick(500);
                    setCurrentTab('book');
                  }}
                  className="rounded-2xl p-3.5 text-white min-h-[92px] relative overflow-hidden shadow-md cursor-pointer active:scale-98 transition-all hover:brightness-105"
                  style={{
                    background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
                  }}
                >
                  <b className="block text-sm font-black">Assessment Book</b>
                  <small className="block text-[11px] opacity-90 mt-0.5">CBC Levels for every subject</small>
                  <span className="absolute right-2 bottom-1.5 text-2xl opacity-90">📘</span>
                </div>

                <div
                  onClick={() => {
                    sound.playClick(500);
                    setCurrentTab('report');
                  }}
                  className="rounded-2xl p-3.5 text-white min-h-[92px] relative overflow-hidden shadow-md cursor-pointer active:scale-98 transition-all hover:brightness-105"
                  style={{
                    background: 'linear-gradient(135deg, #2F6BFF, #60A5FA)',
                  }}
                >
                  <b className="block text-sm font-black">Assessment Report</b>
                  <small className="block text-[11px] opacity-90 mt-0.5">Marks and calculation</small>
                  <span className="absolute right-2 bottom-1.5 text-2xl opacity-90">📊</span>
                </div>
              </div>
            </div>

            {/* Elsie AI Academic Pathway Spotlight */}
            <ElsiePathwayHomeSpotlight
              analysis={pathwayAnalysis}
              isLoading={isAnalyzingPathways}
              isDark={isDark}
              colors={colors}
              onOpenFullReportAnalysis={handleOpenFullPathwayAnalysis}
              onAskElsie={handleOpenElsieWithPrompt}
            />

            {/* School Notices */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: colors.muted }}>
                Official School Notices
              </h3>
              <div className="space-y-2">
                {NOTICES.map(([title, desc], idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl border shadow-sm"
                    style={{
                      backgroundColor: colors.card,
                      borderColor: colors.line,
                    }}
                  >
                    <div className="font-extrabold text-xs" style={{ color: colors.ink }}>
                      {title}
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: colors.muted }}>
                      {desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Privacy Callout */}
            <div
              className="p-3 rounded-2xl text-[11px] leading-relaxed border"
              style={{
                backgroundColor: colors.chip,
                color: colors.chipink,
                borderColor: colors.line,
              }}
            >
              🔒 <strong>Privacy Assurance:</strong> You see only your own registered children ({kids.map((k: ChildProfile) => k.name).join(' & ') || 'your children'}). Other families’ records, administrative notes, and internal faculty remarks are never shown.
            </div>
          </div>
        )}

        {/* TAB 2: TIMETABLE — REAL-TIME CONNECTED TO ADMIN & TEACHERS */}
        {currentTab === 'timetable' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xl font-extrabold m-0" style={{ color: colors.ink }}>
                    {activeKid.name}'s Class Timetable
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                    ⚡ Live Synced
                  </span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: colors.muted }}>
                  {activeKid.grade} · 40-minute CBC periods (8:20 AM – 3:00 PM)
                </div>
              </div>

              {/* Child Switcher Pills (if multiple kids) */}
              {kids.length > 1 && (
                <div className="flex gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                  {kids.map((k: ChildProfile, idx: number) => {
                    const isSel = idx === currentChildIndex;
                    return (
                      <button
                        key={k.id}
                        onClick={() => {
                          sound.playClick(450);
                          setCurrentChildIndex(idx);
                        }}
                        className={`py-1 px-2.5 rounded-full text-xs font-black shrink-0 transition-all cursor-pointer ${
                          isSel
                            ? 'bg-[#2F6BFF] text-white shadow-xs'
                            : 'bg-black/10 dark:bg-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {k.name.split(' ')[0]} ({k.grade.replace('Grade ', 'G')})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Exam Freeze Warning if Active */}
            {liveFreeze && (
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs animate-fade-in">
                <div className="font-extrabold flex items-center gap-1.5 mb-0.5">
                  <span>❄️</span>
                  <span>Active Examination Timetable Freeze ({liveFreeze.why})</span>
                </div>
                <div>
                  Locked from {liveFreeze.from} to {liveFreeze.to}. Regular classroom lessons are paused for KPSEA &amp; school examinations.
                </div>
              </div>
            )}

            {/* Real Timetable Grid */}
            <div
              className="rounded-2xl border overflow-hidden shadow-xs"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.line,
              }}
            >
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-[11px] min-w-[520px]">
                  <thead>
                    <tr className="bg-[#0A1F4D] text-white text-[10px] uppercase font-black tracking-wider">
                      <th className="p-2 w-20 text-center">Time</th>
                      {DAYS.map((d) => {
                        const isToday = todayDayName === d;
                        return (
                          <th
                            key={d}
                            className={`p-2 text-center ${
                              isToday ? 'bg-indigo-600/60 text-amber-300' : ''
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>{d}</span>
                              {isToday && (
                                <span className="text-[8px] bg-amber-400 text-slate-950 px-1 rounded font-black">
                                  TODAY
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: colors.line }}>
                    {liveSlots.map((slot) => {
                      if (slot.brk) {
                        return (
                          <tr
                            key={slot.k}
                            className="bg-amber-50/70 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300 font-extrabold text-[10px] text-center"
                          >
                            <td colSpan={6} className="py-1.5 px-2">
                              {slot.brk} · {slot.t}
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={slot.k} className="align-top">
                          {/* Time & Lesson */}
                          <td
                            className="p-1.5 text-[9px] font-bold border-r whitespace-nowrap text-center"
                            style={{
                              backgroundColor: colors.chip,
                              borderColor: colors.line,
                            }}
                          >
                            <div className="font-extrabold" style={{ color: colors.ink }}>{slot.t.split('–')[0]}</div>
                            <div className="text-[8px]" style={{ color: colors.muted }}>L{slot.lesson}</div>
                          </td>

                          {/* 5 Days */}
                          {DAYS.map((day) => {
                            const isToday = todayDayName === day;

                            // Lower grade lesson 7 check
                            if (slot.lesson === 7 && LOWER_GRADES.includes(activeKidGrade)) {
                              return (
                                <td
                                  key={day}
                                  className={`p-1.5 border-r text-center ${
                                    isToday ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                                  }`}
                                  style={{ borderColor: colors.line }}
                                >
                                  <div className="rounded-lg p-1.5 text-[9px] font-extrabold bg-teal-600 text-white shadow-2xs">
                                    Clubs &amp; Activities
                                  </div>
                                </td>
                              );
                            }

                            const cellKey = `${day}|${slot.k}|${activeKidGrade}`;
                            const entry = liveTimetable[cellKey];

                            if (!entry) {
                              return (
                                <td
                                  key={day}
                                  className={`p-1.5 border-r text-center ${
                                    isToday ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                                  }`}
                                  style={{ borderColor: colors.line }}
                                >
                                  <div className="text-[9px] py-1 italic opacity-60" style={{ color: colors.muted }}>
                                    — Free —
                                  </div>
                                </td>
                              );
                            }

                            const subjColor = SUBJ_COLOR[entry.subject] || '#2F6BFF';
                            const teacherName = getTeacherName(entry.teacherId);

                            return (
                              <td
                                key={day}
                                className={`p-1.5 border-r align-top ${
                                  isToday ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                                }`}
                                style={{ borderColor: colors.line }}
                              >
                                <div
                                  className="rounded-lg p-1 text-[9px] font-extrabold text-white shadow-2xs transition-transform hover:scale-[1.02] flex flex-col justify-between min-h-[38px]"
                                  style={{ backgroundColor: subjColor }}
                                >
                                  <div className="flex items-center justify-between gap-0.5">
                                    <span className="truncate">{entry.subject.split(' ')[0]}</span>
                                    {entry.subject.includes('PPI') && <span>🙏</span>}
                                  </div>
                                  <div className="truncate text-[8px] opacity-90 font-medium">
                                    {teacherName.startsWith('Tr.') ? teacherName : `Tr. ${teacherName.split(' ')[1] || teacherName}`}
                                  </div>
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

            {/* Parent Information Card */}
            <div
              className="p-3.5 rounded-2xl border shadow-sm"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.line,
              }}
            >
              <div className="font-extrabold text-xs flex items-center justify-between" style={{ color: colors.ink }}>
                <span>🏫 Little Roses Academy Bell Policies</span>
                <span className="text-[10px]" style={{ color: colors.muted }}>40 mins/period</span>
              </div>
              <div className="text-[11px] mt-1.5 leading-relaxed space-y-1" style={{ color: colors.muted }}>
                <div>• Pupils arrive by 7:30 AM. Assembly and devotion conclude at 8:15 AM before Lesson 1 begins.</div>
                <div>• Parents picking up learners are advised to arrive at 3:00 PM for official dismissal.</div>
                <div>• In case of any schedule inquiry, you can directly consult ELSIE via chat or contact the class teacher.</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ASSESSMENT BOOK */}
        {currentTab === 'book' && (
          <div className="space-y-4 animate-fade-in">
            {/* 30-Day Download Notice */}
            <AssessmentDownloadNotice
              onDownloadBook={() => handleDownloadPDF('Assessment Book')}
              onDownloadReport={() => setCurrentTab('report')}
            />

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold m-0" style={{ color: colors.ink }}>
                  Official CBC Assessment Book
                </h2>
                <div className="text-[11px] mt-0.5" style={{ color: colors.muted }}>
                  {activeKid.name} ({activeKid.adm}) · All 8 CBC Subjects
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadPDF('Assessment Book')}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <span>📥</span>
                <span>Download / Print Book</span>
              </button>
            </div>

            {/* Official Assessment Book Dynamic Cover */}
            <div
              className="rounded-3xl p-4 border shadow-xl space-y-3"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.line,
              }}
            >
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: colors.line }}>
                <div>
                  <span className="text-[10px] font-mono uppercase font-black text-orange-600">
                    Official Assessment Book Cover
                  </span>
                  <div className="text-xs font-black" style={{ color: colors.ink }}>
                    {activeKid.name} — {getAcademicYear()} Academic Session
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Auto-Rollover Active
                </span>
              </div>

              <div
                onClick={() => {
                  sound.playClick(450);
                  setBookletInitialTab('book');
                  setShowFullBooklet(true);
                }}
                className="max-w-[280px] sm:max-w-[320px] mx-auto overflow-hidden rounded-2xl shadow-xl border-3 border-amber-300 cursor-pointer hover:scale-[1.01] transition-transform"
                title="Tap to preview and open official Master Assessment Book"
              >
                <AssessmentBookCover
                  learner={{
                    name: activeKid.name,
                    adm: activeKid.adm,
                    grade: activeKid.grade,
                    stream: activeKid.stream,
                  }}
                />
              </div>

              <p className="text-[11px] text-center" style={{ color: colors.muted }}>
                Official CBC Assessment Book cover featuring authenticated learner credentials, grade level, and academic year. (Tap cover to open & print complete master booklet)
              </p>

              {/* Dynamic Focus Zone from Teacher Evaluations (<= 70%) */}
              {(() => {
                const focusItems = getLearnerFocusZoneItems(activeKid.adm);
                if (focusItems.length === 0) return null;
                return (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 space-y-2.5 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">⚡</span>
                        <div>
                          <h4 className="font-black text-xs m-0" style={{ color: colors.ink }}>
                            Teacher Flagged Focus Strands (Score ≤ 70%)
                          </h4>
                          <p className="text-[10px] m-0" style={{ color: colors.muted }}>
                            Specific curriculum strands where {activeKid.name} needs revision assistance at home
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white">
                        {focusItems.length} {focusItems.length === 1 ? 'Strand' : 'Strands'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {focusItems.map((item) => (
                        <div
                          key={`${item.subStrandId}_${item.term}`}
                          className="p-2.5 rounded-xl border border-amber-300 dark:border-amber-700/50 bg-[var(--card)] space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300">
                              {item.subject} · {item.grade} · Term {item.term}
                            </span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                              {item.compositeScore}% ({item.rubric})
                            </span>
                          </div>
                          <div className="font-black text-xs" style={{ color: colors.ink }}>
                            {item.subStrandName}
                          </div>
                          {item.teacherRemarks && (
                            <div className="text-[10.5px] italic" style={{ color: colors.muted }}>
                              "{item.teacherRemarks}" — {item.teacherName || 'Subject Teacher'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Subject Bands Section */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: colors.muted }}>
                Subjects Performance Bands
              </h3>

              <div className="space-y-2.5">
                {activeKid.subj.map(([subjName, pct]: [string, number]) => {
                  const band = getBandOf(pct);
                  return (
                    <div
                      key={subjName}
                      className="p-3.5 rounded-2xl border shadow-sm"
                      style={{
                        backgroundColor: colors.card,
                        borderColor: colors.line,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="grow min-w-0">
                          <div className="font-extrabold text-xs" style={{ color: colors.ink }}>
                            {subjName}
                          </div>
                          <div className="text-[11px]" style={{ color: colors.muted }}>
                            Total score: {pct}%
                          </div>
                        </div>
                        <div className="text-sm font-black" style={{ color: colors.ink }}>
                          {pct}%
                        </div>
                      </div>

                      {/* CBC Horizontal Colored Bands with Marker */}
                      <div className="relative h-3 rounded-md overflow-hidden flex my-2 bg-slate-200">
                        <div style={{ width: '50%', backgroundColor: '#E11D48' }} title="BE: <50%" />
                        <div style={{ width: '20%', backgroundColor: '#F5B301' }} title="AE: 50-70%" />
                        <div style={{ width: '10%', backgroundColor: '#2563EB' }} title="ME: 71-79%" />
                        <div style={{ width: '20%', backgroundColor: '#16A34A' }} title="EE: 80-100%" />

                        {/* Exact Horizontal Pointer Marker */}
                        <div
                          className="absolute -top-1 w-1 h-5 rounded-full shadow-md z-10 -translate-x-1/2"
                          style={{
                            left: `${pct}%`,
                            backgroundColor: colors.ink,
                            border: '1px solid white',
                          }}
                        />
                      </div>

                      {/* Band Scale Labels */}
                      <div className="flex justify-between text-[9px] font-bold" style={{ color: colors.muted }}>
                        <span>BE (&lt;50%)</span>
                        <span>AE (50-70%)</span>
                        <span>ME (71-79%)</span>
                        <span>EE (≥80%)</span>
                      </div>

                      {/* Performance Level Pill */}
                      <div
                        className="inline-flex items-center gap-1.5 font-black text-[10px] text-white px-2.5 py-1 rounded-full mt-2"
                        style={{ backgroundColor: BAND_COLOR[band] }}
                      >
                        <span>{band}</span>
                        <span>·</span>
                        <span>{BNAME[band]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Download & Open Master Assessment Book Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  sound.playClick(450);
                  setBookletInitialTab('book');
                  setShowFullBooklet(true);
                }}
                className="flex-1 py-3 px-4 rounded-2xl font-extrabold text-xs text-white shadow-md cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-2 hover:opacity-95"
                style={{ backgroundColor: '#7C3AED' }}
              >
                <span>📖</span>
                <span>Open Full Assessment Book</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadPDF('Assessment Book')}
                className="py-3 px-4 rounded-2xl font-extrabold text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-md cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-1.5"
              >
                <span>📥</span>
                <span>Download</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: ASSESSMENT REPORT */}
        {currentTab === 'report' && (
          <div className="space-y-4 animate-fade-in">
            {/* 30-Day Download Notice */}
            <AssessmentDownloadNotice
              onDownloadBook={() => setCurrentTab('book')}
              onDownloadReport={() => handleDownloadPDF('Assessment Report')}
            />

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold m-0" style={{ color: colors.ink }}>
                  Official Termly Assessment Report
                </h2>
                <div className="text-[11px] mt-0.5" style={{ color: colors.muted }}>
                  {activeKid.name} ({activeKid.adm}) · Every CAT & Assignment by Strand
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadPDF('Assessment Report')}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-black text-xs shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <span>📥</span>
                <span>Download / Print Report</span>
              </button>
            </div>

            {/* Official Assessment Report Dynamic Cover */}
            <div
              className="rounded-3xl p-4 border shadow-xl space-y-3"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.line,
              }}
            >
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: colors.line }}>
                <div>
                  <span className="text-[10px] font-mono uppercase font-black text-pink-600">
                    Official Assessment Report Cover
                  </span>
                  <div className="text-xs font-black" style={{ color: colors.ink }}>
                    {activeKid.name} — {getAcademicYear()} Academic Session
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300">
                  Auto-Rollover Active
                </span>
              </div>

              <div
                onClick={() => {
                  sound.playClick(450);
                  setBookletInitialTab('report');
                  setShowFullBooklet(true);
                }}
                className="max-w-[280px] sm:max-w-[320px] mx-auto overflow-hidden rounded-2xl shadow-xl border-3 border-pink-400 cursor-pointer hover:scale-[1.01] transition-transform"
                title="Tap to open official Termly Assessment Report"
              >
                <AssessmentReportCover
                  learner={{
                    name: activeKid.name,
                    adm: activeKid.adm,
                    grade: activeKid.grade,
                    stream: activeKid.stream,
                  }}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(450);
                    setBookletInitialTab('report');
                    setShowFullBooklet(true);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl font-black text-xs text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>📊</span>
                  <span>Open Full Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPDF('Assessment Report')}
                  className="py-2.5 px-3.5 rounded-xl font-black text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>📥</span>
                  <span>Download</span>
                </button>
              </div>
            </div>

            <div className="inline-block text-[11px] px-2.5 py-1 rounded-xl font-bold bg-blue-100 text-blue-900 border border-blue-300">
              Formula: Total % = round(CAT % × 0.60 + Assignments % × 0.40)
            </div>

            {/* Elsie AI Assessment Report Analysis & Personalized Academic Pathways */}
            <ElsiePathwayAdvisorCard
              analysis={pathwayAnalysis}
              isLoading={isAnalyzingPathways}
              isDark={isDark}
              colors={colors}
              onRefreshAnalysis={handleRefreshPathwayAnalysis}
              onAskElsie={handleOpenElsieWithPrompt}
            />

            {/* Detailed Subject Strands */}
            <div className="space-y-3">
              {activeKid.detail.map((s: SubjectDetail) => (
                <div
                  key={s.name}
                  className="p-3.5 rounded-2xl border shadow-sm space-y-2.5"
                  style={{
                    backgroundColor: colors.card,
                    borderColor: colors.line,
                    borderLeft: `6px solid ${SUBJ_COLOR[s.name] || '#7C3AED'}`,
                  }}
                >
                  {/* Subject Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-xs" style={{ color: colors.ink }}>
                        {s.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        CAT {Math.round(s.catPct)}% × 0.60 + Asg {Math.round(s.asgPct)}% × 0.40
                      </div>
                    </div>
                    <div className="text-base font-black" style={{ color: colors.ink }}>
                      {s.pct}%
                    </div>
                  </div>

                  {/* Strands Breakdown */}
                  {s.strands.map((t: StrandDetail) => (
                    <div
                      key={t.name}
                      className="p-2.5 rounded-xl border mt-2 space-y-2"
                      style={{
                        backgroundColor: colors.sub,
                        borderColor: colors.line,
                      }}
                    >
                      <div className="flex items-center justify-between font-bold text-xs" style={{ color: colors.ink }}>
                        <span>{t.name}</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          {t.cats.length} CATs · {t.asg.length} assignments
                        </span>
                      </div>

                      {/* CATs list */}
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          CATs (out of 10)
                        </div>
                        <div className="space-y-1">
                          {t.cats.map((v: number, ci: number) => (
                            <div
                              key={ci}
                              className="flex items-center justify-between text-[11px] py-0.5 border-b border-dashed"
                              style={{ borderColor: colors.line }}
                            >
                              <span style={{ color: colors.muted }}>CAT {ci + 1}</span>
                              <span className="font-extrabold" style={{ color: colors.ink }}>
                                {v} / 10
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Assignments list */}
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Assignments (out of 10)
                        </div>
                        <div className="space-y-1">
                          {t.asg.map((v: number, ai: number) => (
                            <div
                              key={ai}
                              className="flex items-center justify-between text-[11px] py-0.5 border-b border-dashed"
                              style={{ borderColor: colors.line }}
                            >
                              <span style={{ color: colors.muted }}>Assignment {ai + 1}</span>
                              <span className="font-extrabold" style={{ color: colors.ink }}>
                                {v} / 10
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Attached Assessment & Assignment Documents */}
            <div
              className="rounded-2xl p-4 shadow-sm border space-y-3"
              style={{ backgroundColor: colors.card, borderColor: colors.line }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-black flex items-center gap-1.5" style={{ color: colors.ink }}>
                    <span>📎</span>
                    <span>Attached CAT & Homework Documents</span>
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: colors.muted }}>
                    Official exam papers, homework packs, and scanned sheets
                  </div>
                </div>
                <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white px-2.5 py-1.5 rounded-xl cursor-pointer bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm">
                  <span>+</span>
                  <span>Upload Doc</span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadParentAssessmentDoc(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              {/* Teacher-Uploaded Online CATs */}
              {ecoState.teacherCATs && ecoState.teacherCATs.length > 0 && (
                <div className="space-y-2 pb-2 mb-2 border-b" style={{ borderColor: colors.line }}>
                  <div className="text-[11px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                    Teacher-Uploaded Continuous Assessment Tests (Online)
                  </div>
                  {ecoState.teacherCATs.map((cat) => (
                    <div
                      key={cat.id}
                      className="p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs"
                      style={{ backgroundColor: colors.sub, borderColor: colors.line }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9.5px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                            {cat.kind}
                          </span>
                          <span className="font-extrabold" style={{ color: colors.ink }}>
                            {cat.title}
                          </span>
                        </div>
                        <div className="text-[10.5px] mt-0.5 text-slate-500">
                          {cat.subject} · Strand: {cat.strand} · {cat.totalMarks} Marks · Due: <strong className="text-blue-600">{cat.dueDate}</strong> · Tr. {cat.teacherName}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {cat.documents && cat.documents.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              sound.playClick(400);
                              setReadingDoc(cat.documents[0]);
                            }}
                            className="px-2.5 py-1 text-[10.5px] font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                          >
                            📖 Read Paper
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick(500);
                            setWhatsappShareModal(cat);
                          }}
                          className="px-2.5 py-1 text-[10.5px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer flex items-center gap-1"
                        >
                          <span>💬 WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                {parentDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border text-xs"
                    style={{ backgroundColor: colors.sub, borderColor: colors.line }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                          doc.ext === 'PDF'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300'
                        }`}
                      >
                        {doc.ext}
                      </span>
                      <div className="min-w-0 truncate">
                        <p className="font-bold truncate text-[12px]" style={{ color: colors.ink }}>
                          {doc.name}
                        </p>
                        <p className="text-[10px]" style={{ color: colors.muted }}>
                          {formatFileSize(doc.size)} · {doc.uploadedAt} {doc.aiAnalysis?.competencyFocus ? `· ${doc.aiAnalysis.competencyFocus}` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        sound.playClick(500);
                        setReadingDoc(doc);
                      }}
                      className="shrink-0 px-2.5 py-1 text-[11px] font-extrabold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm cursor-pointer"
                    >
                      📖 Read / Tools
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Download Report Button */}
            <button
              onClick={() => handleDownloadPDF('Assessment Report')}
              className="w-full py-3 px-4 rounded-2xl font-extrabold text-xs text-white shadow-md cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#2F6BFF' }}
            >
              <span>📥</span>
              <span>Download Assessment Report (PDF)</span>
            </button>
          </div>
        )}

        {/* TAB 4: ATTENDANCE */}
        {currentTab === 'attend' && (
          <div className="space-y-3.5 animate-fade-in">
            <div>
              <h2 className="text-base font-extrabold" style={{ color: colors.ink }}>
                Attendance
              </h2>
              <div className="text-[11px] mt-0.5" style={{ color: colors.muted }}>
                {activeKid.name} · Term 1 record
              </div>
            </div>

            {/* Attendance Stat Tiles */}
            <div className="grid grid-cols-3 gap-2.5">
              <div
                className="rounded-2xl p-3 shadow-sm border"
                style={{
                  backgroundColor: isDark ? '#142E28' : '#DCFCE7',
                  borderColor: isDark ? '#1C4A3F' : '#BBF7D0',
                  color: isDark ? '#6EE7B7' : '#14532D',
                }}
              >
                <div className="text-2xl font-black">42</div>
                <div className="text-[10px] font-bold uppercase tracking-wider">Present</div>
              </div>

              <div
                className="rounded-2xl p-3 shadow-sm border"
                style={{
                  backgroundColor: isDark ? '#3E1922' : '#FFE4E6',
                  borderColor: isDark ? '#5A2532' : '#FECDD3',
                  color: isDark ? '#FDA4AF' : '#9F1239',
                }}
              >
                <div className="text-2xl font-black">2</div>
                <div className="text-[10px] font-bold uppercase tracking-wider">Absent</div>
              </div>

              <div
                className="rounded-2xl p-3 shadow-sm border"
                style={{
                  backgroundColor: isDark ? '#3D3116' : '#FEF3C7',
                  borderColor: isDark ? '#59451C' : '#FDE68A',
                  color: isDark ? '#FCD34D' : '#92400E',
                }}
              >
                <div className="text-2xl font-black">3</div>
                <div className="text-[10px] font-bold uppercase tracking-wider">Late</div>
              </div>
            </div>

            {/* Recent Daily Logs Card */}
            <div
              className="p-3.5 rounded-2xl border shadow-sm space-y-2.5"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.line,
              }}
            >
              <div className="font-extrabold text-xs" style={{ color: colors.ink }}>
                Recent Daily Check-ins (This Week)
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between p-2 rounded-xl bg-black/5 dark:bg-white/5">
                  <span className="font-semibold" style={{ color: colors.ink }}>
                    Friday
                  </span>
                  <span className="text-emerald-500 font-bold">Present · 7:42 AM</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-black/5 dark:bg-white/5">
                  <span className="font-semibold" style={{ color: colors.ink }}>
                    Thursday
                  </span>
                  <span className="text-emerald-500 font-bold">Present · 7:40 AM</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-black/5 dark:bg-white/5">
                  <span className="font-semibold" style={{ color: colors.ink }}>
                    Wednesday
                  </span>
                  <span className="text-amber-500 font-bold">Late · 8:15 AM (School Bus Delay)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-black/5 dark:bg-white/5">
                  <span className="font-semibold" style={{ color: colors.ink }}>
                    Tuesday
                  </span>
                  <span className="text-emerald-500 font-bold">Present · 7:50 AM</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-black/5 dark:bg-white/5">
                  <span className="font-semibold" style={{ color: colors.ink }}>
                    Monday
                  </span>
                  <span className="text-emerald-500 font-bold">Present · 7:45 AM</span>
                </div>
              </div>
            </div>

            <div
              className="p-3 rounded-2xl text-[11px] leading-relaxed border"
              style={{
                backgroundColor: colors.chip,
                color: colors.chipink,
                borderColor: colors.line,
              }}
            >
              ℹ️ Attendance is officially marked by the class teacher during morning assembly. Any unexpected absence prompts an immediate SMS notification to your phone.
            </div>
          </div>
        )}

        {/* TAB 5: ELSIE AI */}
        {currentTab === 'ask' && (
          <div className="h-full min-h-[420px] overflow-hidden rounded-2xl border shadow-sm" style={{ borderColor: colors.line }}>
            <ElsieChatView
              identity={parentIdentity}
              onClose={() => setCurrentTab('home')}
              autoPrompt={elsieAutoPrompt}
              onAutoPromptConsumed={() => setElsieAutoPrompt(null)}
              quickPrompts={[
                `How is ${activeKid.name} performing in released subjects?`,
                `Which Kenyan Senior School Pathway fits ${activeKid.name}?`,
                `What Focus Zone areas need help for ${activeKid.name}?`,
                'Niaje Elsie, rada?',
                'Shikamoo Elsie',
              ]}
              theme={isDark ? 'dark' : 'light'}
            />
          </div>
        )}
      </div>

      {/* Docked Bottom Navigation Bar */}
      <div className="shrink-0 px-2.5 sm:px-3 pt-1 pb-2.5 z-20">
        <nav
          className="flex rounded-[24px] p-1.5 shadow-xl border border-white/10"
          style={{
            background: 'linear-gradient(120deg, #0A1F4D, #14296B)',
            boxShadow: '0 8px 22px rgba(10,31,77,0.45)',
          }}
        >
          <button
            onClick={() => {
              sound.playClick(400);
              setCurrentTab('home');
            }}
            className={`min-w-0 flex-1 py-1.5 px-0.5 rounded-2xl flex flex-col items-center gap-0.5 text-[9px] sm:text-[10px] font-extrabold transition-all cursor-pointer ${
              currentTab === 'home'
                ? 'text-white shadow-sm'
                : 'text-[#B8C6E8] hover:text-white'
            }`}
            style={{
              background:
                currentTab === 'home'
                  ? 'linear-gradient(120deg, #2F6BFF, #4F8BFF)'
                  : 'transparent',
            }}
          >
            <span className="text-base leading-none">🏠</span>
            <span className="w-full truncate text-center leading-tight">Home</span>
          </button>

          <button
            onClick={() => {
              sound.playClick(400);
              setCurrentTab('timetable');
            }}
            className={`min-w-0 flex-1 py-1.5 px-0.5 rounded-2xl flex flex-col items-center gap-0.5 text-[9px] sm:text-[10px] font-extrabold transition-all cursor-pointer ${
              currentTab === 'timetable'
                ? 'text-white shadow-sm'
                : 'text-[#B8C6E8] hover:text-white'
            }`}
            style={{
              background:
                currentTab === 'timetable'
                  ? 'linear-gradient(120deg, #2F6BFF, #4F8BFF)'
                  : 'transparent',
            }}
          >
            <span className="text-base leading-none">🗓️</span>
            <span className="w-full truncate text-center leading-tight">
              <span className="sm:hidden">Schedule</span>
              <span className="hidden sm:inline">Timetable</span>
            </span>
          </button>

          <button
            onClick={() => {
              sound.playClick(400);
              setCurrentTab('book');
            }}
            className={`min-w-0 flex-1 py-1.5 px-0.5 rounded-2xl flex flex-col items-center gap-0.5 text-[9px] sm:text-[10px] font-extrabold transition-all cursor-pointer ${
              currentTab === 'book'
                ? 'text-white shadow-sm'
                : 'text-[#B8C6E8] hover:text-white'
            }`}
            style={{
              background:
                currentTab === 'book'
                  ? 'linear-gradient(120deg, #2F6BFF, #4F8BFF)'
                  : 'transparent',
            }}
          >
            <span className="text-base leading-none">📘</span>
            <span className="w-full truncate text-center leading-tight">Book</span>
          </button>

          <button
            onClick={() => {
              sound.playClick(400);
              setCurrentTab('report');
            }}
            className={`min-w-0 flex-1 py-1.5 px-0.5 rounded-2xl flex flex-col items-center gap-0.5 text-[9px] sm:text-[10px] font-extrabold transition-all cursor-pointer ${
              currentTab === 'report'
                ? 'text-white shadow-sm'
                : 'text-[#B8C6E8] hover:text-white'
            }`}
            style={{
              background:
                currentTab === 'report'
                  ? 'linear-gradient(120deg, #2F6BFF, #4F8BFF)'
                  : 'transparent',
            }}
          >
            <span className="text-base leading-none">📊</span>
            <span className="w-full truncate text-center leading-tight">Report</span>
          </button>

          <button
            onClick={() => {
              sound.playClick(400);
              setCurrentTab('attend');
            }}
            className={`min-w-0 flex-1 py-1.5 px-0.5 rounded-2xl flex flex-col items-center gap-0.5 text-[9px] sm:text-[10px] font-extrabold transition-all cursor-pointer ${
              currentTab === 'attend'
                ? 'text-white shadow-sm'
                : 'text-[#B8C6E8] hover:text-white'
            }`}
            style={{
              background:
                currentTab === 'attend'
                  ? 'linear-gradient(120deg, #2F6BFF, #4F8BFF)'
                  : 'transparent',
            }}
          >
            <span className="text-base leading-none">✅</span>
            <span className="w-full truncate text-center leading-tight">
              <span className="sm:hidden">Attend.</span>
              <span className="hidden sm:inline">Attendance</span>
            </span>
          </button>

          <button
            onClick={() => {
              sound.playClick(400);
              setCurrentTab('ask');
            }}
            className={`min-w-0 flex-1 py-1.5 px-0.5 rounded-2xl flex flex-col items-center gap-0.5 text-[9px] sm:text-[10px] font-extrabold transition-all cursor-pointer ${
              currentTab === 'ask'
                ? 'text-white shadow-sm'
                : 'text-[#B8C6E8] hover:text-white'
            }`}
            style={{
              background:
                currentTab === 'ask'
                  ? 'linear-gradient(120deg, #2F6BFF, #4F8BFF)'
                  : 'transparent',
            }}
          >
            <span className="text-base leading-none">🤖</span>
            <span className="w-full truncate text-center leading-tight">ELSIE AI</span>
          </button>
        </nav>
      </div>

      {/* Document Reader & Inspection Modal */}
      {readingDoc && (
        <DocumentReaderModal
          document={readingDoc}
          onClose={() => setReadingDoc(null)}
          assessmentKind="CAT"
        />
      )}

      {/* WhatsApp Share / View Modal */}
      {whatsappShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div
            className={`w-full max-w-md rounded-3xl p-5 border shadow-2xl space-y-4 ${
              isDark ? 'bg-slate-900 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">💬</span>
                <h3 className="font-black text-sm">CAT Assessment Alert (WhatsApp)</h3>
              </div>
              <button
                onClick={() => setWhatsappShareModal(null)}
                className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-xs font-bold"
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
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 font-bold text-xs"
              >
                Close
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(whatsappShareModal.whatsappMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  sound.playClick(500);
                  setWhatsappShareModal(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 no-underline"
              >
                <span>📲 Open in WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW OFFICIAL ASSESSMENT COVER & REPORT */}
      {viewingOfficialCover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
          <div
            className={`w-full max-w-md max-h-[92vh] rounded-3xl p-4 sm:p-5 border shadow-2xl flex flex-col overflow-hidden print:max-h-none print:border-none print:shadow-none print:p-0 ${
              isDark ? 'bg-slate-900 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 shrink-0 print:hidden">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-500">
                  Little Roses Academy · Official CBC Record
                </span>
                <h3 className="font-black text-sm m-0">
                  {viewingOfficialCover === 'book' ? 'CBC Assessment Book Cover' : 'Official Assessment Report Cover'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingOfficialCover(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3 print:py-0">
              <div className="p-1">
                {viewingOfficialCover === 'book' ? (
                  <AssessmentBookCover
                    learner={{
                      name: activeKid.name,
                      adm: activeKid.adm,
                      grade: activeKid.grade,
                      stream: activeKid.stream,
                    }}
                  />
                ) : (
                  <AssessmentReportCover
                    learner={{
                      name: activeKid.name,
                      adm: activeKid.adm,
                      grade: activeKid.grade,
                      stream: activeKid.stream,
                    }}
                  />
                )}
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] space-y-1 print:hidden">
                <div className="font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span>📚</span>
                  <span>Live Assessment Lifecycle &amp; 30-Day Term 3 Window</span>
                </div>
                <p className="text-[10.5px] opacity-80 m-0">
                  Official assessment booklets and reports for {activeKid.name} ({activeKid.adm}) update automatically without waiting for admin push. At the close of Term 3, parents receive 30 days of download reminders before next-class promotion and book deletion.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex flex-wrap gap-2 shrink-0 print:hidden">
              <button
                type="button"
                onClick={() => {
                  sound.playClick(400);
                  setViewingOfficialCover(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 font-bold text-xs cursor-pointer hover:opacity-80"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick(450);
                  const targetTab = viewingOfficialCover === 'report' ? 'report' : 'book';
                  setViewingOfficialCover(null);
                  setBookletInitialTab(targetTab);
                  setShowFullBooklet(true);
                }}
                className="flex-1 py-2.5 rounded-xl font-black text-xs text-white bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>📖</span>
                <span>{viewingOfficialCover === 'report' ? 'Open Master Report' : 'Open Master Book'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleDownloadPDF(viewingOfficialCover === 'report' ? 'Assessment Report' : 'Assessment Book');
                }}
                className="flex-1 py-2.5 rounded-xl font-black text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>📥</span>
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Master Assessment Booklet Modal (Strictly Scoped to This Household's Child(ren)) */}
      {showFullBooklet && (
        <NativeAssessmentBooklet
          role="parent"
          initialTab={bookletInitialTab}
          initialGrade={activeKid.grade}
          allowedLearners={kids.map((k) => ({
            id: k.id,
            name: k.name,
            adm: k.adm,
            grade: k.grade,
            stream: k.stream,
            parentPhone: sessionUser?.phone || sessionUser?.identifier || '',
            familyId: familyCode,
          }))}
          learner={{
            id: activeKid.id,
            name: activeKid.name,
            adm: activeKid.adm,
            grade: activeKid.grade as any,
            stream: activeKid.stream,
            parentPhone: sessionUser?.phone || sessionUser?.identifier || '',
            familyId: familyCode,
            fatherName: parentDisplayName,
            fatherPhone: sessionUser?.phone || sessionUser?.identifier || '',
            motherName: '',
            motherPhone: '',
          }}
          onClose={() => setShowFullBooklet(false)}
          onShowToast={showLocalToast}
        />
      )}


      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-20 bg-[#0A1F4D] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-2xl z-30 pointer-events-none animate-bounce border border-blue-400">
          {toastMessage}
        </div>
      )}
    </div>
  );
};
