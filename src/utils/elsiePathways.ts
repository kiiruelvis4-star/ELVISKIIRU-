import {
  StrandAssessmentRecord,
  SubjectSubmission,
  LevelBand,
  resultOf,
  band,
  makeMarkKey,
  makeSubmissionKey,
} from './cbcAssessmentEngine';

export interface PathwayTrackInfo {
  id: 'stem' | 'social_sciences' | 'arts_sports';
  name: string;
  shortName: string;
  emoji: string;
  tracks: string[];
  primaryIndicators: string[];
  description: string;
  kenyanCareers: string[];
}

export const KENYAN_SENIOR_PATHWAYS: PathwayTrackInfo[] = [
  {
    id: 'stem',
    name: 'STEM (Science, Technology, Engineering & Mathematics)',
    shortName: 'STEM',
    emoji: '🔬',
    tracks: [
      'Pure Sciences (Mathematics, Biology, Chemistry, Physics)',
      'Applied Sciences (Agriculture, Home Science, Computer Studies)',
      'Technical & Engineering / Career & Technology Studies (ICT, Aviation, Building, Power Mechanics)',
    ],
    primaryIndicators: [
      'Mathematics',
      'Science and Technology',
      'Agriculture and Nutrition',
      'Environmental Activities',
    ],
    description:
      'Suited for learners showing strong numeracy, scientific inquiry, problem-solving, experimentation, agriculture, and practical digital curiosity.',
    kenyanCareers: [
      'Medicine & Health Sciences',
      'Software & AI Engineering',
      'Civil/Electrical Engineering',
      'Agribusiness & Food Science',
      'Architecture & Data Science',
    ],
  },
  {
    id: 'social_sciences',
    name: 'Social Sciences (Humanities, Business & Languages)',
    shortName: 'Social Sciences',
    emoji: '⚖️',
    tracks: [
      'Languages & Literature (English, Kiswahili, Literature, Foreign/Kenyan Sign Languages)',
      'Humanities & Business Studies (History, Geography, CRE/IRE/HRE, Business Studies)',
    ],
    primaryIndicators: [
      'English',
      'Kiswahili',
      'Social Studies',
      'CRE',
      'Christian Religious Education',
      'Religious Education',
    ],
    description:
      'Suited for articulate communicators, readers, debaters, empathetic leaders, and learners interested in society, ethics, commerce, and governance.',
    kenyanCareers: [
      'Law & Diplomacy',
      'Finance, Accounting & Entrepreneurship',
      'Journalism & Media',
      'Education & Psychology',
      'Public Policy & Economics',
    ],
  },
  {
    id: 'arts_sports',
    name: 'Arts & Sports Science',
    shortName: 'Arts & Sports Science',
    emoji: '🎨',
    tracks: [
      'Arts (Fine/Visual Arts, Music, Dance, Theatre & Film)',
      'Sports Science (Athletics, Ball Games, Physical Fitness, Recreation & Coaching)',
    ],
    primaryIndicators: [
      'Creative Arts',
      'Creative Arts and Sports',
      'Art and Craft',
      'Music',
      'Physical and Health Education',
    ],
    description:
      'Suited for expressive, creative, musical, visual-spatial, or physically agile learners who thrive in design, performance, teamwork, and athletics.',
    kenyanCareers: [
      'Graphic Design, Animation & Film',
      'Architecture & Interior Design',
      'Music & Performing Arts',
      'Sports Physiotherapy & Coaching',
      'Fashion & Creative Entrepreneurship',
    ],
  },
];

export interface SubjectLiveSummary {
  subject: string;
  score: number;
  catAvg: number;
  asgAvg: number;
  level: LevelBand;
  released: boolean;
  status: 'released' | 'submitted' | 'draft';
  focusStrands: string[];
  assessedStrandsCount: number;
  totalStrandsCount: number;
  terms: string[];
}

export interface PathwayScoreMatch {
  id: 'stem' | 'social_sciences' | 'arts_sports';
  name: string;
  shortName: string;
  emoji: string;
  averageScore: number | null;
  matchedSubjects: Array<{ subject: string; score: number; level: LevelBand }>;
  recommendedTracks: string[];
  reason: string;
}

export interface LiveLearnerAssessmentSummary {
  learnerId: string;
  learnerAdm: string;
  learnerName: string;
  grade: string;
  totalSubjects: number;
  filledSubjectsCount: number;
  releasedSubjectsCount: number;
  pendingReleaseSubjects: string[];
  overallAverage?: number; // Average of released marks (or all filled for teacher/admin)
  releasedAverage?: number;
  teacherFilledAverage?: number;
  performanceLevel?: LevelBand;
  focusZoneStrands: string[];
  termReleased: boolean;
  hasAnyRealMarks: boolean;
  strandsDetail: Record<
    string,
    {
      score: number;
      level: LevelBand;
      released: boolean;
      status: 'released' | 'submitted' | 'draft';
      focusZoneActive: boolean;
      focusStrands: string[];
      catAvg: number;
      asgAvg: number;
    }
  >;
  pathwayMatches: PathwayScoreMatch[];
  topPathway: PathwayScoreMatch | null;
}

function normalizeSubjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/christian religious education/g, 'cre')
    .replace(/[^a-z0-9]/g, '');
}

function matchSubjectToPathway(subjectName: string): 'stem' | 'social_sciences' | 'arts_sports' {
  const n = subjectName.toLowerCase();
  if (
    n.includes('math') ||
    n.includes('science') ||
    n.includes('agri') ||
    n.includes('nutrition') ||
    n.includes('tech') ||
    n.includes('environment')
  ) {
    return 'stem';
  }
  if (
    n.includes('creative') ||
    n.includes('art') ||
    n.includes('music') ||
    n.includes('sport') ||
    n.includes('phe') ||
    n.includes('physical')
  ) {
    return 'arts_sports';
  }
  return 'social_sciences';
}

export function buildPathwayMatches(
  subjects: Array<{ subject: string; score: number; level: LevelBand }>
): PathwayScoreMatch[] {
  const grouped: Record<'stem' | 'social_sciences' | 'arts_sports', Array<{ subject: string; score: number; level: LevelBand }>> = {
    stem: [],
    social_sciences: [],
    arts_sports: [],
  };

  for (const s of subjects) {
    const pid = matchSubjectToPathway(s.subject);
    grouped[pid].push(s);
  }

  const matches: PathwayScoreMatch[] = KENYAN_SENIOR_PATHWAYS.map((p) => {
    const list = grouped[p.id];
    const avg =
      list.length > 0
        ? Math.round((list.reduce((acc, item) => acc + item.score, 0) / list.length) * 10) / 10
        : null;

    let reason = 'No released marks in this pathway yet.';
    if (avg !== null) {
      const names = list.map((i) => `${i.subject} (${i.score}% · ${i.level})`).join(', ');
      if (avg >= 80) {
        reason = `Strong Exceeding Expectations (EE) signal in ${names}.`;
      } else if (avg >= 60) {
        reason = `Solid Meeting Expectations (ME) foundation across ${names}.`;
      } else {
        reason = `Developing competency in ${names}; Focus Zone practice will build confidence.`;
      }
    }

    return {
      id: p.id,
      name: p.name,
      shortName: p.shortName,
      emoji: p.emoji,
      averageScore: avg,
      matchedSubjects: list,
      recommendedTracks: p.tracks,
      reason,
    };
  });

  return matches.sort((a, b) => (b.averageScore ?? -1) - (a.averageScore ?? -1));
}

/**
 * Computes a learner's REAL CBC performance summary directly from teacher-entered marks
 * (`lra_cbc_marks_v1`) and Admin release/push status (`lra_cbc_submissions_v1`).
 * Does NOT fabricate demo scores.
 */
export function computeRealLearnerAssessmentSummary(
  learner: { id: string; adm: string; name: string; grade: string },
  marks: Record<string, StrandAssessmentRecord>,
  submissions: Record<string, SubjectSubmission>,
  gradeTermsData: Record<string, Array<{ name: string; strands: Array<{ sid: string; name: string }> }>> | undefined,
  viewerRole: 'parent' | 'learner' | 'teacher' | 'admin' = 'parent'
): LiveLearnerAssessmentSummary {
  const subjectBuckets = new Map<
    string,
    {
      displayName: string;
      scores: number[];
      cats: number[];
      asgs: number[];
      focusStrands: string[];
      totalStrands: number;
      released: boolean;
      submitted: boolean;
      terms: Set<string>;
    }
  >();

  const terms = gradeTermsData ? Object.entries(gradeTermsData) : [];
  for (const [termName, areas] of terms) {
    for (const area of areas || []) {
      const normKey = normalizeSubjectName(area.name);
      const bucket = subjectBuckets.get(normKey) || {
        displayName: area.name,
        scores: [],
        cats: [],
        asgs: [],
        focusStrands: [],
        totalStrands: 0,
        released: false,
        submitted: false,
        terms: new Set<string>(),
      };

      bucket.totalStrands += (area.strands || []).length;

      // Check submission/release status using both learner.id and learner.adm keys
      const subKey1 = makeSubmissionKey(learner.id, learner.grade, termName, area.name);
      const subKey2 = makeSubmissionKey(learner.adm, learner.grade, termName, area.name);
      const sub = submissions[subKey1] || submissions[subKey2];
      if (sub?.status === 'released') {
        bucket.released = true;
      } else if (sub?.status === 'submitted') {
        bucket.submitted = true;
      }

      for (const strand of area.strands || []) {
        const mk1 = makeMarkKey(learner.id, strand.sid);
        const mk2 = makeMarkKey(learner.adm, strand.sid);
        const rec = marks[mk1] || marks[mk2];
        const res = resultOf(rec);
        if (res) {
          bucket.scores.push(res.f);
          bucket.cats.push(res.c);
          bucket.asgs.push(res.a);
          bucket.terms.add(termName);
          if (res.f <= 70 && !bucket.focusStrands.includes(strand.name)) {
            bucket.focusStrands.push(`${area.name}: ${strand.name} (${Math.round(res.f)}%)`);
          }
        }
      }

      subjectBuckets.set(normKey, bucket);
    }
  }

  const strandsDetail: LiveLearnerAssessmentSummary['strandsDetail'] = {};
  const releasedSubjectsList: Array<{ subject: string; score: number; level: LevelBand }> = [];
  const allFilledList: Array<{ subject: string; score: number; level: LevelBand }> = [];
  const pendingReleaseSubjects: string[] = [];
  const focusZoneStrands: string[] = [];

  for (const [, bucket] of subjectBuckets.entries()) {
    if (bucket.scores.length === 0) continue;

    const avg = Math.round((bucket.scores.reduce((a, b) => a + b, 0) / bucket.scores.length) * 10) / 10;
    const catAvg = Math.round(bucket.cats.reduce((a, b) => a + b, 0) / bucket.cats.length);
    const asgAvg = Math.round(bucket.asgs.reduce((a, b) => a + b, 0) / bucket.asgs.length);
    const lvl = (band(avg) || 'ME') as LevelBand;
    const status: 'released' | 'submitted' | 'draft' = bucket.released
      ? 'released'
      : bucket.submitted
      ? 'submitted'
      : 'draft';

    allFilledList.push({ subject: bucket.displayName, score: avg, level: lvl });

    if (bucket.released) {
      releasedSubjectsList.push({ subject: bucket.displayName, score: avg, level: lvl });
    } else {
      pendingReleaseSubjects.push(bucket.displayName);
    }

    // Assessment books & reports appear automatically to Parents and Learners without waiting for Admin push
    const visibleToViewer = true;
    if (visibleToViewer) {
      strandsDetail[bucket.displayName] = {
        score: avg,
        level: lvl,
        released: true,
        status,
        focusZoneActive: bucket.focusStrands.length > 0,
        focusStrands: bucket.focusStrands,
        catAvg,
        asgAvg,
      };
      bucket.focusStrands.forEach((f) => {
        if (!focusZoneStrands.includes(f)) focusZoneStrands.push(f);
      });
    }
  }

  const releasedAverage =
    releasedSubjectsList.length > 0
      ? Math.round(
          (releasedSubjectsList.reduce((a, b) => a + b.score, 0) / releasedSubjectsList.length) * 10
        ) / 10
      : undefined;

  const teacherFilledAverage =
    allFilledList.length > 0
      ? Math.round((allFilledList.reduce((a, b) => a + b.score, 0) / allFilledList.length) * 10) / 10
      : undefined;

  const activeList = allFilledList;
  const overallAverage = teacherFilledAverage ?? releasedAverage;
  const performanceLevel = overallAverage !== undefined ? (band(overallAverage) || undefined) : undefined;

  const pathwayMatches = activeList.length > 0 ? buildPathwayMatches(activeList) : [];
  const topPathway = pathwayMatches.find((p) => p.averageScore !== null) || null;

  return {
    learnerId: learner.id,
    learnerAdm: learner.adm,
    learnerName: learner.name,
    grade: learner.grade,
    totalSubjects: subjectBuckets.size,
    filledSubjectsCount: allFilledList.length,
    releasedSubjectsCount: releasedSubjectsList.length,
    pendingReleaseSubjects,
    overallAverage,
    releasedAverage,
    teacherFilledAverage,
    performanceLevel,
    focusZoneStrands,
    termReleased: releasedSubjectsList.length > 0,
    hasAnyRealMarks: allFilledList.length > 0,
    strandsDetail,
    pathwayMatches,
    topPathway,
  };
}

export interface ReportSubjectSnapshot {
  name: string;
  pct: number;
  catPct: number;
  asgPct: number;
  strands?: Array<{
    name: string;
    cats: number[];
    asg: number[];
  }>;
}

export interface PersonalizedPathwayItem {
  id: 'stem' | 'social_sciences' | 'arts_sports';
  name: string;
  shortName: string;
  emoji: string;
  fitScore: number;
  fitLabel: 'Primary Fit' | 'Strong Secondary' | 'Emerging Potential';
  averageScore: number | null;
  matchedSubjects: Array<{ subject: string; score: number; level: LevelBand }>;
  recommendedTracks: string[];
  evidenceRationale: string;
  careerHorizons: string[];
  homeSupportTips: string[];
}

export interface ElsiePathwayAnalysisResult {
  learnerName: string;
  learnerAdm: string;
  grade: string;
  dataSource: 'admin_released' | 'teacher_pending' | 'report_snapshot';
  overallAverage: number;
  overallBand: LevelBand;
  executiveSummary: string;
  topStrengths: Array<{ subject: string; score: number; insight: string }>;
  focusAreas: Array<{ area: string; score?: number; actionTip: string }>;
  pathways: PersonalizedPathwayItem[];
  decisionGuidance: string;
  source: 'gemini' | 'elsie_engine' | 'offline';
  analyzedAt: string;
}

const DEFAULT_HOME_TIPS: Record<'stem' | 'social_sciences' | 'arts_sports', string[]> = {
  stem: [
    'Encourage hands-on problem solving through household budgeting, cooking measurements, and simple science observations.',
    'Support participation in school Mathematics, Coding/ICT, Robotics, Science, or Agriculture & 4K clubs.',
  ],
  social_sciences: [
    'Foster daily reading (English & Kiswahili storybooks or newspapers) and calm family discussions on current events.',
    'Encourage debate, public speaking, drama/journalism clubs, and leadership roles in student council or scouts.',
  ],
  arts_sports: [
    'Provide time and materials for sketching, music practice, creative crafts, or structured outdoor athletics.',
    'Support participation in school choir, drama festivals, visual arts exhibitions, and inter-house sports.',
  ],
};

/**
 * Generates a structured, report-grounded Elsie AI academic pathway analysis locally
 * (used immediately for instant rendering, offline PWA resilience, and server fallback).
 */
export function buildLocalElsiePathwayAnalysis(params: {
  learnerName: string;
  learnerAdm: string;
  grade: string;
  liveSummary?: Partial<LiveLearnerAssessmentSummary>;
  reportSubjects: ReportSubjectSnapshot[];
  focusItems?: Array<{ subject?: string; subStrandName?: string; strandName?: string; compositeScore?: number; score?: number }>;
  source?: 'gemini' | 'elsie_engine' | 'offline';
}): ElsiePathwayAnalysisResult {
  const { learnerName, learnerAdm, grade, liveSummary, reportSubjects, focusItems = [], source = 'elsie_engine' } = params;

  const hasReleased = (liveSummary?.releasedSubjectsCount ?? 0) > 0;
  const hasPending = (liveSummary?.pendingReleaseSubjects?.length ?? 0) > 0;

  const dataSource: ElsiePathwayAnalysisResult['dataSource'] = hasReleased
    ? 'admin_released'
    : hasPending
    ? 'teacher_pending'
    : 'report_snapshot';

  // Prefer Admin-released real marks when available; otherwise analyze the displayed assessment report subjects
  const subjectEntries: Array<{
    subject: string;
    score: number;
    catAvg: number;
    asgAvg: number;
    level: LevelBand;
  }> = [];

  if (hasReleased && liveSummary?.strandsDetail) {
    for (const [subj, det] of Object.entries(liveSummary.strandsDetail)) {
      if (det.released) {
        subjectEntries.push({
          subject: subj,
          score: Math.round(det.score),
          catAvg: Math.round(det.catAvg),
          asgAvg: Math.round(det.asgAvg),
          level: (det.level || band(det.score) || 'ME') as LevelBand,
        });
      }
    }
  }

  if (subjectEntries.length === 0) {
    for (const r of reportSubjects) {
      const score = Math.round(r.pct);
      subjectEntries.push({
        subject: r.name,
        score,
        catAvg: Math.round(r.catPct),
        asgAvg: Math.round(r.asgPct),
        level: (band(score) || 'ME') as LevelBand,
      });
    }
  }

  const overallAverage =
    subjectEntries.length > 0
      ? Math.round((subjectEntries.reduce((acc, s) => acc + s.score, 0) / subjectEntries.length) * 10) / 10
      : 0;
  const overallBand = (band(overallAverage) || 'ME') as LevelBand;

  const avgCat =
    subjectEntries.length > 0
      ? Math.round(subjectEntries.reduce((acc, s) => acc + s.catAvg, 0) / subjectEntries.length)
      : 0;
  const avgAsg =
    subjectEntries.length > 0
      ? Math.round(subjectEntries.reduce((acc, s) => acc + s.asgAvg, 0) / subjectEntries.length)
      : 0;

  // Build pathway matches sorted by score
  const rawMatches = buildPathwayMatches(
    subjectEntries.map((s) => ({ subject: s.subject, score: s.score, level: s.level }))
  );

  const pathways: PersonalizedPathwayItem[] = rawMatches.map((m, idx) => {
    const meta = KENYAN_SENIOR_PATHWAYS.find((p) => p.id === m.id)!;
    const baseAvg = m.averageScore ?? overallAverage;
    // Fit score blends absolute pathway mastery + relative lead over overall average
    const relativeBoost = m.averageScore !== null ? Math.max(-6, Math.min(10, m.averageScore - overallAverage)) : 0;
    const fitScore = Math.max(45, Math.min(98, Math.round(baseAvg + relativeBoost)));
    const fitLabel: PersonalizedPathwayItem['fitLabel'] =
      idx === 0 ? 'Primary Fit' : idx === 1 ? 'Strong Secondary' : 'Emerging Potential';

    const topSubjs = [...m.matchedSubjects].sort((a, b) => b.score - a.score);
    const evidenceRationale =
      topSubjs.length > 0
        ? `${learnerName} averages ${m.averageScore}% in ${m.shortName}-aligned learning areas, led by ${topSubjs
            .map((s) => `${s.subject} (${s.score}% · ${s.level})`)
            .join(', ')}. ${
            (m.averageScore ?? 0) >= 80
              ? 'This demonstrates Exceeding Expectations readiness for advanced Senior School tracks.'
              : (m.averageScore ?? 0) >= 65
              ? 'Consistent competency signals solid momentum toward Junior School (Grades 7–9) and Senior pathways.'
              : 'Guided practice in foundational strands can steadily unlock stronger confidence here.'
          }`
        : `Awaiting subject marks in ${m.shortName}-linked learning areas.`;

    return {
      id: m.id,
      name: m.name,
      shortName: m.shortName,
      emoji: m.emoji,
      fitScore,
      fitLabel,
      averageScore: m.averageScore,
      matchedSubjects: topSubjs,
      recommendedTracks: meta.tracks,
      evidenceRationale,
      careerHorizons: meta.kenyanCareers,
      homeSupportTips: DEFAULT_HOME_TIPS[m.id],
    };
  });

  const sortedByScore = [...subjectEntries].sort((a, b) => b.score - a.score);
  const topStrengths = sortedByScore.slice(0, 3).map((s) => {
    const styleNote =
      s.catAvg - s.asgAvg >= 8
        ? `Strong independent test recall (CATs ${s.catAvg}% vs Assignments ${s.asgAvg}%).`
        : s.asgAvg - s.catAvg >= 8
        ? `Thrives in applied homework & project tasks (Assignments ${s.asgAvg}% vs CATs ${s.catAvg}%).`
        : `Balanced mastery across timed CATs (${s.catAvg}%) and assignments (${s.asgAvg}%).`;
    return {
      subject: s.subject,
      score: s.score,
      insight: `${s.level} (${s.score}%). ${styleNote}`,
    };
  });

  const focusAreas: ElsiePathwayAnalysisResult['focusAreas'] = [];
  // Prefer official Focus Zone strands first
  const summaryFocus = liveSummary?.focusZoneStrands || [];
  for (const fStr of summaryFocus.slice(0, 3)) {
    focusAreas.push({
      area: fStr,
      actionTip: 'Schedule 15–20 minutes of guided sub-strand revision at home before the teacher’s next Focus Zone check-in.',
    });
  }
  if (focusAreas.length === 0) {
    for (const fi of focusItems.slice(0, 3)) {
      const label = `${fi.subject || 'Subject'}: ${fi.subStrandName || fi.strandName || 'Key Strand'}`;
      focusAreas.push({
        area: label,
        score: fi.compositeScore ?? fi.score,
        actionTip: 'Review teacher rubric feedback and practice 3–5 worked examples together to cross the 70% mastery threshold.',
      });
    }
  }
  if (focusAreas.length === 0) {
    const lowest = [...sortedByScore].reverse().filter((s) => s.score <= 74).slice(0, 2);
    for (const low of lowest) {
      focusAreas.push({
        area: `${low.subject} (${low.score}%)`,
        score: low.score,
        actionTip:
          low.catAvg < low.asgAvg
            ? `Timed CAT practice (${low.catAvg}%) trails assignments (${low.asgAvg}%) — try short 10-minute timed quizzes at home.`
            : `Reinforce daily homework consistency (${low.asgAvg}%) and review missed strand exercises with the subject teacher.`,
      });
    }
  }

  const topPath = pathways[0];
  const secondPath = pathways[1];
  const balanceNote =
    avgCat - avgAsg >= 7
      ? `CAT performance (${avgCat}%) is ahead of Assignments (${avgAsg}%), suggesting strong exam recall that can be boosted further by structured homework routines.`
      : avgAsg - avgCat >= 7
      ? `Assignments (${avgAsg}%) outpace CATs (${avgCat}%), showing strong practical effort—short timed revision drills will sharpen test readiness.`
      : `CATs (${avgCat}%) and Assignments (${avgAsg}%) are well-balanced across the term.`;

  const statusPrefix =
    dataSource === 'admin_released'
      ? `Based on officially Admin-released CBC marks, `
      : dataSource === 'teacher_pending'
      ? `While ${liveSummary?.pendingReleaseSubjects?.length || 0} teacher-marked subject(s) await final Admin release, this report analysis shows `
      : `Based on ${learnerName}'s current ${grade} assessment report, `;

  const executiveSummary = `${statusPrefix}${learnerName} holds an overall average of ${overallAverage}% (${overallBand}). ${balanceNote} Current indicators lean strongest toward ${
    topPath?.shortName || 'STEM'
  }${secondPath ? `, with solid secondary alignment in ${secondPath.shortName}` : ''}.`;

  const decisionGuidance = `Under Kenya's Competency-Based Education (CBE), ${grade} builds foundational competencies ahead of Junior School (Grades 7–9), the KJSEA assessment, and Senior School (Grades 10–12) pathway selection. Use ${
    topPath?.shortName || 'the leading pathway'
  } (${topPath?.fitScore || 75}% fit) to guide co-curricular club choices and holiday enrichment, while keeping all learning areas balanced so ${learnerName}'s options stay broad.`;

  return {
    learnerName,
    learnerAdm,
    grade,
    dataSource,
    overallAverage,
    overallBand,
    executiveSummary,
    topStrengths,
    focusAreas,
    pathways,
    decisionGuidance,
    source,
    analyzedAt: new Date().toISOString(),
  };
}

