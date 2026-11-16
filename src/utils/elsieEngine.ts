// ELSIE AI Engine for Little Roses Academy (Nakuru, Kenya)
// Connected to Server-Side Gemini 4 Brain + Live Cloud CBC Marks + Kenyan Senior Pathways + Swahili & Sheng

import {
  buildLocalElsiePathwayAnalysis,
  type LiveLearnerAssessmentSummary,
  type ReportSubjectSnapshot,
  type ElsiePathwayAnalysisResult,
} from './elsiePathways';
import {
  analyzeEmojiSemantics,
  sanitizeAiReplyEmojis,
} from '../data/emojiCatalog';

export type { ElsiePathwayAnalysisResult, ReportSubjectSnapshot };

export type PortalRole = 'learner' | 'parent' | 'teacher' | 'admin';

export interface UserIdentity {
  role: PortalRole;
  id: string; // ADM (e.g. LRA/0001) for learner, Phone for parent/teacher, "admin_office" for admin
  name: string;
  preferredTitle?: string;
  preferredName?: string;
  language?: 'en' | 'sw';
  teachesKiswahili?: boolean;
  grade?: string;
  stream?: string;
  assignedClasses?: string[];
  linkedLearners?: Array<{ id?: string; adm: string; name: string; grade: string; stream?: string }>;
  assessmentSummary?: Partial<LiveLearnerAssessmentSummary> & {
    totalSubjects?: number;
    overallAverage?: number;
    focusZoneStrands?: string[];
    performanceLevel?: 'EE' | 'ME' | 'AE' | 'BE';
    termReleased?: boolean;
    strandsDetail?: Record<
      string,
      {
        score: number;
        level: string;
        released?: boolean;
        status?: string;
        focusZoneActive?: boolean;
        focusStrands?: string[];
        catAvg?: number;
        asgAvg?: number;
      }
    >;
  };
}

export interface ElsieMessage {
  id: string;
  text: string;
  out: boolean; // true = user (outgoing), false = Elsie AI (incoming)
  timestamp: string; // ISO string
  displayTime: string; // e.g. "10:45 AM"
  status?: 'sent' | 'delivered' | 'read';
  source?: 'gemini' | 'cloud_fallback' | 'cloud_engine' | 'guard' | 'offline';
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// Nairobi Timezone Helper (Africa/Nairobi, UTC+3)
export function getNairobiDate(): Date {
  const now = new Date();
  try {
    const nairobiStr = now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' });
    return new Date(nairobiStr);
  } catch {
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 3600000 * 3);
  }
}

export function isThursdayInNairobi(): boolean {
  return getNairobiDate().getDay() === 4;
}

export function getTimeBand(hour: number): 'morning' | 'afternoon' | 'evening' | 'late' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'late';
}

export function formatTimeHM(date: Date): string {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export const GREETINGS_DATA = {
  time_bands: {
    morning: { emoji: ['☀️', '🌅', '🌄'] },
    afternoon: { emoji: ['🌤️', '🌞', '😊'] },
    evening: { emoji: ['🌇', '🌆', '🌙'] },
    late: { emoji: ['🌙', '✨', '💤'] },
  },
  english: {
    learner: {
      morning: [
        'Good morning, {address}! ☀️ I am **Elsie AI**, your Little Roses study assistant. Ready to check your Focus Zone or revise a CBC topic?',
      ],
      afternoon: [
        'Good afternoon, {address}! 🌤️ **Elsie AI** here — how are your lessons going? Ask me anything in English, Kiswahili, or Sheng!',
      ],
      evening: [
        'Good evening, {address}! 🌇 I am **Elsie AI**. Need help revising homework or checking your Admin-released Assessment Book?',
      ],
      late: [
        "Hello, {address}! 🌙 It's late — as your AI assistant I'm always awake, though learners should rest soon! Need one quick study tip?",
      ],
    },
    parent: {
      morning: [
        'Good morning, {address}! ☀️ I am **Elsie**, your Little Roses AI Academic Advisor. Ask me about your child’s **Admin-released CBC marks**, Focus Zone, or **Kenyan Senior School Pathways** (STEM, Social Sciences, Arts & Sports).',
      ],
      afternoon: [
        'Good afternoon, {address}! 🌤️ **Elsie AI** is online and synced with Little Roses records. How can I assist with your child’s CBC progress or Senior Pathway guidance today?',
      ],
      evening: [
        'Good evening, {address}! 🌇 Welcome back. I can walk you through your child’s released Assessment Book subjects and early Senior School Pathway strengths.',
      ],
      late: [
        "Good evening, {address}! 🌙 As an AI assistant, I'm available anytime. Would you like a summary of your child's released CBC performance or Focus Zone?",
      ],
    },
    teacher: {
      morning: [
        'Good morning, {address}! ☀️ **Elsie AI Faculty Copilot** is online. Ready to draft CBC 40-minute lesson plans, 10-mark CATs, or analyze Focus Zone strands?',
      ],
      afternoon: [
        'Good afternoon, {address}! 🌤️ **Elsie AI** here. Need help checking pending mark submissions or designing remedial Focus Zone tasks?',
      ],
      evening: [
        'Good evening, {address}! 🌇 Winding down classes? Let me know if you need marking rubrics or tomorrow’s CBC starter activities.',
      ],
      late: [
        'Hello, {address}! 🌙 As an AI, I am available whenever you prepare Schemes of Work or CAT drafts.',
      ],
    },
    admin: {
      morning: [
        'Good morning, {address}! ☀️ **Elsie Master AI** is synced with school records. Ready to review pending subject releases, learner dossiers, or draft actions?',
      ],
      afternoon: [
        'Good afternoon, {address}! 🌤️ **Elsie Master AI** ready. Ask for term release readiness, learner admissions drafts, or schoolwide CBC metrics.',
      ],
      evening: [
        'Good evening, {address}! 🌇 What school records or pending Assessment Book releases should we check before closing?',
      ],
      late: [
        'Hello, {address}! 🌙 **Elsie Master AI** is online to help review records or prepare drafts for tomorrow.',
      ],
    },
    no_name: {
      morning: ['Good morning! ☀️ I am Elsie AI at Little Roses Academy. How can I help today?'],
      afternoon: ['Good afternoon! 🌤️ I am Elsie AI. How can I assist you?'],
      evening: ['Good evening! 🌇 I am Elsie AI. How may I help?'],
      late: ['Hello! 🌙 I am Elsie AI. How can I assist tonight?'],
    },
  },
  kiswahili: {
    learner: {
      morning: [
        'Habari za asubuhi, {address}! ☀️ Mimi ni **Elsie AI** wa Little Roses Academy. Leo ni siku njema ya kujifunza — tuanze na somo gani?',
      ],
      afternoon: [
        'Habari za mchana, {address}! 🌤️ **Elsie AI** yuko tayari. Ukihitaji msaada wa Focus Zone au maswali ya CBC, niambie!',
      ],
      evening: [
        'Habari za jioni, {address}! 🌇 Karibu tujifunze kidogo au tuangalie matokeo yaliyoidhinishwa na Admin.',
      ],
      late: [
        'Habari za usiku, {address}! 🌙 Kama AI msaidizi wako, niko macho muda wote — lakini kumbuka kupumzika mapema!',
      ],
    },
    parent: {
      morning: [
        'Habari za asubuhi, {address}! ☀️ Mimi ni **Elsie AI** wa Little Roses Academy. Karibu tuangalie maendeleo ya mtoto yaliyotumwa na Admin na ushauri wa **Kenyan Senior School Pathways**.',
      ],
      afternoon: [
        'Habari za mchana, {address}! 🌤️ **Elsie AI** iko tayari kukupa taarifa halisi za Assessment Book na ushauri wa njia za Senior School (STEM, Social Sciences, Arts & Sports).',
      ],
      evening: [
        'Habari za jioni, {address}! 🌇 Karibu mzazi. Ungependa tuangalie matokeo ya mtoto au Focus Zone leo?',
      ],
      late: [
        'Habari za usiku, {address}! 🌙 Niko hapa kukusaidia na ripoti ya CBC ya mtoto wako wakati wowote.',
      ],
    },
    teacher: {
      morning: [
        'Habari za asubuhi, {address}! ☀️ **Elsie AI** iko tayari kukusaidia kuandaa mpango wa somo (lesson plan) au maswali ya CAT.',
      ],
      afternoon: [
        'Habari za mchana, {address}! 🌤️ Karibu Mwalimu. Nikusaidieje na tathmini za CBC au Focus Zone leo?',
      ],
      evening: [
        'Habari za jioni, {address}! 🌇 Asante kwa kazi nzuri leo, Mwalimu. Unahitaji msaada wowote wa maandalizi?',
      ],
      late: [
        'Habari za usiku, {address}! 🌙 Kama AI msaidizi wa walimu, niko tayari wakati wowote.',
      ],
    },
    admin: {
      morning: [
        'Habari za asubuhi, {address}! ☀️ **Elsie AI** iko tayari kuchunguza alama zinazosubiri kutumwa kwa wazazi na kumbukumbu za shule.',
      ],
      afternoon: [
        'Habari za mchana, {address}! 🌤️ Nikusaidieje katika usimamizi wa Little Roses Academy leo?',
      ],
      evening: [
        'Habari za jioni, {address}! 🌇 Unahitaji taarifa gani za shule kabla ya siku kuisha?',
      ],
      late: [
        'Habari za usiku, {address}! 🌙 Niko tayari kukusaidia na kumbukumbu za utawala usiku huu.',
      ],
    },
    no_name: {
      morning: ['Habari za asubuhi! ☀️ Mimi ni Elsie AI. Nikusaidieje leo?'],
      afternoon: ['Habari za mchana! 🌤️ Mimi ni Elsie AI. Nikusaidieje?'],
      evening: ['Habari za jioni! 🌇 Mimi ni Elsie AI. Nikusaidieje?'],
      late: ['Habari za usiku! 🌙 Mimi ni Elsie AI. Nikusaidieje usiku huu?'],
    },
  },
};

// Comprehensive Kiswahili & Kenyan Sheng Replies (used for instant greeting helper & offline resilience)
export const SWAHILI_DIRECT_REPLIES: Record<string, string> = {
  shikamoo: 'Marahaba! 🌹 Karibu sana — mimi ni **Elsie AI** wa Little Roses Academy. Nikusaidieje leo?',
  'shikamoo mwalimu': 'Marahaba! Karibu sana, tuanze na somo au tathmini gani leo?',
  'shikamoo baba': 'Marahaba! Karibu mzazi, tuangalie maendeleo ya CBC ya mtoto.',
  'shikamoo mama': 'Marahaba! Karibu mzazi, tuangalie maendeleo ya CBC ya mtoto.',
  hujambo: 'Sijambo! 🌹 Habari yako? Mimi ni **Elsie AI**, niko tayari kukusaidia.',
  hamjambo: 'Hatujambo kabisa! 🌹 Karibuni Little Roses Academy.',
  habari: 'Nzuri sana, asante! 🌹 Mimi ni **Elsie AI** — nikusaidieje kuhusu masomo au Assessment Book?',
  'habari za asubuhi': 'Nzuri na njema kabisa! ☀️ Karibu tuangalie masomo ya leo.',
  'habari za mchana': 'Salama kabisa! 🌤️ Nikusaidieje leo?',
  'habari za jioni': 'Nzuri sana! 🌇 Karibu tuangalie maendeleo ya leo.',
  'habari za usiku': 'Salama! 🌙 Kama AI msaidizi wako, niko hapa wakati wowote.',
  'habari ya masomo': 'Masomo yanaendelea vizuri sana! 📚 Ungependa tuangalie somo gani?',
  mambo: 'Poa sana! 😄 Mimi ni **Elsie AI** — sema nikusaidieje na CBC au Senior Pathways leo?',
  'mambo vipi': 'Safi kabisa! 🔥 Niko chonjo kukusaidia na Assessment Book au masomo.',
  niaje: 'Niaje! Fiti sana, rada ni safi kabisa! ⚡ Mimi ni **Elsie AI** — tuangalie nini leo?',
  rada: 'Rada ni safi kabisa! ⚡ Mfumo wa CBC na Senior Pathways uko tayari.',
  'rada safi': 'Rada safi kabisa! 😄 Tuanze na somo gani au tuangalie Assessment Book?',
  'form ni gani': 'Form ni ku-level up CBC Focus Zone na kuangalia Kenyan Senior Pathways! 🎯',
  'uko aje': 'Niko fiti mbaya! ⚡ Kumbuka mimi ni **Elsie AI** (sio binadamu), so niko online 24/7 kukusaidia!',
  'uko fiti': 'Niko fiti kabisa! ⚡ Nikusaidieje na masomo leo?',
  'uko poa': 'Niko poa sana! 🌹 Kama AI assistant, niko ready muda wote.',
  vipi: 'Poa sana! Kila kitu kiko shwari. Nikusaidieje leo?',
  sasa: 'Poa! 😄 Tuanze na Assessment Book, Focus Zone, ama Senior Pathways?',
  alamsiki: 'Binuru! 🌙 Lala salama.',
  'lala salama': 'Nawe pia! Ndoto njema. 💤',
  kwaheri: 'Kwaheri ya kuonana! 👋',
  asante: 'Karibu sana! 😊 Ni furaha yangu kusaidia.',
  'asante sana': 'Karibu sana, wakati wowote! 🌹',
};

export function generateGreeting(identity: UserIdentity): string {
  const nairobi = getNairobiDate();
  const hour = nairobi.getHours();
  const band = getTimeBand(hour);
  const isThursday = nairobi.getDay() === 4;
  const useSwahili = isThursday || identity.language === 'sw' || identity.teachesKiswahili;

  const langKey = useSwahili ? 'kiswahili' : 'english';
  const roleGreetings = GREETINGS_DATA[langKey][identity.role] || GREETINGS_DATA[langKey].no_name;
  const list: string[] = roleGreetings[band] || roleGreetings.morning;
  const template = list[Math.floor(Math.random() * list.length)];

  const address =
    identity.preferredName ||
    (identity.preferredTitle && identity.name ? `${identity.preferredTitle} ${identity.name}` : identity.name) ||
    'there';

  return template.replace('{address}', address);
}

// 24-Hour Storage Manager for Threads
const STORAGE_PREFIX = 'lra_elsie_thread_';

export function loadThread(role: PortalRole, id: string): ElsieMessage[] {
  try {
    const key = `${STORAGE_PREFIX}${role}_${id}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: ElsieMessage[] = JSON.parse(raw);
    const cutoff = Date.now() - TWENTY_FOUR_HOURS_MS;
    const active = parsed.filter((m) => new Date(m.timestamp).getTime() > cutoff);
    if (active.length !== parsed.length) {
      saveThread(role, id, active);
    }
    return active;
  } catch {
    return [];
  }
}

export function saveThread(role: PortalRole, id: string, messages: ElsieMessage[]): void {
  try {
    const key = `${STORAGE_PREFIX}${role}_${id}`;
    const cutoff = Date.now() - TWENTY_FOUR_HOURS_MS;
    const active = messages.filter((m) => new Date(m.timestamp).getTime() > cutoff);
    localStorage.setItem(key, JSON.stringify(active));
  } catch (err) {
    console.warn('Could not save Elsie thread:', err);
  }
}

export function clearThread(role: PortalRole, id: string): void {
  try {
    const key = `${STORAGE_PREFIX}${role}_${id}`;
    localStorage.removeItem(key);
  } catch {}
}

/**
 * Offline fallback engine (used ONLY if /api/elsie/message cannot be reached over the network).
 * Strictly uses real assessmentSummary data and never invents demo scores.
 */
function buildOfflineClientResponse(
  query: string,
  identity: UserIdentity,
  swahiliMode: boolean
): { text: string; source: 'offline' } {
  const lower = query.toLowerCase();
  const normalizedGreet = lower.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

  if (SWAHILI_DIRECT_REPLIES[normalizedGreet]) {
    return { text: SWAHILI_DIRECT_REPLIES[normalizedGreet], source: 'offline' };
  }

  if (/(are you human|wewe ni mtu|who are you)/i.test(lower)) {
    return {
      text: `I am **Elsie**, an AI academic assistant built for Little Roses Academy 🌹🤖 (not human, so I'm ready 24/7 to help!). Currently operating in offline PWA mode.`,
      source: 'offline',
    };
  }

  if (/(pathway|senior school|stem|social science|arts|sports|performance|marks|assessment|focus zone|doing)/i.test(lower)) {
    const s = identity.assessmentSummary;
    if (identity.role === 'parent' || identity.role === 'learner') {
      const releasedCount = s?.releasedSubjectsCount ?? 0;
      const pendingList = s?.pendingReleaseSubjects || [];
      if (releasedCount === 0) {
        return {
          text:
            pendingList.length > 0
              ? `📋 Teacher marks exist in **${pendingList.join(', ')}**, awaiting Administration push/release before appearing on your official report. Once Admin releases them, I will advise on your **Kenyan Senior School Pathway** (STEM, Social Sciences, or Arts & Sports Science).`
              : `📋 No official Admin-released marks are synced locally yet. Connect online or wait for Administration to release your child's Assessment Book so I can analyze real scores and Kenyan Senior School Pathways.`,
          source: 'offline',
        };
      }
      const subjText = Object.entries(s?.strandsDetail || {})
        .filter(([, d]) => d.released || identity.role !== 'parent')
        .map(([name, d]) => `• **${name}:** ${d.score}% [**${d.level}**]`)
        .join('\n');
      const topPathway = s?.topPathway;
      const pathwayText = topPathway
        ? `\n\n🎓 **Top Kenyan Senior School Pathway Indicator:** ${topPathway.name} (${topPathway.averageScore}% avg) — ${topPathway.reason}`
        : '';
      return {
        text: `📊 **Released Assessment Summary (${identity.assessmentSummary?.learnerName || identity.name}):**\nAverage: **${s?.overallAverage ?? 'N/A'}%** [**${s?.performanceLevel ?? 'ME'}**]\n\n${subjText}${pathwayText}`,
        source: 'offline',
      };
    }
  }

  // Handle emoji-only or strongly expressive emoji messages meaningfully & safely
  const emojiInfo = analyzeEmojiSemantics(query);
  if (emojiInfo.hasInappropriate && emojiInfo.isEmojiOnly) {
    return {
      text: swahiliMode
        ? 'Niko hapa kukusaidia kwa heshima na utulivu 💛 Kuna jambo linalokusumbua kuhusu masomo? Niambie polepole tulitatue pamoja.'
        : "I'm always here to help calmly and respectfully 💛 If something is frustrating you with your schoolwork or schedule, tell me what happened and we'll sort it out step by step.",
      source: 'offline',
    };
  }

  if (emojiInfo.isEmojiOnly && emojiInfo.dominantTone) {
    const toneReplies: Record<string, string> = {
      vulnerable: swahiliMode
        ? 'Naona unahitaji moyo na msaada mpole 🥺💛 Usijali — hapa Little Roses tunakwenda hatua kwa hatua. Ni somo lipi au jambo lipi nikusaidie leo?'
        : 'I hear you 💛 Take a deep breath — whether something feels tricky or overwhelming, we will take it one gentle step at a time. Which subject or topic can I help you with?',
      oops: swahiliMode
        ? 'Hakuna shida kabisa! 😄 Kukosea ni sehemu ya kujifunza CBC. Niambie kilichotokea tusahihishe pamoja!'
        : "No worries at all! 😊 Mistakes are how we learn best in CBC. Tell me what tripped you up and we'll fix it step by step!",
      thinking: swahiliMode
        ? 'Naona unafikiria kwa kina 🤔💡 Niambie swali au mada unayoitafakari ili tuichambue pamoja!'
        : "Got your thinking cap on! 🤔💡 Share the question or topic you're puzzling over and I'll break it down clearly step by step.",
      curious: swahiliMode
        ? 'Macho makini! 👀✨ Ungependa tuangalie alama zako zilizotolewa na Admin, Focus Zone, au Kenyan Senior Pathways?'
        : 'Eyes on the details! 👀✨ Would you like me to check your released Assessment Book summary, Focus Zone strands, or Kenyan Senior School Pathways?',
      welcoming: swahiliMode
        ? 'Karibu kwa mikono miwili! 👐🌹 Mimi ni **Elsie AI** — niko tayari kusaidia kwa uwazi na upendo. Tuanze na nini?'
        : 'Open hands and ready to help! 👐🌹 I am **Elsie AI** — ask me anything about CBC studies, Focus Zone, or Kenyan Senior Pathways.',
      celebration: swahiliMode
        ? 'Moto kabisa! 🔥🏆 Hongera kwa bidii yako! Tuendelee kujenga uwezo wako — ungependa tuangalie nini sasa?'
        : "Love that energy! 🔥🏆 Keep shining and building your strengths — what would you like to tackle next?",
      joy: swahiliMode
        ? 'Haha! 😊😂 Furaha ni nzuri sana darasani! Tuendelee na ari hii — kuna swali au mada tuanze nayo?'
        : "Haha, love the good vibes! 😊😂 Learning is always better with a smile — what can I help you explore today?",
      playful: swahiliMode
        ? 'Hehe, hali ni shwari kabisa! 😉✨ Kama AI msaidizi wako, niko chonjo kukusaidia na masomo au Focus Zone!'
        : "Haha, keeping things fun! 😉✨ Whenever you're ready, I'm right here to help with CBC topics, homework tips, or Pathways!",
      affection: swahiliMode
        ? 'Asante sana kwa upendo na heshima yako! 🥰🌹 Ni furaha yangu kusaidia familia ya Little Roses Academy!'
        : 'Thank you for the warm kindness! 🥰🌹 As your Little Roses AI assistant, I’m always happy to support your learning journey.',
      warmth: swahiliMode
        ? 'Karibu sana! 😊🌹 Nikusaidieje leo hapa Little Roses Academy?'
        : 'Warm greetings! 😊🌹 How can **Elsie AI** assist you today at Little Roses Academy?',
      school: swahiliMode
        ? 'Wakati wa kusoma! 📚🎓 Ni somo lipi la CBC au Focus Zone tuanze nalo?'
        : 'Study mode activated! 📚🎓 Which CBC learning area, CAT revision, or Senior Pathway question should we dive into?',
      calm: swahiliMode
        ? 'Salama kabisa! 🌿✨ Nikusaidieje kwa utulivu leo?'
        : 'All calm and steady! 🌿✨ What would you like to check or revise today?',
    };
    if (toneReplies[emojiInfo.dominantTone]) {
      return {
        text: toneReplies[emojiInfo.dominantTone],
        source: 'offline',
      };
    }
  }

  return {
    text: swahiliMode
      ? `Nimepokea ujumbe wako ("${query}"). Kwa sasa niko kwenye hali ya nje ya mtandao (offline PWA). Unganisha intaneti ili **Elsie AI** ichambue data moja kwa moja kutoka Little Roses Cloud!`
      : `I'm **Elsie AI** (currently in offline PWA mode). Reconnect briefly so my cloud brain can run full Gemini & real-time Assessment Book analysis for "${query}".`,
    source: 'offline',
  };
}

export interface ElsieQueryResult {
  text: string;
  source: 'gemini' | 'cloud_fallback' | 'cloud_engine' | 'guard' | 'offline';
  pathwaySnapshot?: any;
  dossierSummary?: any;
  draft?: any;
}

function buildContextPayload(
  query: string,
  identity: UserIdentity,
  history: ElsieMessage[],
  isThursday: boolean,
  swahiliMode: boolean
) {
  const emojiSemantics = analyzeEmojiSemantics(query);
  return {
    message: query,
    portal: identity.role,
    history: history.slice(-6).map((m) => ({ out: m.out, text: m.text })),
    context: {
      userName: identity.name,
      userId: identity.id,
      grade: identity.grade,
      stream: identity.stream,
      isThursday,
      swahiliMode,
      linkedLearners: identity.linkedLearners,
      assignedClasses: identity.assignedClasses,
      assessmentSummary: identity.assessmentSummary,
      emojiContext:
        emojiSemantics.details.length > 0
          ? {
              dominantTone: emojiSemantics.dominantTone,
              isEmojiOnly: emojiSemantics.isEmojiOnly,
              hasInappropriate: emojiSemantics.hasInappropriate,
              summary: emojiSemantics.summaryText,
            }
          : null,
    },
  };
}

function checkInstantFastPath(
  query: string,
  identity: UserIdentity,
  swahiliMode: boolean
): ElsieQueryResult | null {
  const lower = query.toLowerCase();
  const normalizedGreet = lower.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

  // 1. Immediate Child Safety & Safeguards
  if (/hurt me|hitting me|touched me|i want to die|kill myself|i'm not safe|threatened|abuse/i.test(lower)) {
    return {
      text: swahiliMode
        ? 'Nashukuru umeniambia 🤍 Tafadhali zungumza na mtu mzima unayemwamini sasa: mwalimu wa darasa, mkuu wa shule, au mzazi wako. Hauko peke yako, na tuko hapa kukulinda.'
        : "What you have told me is very important, and you deserve help right away 🤍 Please speak to a trusted adult right now: your class teacher, the head teacher, or your parent. You don't have to carry this alone.",
      source: 'guard',
    };
  }

  // 2. Role-Based Privacy & Academic Integrity Guards
  if (identity.role === 'learner') {
    if (/(answer key|solutions to|give me the answers|exam answers|marking scheme|teacher's notes|test answers)/i.test(lower)) {
      return {
        text: swahiliMode
          ? 'Siwezi kutoa majibu ya mtihani 🙂 lakini ninaweza kukuonyesha jinsi ya kutatua swali kama hilo. Ungependa tufanye pamoja?'
          : "I can't give test answers or teacher marking guides 🙂 But as your AI tutor, I can walk you through the method step by step so you master it. Which question should we try?",
        source: 'guard',
      };
    }
    if (/(classmate'?s? marks|what did .* get|list of learners|who got the highest|ranking)/i.test(lower)) {
      return {
        text: swahiliMode
          ? 'Ninaweza kusaidia kazi yako tu 🙂 Mwalimu wako atakueleza matokeo yako. Ungependa kufanya zoezi kutoka kitabuni?'
          : 'I can only discuss your own academic progress 🙂 Every learner at Little Roses has a private record. Would you like to review one of your subjects or Focus Zone strands?',
        source: 'guard',
      };
    }
  }

  if (identity.role === 'parent') {
    if (/(compare .* with|who is top|class position|ranking|who is best)/i.test(lower)) {
      return {
        text: swahiliMode
          ? 'Ninaweza kuzungumzia tu maendeleo ya mtoto wako na chaguo za Senior Pathways 🙂 Siwezi kulinganisha watoto au kutoa nafasi za darasa.'
          : 'Under Kenya’s CBC framework, we focus on your child’s individual mastery rather than comparing children or assigning class positions 🙂 Would you like to explore their strongest learning areas and matching Senior School Pathways?',
        source: 'guard',
      };
    }
  }

  // 3. Instant Greetings & Emoji-Only Replies (<20ms)
  if (SWAHILI_DIRECT_REPLIES[normalizedGreet]) {
    return { text: sanitizeAiReplyEmojis(SWAHILI_DIRECT_REPLIES[normalizedGreet]), source: 'cloud_engine' };
  }
  const emojiInfo = analyzeEmojiSemantics(query);
  if (emojiInfo.isEmojiOnly) {
    const offline = buildOfflineClientResponse(query, identity, swahiliMode);
    return { text: sanitizeAiReplyEmojis(offline.text), source: 'cloud_engine' };
  }

  return null;
}

// Core Engine Query Resolution — prioritizes live Server Brain (/api/elsie/message) with multi-turn history
export async function solveElsieQuery(
  rawInput: string,
  identity: UserIdentity,
  history: ElsieMessage[] = []
): Promise<ElsieQueryResult> {
  const query = rawInput.trim();
  const nairobi = getNairobiDate();
  const isThursday = nairobi.getDay() === 4;
  const swahiliMode = isThursday || identity.language === 'sw' || Boolean(identity.teachesKiswahili);

  const instant = checkInstantFastPath(query, identity, swahiliMode);
  if (instant) return instant;

  try {
    const res = await fetch('/api/elsie/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildContextPayload(query, identity, history, isThursday, swahiliMode)),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.replyText) {
        return {
          text: sanitizeAiReplyEmojis(data.replyText),
          source: data.source || 'gemini',
          pathwaySnapshot: data.pathwaySnapshot || null,
          dossierSummary: data.dossierSummary || null,
          draft: data.draft || null,
        };
      }
    }
  } catch (err) {
    console.warn('Elsie backend unreachable, using offline resilient engine:', err);
  }

  const offline = buildOfflineClientResponse(query, identity, swahiliMode);
  return {
    ...offline,
    text: sanitizeAiReplyEmojis(offline.text),
  };
}

/**
 * Streaming Elsie AI resolver for live word-by-word replies via /api/elsie/stream
 */
export async function solveElsieQueryStreaming(
  rawInput: string,
  identity: UserIdentity,
  history: ElsieMessage[],
  onPartialText: (accumulatedText: string) => void
): Promise<ElsieQueryResult> {
  const query = rawInput.trim();
  const nairobi = getNairobiDate();
  const isThursday = nairobi.getDay() === 4;
  const swahiliMode = isThursday || identity.language === 'sw' || Boolean(identity.teachesKiswahili);

  const instant = checkInstantFastPath(query, identity, swahiliMode);
  if (instant) {
    onPartialText(instant.text);
    return instant;
  }

  // Admin portal sometimes returns structured action drafts, use structured endpoint
  if (identity.role === 'admin') {
    const res = await solveElsieQuery(query, identity, history);
    onPartialText(res.text);
    return res;
  }

  try {
    const res = await fetch('/api/elsie/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildContextPayload(query, identity, history, isThursday, swahiliMode)),
    });

    if (res.ok && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';
      let finalSource: ElsieQueryResult['source'] = 'gemini';
      let pathwaySnapshot: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;
          try {
            const payload = JSON.parse(line.slice(5).trim());
            if (payload.chunk) {
              accumulated += payload.chunk;
              onPartialText(sanitizeAiReplyEmojis(accumulated));
            }
            if (payload.fullText) {
              accumulated = payload.fullText;
              onPartialText(sanitizeAiReplyEmojis(accumulated));
            }
            if (payload.pathwaySnapshot) pathwaySnapshot = payload.pathwaySnapshot;
            if (payload.source) finalSource = payload.source;
          } catch {
            // ignore incomplete SSE line
          }
        }
      }

      const finalClean = sanitizeAiReplyEmojis(accumulated);
      if (finalClean) {
        return {
          text: finalClean,
          source: finalSource,
          pathwaySnapshot,
        };
      }
    }
  } catch (err) {
    console.warn('Elsie stream fallback to offline engine:', err);
  }

  const offline = buildOfflineClientResponse(query, identity, swahiliMode);
  const clean = sanitizeAiReplyEmojis(offline.text);
  onPartialText(clean);
  return { ...offline, text: clean };
}

const pathwayAnalysisCache = new Map<string, ElsiePathwayAnalysisResult>();

export async function analyzeAssessmentPathways(params: {
  learner: { id: string; adm: string; name: string; grade: string; stream?: string };
  parentName?: string;
  liveSummary?: Partial<LiveLearnerAssessmentSummary>;
  reportSubjects: ReportSubjectSnapshot[];
  focusItems?: Array<{ subject?: string; subStrandName?: string; strandName?: string; compositeScore?: number; score?: number }>;
  forceRefresh?: boolean;
}): Promise<ElsiePathwayAnalysisResult> {
  const { learner, parentName, liveSummary, reportSubjects, focusItems = [], forceRefresh = false } = params;
  const sig = [
    learner.adm || learner.id,
    learner.grade,
    liveSummary?.releasedSubjectsCount ?? 0,
    reportSubjects.map((s) => `${s.name}:${Math.round(s.pct)}`).join('|'),
  ].join('::');

  if (!forceRefresh) {
    const cached = pathwayAnalysisCache.get(sig);
    if (cached) return cached;
    try {
      const ss = sessionStorage.getItem(`lra_elsie_pathway_${sig}`);
      if (ss) {
        const parsed = JSON.parse(ss) as ElsiePathwayAnalysisResult;
        pathwayAnalysisCache.set(sig, parsed);
        return parsed;
      }
    } catch {
      // ignore storage errors
    }
  }

  try {
    const res = await fetch('/api/elsie/pathway-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learner,
        parentName,
        reportSubjects,
        focusItems,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.analysis) {
        const result = data.analysis as ElsiePathwayAnalysisResult;
        pathwayAnalysisCache.set(sig, result);
        try {
          sessionStorage.setItem(`lra_elsie_pathway_${sig}`, JSON.stringify(result));
        } catch {
          // ignore
        }
        return result;
      }
    }
  } catch (err) {
    console.warn('Elsie pathway analysis endpoint unreachable, using offline local engine:', err);
  }

  const offlineResult = buildLocalElsiePathwayAnalysis({
    learnerName: learner.name,
    learnerAdm: learner.adm,
    grade: learner.grade,
    liveSummary,
    reportSubjects,
    focusItems,
    source: 'offline',
  });
  return offlineResult;
}

