import React, { useState, useEffect, useRef, useMemo } from 'react';
import { sound } from '../../utils/sound';
import { useBackHandler } from '../../utils/navigationHistory';
import { ElsieChatView } from '../common/ElsieChatView';
import { UserIdentity } from '../../utils/elsieEngine';
import { DocumentReaderModal } from '../DocumentReaderModal';
import {
  readUploadedDocument,
  formatFileSize,
  AttachedDocument,
} from '../../utils/documentReader';
import { CBC_SYLLABUS_TOPICS } from '../../data/cbcCurriculumData';
import { ecosystemSync } from '../../utils/ecosystemSync';
import { pullSchoolStateFromCloud } from '../../utils/cloudSync';
import { LessonNoteItem, TeacherCATUploadItem } from '../../types/cbcDocuments';
import {
  AssessmentBookCover,
  AssessmentReportCover,
  AssessmentDownloadNotice,
  getAcademicYear,
  getLearnerGradeDisplay,
} from '../common/AssessmentCovers';
import { AssessmentBookView } from '../common/AssessmentBookView';
import { AssessmentReportView } from '../common/AssessmentReportView';
import { NativeAssessmentBooklet } from '../common/NativeAssessmentBooklet';
import { downloadAssessmentDocument } from '../../utils/bookletDownload';
import { AssessmentCoverInspectorModal } from '../common/AssessmentCoverInspectorModal';
import { getLearnerFocusZoneItems } from '../../utils/cbcCalculations';
import { OFFICIAL_BOOKLET_PDFS } from '../../data/officialCbcBooklets';
import {
  ALL_HOLIDAY_CATS,
  getHolidayCATForDate,
  KICD_PAST_PAPERS_COLLECTION,
  DailyHolidayCAT,
  KICDPastPaper,
  KICDQuestion,
} from '../../data/kicdPastPapersData';
import {
  getPushedAssignments,
  recordLearnerCATCompletion,
  PushedCATAssignment,
} from '../../utils/aiQuestionParser';
import { useTimetableSync } from '../../utils/timetableSync';
import { SLOTS, DAYS, GradeName, GRADES, GRADE_COLORS, LOWER_GRADES } from '../admin/types';
import { INITIAL_ADMIN_STATE } from '../admin/initialData';
import { DATA } from '../../data/curriculumData';
import { LearningAreaDef, LevelBand } from '../../types/cbcAssessment';
import { getStoredMarks, getStoredSubmissions, makeMarkKey, resultOf, band, LEVEL_COLORS, LEVEL_NAMES } from '../../utils/cbcAssessmentEngine';
import { computeRealLearnerAssessmentSummary } from '../../utils/elsiePathways';
import { getNotificationPermissionState, getUnreadNotificationCount } from '../../utils/notifications';
import { LearnerAssignmentTimetable } from './LearnerAssignmentTimetable';

// Isolated Nairobi Clock component that updates every second without causing LearnerPortal to re-render
const LiveNairobiClock: React.FC = React.memo(() => {
  const [timeStr, setTimeStr] = useState<string>(() => {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Nairobi',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date());
    } catch {
      return new Date().toLocaleTimeString();
    }
  });

  useEffect(() => {
    const timer = setInterval(() => {
      try {
        const time = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Africa/Nairobi',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(new Date());
        setTimeStr(time);
      } catch {
        setTimeStr(new Date().toLocaleTimeString());
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="text-[12px] font-extrabold bg-white/15 px-3 py-1 rounded-full tracking-wider font-mono shrink-0">
      {timeStr} EAT
    </span>
  );
});

interface LearnerPortalProps {
  onExitPortal: () => void;
  onShowToast: (msg: string) => void;
}

const TZ = 'Africa/Nairobi';

const SUBJ: Record<string, string> = {
  English: '#DB2777',
  Kiswahili: '#A21CAF',
  Mathematics: '#7C3AED',
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

const SUBJ_ICONS: Record<string, string> = {
  English: '📘',
  Kiswahili: '📗',
  Mathematics: '📐',
  'Science & Technology': '🔬',
  'Science and Technology': '🔬',
  'Social Studies': '🌍',
  CRE: '📖',
  'Christian Religious Education': '📖',
  'Agriculture & Nutrition': '🌱',
  'Agriculture and Nutrition': '🌱',
  'Creative Arts': '🎨',
  'Creative Activities': '🎨',
  'Environmental Activities': '🌿',
};

// Daily rotating subject per weekday
const ROT: Record<string, string> = {
  Mon: 'English',
  Tue: 'Kiswahili',
  Wed: 'Science & Technology',
  Thu: 'Social Studies',
  Fri: 'Creative Arts',
};

type QuestionItem = [string, string[], number];

const QS: Record<string, QuestionItem[]> = {
  Mathematics: [
    ['What is 3/4 + 1/4?', ['1/2', '1', '1 1/4', '4/8'], 1],
    ['Which fraction is equivalent to 1/2?', ['2/3', '2/4', '3/5', '1/3'], 1],
    ['How many quarters make 1 whole?', ['2', '3', '4', '8'], 2],
    ['What is the place value of digit 7 in 47,825?', ['Hundreds', 'Tens', 'Thousands', 'Ten Thousands'], 2],
    ['What is the perimeter of a rectangle measuring 8 cm by 5 cm?', ['40 cm', '26 cm', '13 cm', '52 cm'], 1],
    ['A farmer packed 360 eggs into trays of 30. How many trays did he fill?', ['10', '12', '15', '18'], 1],
    ['Which is an even number?', ['13', '27', '48', '51'], 2],
    ['Round off 4,682 to the nearest hundred:', ['4,600', '4,700', '4,680', '5,000'], 1],
    ['What is 7/10 - 2/10?', ['5/10', '5/20', '9/10', '1/10'], 0],
    ['How many centimeters are there in 2 meters?', ['20 cm', '200 cm', '2,000 cm', '20,000 cm'], 1],
  ],
  English: [
    ['Choose the noun: "The swift leopard runs fast."', ['swift', 'runs', 'leopard', 'fast'], 2],
    ['What is the plural of "ox"?', ['oxes', 'oxen', 'oxies', 'oxs'], 1],
    ['Which word is an action verb?', ['brave', 'whistle', 'purple', 'clever'], 1],
    ['Choose the correct preposition: "The assembly starts ___ 8:00 AM."', ['on', 'at', 'in', 'by'], 1],
    ['Identify the pronoun in: "She carried the basket."', ['carried', 'basket', 'She', 'the'], 2],
    ['Which is the opposite of "generous"?', ['kind', 'selfish', 'polite', 'honest'], 1],
    ['Fill in the blank: "Neither Joy ___ Grace came to school."', ['or', 'nor', 'and', 'but'], 1],
    ['Select the correct punctuation mark for: "What a glorious victory"', ['.', '?', '!', ','], 2],
    ['What is the past tense of "write"?', ['writed', 'wrote', 'written', 'writing'], 1],
    ['Which word is spelled correctly?', ['Neccesary', 'Necessary', 'Necesary', 'Neccessary'], 1],
  ],
  Kiswahili: [
    ['Jibu sahihi: "Mimi ___ shuleni kila asubuhi."', ['huenda', 'waenda', 'yaenda', 'zaenda'], 0],
    ['Neno lipi ni nomino?', ['kula', 'mti', 'zuri', 'haraka'], 1],
    ['Wingi wa "kitabu" ni?', ['vitabu', 'vitabus', 'kitabus', 'mitabu'], 0],
    ['Kinyume cha neno "mrefu" ni?', ['mnene', 'mfupi', 'mwembamba', 'mdogo'], 1],
    ['Tegua kitendawili: "Nyumba yangu haina mlango."', ['Yai', 'Chungwa', 'Kiatu', 'Kalamu'], 0],
    ['Mtu anayetibu wagonjwa hospitalini huitwa?', ['Mwashi', 'Daktari', 'Dereva', 'Mkulima'], 1],
    ['Chagua kitenzi katika sentensi: "Amina anasoma hadithi."', ['Amina', 'anasoma', 'hadithi', 'nzuri'], 1],
    ['Umoja wa "macho" ni?', ['jicho', 'icho', 'kicho', 'macho'], 0],
    ['Salamu ya asubuhi katika Kiswahili sanifu ni?', ['Masalkheri', 'Sabalkheri', 'U hali gani', 'Alamsiki'], 1],
    ['Nambari 15 kwa maneno ni?', ['Kumi na nne', 'Kumi na tano', 'Kumi na sita', 'Ishirini'], 1],
  ],
  'Science & Technology': [
    ['Which living organism produces its own food through photosynthesis?', ['Dog', 'Green plant', 'Mushroom', 'Fish'], 1],
    ['What do green plants need to manufacture food?', ['Sunlight, carbon dioxide, water', 'Only sand and stones', 'Darkness and sugar', 'Plastic and oil'], 0],
    ['Which organ in the human respiratory system filters dust from inhaled air?', ['Lungs', 'Nose hairs and mucus', 'Stomach', 'Heart'], 1],
    ['Which is a good conductor of electricity?', ['Dry wood', 'Copper wire', 'Plastic ruler', 'Rubber band'], 1],
    ['Water exists in three states: solid, liquid, and?', ['Gas / Steam', 'Sand', 'Clay', 'Oil'], 0],
    ['Which teeth are specialized for biting and cutting food?', ['Molars', 'Incisors', 'Canines', 'Premolars'], 1],
    ['A shadow is formed when light is blocked by which kind of object?', ['Transparent', 'Opaque', 'Translucent', 'Luminous'], 1],
    ['Which animal group is warm-blooded and nurses young ones with milk?', ['Reptiles', 'Mammals', 'Fish', 'Insects'], 1],
    ['Which cloud type brings heavy rainfall in Kenya?', ['Cirrus', 'Cumulonimbus', 'Stratus', 'Altocumulus'], 1],
    ['How can we prevent soil erosion in school compounds?', ['Planting grass and trees', 'Cutting down trees', 'Overgrazing', 'Pouring chemicals'], 0],
  ],
  'Social Studies': [
    ['Little Roses Academy is situated in which Kenyan county?', ['Nairobi', 'Nakuru', 'Mombasa', 'Kisumu'], 1],
    ['What does the green color on the Kenyan National Flag represent?', ['Blood shed for freedom', 'The land and agriculture', 'Peace', 'The people of Kenya'], 1],
    ['Which compass direction lies directly opposite to East?', ['North', 'West', 'South', 'North-East'], 1],
    ['A valley with steep sides and a flat floor is called a?', ['Rift Valley', 'Mountain', 'Plain', 'Plateau'], 0],
    ['Who is the head of administration in a public or private school?', ['Class Prefect', 'Headteacher / Principal', 'Cook', 'Driver'], 1],
    ['Physical features created by nature include?', ['Roads and bridges', 'Mountains and rivers', 'Hospitals and churches', 'Airports'], 1],
    ['Which lake in the Rift Valley is famous for flamingos and national parks?', ['Lake Victoria', 'Lake Nakuru', 'Lake Turkana', 'Lake Naivasha'], 1],
    ['Traditional houses of the Maasai community are known as?', ['Manyatta', 'Hut', 'Igloo', 'Mansion'], 0],
    ['The main economic activity in rural Nakuru County is?', ['Mining gold', 'Farming and dairy', 'Fishing in ocean', 'Manufacturing aircraft'], 1],
    ['Showing respect to national symbols like the flag promotes?', ['Disunity', 'National unity and patriotism', 'Fear', 'Tribalism'], 1],
  ],
  'Creative Arts': [
    ['Which of the following is a primary colour?', ['Green', 'Red', 'Purple', 'Orange'], 1],
    ['Mixing yellow and blue paint gives which secondary colour?', ['Orange', 'Green', 'Purple', 'Brown'], 1],
    ['A repeated decorative visual arrangement is called a?', ['Pattern', 'Smudge', 'Shadow', 'Blank'], 0],
    ['Which Kenyan traditional musical instrument is played by blowing air?', ['Nyatiti', 'Abu / Horn flute', 'Kayamba', 'Isukuti drum'], 1],
    ['Clay is suitable for modeling pottery because it is?', ['Sandy', 'Plastic and malleable', 'Brittle', 'Waterproof'], 1],
    ['Which tool is specifically designed for cutting paper neatly in craft?', ['Hammer', 'Scissors', 'Pliers', 'Screwdriver'], 1],
    ['The Kenyan National Anthem was composed during independence in?', ['1950', '1963', '1978', '2010'], 1],
    ['Shading a drawing from light to dark creates an illusion of?', ['Sound', 'Form and depth', 'Weight', 'Speed'], 1],
    ['A percussion shaker made from reeds and seeds is called a?', ['Guitar', 'Kayamba', 'Piano', 'Violin'], 1],
    ['Paper folding art technique is commonly known as?', ['Origami', 'Mosaic', 'Collage', 'Etching'], 0],
  ],
  CRE: [
    ['In how many days did God create the heavens and the earth according to Genesis?', ['7 days', '6 days', '3 days', '10 days'], 1],
    ['Who was commanded by God to build the Ark during the great flood?', ['Moses', 'Noah', 'David', 'Abraham'], 1],
    ['Which quality best shows genuine love toward our neighbors at school?', ['Sharing and helping', 'Fighting', 'Gossiping', 'Ignoring them'], 0],
    ['The first book of the Holy Bible is?', ['Matthew', 'Genesis', 'Psalms', 'Revelation'], 1],
    ['Where was baby Jesus born?', ['Jerusalem', 'Bethlehem', 'Nazareth', 'Egypt'], 1],
    ['Who was given the Ten Commandments on Mount Sinai?', ['Moses', 'Joshua', 'Samuel', 'Solomon'], 0],
    ['Which of the following is a Fruit of the Holy Spirit?', ['Hatred', 'Love and Kindness', 'Jealousy', 'Boasting'], 1],
    ['David defeated the Philistine giant Goliath using?', ['A bow and arrow', 'A sling and stones', 'A bronze sword', 'A spear'], 1],
    ['How many disciples did Jesus choose to be His apostles?', ['10', '12', '14', '7'], 1],
    ['Prayer is best described as?', ['Talking to God with reverence', 'Reading a story', 'Singing loud shouts', 'Arguing'], 0],
  ],
  'Agriculture & Nutrition': [
    ['Which of these is a rich indigenous green vegetable grown in Kenya?', ['Sukuma wiki', 'Soda', 'Candy', 'Polythene'], 0],
    ['Why do we weed vegetable garden beds regularly?', ['To remove competition for water and nutrients', 'To make noise', 'To destroy soil', 'To invite pests'], 0],
    ['Which farm tool is most suitable for digging hard ground and cultivating beds?', ['Jembe / Hoe', 'Pencil', 'Ruler', 'Needle'], 0],
    ['Nutrients that protect our bodies from illnesses and infections are mainly found in?', ['Fruits and vegetables', 'Sugar only', 'Pure fat', 'Plastic'], 0],
    ['A structure built to protect seedlings from harsh direct sunlight is called a?', ['Shade net / Nursery shelter', 'Granary', 'Silo', 'Cattle dip'], 0],
    ['Adding organic compost manure to the soil helps to improve?', ['Soil fertility and moisture retention', 'Soil pollution', 'Soil erosion', 'Stones'], 0],
    ['Which method conserves soil on sloping farm terrain?', ['Terracing and contour plowing', 'Cutting tree roots', 'Burning bushes', 'Overgrazing'], 0],
    ['Drinking clean boiled or treated water prevents which disease?', ['Cholera and Typhoid', 'Malaria', 'Broken bone', 'Headache'], 0],
    ['A food source rich in body-building protein is?', ['Eggs and beans', 'Cassava only', 'Cooking oil', 'Honey'], 0],
    ['A tool used for carrying soil, weeds, and farm produce is a?', ['Wheelbarrow', 'Knife', 'Spoon', 'Hammer'], 0],
  ],
};

const FOCUS = {
  topic: 'Fractions',
  notes:
    'Fractions name parts of a whole. The bottom number tells how many equal parts there are; the top number tells how many parts we have. Equal parts must be the same size.',
  qs: [
    ['Which fraction shows 2 out of 4 equal parts shaded?', ['1/4', '2/4', '3/4', '4/2'], 1],
    ['Which is bigger: 1/2 or 1/4?', ['1/4', '1/2', 'They are equal', 'Neither'], 1],
    ['3/8 means?', ['3 parts of 8', '8 parts of 3', '3 wholes', '8 wholes'], 0],
  ] as QuestionItem[],
};

const PROG: [string, number][] = [
  ['Mathematics', 78],
  ['English', 85],
  ['Kiswahili', 74],
  ['Christian Religious Education', 82],
  ['Science and Technology', 72],
  ['Agriculture and Nutrition', 80],
  ['Social Studies', 80],
  ['Creative Arts', 88],
];

export const LearnerPortal: React.FC<LearnerPortalProps> = ({
  onExitPortal,
  onShowToast,
}) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState<'home' | 'timetable' | 'focus' | 'progress' | 'ask'>('home');
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [assessmentTerm, setAssessmentTerm] = useState<'Term 1' | 'Term 2' | 'Term 3'>('Term 1');
  const [assessmentCycleGrade, setAssessmentCycleGrade] = useState<string | null>(null);
  const [assessmentViewMode, setAssessmentViewMode] = useState<'strands' | 'book' | 'report' | 'covers'>('strands');
  const [storedMarks, setStoredMarks] = useState<Record<string, any>>(() => getStoredMarks());
  const [storedSubmissions, setStoredSubmissions] = useState<Record<string, any>>(() => getStoredSubmissions());
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [subDone, setSubDone] = useState<Record<string, boolean>>({});
  const [focusAnswers, setFocusAnswers] = useState<Record<number, number>>({});
  const [focusDone, setFocusDone] = useState<boolean>(false);
  const [ecoState, setEcoState] = useState(ecosystemSync.getState());
  const [focusSubject, setFocusSubject] = useState<string>('Mathematics');
  const [focusTopicId, setFocusTopicId] = useState<string>('math_g4_w2_fractions_intro');
  const [viewingTeacherNote, setViewingTeacherNote] = useState<any | null>(null);
  const [bookletTab, setBookletTab] = useState<'book' | 'report'>('book');
  const [showInspectorModal, setShowInspectorModal] = useState(false);

  // Live 4-Portal Timetable Synchronization Hook
  const {
    timetable: liveTimetable,
    slots: liveSlots,
    freeze: liveFreeze,
    teachers: liveFaculty,
    isFrozen: isTimetableFrozen,
    getTeacherName,
  } = useTimetableSync();

  const [adminState, setAdminState] = useState(() => {
    try {
      const s = localStorage.getItem('lra_admin_v3');
      return s ? JSON.parse(s) : INITIAL_ADMIN_STATE;
    } catch {
      return INITIAL_ADMIN_STATE;
    }
  });

  useEffect(() => {
    const handleAdminSync = (e: any) => {
      if (Array.isArray(e?.detail?.learners)) {
        setAdminState(e.detail);
      } else {
        try {
          const s = localStorage.getItem('lra_admin_v3');
          if (s) setAdminState(JSON.parse(s));
          else setAdminState(INITIAL_ADMIN_STATE);
        } catch {}
      }
      setStoredMarks(getStoredMarks());
      setStoredSubmissions(getStoredSubmissions());
    };
    pullSchoolStateFromCloud().then(() => handleAdminSync(null)).catch(() => {});

    window.addEventListener('lra-admin-state-updated', handleAdminSync);
    window.addEventListener('lra_data_sync', handleAdminSync);
    window.addEventListener('storage', handleAdminSync);
    return () => {
      window.removeEventListener('lra-admin-state-updated', handleAdminSync);
      window.removeEventListener('lra_data_sync', handleAdminSync);
      window.removeEventListener('storage', handleAdminSync);
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

  // Dynamic Learners roster from Admin
  const allLearners = useMemo(() => {
    const fromAdmin = adminState?.learners;
    if (Array.isArray(fromAdmin) && fromAdmin.length > 0) return fromAdmin;
    return INITIAL_ADMIN_STATE.learners;
  }, [adminState]);

  const currentLearner = useMemo(() => {
    if (sessionUser?.identifier) {
      const cleanAdm = sessionUser.identifier.toUpperCase();
      const found = allLearners.find((l: any) => l.adm?.toUpperCase() === cleanAdm);
      if (found) return found;
    }
    if (sessionUser?.id) {
      const found = allLearners.find((l: any) => l.id === sessionUser.id);
      if (found) return found;
    }
    if (sessionUser?.name) {
      const found = allLearners.find((l: any) => l.name?.toLowerCase() === sessionUser.name.toLowerCase());
      if (found) return found;
    }
    return allLearners[0] || INITIAL_ADMIN_STATE.learners[0];
  }, [allLearners, sessionUser]);

  const learnerFirstName = (currentLearner?.name || 'Learner').split(' ')[0] || 'Learner';
  const learnerGrade = (currentLearner?.grade || 'Grade 1') as GradeName;

  const todayDayName = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const d = days[new Date().getDay()];
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(d) ? d : 'Mon';
  }, []);

  const todayLearnerLessons = useMemo(() => {
    const lessons: { slotKey: string; time: string; lesson: number; subject: string; teacherName: string }[] = [];
    liveSlots.filter((s) => s.lesson).forEach((slot) => {
      const cellKey = `${todayDayName}|${slot.k}|${learnerGrade}`;
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
  }, [todayDayName, learnerGrade, liveTimetable, liveSlots, getTeacherName]);

  const getTimeEmoji = () => {
    const h = new Date().getHours();
    if (h < 12) return '☀️';
    if (h < 17) return '⛅';
    return '🌙';
  };

  const [viewingOfficialCover, setViewingOfficialCover] = useState<'book' | 'report' | null>(null);
  const [bookletInitialTab, setBookletInitialTab] = useState<'book' | 'report'>('book');
  const [showFullBooklet, setShowFullBooklet] = useState<boolean>(false);
  const [focusTerm, setFocusTerm] = useState<'Term 1' | 'Term 2' | 'Term 3'>('Term 1');
  const [focusSubjectFilter, setFocusSubjectFilter] = useState<string>('All');

  // Live Teacher Focus Zone items (evaluated <= 70%)
  const liveFocusItems = useMemo(() => {
    const byId = getLearnerFocusZoneItems(currentLearner.id, currentLearner.grade);
    const byAdm = getLearnerFocusZoneItems(currentLearner.adm, currentLearner.grade);
    const seen = new Set(byId.map((i) => i.strandId));
    return [...byId, ...byAdm.filter((i) => !seen.has(i.strandId))];
  }, [currentLearner.id, currentLearner.adm, currentLearner.grade, storedMarks]);

  // Holiday CATs (30th Oct - 4th Jan) & Pushed Assignments state
  const [selectedHolidayDate, setSelectedHolidayDate] = useState<string>('2026-10-30');
  const [completedHolidayCATs, setCompletedHolidayCATs] = useState<Record<string, {
    score: number;
    total: number;
    percentage: number;
    band: 'EE' | 'ME' | 'AE' | 'BE';
    dateStr: string;
  }>>(() => {
    try {
      const stored = localStorage.getItem('lra_completed_holiday_cats');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [pushedAssignments, setPushedAssignments] = useState<PushedCATAssignment[]>(() => getPushedAssignments());
  const [viewingKICDPastPaper, setViewingKICDPastPaper] = useState<KICDPastPaper | null>(null);

  // Active Interactive Exam Session
  const [activeExamModal, setActiveExamModal] = useState<{
    type: 'holiday' | 'pushed';
    data: DailyHolidayCAT | PushedCATAssignment;
    title: string;
    subject: string;
    strand?: string;
    questions: KICDQuestion[];
  } | null>(null);

  const [examQuestionIndex, setExamQuestionIndex] = useState<number>(0);
  const [examAnswers, setExamAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({});
  const [examSubmitted, setExamSubmitted] = useState<boolean>(false);
  const [examScoreResult, setExamScoreResult] = useState<{
    score: number;
    total: number;
    percentage: number;
    band: 'EE' | 'ME' | 'AE' | 'BE';
  } | null>(null);

  useEffect(() => {
    const handlePushedUpdate = () => {
      setPushedAssignments(getPushedAssignments());
    };
    window.addEventListener('lra-pushed-assignments-updated', handlePushedUpdate);
    return () => window.removeEventListener('lra-pushed-assignments-updated', handlePushedUpdate);
  }, []);

  // Attached homework documents state
  const [learnerDocs, setLearnerDocs] = useState<AttachedDocument[]>([
    {
      id: 'doc_faith_hw1',
      name: 'Faith_Wanjiku_Maths_Worksheet_Numbers.docx',
      size: 98000,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ext: 'DOCX',
      extractedText: `Faith Wanjiku — Grade 4A (LRA/0001)
Mathematics Homework: Number Operations & Fractions
Status: Completed and submitted for Tr. Kibet review.
1. 3/8 + 2/8 = 5/8
2. Equivalent fraction for 2/5 = 4/10
3. Shaded parts: 3 out of 4 squares shaded.
Self-Assessment: I understand fraction additions well!`,
      wordCount: 42,
      pageCount: 1,
      uploadedAt: 'Today, 07:45 AM',
    },
  ]);
  const [readingDoc, setReadingDoc] = useState<AttachedDocument | null>(null);

  const handleUploadLearnerHomework = async (file: File) => {
    sound.playClick(500);
    try {
      const doc = await readUploadedDocument(file);
      setLearnerDocs((prev) => [doc, ...prev]);
      sound.playCompleteChime();
      onShowToast(`Uploaded homework sheet: ${doc.name}`);
    } catch (e: any) {
      onShowToast(`Failed to read file: ${e.message}`);
    }
  };

  // Start Exam Runner (Holiday CAT or Teacher Pushed CAT)
  const handleStartExam = (
    type: 'holiday' | 'pushed',
    data: DailyHolidayCAT | PushedCATAssignment,
    title: string,
    subject: string,
    questions: KICDQuestion[],
    strand?: string
  ) => {
    sound.playClick(600);
    setActiveExamModal({
      type,
      data,
      title,
      subject,
      questions,
      strand,
    });
    setExamQuestionIndex(0);
    setExamAnswers({});
    setExamSubmitted(false);
    setExamScoreResult(null);
  };

  // Pick Option in Exam
  const handleSelectExamOption = (optKey: 'A' | 'B' | 'C' | 'D') => {
    sound.playClick(450);
    setExamAnswers((prev) => ({
      ...prev,
      [examQuestionIndex]: optKey,
    }));
  };

  // Submit Exam & Auto-record into Assessment Book & Report
  const handleSubmitExam = () => {
    if (!activeExamModal) return;
    sound.playCompleteChime();

    const questions = activeExamModal.questions;
    let score = 0;
    const total = questions.length;

    questions.forEach((q, idx) => {
      if (examAnswers[idx] === q.correctAnswer) {
        score++;
      }
    });

    const percentage = Math.round((score / total) * 100);
    const band: 'EE' | 'ME' | 'AE' | 'BE' =
      percentage >= 80 ? 'EE' : percentage >= 60 ? 'ME' : percentage >= 40 ? 'AE' : 'BE';

    const result = { score, total, percentage, band };
    setExamScoreResult(result);
    setExamSubmitted(true);

    if (activeExamModal.type === 'pushed') {
      const pushedCat = activeExamModal.data as PushedCATAssignment;
      recordLearnerCATCompletion(pushedCat.id, currentLearner.adm || 'LRA/0001', score, total, percentage, band);
      // Auto-fill into ecosystemSync assessment book and terminal report
      ecosystemSync.updateSubjectScore(
        activeExamModal.subject,
        percentage,
        percentage,
        pushedCat.teacherName || 'Tr. Peter Kibet'
      );
      onShowToast(`✓ ${activeExamModal.title} submitted! Score: ${percentage}% (${band}) auto-filled in Assessment Book.`);
    } else {
      const holidayCat = activeExamModal.data as DailyHolidayCAT;
      const updated = {
        ...completedHolidayCATs,
        [holidayCat.dateStr]: {
          score,
          total,
          percentage,
          band,
          dateStr: holidayCat.dateStr,
        },
      };
      setCompletedHolidayCATs(updated);
      try {
        localStorage.setItem('lra_completed_holiday_cats', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      // Auto-fill into ecosystemSync assessment book
      ecosystemSync.updateSubjectScore(
        activeExamModal.subject,
        percentage,
        percentage,
        'KICD Holiday Assessment'
      );
      onShowToast(`✓ Day ${holidayCat.dayNumber} Holiday CAT submitted! Score: ${percentage}% (${band}) auto-recorded in Report.`);
    }
  };

  useEffect(() => {
    const unsub = ecosystemSync.subscribe((next) => setEcoState(next));
    return () => {
      unsub();
    };
  }, []);

  // Keep stored marks reactive with teacher grading actions
  useEffect(() => {
    const handleSync = () => {
      setStoredMarks(getStoredMarks());
    };
    window.addEventListener('lra_data_sync', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('lra_data_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Helper for greeting based on Nairobi hour
  const getGreeting = () => {
    try {
      const hourStr = new Intl.DateTimeFormat('en-GB', {
        timeZone: TZ,
        hour: '2-digit',
        hour12: false,
      }).format(new Date());
      const h = parseInt(hourStr, 10);
      return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    } catch {
      const h = new Date().getHours();
      return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    }
  };

  // Helper for Nairobi day of week
  const getWeekday = () => {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: TZ,
        weekday: 'short',
      })
        .format(new Date())
        .slice(0, 3);
    } catch {
      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
    }
  };

  const gradeSubjectsList = useMemo(() => {
    const gradeData = DATA.grades[learnerGrade];
    if (gradeData?.terms) {
      const names = new Set<string>();
      const term1Areas = gradeData.terms['Term 1'] || [];
      term1Areas.forEach((a) => {
        if (a?.name) names.add(a.name);
      });
      if (names.size > 0) return Array.from(names);
    }
    if (LOWER_GRADES.includes(learnerGrade as GradeName)) {
      return [
        'Mathematics',
        'English',
        'Kiswahili',
        'Environmental Activities',
        'Creative Activities',
        'Christian Religious Education',
      ];
    }
    return [
      'Mathematics',
      'English',
      'Kiswahili',
      'Science and Technology',
      'Agriculture and Nutrition',
      'Social Studies',
      'Creative Arts',
      'Christian Religious Education',
    ];
  }, [learnerGrade]);

  const getDayPlan = () => {
    const d = getWeekday();
    if (d === 'Sat') return { focus: true, text: 'Focus Zone practice (Saturday)' };
    if (d === 'Sun') return { none: true, text: 'No homework on Sunday' };
    const lowerRot: Record<string, string> = {
      Mon: 'English',
      Tue: 'Kiswahili',
      Wed: 'Environmental Activities',
      Thu: 'Creative Activities',
      Fri: 'Christian Religious Education',
    };
    const secondSubject = LOWER_GRADES.includes(learnerGrade as GradeName)
      ? lowerRot[d] || 'English'
      : ROT[d] || 'English';
    return {
      subjects: ['Mathematics', secondSubject],
      text: `Mathematics and ${secondSubject}`,
    };
  };

  // Back Button Handlers (Modals -> Official Cover -> Subview -> Non-Home Tab -> Home -> App Exit Guard)
  // Priority 48: Active Exam / Booklet / Past Paper / Document / Inspector Modals
  useBackHandler(
    () => {
      sound.playClick(400);
      if (activeExamModal) setActiveExamModal(null);
      else if (viewingKICDPastPaper) setViewingKICDPastPaper(null);
      else if (showFullBooklet) setShowFullBooklet(false);
      else if (readingDoc) setReadingDoc(null);
      else if (showInspectorModal) setShowInspectorModal(false);
      return true;
    },
    Boolean(
      activeExamModal ||
        viewingKICDPastPaper ||
        showFullBooklet ||
        readingDoc ||
        showInspectorModal
    ),
    48,
    'learner_modals_back'
  );

  // Priority 25: viewing official cover modal
  useBackHandler(
    () => {
      sound.playClick(400);
      setViewingOfficialCover(null);
      return true;
    },
    viewingOfficialCover !== null,
    25,
    'learner_official_cover_back'
  );

  // Priority 20: in subject quiz subview or in ask subview
  useBackHandler(
    () => {
      sound.playClick(400);
      if (activeSub) {
        setActiveSub(null);
        return true;
      }
      if (activeTab === 'ask') {
        setActiveTab('home');
        return true;
      }
      return false;
    },
    activeSub !== null || activeTab === 'ask',
    20,
    'learner_subview_back'
  );

  // Priority 18: on non-home tab -> back to home
  useBackHandler(
    () => {
      sound.playClick(400);
      setActiveTab('home');
      return true;
    },
    activeTab !== 'home' && !activeSub,
    18,
    'learner_tab_back'
  );
  // At home tab root, back falls through to App.tsx universal "ARE YOU LEAVING ALREADY?" confirmation modal.

  const handlePickAnswer = (sub: string, qIdx: number, optIdx: number) => {
    if (subDone[sub]) return;
    sound.playClick(500);
    setAnswers((prev) => ({
      ...prev,
      [`${sub}_${qIdx}`]: optIdx,
    }));
  };

  const getSubScore = (sub: string) => {
    const questions = QS[sub] || [];
    return questions.reduce((acc, q, i) => {
      return acc + (answers[`${sub}_${i}`] === q[2] ? 1 : 0);
    }, 0);
  };

  const handleSubmitSub = (sub: string) => {
    const questions = QS[sub] || [];
    const isAllAnswered = questions.every((_, i) => answers[`${sub}_${i}`] !== undefined);
    if (!isAllAnswered) {
      sound.playClick(300);
      onShowToast('Please answer every question first');
      return;
    }
    sound.playClick(650);
    setSubDone((prev) => ({ ...prev, [sub]: true }));
    const score = getSubScore(sub);
    onShowToast(`Submitted: ${score} / ${questions.length}`);
  };

  const handlePickFocus = (qIdx: number, optIdx: number) => {
    if (focusDone) return;
    sound.playClick(500);
    setFocusAnswers((prev) => ({
      ...prev,
      [qIdx]: optIdx,
    }));
  };

  const getFocusScore = () => {
    return FOCUS.qs.reduce((acc, q, i) => {
      return acc + (focusAnswers[i] === q[2] ? 1 : 0);
    }, 0);
  };

  const handleSubmitFocus = () => {
    const isAllAnswered = FOCUS.qs.every((_, i) => focusAnswers[i] !== undefined);
    if (!isAllAnswered) {
      sound.playClick(300);
      onShowToast('Please answer every question first');
      return;
    }
    sound.playClick(650);
    setFocusDone(true);
    const score = getFocusScore();
    onShowToast(`Focus Zone Submitted: ${score} / ${FOCUS.qs.length}`);
  };

  const learnerIdentity: UserIdentity = useMemo(() => {
    const liveSummary = computeRealLearnerAssessmentSummary(
      {
        id: currentLearner.id,
        adm: currentLearner.adm,
        name: currentLearner.name,
        grade: learnerGrade,
      },
      storedMarks,
      storedSubmissions,
      DATA.grades[learnerGrade]?.terms,
      'learner'
    );

    return {
      role: 'learner',
      id: currentLearner.adm,
      name: currentLearner.name,
      grade: currentLearner.grade,
      stream: currentLearner.stream,
      assessmentSummary: liveSummary,
    };
  }, [currentLearner, learnerGrade, storedMarks, storedSubmissions]);

  const [learnerNotifUnread, setLearnerNotifUnread] = useState<number>(() =>
    getUnreadNotificationCount({
      portalId: 'learners',
      userId: currentLearner.id,
      userName: currentLearner.name,
      adm: currentLearner.adm,
      grade: learnerGrade,
      linkedLearnerIds: [currentLearner.id, currentLearner.adm],
      linkedLearnerNames: [currentLearner.name],
    })
  );

  useEffect(() => {
    const refreshNotifs = () => {
      setLearnerNotifUnread(
        getUnreadNotificationCount({
          portalId: 'learners',
          userId: currentLearner.id,
          userName: currentLearner.name,
          adm: currentLearner.adm,
          grade: learnerGrade,
          linkedLearnerIds: [currentLearner.id, currentLearner.adm],
          linkedLearnerNames: [currentLearner.name],
        })
      );
    };
    refreshNotifs();
    window.addEventListener('lra_notifications_updated', refreshNotifs);
    window.addEventListener('lra_data_sync', refreshNotifs);
    return () => {
      window.removeEventListener('lra_notifications_updated', refreshNotifs);
      window.removeEventListener('lra_data_sync', refreshNotifs);
    };
  }, [currentLearner.id, currentLearner.adm, currentLearner.name, learnerGrade]);

  const plan = getDayPlan();

  return (
    <div
      data-theme={theme}
      className={`w-full h-full flex flex-col relative overflow-hidden select-none font-sans transition-colors duration-200 ${
        theme === 'dark' ? 'bg-[#0A0F1F] text-[#EEF2FF]' : 'bg-[#EEF2FA] text-[#0F1B33]'
      }`}
      style={{
        // Define CSS variables for high fidelity fidelity matching
        ['--bg' as any]: theme === 'dark' ? '#0A0F1F' : '#EEF2FA',
        ['--card' as any]: theme === 'dark' ? '#141C33' : '#FFFFFF',
        ['--ink' as any]: theme === 'dark' ? '#EEF2FF' : '#0F1B33',
        ['--muted' as any]: theme === 'dark' ? '#9AA7C7' : '#6B7A93',
        ['--line' as any]: theme === 'dark' ? '#26324F' : '#E4E9F4',
        ['--sub' as any]: theme === 'dark' ? '#1B2644' : '#F7F9FD',
        ['--chip' as any]: theme === 'dark' ? '#1F2A4D' : '#EEF2FF',
        ['--chipink' as any]: theme === 'dark' ? '#C7D2FE' : '#3730A3',
      }}
    >
      {/* HEADER SECTION (Navy gradient with Crest, Nairobi Clock, Theme Switcher, Exit) */}
      <header className="w-full max-w-full overflow-hidden bg-gradient-to-r from-[#0A1F4D] to-[#1A3A8F] text-white px-3 sm:px-4 pt-2.5 pb-3 rounded-b-[24px] shadow-[0_8px_22px_rgba(10,31,77,0.35)] shrink-0 z-20">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <img
            src="/images/lra_crest.jpg"
            alt="Little Roses Academy Crest"
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white border-2 border-pink-200 object-cover shrink-0 shadow-xs"
          />

          <div className="flex-1 min-w-0 overflow-hidden">
            <h1 className="m-0 text-[13.5px] sm:text-[15px] font-extrabold tracking-tight truncate leading-tight">
              {getGreeting()}, {learnerFirstName} {getTimeEmoji()}
            </h1>
            <p className="m-0 text-[11px] sm:text-[12px] text-[#C7D7FF] font-medium truncate">
              Learner · {currentLearner.grade}
            </p>
          </div>

          {/* Controls: Single Scoped Bell & Theme Toggle */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                sound.playClick(520);
                window.dispatchEvent(
                  new CustomEvent('lra-open-notification-setup', {
                    detail: {
                      portalId: 'learners',
                      userId: currentLearner.id,
                      userName: currentLearner.name,
                      adm: currentLearner.adm,
                      grade: learnerGrade,
                      linkedLearnerIds: [currentLearner.id, currentLearner.adm],
                      linkedLearnerNames: [currentLearner.name],
                      initialView: 'inbox',
                    },
                  })
                );
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-sm relative shrink-0 cursor-pointer transition-colors"
              title="Learner Notifications & Inbox"
              aria-label="Open Learner Notifications"
            >
              🔔
              {learnerNotifUnread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center px-1 border-2 border-[#0A1F4D]">
                  {learnerNotifUnread > 99 ? '99+' : learnerNotifUnread}
                </span>
              )}
            </button>
            <div className="flex bg-white/20 rounded-full p-0.5">
              <button
                type="button"
                onClick={() => {
                  sound.playClick(500);
                  setTheme('light');
                }}
                className={`border-0 bg-transparent text-[12px] sm:text-[13px] px-1.5 sm:px-2 py-0.5 rounded-full cursor-pointer transition-all ${
                  theme === 'light' ? 'bg-white shadow-xs' : 'text-white/80 hover:text-white'
                }`}
                title="Light Theme"
              >
                ☀️
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playClick(500);
                  setTheme('dark');
                }}
                className={`border-0 bg-transparent text-[12px] sm:text-[13px] px-1.5 sm:px-2 py-0.5 rounded-full cursor-pointer transition-all ${
                  theme === 'dark' ? 'bg-[#141C33] shadow-xs' : 'text-white/80 hover:text-white'
                }`}
                title="Dark Theme"
              >
                🌙
              </button>
            </div>
          </div>
        </div>

        {/* Status Pill Bar */}
        <div className="flex flex-wrap justify-between items-center mt-2 pt-1.5 border-t border-white/10 gap-1.5 min-w-0">
          <LiveNairobiClock />

          <span className="text-[11px] sm:text-[12px] font-extrabold bg-white/15 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full truncate min-w-0 max-w-[56%]">
            Learner · {currentLearner.adm}
          </span>
        </div>
      </header>

      {/* SCROLLABLE CONTENT AREA */}
      <main className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-3.5 pt-3.5 pb-4 text-[13px] leading-relaxed">
        {/* SUB-VIEW: SUBJECT HOMEWORK QUIZ */}
        {activeSub ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-extrabold m-0 text-[var(--ink)]">
                {activeSub}
              </h2>
              <button
                type="button"
                onClick={() => {
                  sound.playClick(400);
                  setActiveSub(null);
                }}
                className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[var(--sub)] border border-[var(--line)] text-[var(--ink)] hover:opacity-80 cursor-pointer"
              >
                ← Back
              </button>
            </div>
            <div className="text-xs text-[var(--muted)] mb-3">
              Choose one answer per question, then Submit.
            </div>
            <div className="inline-block text-[11px] font-bold text-amber-800 bg-amber-100 rounded-lg px-2.5 py-1 mb-3">
              DEMO questions
            </div>

            {/* Questions List */}
            {QS[activeSub]?.map((q, i) => (
              <div
                key={i}
                className="border border-[var(--line)] rounded-2xl p-3 mb-3 bg-[var(--sub)]"
              >
                <div className="font-extrabold text-[13px] mb-2 text-[var(--ink)]">
                  {i + 1}. {q[0]}
                </div>
                <div className="space-y-1.5">
                  {q[1].map((opt, k) => {
                    const isSelected = answers[`${activeSub}_${i}`] === k;
                    const isSubmitted = subDone[activeSub];
                    let optionStyle = 'border-[var(--line)] bg-[var(--card)] text-[var(--ink)]';

                    if (isSubmitted) {
                      if (k === q[2]) {
                        optionStyle = 'border-green-600 bg-green-100 text-green-900 font-bold';
                      } else if (isSelected) {
                        optionStyle = 'border-rose-600 bg-rose-100 text-rose-900 line-through';
                      }
                    } else if (isSelected) {
                      optionStyle = 'border-[#7C3AED] bg-purple-100 text-purple-950 font-bold';
                    }

                    return (
                      <div
                        key={k}
                        onClick={() => handlePickAnswer(activeSub, i, k)}
                        className={`flex items-center gap-2 p-2 rounded-xl border-1.5 text-xs transition-all cursor-pointer ${optionStyle}`}
                      >
                        <span className="w-6 h-6 rounded-full bg-[var(--chip)] text-[var(--chipink)] flex items-center justify-center font-black text-xs shrink-0">
                          {'ABCD'[k]}
                        </span>
                        <span className="flex-1">{opt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Result or Submit Action */}
            {subDone[activeSub] ? (
              <div className="space-y-2 mt-4">
                <div className="bg-[var(--card)] rounded-2xl p-3.5 shadow-sm border border-[var(--line)]">
                  <div className="font-extrabold text-[15px] text-[var(--ink)]">
                    Score: {getSubScore(activeSub)} / {QS[activeSub]?.length}
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-1">
                    Green indicates correct answers. Your teacher can review this result.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(400);
                    setActiveSub(null);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl font-extrabold text-sm text-white bg-[#7C3AED] hover:bg-[#6D28D9] cursor-pointer shadow-md transition-all"
                >
                  Back to homework
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmitSub(activeSub)}
                className="w-full py-3 px-4 rounded-xl font-extrabold text-sm text-white bg-[#16A34A] hover:bg-emerald-700 cursor-pointer shadow-md transition-all mt-2"
              >
                Submit Answers
              </button>
            )}
          </div>
        ) : activeTab === 'home' ? (
          /* TAB 1: HOME */
          <div className="space-y-3.5 animate-fade-in">
            {/* Status Hero Card */}
            <div className="bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white p-3.5 rounded-2xl shadow-md border-0">
              <div className="text-[17px] font-black text-white">Hi {learnerFirstName}! 👋</div>
              <div className="text-xs text-purple-100 mt-1 font-medium">
                Today: {plan.text}
              </div>
            </div>

            {/* 3 Summary Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              <div className="rounded-2xl p-2.5 sm:p-3 bg-[#DBE7FF] text-[#0F1B33] shadow-xs">
                <div className="text-xl sm:text-2xl font-black">{plan.none ? '0' : plan.focus ? '1' : '2'}</div>
                <div className="text-[10.5px] sm:text-[11px] font-bold text-[#4B5873]">Due today</div>
              </div>
              <div className="rounded-2xl p-2.5 sm:p-3 bg-[#DCFCE7] text-[#0F1B33] shadow-xs">
                <div className="text-xl sm:text-2xl font-black">
                  {learnerIdentity.assessmentSummary?.overallAverage != null
                    ? `${Math.round(learnerIdentity.assessmentSummary.overallAverage)}%`
                    : '—'}
                </div>
                <div className="text-[10.5px] sm:text-[11px] font-bold text-[#4B5873]">Average</div>
              </div>
              <div className="rounded-2xl p-2.5 sm:p-3 bg-[#FEF3C7] text-[#0F1B33] shadow-xs">
                <div className="text-xl sm:text-2xl font-black">{liveFocusItems.length}</div>
                <div className="text-[10.5px] sm:text-[11px] font-bold text-[#4B5873]">Focus topics</div>
              </div>
            </div>

            {/* Today's Lessons & Live Bell Timetable Card */}
            <div className="bg-[var(--card)] rounded-2xl p-3.5 shadow-sm border border-[var(--line)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🗓️</span>
                  <span className="font-extrabold text-sm text-[var(--ink)]">
                    Today's Classes ({todayDayName})
                  </span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                    {learnerGrade}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(500);
                    setActiveTab('timetable');
                  }}
                  className="text-xs font-bold text-[#7C3AED] hover:underline cursor-pointer"
                >
                  Full Timetable →
                </button>
              </div>

              {isTimetableFrozen ? (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                  ❄️ <strong>Exam Freeze:</strong> {liveFreeze?.why || 'Examinations Period'}. Regular classes are locked for assessments.
                </div>
              ) : todayLearnerLessons.length === 0 ? (
                <div className="p-3 text-center text-xs text-[var(--muted)]">
                  No scheduled lessons found for {todayDayName}.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {todayLearnerLessons.slice(0, 4).map((l, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl border border-[var(--line)] bg-[var(--chip)] text-left flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between text-[10px] text-[var(--muted)] font-bold">
                        <span>L{l.lesson} · {l.time.split('–')[0]}</span>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SUBJ[l.subject] || '#7C3AED' }} />
                      </div>
                      <div className="font-black text-xs text-[var(--ink)] truncate mt-0.5">
                        {l.subject}
                      </div>
                      <div className="text-[10px] text-[var(--muted)] truncate">
                        {l.teacherName}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subjects Grid */}
            <div>
              <h3 className="text-[15px] font-extrabold text-[var(--ink)] mb-2 mt-4">
                Your Subjects ({learnerGrade})
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {gradeSubjectsList.map((s) => (
                  <div
                    key={s}
                    onClick={() => {
                      sound.playClick(500);
                      setActiveTab('focus');
                    }}
                    className="rounded-2xl p-3.5 text-white min-h-[96px] relative overflow-hidden shadow-sm cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    style={{ backgroundColor: SUBJ[s] || '#7C3AED' }}
                  >
                    <b className="block text-[14px] font-black leading-tight pr-6">
                      {s}
                    </b>
                    <small className="block text-xs opacity-90 mt-1">{learnerGrade}</small>
                    <span className="absolute right-2.5 bottom-2 text-2xl select-none">
                      {SUBJ_ICONS[s] || '📘'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Study Desk Card */}
            <div>
              <h3 className="text-[15px] font-extrabold text-[var(--ink)] mb-2 mt-4">
                🤖 Elsie AI Study Desk
              </h3>
              <div
                onClick={() => {
                  sound.playClick(600);
                  setActiveTab('ask');
                }}
                className="rounded-2xl p-3.5 text-white bg-gradient-to-br from-[#2F6BFF] to-[#60A5FA] relative overflow-hidden shadow-sm cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.98]"
              >
                <b className="block text-[15px] font-black">🤖 ✨ Ask Elsie AI</b>
                <small className="block text-xs opacity-95 mt-0.5">
                  Need help with a question? Chat with your AI study desk
                </small>
                <span className="absolute right-3.5 bottom-2.5 text-2xl">🤖</span>
              </div>
            </div>

            <div className="text-xs text-[var(--muted)] px-1 mt-2">
              Your teachers and parents can review your official CBC assessment records in real-time.
            </div>
          </div>
        ) : activeTab === 'timetable' ? (
          /* TAB 2: TIMETABLE — REAL TIME CONNECTED TO ADMIN & TEACHERS */
          <div className="space-y-3.5 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xl font-extrabold m-0 text-[var(--ink)]">
                    {learnerGrade} Official Class Timetable
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                    ⚡ Live Synced
                  </span>
                </div>
                <div className="text-xs text-[var(--muted)] mt-0.5">
                  Official CBC 40-minute schedule for {currentLearner.name} ({currentLearner.adm})
                </div>
              </div>
            </div>

            {/* Exam Freeze Warning if Active */}
            {liveFreeze && (
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs animate-fade-in">
                <div className="font-extrabold flex items-center gap-1.5 mb-0.5">
                  <span>❄️</span>
                  <span>Active Examination Freeze ({liveFreeze.why})</span>
                </div>
                <div>
                  Locked from {liveFreeze.from} to {liveFreeze.to}. Regular classroom lessons are paused for KPSEA &amp; school assessments.
                </div>
              </div>
            )}

            {/* Real Timetable Grid */}
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--line)] overflow-hidden shadow-xs">
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
                  <tbody className="divide-y divide-[var(--line)]">
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
                          <td className="p-1.5 bg-[var(--chip)] text-[9px] font-bold border-r border-[var(--line)] whitespace-nowrap text-center">
                            <div className="font-extrabold text-[var(--ink)]">{slot.t.split('–')[0]}</div>
                            <div className="text-[8px] text-[var(--muted)]">L{slot.lesson}</div>
                          </td>

                          {/* 5 Days */}
                          {DAYS.map((day) => {
                            const isToday = todayDayName === day;

                            // Lower grade lesson 7 check
                            if (slot.lesson === 7 && LOWER_GRADES.includes(learnerGrade)) {
                              return (
                                <td
                                  key={day}
                                  className={`p-1.5 border-r border-[var(--line)] text-center ${
                                    isToday ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                                  }`}
                                >
                                  <div className="rounded-lg p-1.5 text-[9px] font-extrabold bg-teal-600 text-white shadow-2xs">
                                    Clubs &amp; Activities
                                  </div>
                                </td>
                              );
                            }

                            const cellKey = `${day}|${slot.k}|${learnerGrade}`;
                            const entry = liveTimetable[cellKey];

                            if (!entry) {
                              return (
                                <td
                                  key={day}
                                  className={`p-1.5 border-r border-[var(--line)] text-center ${
                                    isToday ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                                  }`}
                                >
                                  <div className="text-[9px] text-[var(--muted)] py-1 italic opacity-60">
                                    — Free —
                                  </div>
                                </td>
                              );
                            }

                            const subjColor = SUBJ[entry.subject] || GRADE_COLORS[learnerGrade] || '#7C3AED';
                            const teacherName = getTeacherName(entry.teacherId);

                            return (
                              <td
                                key={day}
                                className={`p-1.5 border-r border-[var(--line)] align-top ${
                                  isToday ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                                }`}
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

            {/* Afternoon & Weekend Assignment Timetable (Grades 1-3 & 4-6) */}
            <LearnerAssignmentTimetable learnerGrade={learnerGrade} />

            {/* Bell Schedule Information Card */}
            <div className="bg-[var(--card)] rounded-2xl p-3.5 shadow-sm border border-[var(--line)]">
              <div className="font-extrabold text-xs text-[var(--ink)] flex items-center justify-between">
                <span>🔔 CBC Bell &amp; Lesson Guidelines</span>
                <span className="text-[10px] text-[var(--muted)]">40 mins/period</span>
              </div>
              <div className="text-[11px] text-[var(--muted)] mt-1.5 leading-relaxed space-y-1">
                <div>• Morning lessons start at 8:20 AM after assembly and devotion.</div>
                <div>• Health breaks at 9:40 AM and 11:20 AM. Lunch and rest from 1:00 PM to 2:00 PM.</div>
                <div>• Grades 1–3 engage in co-curricular clubs from 2:00 PM. Grades 4–6 complete Lesson 7 until 2:40 PM.</div>
              </div>
            </div>
          </div>
                ) : activeTab === 'focus' ? (
          /* TAB 3: CBC ASSESSMENT FOCUS ZONE (STRAND & SUB-STRAND PROGRESS) */
          (() => {
            const gradeData = DATA.grades[learnerGrade];
            const learningAreas: LearningAreaDef[] = (gradeData?.terms && gradeData.terms[focusTerm]) || [];
            const marks = storedMarks;

            // Sift through learning areas and evaluate strands
            const evaluatedStrands: Array<{
              areaName: string;
              strand: any;
              markKey: string;
              result: any;
              band: any;
              isFocus: boolean;
            }> = [];

            learningAreas.forEach((area) => {
              area.strands.forEach((str) => {
                const markKey1 = makeMarkKey(currentLearner.id, str.sid);
                const markKey2 = makeMarkKey(currentLearner.adm, str.sid);
                const markKey = marks[markKey1] ? markKey1 : markKey2;
                const rec = marks[markKey1] || marks[markKey2];
                const res = resultOf(rec);
                const activeBand = res ? band(res.f) : null;
                const isFocus = res ? res.f <= 70 : false;
                evaluatedStrands.push({
                  areaName: area.name,
                  strand: str,
                  markKey,
                  result: res,
                  band: activeBand,
                  isFocus,
                });
              });
            });

            const totalStrands = evaluatedStrands.length;
            const completedStrands = evaluatedStrands.filter((s) => s.result !== null);
            const focusStrands = evaluatedStrands.filter((s) => s.isFocus);
            const masteredStrands = evaluatedStrands.filter((s) => s.result && s.result.f > 70);

            const filteredAreas = focusSubjectFilter === 'All'
              ? learningAreas
              : learningAreas.filter((la) => la.name === focusSubjectFilter);

            return (
              <div className="space-y-4 animate-fade-in pb-4">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-extrabold m-0 text-[var(--ink)]">
                      CBC Focus Zone & Strand Progress
                    </h2>
                    <div className="text-xs text-[var(--muted)] mt-0.5">
                      Strand and sub-strand continuous assessment evaluation for <strong>{currentLearner.name}</strong> ({learnerGrade})
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick(450);
                        setBookletInitialTab('book');
                        setShowFullBooklet(true);
                      }}
                      className="text-xs font-black px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white cursor-pointer shadow-xs flex items-center gap-1"
                    >
                      <span>📖</span>
                      <span>Full Assessment Book</span>
                    </button>
                  </div>
                </div>

                {/* Term Switcher (Term 1, Term 2, Term 3) */}
                <div className="flex items-center gap-1.5 p-1 bg-[var(--card)] rounded-2xl border border-[var(--line)] shadow-xs">
                  {(['Term 1', 'Term 2', 'Term 3'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        sound.playClick(400);
                        setFocusTerm(t);
                      }}
                      className={`flex-1 py-1.5 px-3 rounded-xl font-black text-xs transition-all cursor-pointer ${
                        focusTerm === t
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs'
                          : 'text-[var(--muted)] hover:text-[var(--ink)]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Assessment Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-3 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs">
                    <div className="text-[10.5px] font-bold text-[var(--muted)]">Total Strands</div>
                    <div className="text-xl font-black text-[var(--ink)] mt-0.5">{totalStrands}</div>
                    <div className="text-[9.5px] text-[var(--muted)]">{learningAreas.length} Learning Areas</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs">
                    <div className="text-[10.5px] font-bold text-[var(--muted)]">Evaluated</div>
                    <div className="text-xl font-black text-blue-600 mt-0.5">{completedStrands.length}</div>
                    <div className="text-[9.5px] text-blue-600/80">Continuous CATs & Asg</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 shadow-xs">
                    <div className="text-[10.5px] font-bold text-emerald-800 dark:text-emerald-300">Mastered (ME/EE)</div>
                    <div className="text-xl font-black text-emerald-600 mt-0.5">{masteredStrands.length}</div>
                    <div className="text-[9.5px] text-emerald-700/80">Score &gt; 70%</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-xs">
                    <div className="text-[10.5px] font-bold text-amber-800 dark:text-amber-300">Focus Items</div>
                    <div className="text-xl font-black text-amber-600 mt-0.5">{focusStrands.length}</div>
                    <div className="text-[9.5px] text-amber-700/80">Target Score ≤ 70%</div>
                  </div>
                </div>

                {/* Focus Zone Urgent Attention Banner (if any <= 70%) */}
                {focusStrands.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-rose-500/15 border-2 border-amber-500/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">⚡</span>
                        <div>
                          <div className="font-extrabold text-xs text-amber-900 dark:text-amber-200">
                            Active Focus Zone Strands ({focusStrands.length})
                          </div>
                          <div className="text-[10.5px] text-amber-800/80 dark:text-amber-300/80">
                            Evaluated in {currentLearner.name}&apos;s Assessment Book requiring guided revision:
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white">
                        Priority Practice
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {focusStrands.map((fs) => (
                        <div
                          key={fs.markKey}
                          className="p-2.5 rounded-xl bg-[var(--card)] border border-amber-300 dark:border-amber-700/50 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 truncate">
                              {fs.areaName}
                            </span>
                            <span
                              className="text-[9.5px] font-black px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: (fs.band && LEVEL_COLORS[fs.band as LevelBand]) || '#EA580C' }}
                            >
                              {fs.result.f.toFixed(1)}% ({fs.band})
                            </span>
                          </div>
                          <div className="font-extrabold text-xs text-[var(--ink)]">
                            {fs.strand.code} {fs.strand.name}
                          </div>
                          <div className="text-[10px] text-[var(--muted)]">
                            {fs.strand.subs?.length || 0} sub-strands in this focus unit
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subject Filter Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick(400);
                      setFocusSubjectFilter('All');
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition-all cursor-pointer border ${
                      focusSubjectFilter === 'All'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-[var(--card)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]'
                    }`}
                  >
                    All Areas ({learningAreas.length})
                  </button>
                  {learningAreas.map((la) => {
                    const isSelected = focusSubjectFilter === la.name;
                    return (
                      <button
                        key={la.name}
                        type="button"
                        onClick={() => {
                          sound.playClick(400);
                          setFocusSubjectFilter(la.name);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-[var(--card)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]'
                        }`}
                      >
                        {la.name}
                      </button>
                    );
                  })}
                </div>

                {/* Learning Areas & Strands List */}
                <div className="space-y-4">
                  {filteredAreas.map((area, aIdx) => (
                    <div
                      key={aIdx}
                      className="bg-[var(--card)] rounded-2xl p-4 border border-[var(--line)] shadow-sm space-y-3"
                    >
                      {/* Learning Area Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📚</span>
                          <div>
                            <h3 className="font-black text-sm text-[var(--ink)] m-0">
                              {area.name}
                            </h3>
                            <span className="text-[10px] text-[var(--muted)]">
                              {learnerGrade} · {focusTerm} · {area.strands.length} Strands
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200">
                          CBC Curriculum
                        </span>
                      </div>

                      {/* Strands & Sub-strands */}
                      <div className="space-y-3">
                        {area.strands.map((strand) => {
                          const markKey1 = makeMarkKey(currentLearner.id, strand.sid);
                          const markKey2 = makeMarkKey(currentLearner.adm, strand.sid);
                          const rec = marks[markKey1] || marks[markKey2];
                          const res = resultOf(rec);
                          const activeBand = res ? band(res.f) : null;
                          const isFocus = res ? res.f <= 70 : false;

                          return (
                            <div
                              key={strand.sid}
                              className={`p-3 rounded-xl border transition-all ${
                                isFocus
                                  ? 'bg-amber-500/5 border-amber-300 dark:border-amber-700/60'
                                  : res
                                  ? 'bg-emerald-500/5 border-emerald-300 dark:border-emerald-700/60'
                                  : 'bg-[var(--sub)] border-[var(--line)]'
                              }`}
                            >
                              {/* Strand Title Row */}
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-white font-mono text-[10px] font-extrabold">
                                    {strand.code}
                                  </span>
                                  <span className="font-extrabold text-xs text-[var(--ink)]">
                                    {strand.name}
                                  </span>
                                </div>

                                {res ? (
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="text-[10px] font-black px-2.5 py-0.5 rounded-full text-white shadow-xs"
                                      style={{ backgroundColor: (activeBand && LEVEL_COLORS[activeBand as LevelBand]) || '#16A34A' }}
                                    >
                                      {res.f.toFixed(1)}% · {activeBand}
                                    </span>
                                    {isFocus && (
                                      <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">
                                        ⚡ Focus Zone
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-medium text-[var(--muted)] italic bg-[var(--card)] px-2 py-0.5 rounded-md border border-[var(--line)]">
                                    Continuous evaluation pending
                                  </span>
                                )}
                              </div>

                              {/* Sub-strands Table / Breakdown */}
                              {strand.subs && strand.subs.length > 0 && (
                                <div className="mt-2.5 pt-2 border-t border-[var(--line)] space-y-1.5">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                                    Sub-strands &amp; Expected Competencies:
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {strand.subs.map((sub: any) => (
                                      <div
                                        key={sub.code}
                                        className="p-2 rounded-lg bg-[var(--card)] border border-[var(--line)] flex items-start gap-2"
                                      >
                                        <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[9px] font-bold shrink-0 mt-0.5">
                                          {sub.code}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                          <div className="font-bold text-[11px] text-[var(--ink)] leading-snug">
                                            {sub.name}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()
) : activeTab === 'progress' ? (
          /* TAB 5: ASSESSMENT & CBC RECORDS */
          <div className="space-y-4 animate-fade-in pb-4">
            {/* School Crest & Assessment Branding Header */}
            <div className="bg-gradient-to-r from-[#0A1F4D] via-[#14296B] to-[#1E3A8A] text-white rounded-2xl p-3.5 sm:p-4 shadow-md border border-indigo-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3 min-w-0 w-full">
                <img
                  src="/images/lra_crest.jpg"
                  alt="Little Roses Academy Crest"
                  className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-white p-0.5 border-2 border-amber-400 object-cover shrink-0 shadow-md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <span className="font-mono text-[9.5px] sm:text-[10px] tracking-wider font-black text-amber-300 uppercase">
                      Little Roses Academy · Nakuru
                    </span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 shrink-0">
                      CBC Official
                    </span>
                  </div>
                  <h2 className="text-base sm:text-xl font-black m-0 leading-tight text-white mt-0.5">
                    CBC Assessment Book & Report
                  </h2>
                  <p className="text-[11px] sm:text-xs text-indigo-200 m-0 mt-0.5">
                    Continuous assessment evaluation, 60/40 final results & competency records
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <span className="text-[11px] sm:text-xs font-mono font-bold px-2.5 sm:px-3 py-1 rounded-full bg-white/15 text-white border border-white/20 whitespace-nowrap">
                  {getAcademicYear()} Session
                </span>
              </div>
            </div>

            {/* Learner Particulars Card */}
            <div className="bg-[var(--card)] rounded-2xl p-3.5 sm:p-4 border border-[var(--line)] shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-base flex items-center justify-center shadow-xs shrink-0">
                    {learnerFirstName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-sm sm:text-base text-[var(--ink)] flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="truncate">{currentLearner.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200 shrink-0">
                        {currentLearner.adm}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--muted)] flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      <span>Grade: <b>{currentLearner.grade}</b></span>
                    </div>
                  </div>
                </div>

                {/* Term Switcher */}
                <div className="flex items-center bg-[var(--sub)] p-1 rounded-xl border border-[var(--line)] self-start sm:self-center">
                  {(['Term 1', 'Term 2', 'Term 3'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        sound.playClick(400);
                        setAssessmentTerm(t);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        assessmentTerm === t
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-[var(--muted)] hover:text-[var(--ink)]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* View Mode Switcher */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3.5 pt-3 border-t border-[var(--line)]">
                {[
                  { id: 'strands', label: 'Strands & Marks', icon: '📋' },
                  { id: 'book', label: 'Assessment Book', icon: '📘' },
                  { id: 'report', label: 'Assessment Report', icon: '📊' },
                  { id: 'covers', label: 'Official Covers', icon: '📑' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      sound.playClick(450);
                      setAssessmentViewMode(mode.id as any);
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                      assessmentViewMode === mode.id
                        ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-[var(--sub)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--line)]'
                    }`}
                  >
                    <span>{mode.icon}</span>
                    <span className="truncate">{mode.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Permanent Assessment Booklet Download Notice + Cycle Switcher */}
            {(() => {
              const currNumMatch = String(learnerGrade).match(/\d+/);
              const currGradeNum = currNumMatch ? parseInt(currNumMatch[0], 10) : 1;
              const availableCycleGrades = Array.from(
                { length: Math.max(1, Math.min(6, currGradeNum)) },
                (_, i) => `Grade ${i + 1}`
              );
              const activeCycleGrade =
                assessmentCycleGrade && availableCycleGrades.includes(assessmentCycleGrade)
                  ? assessmentCycleGrade
                  : learnerGrade;
              const prevCycleGrade = currGradeNum > 1 ? `Grade ${currGradeNum - 1}` : learnerGrade;

              return (
                <>
                  {availableCycleGrades.length > 1 && (
                    <div className="bg-[var(--card)] rounded-2xl p-3 border border-[var(--line)] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-extrabold text-[var(--ink)] flex items-center gap-1.5">
                        <span>🗂️</span>
                        <span>Saved Booklet Cycle:</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {availableCycleGrades.map((cg) => (
                          <button
                            key={cg}
                            type="button"
                            onClick={() => {
                              sound.playClick(420);
                              setAssessmentCycleGrade(cg === learnerGrade ? null : cg);
                            }}
                            className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] cursor-pointer transition-all ${
                              activeCycleGrade === cg
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-[var(--sub)] text-[var(--ink)] border border-[var(--line)]'
                            }`}
                          >
                            {cg}{cg === learnerGrade ? ' (Current)' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <AssessmentDownloadNotice
                    onDownloadBook={() => {
                      setAssessmentViewMode('book');
                    }}
                    onDownloadReport={() => {
                      setAssessmentViewMode('report');
                    }}
                    onToggleArchive={
                      currGradeNum > 1
                        ? () =>
                            setAssessmentCycleGrade((prev) =>
                              prev && prev !== learnerGrade ? null : prevCycleGrade
                            )
                        : undefined
                    }
                    isViewingArchive={activeCycleGrade !== learnerGrade}
                    previousGrade={prevCycleGrade}
                  />
                </>
              );
            })()}

            {/* VIEW MODE 1: STRANDS & TEACHER RESULTS (WITH PENDING STATUS) */}
            {assessmentViewMode === 'strands' && (
              <div className="space-y-4">
                {(() => {
                  const cycleGrade = assessmentCycleGrade || learnerGrade;
                  const learningAreas: LearningAreaDef[] = DATA.grades[cycleGrade]?.terms[assessmentTerm] || [];

                  if (learningAreas.length === 0) {
                    return (
                      <div className="bg-[var(--card)] rounded-2xl p-6 text-center border border-[var(--line)] text-xs text-[var(--muted)]">
                        No learning areas found for {cycleGrade} in {assessmentTerm}.
                      </div>
                    );
                  }

                  // Count total strands and marked strands
                  let totalStrands = 0;
                  let markedStrands = 0;

                  learningAreas.forEach((area) => {
                    area.strands.forEach((str) => {
                      totalStrands++;
                      const markKey1 = makeMarkKey(currentLearner.id, str.sid);
                      const markKey2 = makeMarkKey(currentLearner.adm, str.sid);
                      const rec = storedMarks[markKey1] || storedMarks[markKey2];
                      if (rec && resultOf(rec)) {
                        markedStrands++;
                      }
                    });
                  });

                  return (
                    <>
                      {/* Overall Status Banner */}
                      <div className="bg-[var(--card)] rounded-2xl p-3.5 border border-[var(--line)] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-base">📈</span>
                          <div>
                            <span className="font-extrabold text-[var(--ink)]">
                              {cycleGrade} &bull; {assessmentTerm} Evaluation Status:
                            </span>{' '}
                            <span className="text-[var(--muted)]">
                              {markedStrands} of {totalStrands} strands assessed
                            </span>
                          </div>
                        </div>
                        <span
                          className={`font-black px-2 py-0.5 rounded-full text-[10.5px] ${
                            markedStrands === totalStrands
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                              : markedStrands > 0
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {markedStrands === totalStrands ? 'Completed' : markedStrands > 0 ? 'In Progress' : 'Pending'}
                        </span>
                      </div>

                      {/* Learning Areas List */}
                      <div className="space-y-3.5">
                        {learningAreas.map((area, aIdx) => {
                          const areaStrands = area.strands || [];
                          let areaMarkedCount = 0;
                          let areaScoreSum = 0;

                          areaStrands.forEach((str) => {
                            const markKey1 = makeMarkKey(currentLearner.id, str.sid);
                            const markKey2 = makeMarkKey(currentLearner.adm, str.sid);
                            const rec = storedMarks[markKey1] || storedMarks[markKey2];
                            const res = resultOf(rec);
                            if (res) {
                              areaMarkedCount++;
                              areaScoreSum += res.f;
                            }
                          });

                          const areaAverage = areaMarkedCount > 0 ? Math.round(areaScoreSum / areaMarkedCount) : null;
                          const areaLevel = band(areaAverage);

                          return (
                            <div
                              key={aIdx}
                              className="bg-[var(--card)] rounded-2xl border border-[var(--line)] shadow-xs overflow-hidden"
                            >
                              {/* Learning Area Header */}
                              <div className="p-3.5 bg-[var(--sub)] border-b border-[var(--line)] flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="text-xl shrink-0">
                                    {SUBJ_ICONS[area.name] || '📚'}
                                  </span>
                                  <div className="min-w-0">
                                    <h3 className="font-black text-sm text-[var(--ink)] truncate m-0">
                                      {area.name}
                                    </h3>
                                    <span className="text-[11px] text-[var(--muted)]">
                                      {areaStrands.length} {areaStrands.length === 1 ? 'Strand' : 'Strands'}
                                    </span>
                                  </div>
                                </div>

                                {areaAverage !== null && areaLevel ? (
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span
                                      className="text-white text-[10.5px] font-black px-2 py-0.5 rounded-md"
                                      style={{ backgroundColor: LEVEL_COLORS[areaLevel] }}
                                    >
                                      {areaLevel} &bull; {areaAverage}%
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                    Pending Teacher Marks
                                  </span>
                                )}
                              </div>

                              {/* Strands Breakdown */}
                              <div className="p-3.5 space-y-3">
                                {areaStrands.map((strand) => {
                                  const markKey1 = makeMarkKey(currentLearner.id, strand.sid);
                                  const markKey2 = makeMarkKey(currentLearner.adm, strand.sid);
                                  const rec = storedMarks[markKey1] || storedMarks[markKey2];
                                  const res = resultOf(rec);
                                  const level = res ? band(res.f) : null;

                                  return (
                                    <div
                                      key={strand.sid}
                                      className="p-3 rounded-xl bg-[var(--sub)] border border-[var(--line)] space-y-2"
                                    >
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                          <div className="font-extrabold text-xs sm:text-sm text-[var(--ink)] flex items-center gap-1.5">
                                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-600 text-white font-bold">
                                              {strand.code}
                                            </span>
                                            <span>{strand.name}</span>
                                          </div>
                                          {strand.subs && strand.subs.length > 0 && (
                                            <div className="text-[11px] text-[var(--muted)] mt-1 flex flex-wrap gap-1.5">
                                              <span className="font-semibold text-[var(--ink)]">Sub-strands:</span>
                                              {strand.subs.map((sub) => (
                                                <span
                                                  key={sub.code}
                                                  className="px-1.5 py-0.2 rounded bg-[var(--card)] border border-[var(--line)] text-[10px]"
                                                >
                                                  {sub.code} {sub.name}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>

                                        {res && level ? (
                                          <div className="text-right shrink-0">
                                            <div className="flex items-center gap-1.5 justify-end">
                                              <span
                                                className="text-white text-[11px] font-black px-2 py-0.5 rounded shadow-xs"
                                                style={{ backgroundColor: LEVEL_COLORS[level] }}
                                              >
                                                {level}
                                              </span>
                                              <span className="text-sm font-black text-[var(--ink)]">
                                                {Math.round(res.f)}%
                                              </span>
                                            </div>
                                            <div className="text-[9.5px] text-[var(--muted)] mt-0.5 font-mono">
                                              CATs: {Math.round(res.c)}% (60%) &bull; Asg: {Math.round(res.a)}% (40%)
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="text-left sm:text-right shrink-0">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                              <span>⏳</span>
                                              <span>Pending Teacher Assessment</span>
                                            </span>
                                            <div className="text-[10px] text-[var(--muted)] mt-0.5">
                                              Awaiting teacher evaluation in {assessmentTerm}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Visual score bar */}
                                      <div className="h-1.5 rounded-full bg-[var(--line)] overflow-hidden">
                                        <div
                                          className="h-full rounded-full transition-all duration-500"
                                          style={{
                                            width: res ? `${Math.min(100, Math.round(res.f))}%` : '0%',
                                            backgroundColor: level ? LEVEL_COLORS[level] : '#94A3B8',
                                          }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* CBC Competency Levels Card */}
                      <div className="bg-[var(--card)] rounded-2xl p-4 shadow-sm border border-[var(--line)] space-y-2">
                        <div className="font-black text-xs text-[var(--ink)]">
                          Kenyan CBC Performance Bands (Ministry of Education Standards)
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          {(['EE', 'ME', 'AE', 'BE'] as const).map((lvl) => (
                            <div
                              key={lvl}
                              className="p-2.5 rounded-xl border flex flex-col gap-0.5 text-white"
                              style={{ backgroundColor: LEVEL_COLORS[lvl] }}
                            >
                              <div className="font-black text-xs flex items-center justify-between">
                                <span>{lvl}</span>
                                <span className="text-[10px] opacity-90">
                                  {lvl === 'EE' ? '80-100%' : lvl === 'ME' ? '60-79%' : lvl === 'AE' ? '40-59%' : 'Below 40%'}
                                </span>
                              </div>
                              <span className="text-[10px] font-medium leading-tight opacity-95">
                                {LEVEL_NAMES[lvl]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* VIEW MODE 2: ASSESSMENT BOOK TABLE */}
            {assessmentViewMode === 'book' && (
              <div className="bg-[var(--card)] rounded-2xl p-4 border border-[var(--line)] shadow-sm space-y-3">
                {(() => {
                  const cycleGrade = assessmentCycleGrade || learnerGrade;
                  return (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--line)]">
                        <div>
                          <h3 className="font-black text-sm sm:text-base text-[var(--ink)] m-0">
                            Official CBC Assessment Booklet
                          </h3>
                          <p className="text-[11px] text-[var(--muted)] m-0 mt-0.5">
                            {currentLearner.name} &bull; {currentLearner.adm} &bull; {cycleGrade} &bull; {assessmentTerm}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <button
                            type="button"
                            onClick={() => {
                              sound.playCompleteChime();
                              const res = downloadAssessmentDocument({
                                learner: {
                                  id: currentLearner.id,
                                  name: currentLearner.name,
                                  adm: currentLearner.adm,
                                  grade: cycleGrade,
                                  stream: '',
                                },
                                mode: 'book',
                                term: assessmentTerm,
                              });
                              onShowToast(`Downloaded ${cycleGrade} Assessment Book (${res.filename})`);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <span>📥</span>
                            <span>Download Book</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              sound.playClick(450);
                              window.print();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <span>🖨️</span>
                            <span>Print</span>
                          </button>
                        </div>
                      </div>

                      <AssessmentBookView
                        learnerId={currentLearner.id}
                        learnerAdm={currentLearner.adm}
                        gradeLabel={cycleGrade}
                        learningAreas={DATA.grades[cycleGrade]?.terms[assessmentTerm] || []}
                        term={assessmentTerm}
                        editable={false}
                      />
                    </>
                  );
                })()}
              </div>
            )}

            {/* VIEW MODE 3: ASSESSMENT REPORT TABLE */}
            {assessmentViewMode === 'report' && (
              <div className="bg-[var(--card)] rounded-2xl p-4 border border-[var(--line)] shadow-sm space-y-3">
                {(() => {
                  const cycleGrade = assessmentCycleGrade || learnerGrade;
                  return (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--line)]">
                        <div>
                          <h3 className="font-black text-sm sm:text-base text-[var(--ink)] m-0">
                            Official Termly Assessment Report
                          </h3>
                          <p className="text-[11px] text-[var(--muted)] m-0 mt-0.5">
                            {currentLearner.name} &bull; {currentLearner.adm} &bull; {cycleGrade} &bull; {assessmentTerm}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <button
                            type="button"
                            onClick={() => {
                              sound.playCompleteChime();
                              const res = downloadAssessmentDocument({
                                learner: {
                                  id: currentLearner.id,
                                  name: currentLearner.name,
                                  adm: currentLearner.adm,
                                  grade: cycleGrade,
                                  stream: '',
                                },
                                mode: 'report',
                                term: assessmentTerm,
                              });
                              onShowToast(`Downloaded ${cycleGrade} Assessment Report (${res.filename})`);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <span>📥</span>
                            <span>Download Report</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              sound.playClick(450);
                              window.print();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <span>🖨️</span>
                            <span>Print</span>
                          </button>
                        </div>
                      </div>

                      <AssessmentReportView
                        learnerId={currentLearner.id}
                        learnerAdm={currentLearner.adm}
                        learningAreas={DATA.grades[cycleGrade]?.terms[assessmentTerm] || []}
                        term={assessmentTerm}
                        canEdit={false}
                      />
                    </>
                  );
                })()}
              </div>
            )}

            {/* VIEW MODE 4: OFFICIAL COVERS PREVIEW */}
            {assessmentViewMode === 'covers' && (
              <div className="bg-[var(--card)] rounded-2xl p-4 border border-[var(--line)] shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-sm text-[var(--ink)] m-0">
                      Official CBC Covers
                    </h3>
                    <p className="text-[11px] text-[var(--muted)] m-0 mt-0.5">
                      Dynamic school covers with your admission number, grade and academic year
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick(500);
                        setShowInspectorModal(true);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-[11px] shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>🎨</span>
                      <span>Cover Calibrator & Inspector</span>
                    </button>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                      LRA Verified
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Assessment Book Cover Card */}
                  <div className="p-3.5 rounded-2xl border border-[var(--line)] bg-[var(--sub)] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-[var(--ink)] flex items-center gap-1.5">
                        <span>📘</span>
                        <span>Assessment Book Cover</span>
                      </span>
                    </div>
                    <div className="max-w-[210px] mx-auto overflow-hidden rounded-xl shadow-md border-2 border-amber-300">
                      <AssessmentBookCover
                        learner={{
                          name: currentLearner.name,
                          adm: currentLearner.adm,
                          grade: currentLearner.grade,
                          stream: '',
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick(450);
                        setViewingOfficialCover('book');
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>🔍</span>
                      <span>Enlarge & Print Cover</span>
                    </button>
                  </div>

                  {/* Assessment Report Cover Card */}
                  <div className="p-3.5 rounded-2xl border border-[var(--line)] bg-[var(--sub)] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-[var(--ink)] flex items-center gap-1.5">
                        <span>📊</span>
                        <span>Assessment Report Cover</span>
                      </span>
                    </div>
                    <div className="max-w-[210px] mx-auto overflow-hidden rounded-xl shadow-md border-2 border-pink-400">
                      <AssessmentReportCover
                        learner={{
                          name: currentLearner.name,
                          adm: currentLearner.adm,
                          grade: currentLearner.grade,
                          stream: '',
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick(450);
                        setViewingOfficialCover('report');
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-extrabold text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>🔍</span>
                      <span>Enlarge & Print Cover</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* TAB 5: ASK ELSIE CHAT */
          <div className="flex flex-col h-full min-h-[420px] overflow-hidden rounded-2xl border border-[var(--line)] shadow-sm">
            <ElsieChatView
              identity={learnerIdentity}
              onClose={() => setActiveTab('home')}
              quickPrompts={[
                'How am I performing in my released subjects?',
                'Which Kenyan Senior School Pathway fits my strengths?',
                'What is in my Focus Zone right now?',
                'Niaje Elsie, form ni gani?',
                'Shikamoo Elsie',
              ]}
              theme={theme}
            />
          </div>
        )}
      </main>

      {/* DOCKED BOTTOM NAVIGATION BAR (5 Tabs, docked below main so content never slides underneath) */}
      <div className="shrink-0 px-2.5 sm:px-3 pt-1 pb-2.5 z-30">
        <nav className="flex bg-gradient-to-r from-[#0A1F4D] to-[#14296B] rounded-[24px] p-1.5 shadow-[0_8px_22px_rgba(10,31,77,0.4)] border border-white/10">
          {[
            { id: 'home', label: 'Home', icon: '🏠' },
            { id: 'timetable', label: 'Timetable', icon: '🗓️' },
            { id: 'focus', label: 'Focus Zone', icon: '🎯' },
            { id: 'progress', label: 'Assessment', icon: '📊' },
            { id: 'ask', label: 'ELSIE AI', icon: '🤖' },
          ].map((t) => {
            const isActive = activeTab === t.id && !activeSub;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  sound.playClick(450);
                  setActiveTab(t.id as any);
                  setActiveSub(null);
                  setShowFullBooklet(false);
                  setViewingOfficialCover(null);
                  setViewingTeacherNote(null);
                  setActiveExamModal(null);
                  setViewingKICDPastPaper(null);
                  setReadingDoc(null);
                }}
                className={`min-w-0 flex-1 border-0 bg-transparent flex flex-col items-center gap-0.5 cursor-pointer py-1.5 px-0.5 rounded-[18px] text-[9.5px] sm:text-[10.5px] font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-[#2F6BFF] to-[#4F8BFF] text-white shadow-xs'
                    : 'text-[#B8C6E8] hover:text-white'
                }`}
              >
                <span className="text-[16px] sm:text-[17px] leading-none">{t.icon}</span>
                <span className="w-full truncate text-center leading-tight">{t.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Free Document Reader Modal (PDF & Word .docx) */}
      <DocumentReaderModal
        document={readingDoc}
        onClose={() => setReadingDoc(null)}
        assessmentKind="Assignment"
      />

      {/* MODAL: VIEW OFFICIAL ASSESSMENT COVER & REPORT */}
      {viewingOfficialCover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md max-h-[92vh] rounded-3xl p-4 sm:p-5 bg-[var(--card)] border border-[var(--line)] shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] shrink-0">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-500">
                  Little Roses Academy · Official CBC Record
                </span>
                <h3 className="font-black text-sm text-[var(--ink)] m-0">
                  {viewingOfficialCover === 'book' ? 'CBC Assessment Book Cover' : 'Official Assessment Report Cover'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingOfficialCover(null)}
                className="w-8 h-8 rounded-full bg-[var(--sub)] hover:bg-[var(--line)] flex items-center justify-center font-bold text-xs cursor-pointer text-[var(--ink)]"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Cover Display */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              <div className="p-1">
                {viewingOfficialCover === 'book' ? (
                  <AssessmentBookCover
                    learner={{
                      name: currentLearner.name,
                      adm: currentLearner.adm,
                      grade: currentLearner.grade,
                      stream: '',
                    }}
                  />
                ) : (
                  <AssessmentReportCover
                    learner={{
                      name: currentLearner.name,
                      adm: currentLearner.adm,
                      grade: currentLearner.grade,
                      stream: '',
                    }}
                  />
                )}
              </div>

              {/* Assessment booklet availability & Term 3 30-day lifecycle notice */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-[var(--ink)] space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span>📚</span>
                  <span>Live Assessment Booklet &amp; 30-Day Term 3 Window</span>
                </div>
                <p className="text-[10.5px] text-[var(--muted)] m-0">
                  Your assessment booklets and reports appear automatically as teachers record marks. At the end of Term 3, you have 30 days to download your official copies before automatic class promotion and archive cleanup.
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-2 border-t border-[var(--line)] flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  sound.playClick(400);
                  setViewingOfficialCover(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-[var(--line)] font-bold text-xs text-[var(--ink)] bg-[var(--sub)] hover:opacity-80 cursor-pointer"
              >
                Close
              </button>

              {viewingOfficialCover === 'book' && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(450);
                    setViewingOfficialCover(null);
                    setShowFullBooklet(true);
                  }}
                  className="flex-1 py-2.5 rounded-xl font-black text-xs text-white bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>📖</span>
                  <span>Open Master Book</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  sound.playCompleteChime();
                  const mode = viewingOfficialCover === 'report' ? 'report' : 'book';
                  const res = downloadAssessmentDocument({
                    learner: {
                      id: currentLearner.id,
                      name: currentLearner.name,
                      adm: currentLearner.adm,
                      grade: currentLearner.grade,
                      stream: '',
                    },
                    mode,
                    term: assessmentTerm,
                  });
                  onShowToast(`Downloaded ${currentLearner.grade} ${mode === 'book' ? 'Assessment Book' : 'Assessment Report'} (${res.filename})`);
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

      {/* ========================================================================= */}
      {/* MODAL: FULL NATIVE ASSESSMENT BOOKLET                                    */}
      {/* ========================================================================= */}
      {showFullBooklet && (
        <NativeAssessmentBooklet
          role="learner"
          initialTab={bookletInitialTab}
          initialGrade={currentLearner.grade}
          learner={{
            id: currentLearner.id,
            name: currentLearner.name,
            adm: currentLearner.adm,
            grade: currentLearner.grade,
            stream: '',
            parentPhone: currentLearner.parentPhone || '',
            familyId: currentLearner.familyId || 'FAM-001',
            fatherName: currentLearner.fatherName || '',
            fatherPhone: currentLearner.fatherPhone || '',
            motherName: currentLearner.motherName || '',
            motherPhone: currentLearner.motherPhone || '',
          }}
          onClose={() => setShowFullBooklet(false)}
          onShowToast={onShowToast}
          onNavigateToFocusZone={() => {
            setShowFullBooklet(false);
            setActiveTab('focus');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: INTERACTIVE ABCD EXAM RUNNER (HOLIDAY CAT & TEACHER PUSHED CATS)   */}
      {/* ========================================================================= */}
      {activeExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-[var(--card)] rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[var(--line)] overflow-hidden">
            {/* Header */}
            <div className="p-3.5 sm:p-5 bg-gradient-to-r from-[#0A1F4D] to-[#1E3A8A] text-white flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <span className="text-2xl shrink-0">
                  {activeExamModal.type === 'holiday' ? '☀️' : '⚡'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <h3 className="font-black text-sm sm:text-base leading-tight truncate">
                      {activeExamModal.title}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white font-mono shrink-0">
                      {activeExamModal.subject}
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-200 mt-0.5 truncate">
                    {activeExamModal.type === 'holiday'
                      ? 'CBC Long Holiday Assessment (30 Oct – 4 Jan)'
                      : 'Teacher Pushed CAT · Auto-fills Assessment Book & Report'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playClick(400);
                  setActiveExamModal(null);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs font-bold cursor-pointer transition-all shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {!examSubmitted ? (
                /* IN-PROGRESS EXAM VIEW */
                <div className="space-y-4">
                  {/* Progress & Question Counter */}
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--muted)] pb-2 border-b border-[var(--line)]">
                    <span className="flex items-center gap-1.5">
                      <span>Question</span>
                      <span className="font-mono text-purple-600 dark:text-purple-400 font-extrabold text-sm">
                        {examQuestionIndex + 1}
                      </span>
                      <span>of {activeExamModal.questions.length}</span>
                    </span>

                    <span className="font-mono text-[11px] bg-purple-500/15 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md">
                      {activeExamModal.questions[examQuestionIndex]?.competency}
                    </span>
                  </div>

                  {/* Question Stem */}
                  <div className="bg-[var(--sub)] p-4 rounded-2xl border border-[var(--line)]">
                    <h4 className="text-sm sm:text-base font-extrabold text-[var(--ink)] leading-snug">
                      {activeExamModal.questions[examQuestionIndex]?.stem}
                    </h4>
                  </div>

                  {/* ABCD Option Choices */}
                  <div className="space-y-2.5 pt-1">
                    {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                      const isSelected = examAnswers[examQuestionIndex] === optKey;
                      const optText = activeExamModal.questions[examQuestionIndex]?.options[optKey];

                      return (
                        <div
                          key={optKey}
                          onClick={() => handleSelectExamOption(optKey)}
                          className={`p-3.5 rounded-2xl border text-xs sm:text-sm cursor-pointer transition-all flex items-center gap-3 ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-500 shadow-md font-bold scale-[1.01]'
                              : 'bg-[var(--card)] border-[var(--line)] text-[var(--ink)] hover:border-purple-400 hover:bg-[var(--sub)]'
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                              isSelected
                                ? 'bg-white text-purple-700 shadow-xs'
                                : 'bg-[var(--sub)] text-[var(--ink)] border border-[var(--line)]'
                            }`}
                          >
                            {optKey}
                          </span>
                          <span className="flex-1 leading-snug">{optText}</span>
                          {isSelected && <span className="text-sm">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* EXAM RESULT & CBC RUBRIC SUMMARY */
                <div className="space-y-4 animate-fade-in">
                  {/* Score Card Banner */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg text-center space-y-2">
                    <div className="text-3xl">🎉</div>
                    <div className="text-xs uppercase font-mono font-bold text-emerald-200 tracking-wider">
                      Assessment Completed & Graded
                    </div>
                    <div className="text-3xl sm:text-4xl font-black font-mono">
                      {examScoreResult?.score} / {examScoreResult?.total} ({examScoreResult?.percentage}%)
                    </div>
                    <div className="inline-block px-3 py-1 rounded-full bg-white/20 text-white font-extrabold text-xs">
                      CBC Band: {examScoreResult?.band} (
                      {examScoreResult?.band === 'EE'
                        ? 'Exceeding Expectations'
                        : examScoreResult?.band === 'ME'
                        ? 'Meeting Expectations'
                        : examScoreResult?.band === 'AE'
                        ? 'Approaching Expectations'
                        : 'Below Expectations'}
                      )
                    </div>

                    <div className="text-xs text-emerald-100 bg-black/20 p-2.5 rounded-xl border border-white/20 mt-2 font-medium">
                      ✓ Score automatically filled into <b>{currentLearner.name}'s Assessment Book and Report</b>!
                    </div>
                  </div>

                  {/* Question Review List */}
                  <div className="space-y-3 pt-2">
                    <h4 className="font-black text-xs text-[var(--ink)] uppercase tracking-wider">
                      Question Review & Curriculum Notes:
                    </h4>

                    {activeExamModal.questions.map((q, idx) => {
                      const userPick = examAnswers[idx];
                      const isCorrect = userPick === q.correctAnswer;

                      return (
                        <div
                          key={q.id || idx}
                          className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                            isCorrect
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : 'bg-rose-500/10 border-rose-500/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-extrabold text-[var(--ink)]">
                              <span className="font-mono text-purple-600 mr-1.5">{idx + 1}.</span>
                              {q.stem}
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                isCorrect
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-rose-500 text-white'
                              }`}
                            >
                              {isCorrect ? '✓ Correct' : '✕ Missed'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-[var(--muted)]">Your Answer: </span>
                              <b className={isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}>
                                Option {userPick || 'None'}
                              </b>
                            </div>
                            <div>
                              <span className="text-[var(--muted)]">Correct Key: </span>
                              <b className="text-emerald-700 dark:text-emerald-300">
                                Option {q.correctAnswer} ({q.options[q.correctAnswer]})
                              </b>
                            </div>
                          </div>

                          <div className="text-[11px] text-[var(--muted)] italic pt-1 border-t border-[var(--line)]">
                            💡 {q.explanation}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Navigation */}
            <div className="p-4 bg-[var(--sub)] border-t border-[var(--line)] flex items-center justify-between shrink-0">
              {!examSubmitted ? (
                <>
                  <button
                    type="button"
                    disabled={examQuestionIndex === 0}
                    onClick={() => {
                      sound.playClick(400);
                      setExamQuestionIndex((prev) => Math.max(0, prev - 1));
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold border border-[var(--line)] text-[var(--ink)] disabled:opacity-40 cursor-pointer"
                  >
                    ← Previous
                  </button>

                  <div className="flex items-center gap-2">
                    {examQuestionIndex < activeExamModal.questions.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick(450);
                          setExamQuestionIndex((prev) => Math.min(activeExamModal.questions.length - 1, prev + 1));
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-black text-white bg-purple-600 hover:bg-purple-700 cursor-pointer shadow-xs"
                      >
                        Next Question →
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSubmitExam}
                        className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer shadow-md flex items-center gap-1.5 transition-all"
                      >
                        <span>✓ Submit & Auto-Grade</span>
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(500);
                    setActiveExamModal(null);
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 cursor-pointer shadow-md"
                >
                  Done & Return to Homework
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW KICD PAST PAPER REVISION VAULT                                */}
      {/* ========================================================================= */}
      {viewingKICDPastPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-[var(--card)] rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[var(--line)] overflow-hidden">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-700 to-purple-800 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black text-sm sm:text-base leading-tight">
                  {viewingKICDPastPaper.title}
                </h3>
                <p className="text-xs text-indigo-200 mt-0.5">
                  Grade {viewingKICDPastPaper.grade} &bull; {viewingKICDPastPaper.subject} &bull; {viewingKICDPastPaper.term}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewingKICDPastPaper(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="space-y-3.5">
                {viewingKICDPastPaper.questions.map((q, idx) => (
                  <div key={q.id || idx} className="p-3.5 rounded-2xl bg-[var(--sub)] border border-[var(--line)] space-y-2">
                    <div className="font-extrabold text-xs text-[var(--ink)]">
                      <span className="text-purple-600 mr-1.5">{idx + 1}.</span>
                      {q.stem}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {(['A', 'B', 'C', 'D'] as const).map((optKey) => (
                        <div
                          key={optKey}
                          className={`p-2 rounded-xl border flex items-center gap-1.5 ${
                            optKey === q.correctAnswer
                              ? 'bg-emerald-500/15 border-emerald-500/40 font-bold text-emerald-800 dark:text-emerald-300'
                              : 'bg-[var(--card)] border-[var(--line)] text-[var(--ink)]'
                          }`}
                        >
                          <span className="font-black text-[10px] w-4 h-4 rounded-full bg-black/10 flex items-center justify-center">
                            {optKey}
                          </span>
                          <span>{q.options[optKey]}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-[11px] text-[var(--muted)] italic pt-1 border-t border-[var(--line)]">
                      <b>Marking Guide:</b> {q.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-[var(--sub)] border-t border-[var(--line)] flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setViewingKICDPastPaper(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--line)] text-[var(--ink)] cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick(600);
                  const paper = viewingKICDPastPaper;
                  setViewingKICDPastPaper(null);
                  handleStartExam(
                    'holiday',
                    {
                      id: paper.id,
                      dateStr: '2026-10-30',
                      dayNumber: 1,
                      grade: paper.grade,
                      subject: paper.subject,
                      strand: 'KICD Model Paper',
                      title: paper.title,
                      durationMinutes: 20,
                      totalMarks: paper.questions.length * 2,
                      questions: paper.questions,
                    },
                    paper.title,
                    paper.subject,
                    paper.questions
                  );
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md cursor-pointer"
              >
                Practice as Timed Test →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CBC Assessment Cover Inspector Modal */}
      <AssessmentCoverInspectorModal
        isOpen={showInspectorModal}
        onClose={() => setShowInspectorModal(false)}
        initialGrade={currentLearner.grade}
      />
    </div>
  );
};
