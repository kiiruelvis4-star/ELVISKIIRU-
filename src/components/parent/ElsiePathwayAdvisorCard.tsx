import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Compass,
  TrendingUp,
  Target,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  BookOpen,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import {
  ElsiePathwayAnalysisResult,
  PersonalizedPathwayItem,
} from '../../utils/elsiePathways';
import { LEVEL_COLORS, LevelBand } from '../../utils/cbcAssessmentEngine';
import { sound } from '../../utils/sound';

interface ThemeColors {
  bg: string;
  card: string;
  ink: string;
  muted: string;
  line: string;
  sub: string;
  chip: string;
  chipink: string;
}

const PATHWAY_ACCENTS: Record<
  'stem' | 'social_sciences' | 'arts_sports',
  { gradient: string; badgeBg: string; badgeText: string; bar: string }
> = {
  stem: {
    gradient: 'from-indigo-600 to-blue-600',
    badgeBg: 'rgba(37, 99, 235, 0.14)',
    badgeText: '#2563EB',
    bar: '#2563EB',
  },
  social_sciences: {
    gradient: 'from-violet-600 to-purple-600',
    badgeBg: 'rgba(124, 58, 237, 0.14)',
    badgeText: '#7C3AED',
    bar: '#7C3AED',
  },
  arts_sports: {
    gradient: 'from-pink-600 to-rose-500',
    badgeBg: 'rgba(219, 39, 119, 0.14)',
    badgeText: '#DB2777',
    bar: '#DB2777',
  },
};

function getDataSourceLabel(dataSource: ElsiePathwayAnalysisResult['dataSource']) {
  if (dataSource === 'admin_released') {
    return {
      label: 'Official Admin-Released Marks',
      color: '#16A34A',
      bg: 'rgba(22, 163, 74, 0.12)',
    };
  }
  if (dataSource === 'teacher_pending') {
    return {
      label: 'Report Snapshot · Teacher Marks Pending Admin Push',
      color: '#D97706',
      bg: 'rgba(217, 119, 6, 0.12)',
    };
  }
  return {
    label: 'Term Assessment Report Analysis',
    color: '#2563EB',
    bg: 'rgba(37, 99, 235, 0.12)',
  };
}

interface ElsiePathwayHomeSpotlightProps {
  analysis: ElsiePathwayAnalysisResult | null;
  isLoading: boolean;
  isDark: boolean;
  colors: ThemeColors;
  onOpenFullReportAnalysis: () => void;
  onAskElsie: (prompt: string) => void;
}

export const ElsiePathwayHomeSpotlight: React.FC<ElsiePathwayHomeSpotlightProps> = ({
  analysis,
  isLoading,
  isDark,
  colors,
  onOpenFullReportAnalysis,
  onAskElsie,
}) => {
  const topPathway = analysis?.pathways?.[0];
  const accent = topPathway ? PATHWAY_ACCENTS[topPathway.id] : PATHWAY_ACCENTS.stem;

  return (
    <div
      className="rounded-2xl border shadow-sm overflow-hidden transition-all"
      style={{
        backgroundColor: colors.card,
        borderColor: colors.line,
      }}
    >
      {/* Top gradient banner */}
      <div
        className={`px-3.5 py-2.5 text-white bg-gradient-to-r ${accent.gradient} flex items-center justify-between gap-2`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/85">
              🤖 ✨ Elsie AI · Academic Pathway Spotlight
            </div>
            <div className="text-xs font-black truncate">
              {isLoading && !analysis
                ? 'Analyzing Assessment Report…'
                : topPathway
                ? `Primary Fit: ${topPathway.emoji} ${topPathway.shortName} (${topPathway.fitScore}% Fit)`
                : 'Kenyan Senior School Pathways'}
            </div>
          </div>
        </div>
        {analysis && (
          <span
            className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white shrink-0"
          >
            {analysis.overallAverage}% · {analysis.overallBand}
          </span>
        )}
      </div>

      <div className="p-3.5 space-y-3">
        {analysis ? (
          <>
            <p className="text-[11.5px] leading-relaxed m-0" style={{ color: colors.ink }}>
              {analysis.executiveSummary}
            </p>

            {/* 3-Pathway Fit Comparison */}
            <div className="space-y-1.5">
              {analysis.pathways.map((p) => {
                const pAccent = PATHWAY_ACCENTS[p.id];
                return (
                  <div key={p.id} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="font-bold flex items-center gap-1" style={{ color: colors.ink }}>
                        <span>{p.emoji}</span>
                        <span>{p.shortName}</span>
                        {p.fitLabel === 'Primary Fit' && (
                          <span
                            className="text-[9px] font-black px-1.5 py-0.2 rounded uppercase"
                            style={{ backgroundColor: pAccent.badgeBg, color: pAccent.badgeText }}
                          >
                            Recommended
                          </span>
                        )}
                      </span>
                      <span className="font-black" style={{ color: colors.ink }}>
                        {p.fitScore}% Fit
                        {p.averageScore !== null ? ` · ${p.averageScore}% avg` : ''}
                      </span>
                    </div>
                    <div
                      className="h-1.5 w-full rounded-full overflow-hidden"
                      style={{ backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${p.fitScore}%`,
                          backgroundColor: pAccent.bar,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  sound.playClick(450);
                  onOpenFullReportAnalysis();
                }}
                className="flex-1 min-w-[140px] py-2 px-3 rounded-xl font-extrabold text-[11px] text-white bg-[#1A3A8F] hover:bg-[#0A1F4D] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Full Pathway Analysis</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playClick(450);
                  onAskElsie(
                    `Based on ${analysis.learnerName}'s assessment report, explain why ${
                      topPathway?.shortName || 'this pathway'
                    } is recommended and what clubs or home support we should prioritize.`
                  );
                }}
                className="py-2 px-3 rounded-xl font-bold text-[11px] border transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                style={{
                  backgroundColor: colors.sub,
                  borderColor: colors.line,
                  color: colors.ink,
                }}
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>🤖 Ask Elsie AI</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-xs py-2" style={{ color: colors.muted }}>
            <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
            <span>Elsie AI is analyzing the student&apos;s assessment report…</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface ElsiePathwayAdvisorCardProps {
  analysis: ElsiePathwayAnalysisResult | null;
  isLoading: boolean;
  isDark: boolean;
  colors: ThemeColors;
  onRefreshAnalysis: () => void;
  onAskElsie: (prompt: string) => void;
}

export const ElsiePathwayAdvisorCard: React.FC<ElsiePathwayAdvisorCardProps> = ({
  analysis,
  isLoading,
  isDark,
  colors,
  onRefreshAnalysis,
  onAskElsie,
}) => {
  const [selectedPathwayId, setSelectedPathwayId] = useState<'stem' | 'social_sciences' | 'arts_sports' | null>(
    null
  );
  const [showAllDetails, setShowAllDetails] = useState<boolean>(true);

  if (!analysis && isLoading) {
    return (
      <div
        className="rounded-3xl p-4 border shadow-sm space-y-3"
        style={{ backgroundColor: colors.card, borderColor: colors.line }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
            <RefreshCw className="w-4 h-4 animate-spin" />
          </div>
          <div>
            <div className="font-black text-xs" style={{ color: colors.ink }}>
              🤖 ✨ Elsie AI is analyzing the assessment report…
            </div>
            <div className="text-[11px]" style={{ color: colors.muted }}>
              Evaluating learning area scores, Focus Zone strands, and Kenyan Senior School Pathways
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const activePathway: PersonalizedPathwayItem =
    analysis.pathways.find((p) => p.id === selectedPathwayId) || analysis.pathways[0];
  const sourceBadge = getDataSourceLabel(analysis.dataSource);

  return (
    <div
      id="elsie-pathway-advisor-panel"
      className="rounded-3xl border shadow-lg overflow-hidden transition-all"
      style={{
        backgroundColor: colors.card,
        borderColor: isDark ? '#2B3B63' : '#CBD5E1',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 text-white flex flex-wrap items-center justify-between gap-2"
        style={{
          background: 'linear-gradient(125deg, #0A1F4D 0%, #312E81 55%, #4F46E5 100%)',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs sm:text-sm font-black m-0 text-white">
                🤖 ✨ Elsie AI · Personalized Pathway Advisor
              </h3>
              <span className="text-[9.5px] font-extrabold px-2 py-0.5 rounded-full bg-white/15 text-blue-100">
                {analysis.source === 'gemini' ? '🧠 Gemini AI Brain' : '☁️ Cloud CBC Engine'}
              </span>
            </div>
            <p className="text-[10.5px] text-blue-100/90 m-0 mt-0.5 truncate">
              Evidence-based guidance for {analysis.learnerName} ({analysis.grade})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              sound.playClick(500);
              onRefreshAnalysis();
            }}
            className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 disabled:opacity-60 text-white text-[10.5px] font-bold cursor-pointer flex items-center gap-1 transition-colors"
            title="Re-run Elsie AI analysis on latest report marks"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Analyzing…' : '✨ Refresh AI'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick(400);
              setShowAllDetails((v) => !v);
            }}
            className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer"
            title={showAllDetails ? 'Collapse details' : 'Expand details'}
          >
            {showAllDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Status & Overall Metric Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className="text-[10.5px] font-extrabold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"
            style={{ backgroundColor: sourceBadge.bg, color: sourceBadge.color }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{sourceBadge.label}</span>
          </span>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold" style={{ color: colors.muted }}>
              Overall Average:
            </span>
            <span className="text-sm font-black" style={{ color: colors.ink }}>
              {analysis.overallAverage}%
            </span>
            <span
              className="text-[10px] font-black text-white px-2 py-0.5 rounded-md"
              style={{
                backgroundColor: LEVEL_COLORS[analysis.overallBand as LevelBand] || '#16A34A',
              }}
            >
              {analysis.overallBand}
            </span>
          </div>
        </div>

        {/* Executive Summary */}
        <div
          className="p-3 rounded-2xl border text-xs leading-relaxed"
          style={{
            backgroundColor: colors.sub,
            borderColor: colors.line,
            color: colors.ink,
          }}
        >
          <div className="font-extrabold text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5 text-indigo-600">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Assessment Report Synthesis</span>
          </div>
          <p className="m-0">{analysis.executiveSummary}</p>
        </div>

        {showAllDetails && (
          <>
            {/* 3 Ranked Pathway Selector Cards */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-black uppercase tracking-wider" style={{ color: colors.muted }}>
                  Recommended Academic Pathways (Kenya CBE)
                </div>
                <span className="text-[10px]" style={{ color: colors.muted }}>
                  Tap a pathway to inspect tracks &amp; home steps
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {analysis.pathways.map((p, idx) => {
                  const isSelected = activePathway?.id === p.id;
                  const pAccent = PATHWAY_ACCENTS[p.id];
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        sound.playClick(450);
                        setSelectedPathwayId(p.id);
                      }}
                      className="text-left p-3 rounded-2xl border transition-all cursor-pointer relative"
                      style={{
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(79, 70, 229, 0.18)'
                            : '#EEF2FF'
                          : colors.sub,
                        borderColor: isSelected ? pAccent.bar : colors.line,
                        boxShadow: isSelected ? `0 0 0 1px ${pAccent.bar}` : 'none',
                      }}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-lg leading-none">{p.emoji}</span>
                        <span
                          className="text-[9.5px] font-black px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: idx === 0 ? pAccent.bar : pAccent.badgeBg,
                            color: idx === 0 ? '#FFFFFF' : pAccent.badgeText,
                          }}
                        >
                          #{idx + 1} · {p.fitLabel}
                        </span>
                      </div>

                      <div className="font-black text-xs leading-snug" style={{ color: colors.ink }}>
                        {p.shortName}
                      </div>

                      <div className="flex items-center justify-between text-[10.5px] mt-1" style={{ color: colors.muted }}>
                        <span>{p.averageScore !== null ? `Subj avg: ${p.averageScore}%` : 'No marks yet'}</span>
                        <span className="font-black" style={{ color: pAccent.badgeText }}>
                          {p.fitScore}% Fit
                        </span>
                      </div>

                      <div
                        className="h-1.5 w-full rounded-full overflow-hidden mt-1.5"
                        style={{ backgroundColor: isDark ? '#0F172A' : '#E2E8F0' }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${p.fitScore}%`, backgroundColor: pAccent.bar }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Pathway Detail Breakdown */}
            {activePathway && (
              <div
                className="p-3.5 rounded-2xl border space-y-3"
                style={{
                  backgroundColor: isDark ? '#111A30' : '#F8FAFF',
                  borderColor: PATHWAY_ACCENTS[activePathway.id].bar,
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{activePathway.emoji}</span>
                    <div>
                      <div className="font-black text-xs sm:text-sm" style={{ color: colors.ink }}>
                        {activePathway.name}
                      </div>
                      <div className="text-[10.5px]" style={{ color: colors.muted }}>
                        {activePathway.fitLabel} · {activePathway.fitScore}% Alignment Score
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick(500);
                      onAskElsie(
                        `For ${analysis.learnerName} (${analysis.grade}), explain the ${activePathway.shortName} pathway in detail based on their report marks and suggest practical next steps for this term.`
                      );
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-extrabold cursor-pointer flex items-center gap-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>🤖 Discuss {activePathway.shortName} with Elsie</span>
                  </button>
                </div>

                {/* Evidence Rationale */}
                <p className="text-[11.5px] leading-relaxed m-0" style={{ color: colors.ink }}>
                  {activePathway.evidenceRationale}
                </p>

                {/* Matched Report Subjects */}
                {activePathway.matchedSubjects.length > 0 && (
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: colors.muted }}>
                      Supporting Report Subjects
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activePathway.matchedSubjects.map((ms) => (
                        <span
                          key={ms.subject}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border"
                          style={{
                            backgroundColor: colors.card,
                            borderColor: colors.line,
                            color: colors.ink,
                          }}
                        >
                          <span>{ms.subject}</span>
                          <span className="font-black">{ms.score}%</span>
                          <span
                            className="text-[9.5px] font-black text-white px-1.5 py-0.2 rounded"
                            style={{ backgroundColor: LEVEL_COLORS[ms.level] || '#16A34A' }}
                          >
                            {ms.level}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tracks & Careers + Home Support */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div
                    className="p-2.5 rounded-xl border space-y-1.5"
                    style={{ backgroundColor: colors.card, borderColor: colors.line }}
                  >
                    <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: colors.muted }}>
                      Senior School Tracks &amp; Kenyan Careers
                    </div>
                    <ul className="m-0 pl-3.5 space-y-1 text-[11px]" style={{ color: colors.ink }}>
                      {activePathway.recommendedTracks.map((tr) => (
                        <li key={tr}>{tr}</li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {activePathway.careerHorizons.slice(0, 4).map((c) => (
                        <span
                          key={c}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                          style={{ backgroundColor: colors.chip, color: colors.chipink }}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div
                    className="p-2.5 rounded-xl border space-y-1.5"
                    style={{ backgroundColor: colors.card, borderColor: colors.line }}
                  >
                    <div className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1" style={{ color: colors.muted }}>
                      <Lightbulb className="w-3 h-3 text-amber-500" />
                      <span>How Parents Can Nurture This at Home</span>
                    </div>
                    <ul className="m-0 pl-3.5 space-y-1 text-[11px]" style={{ color: colors.ink }}>
                      {activePathway.homeSupportTips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Strengths & Focus Zone Action Plan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Top Strengths */}
              <div
                className="p-3 rounded-2xl border space-y-2"
                style={{ backgroundColor: colors.sub, borderColor: colors.line }}
              >
                <div className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 text-emerald-600">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Top Strengths to Stretch</span>
                </div>
                <div className="space-y-1.5">
                  {analysis.topStrengths.map((st, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl border text-[11px]"
                      style={{ backgroundColor: colors.card, borderColor: colors.line }}
                    >
                      <div className="flex items-center justify-between font-extrabold" style={{ color: colors.ink }}>
                        <span>{st.subject}</span>
                        <span className="text-emerald-600">{Math.round(st.score)}%</span>
                      </div>
                      <div className="text-[10.5px] mt-0.5" style={{ color: colors.muted }}>
                        {st.insight}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Focus Zone & Growth Areas */}
              <div
                className="p-3 rounded-2xl border space-y-2"
                style={{ backgroundColor: colors.sub, borderColor: colors.line }}
              >
                <div className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 text-amber-600">
                  <Target className="w-3.5 h-3.5" />
                  <span>Focus &amp; Reinforcement Plan</span>
                </div>
                {analysis.focusAreas.length > 0 ? (
                  <div className="space-y-1.5">
                    {analysis.focusAreas.map((fa, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl border text-[11px]"
                        style={{ backgroundColor: colors.card, borderColor: colors.line }}
                      >
                        <div className="font-extrabold" style={{ color: colors.ink }}>
                          {fa.area}
                        </div>
                        <div className="text-[10.5px] mt-0.5" style={{ color: colors.muted }}>
                          {fa.actionTip}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="p-2.5 rounded-xl border text-[11px]"
                    style={{ backgroundColor: colors.card, borderColor: colors.line, color: colors.ink }}
                  >
                    All assessed learning areas are currently above the 70% Focus Zone threshold. Keep up steady reading and problem-solving enrichment!
                  </div>
                )}
              </div>
            </div>

            {/* Educational Decision-Making Note */}
            <div
              className="p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-2.5"
              style={{
                backgroundColor: colors.chip,
                borderColor: colors.line,
                color: colors.chipink,
              }}
            >
              <div className="flex-1 min-w-[200px] text-[11px] leading-relaxed">
                <strong>Informed Decision-Making Note:</strong> {analysis.decisionGuidance}
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.playClick(500);
                  onAskElsie(
                    `Create a personalized 4-week home study & co-curricular plan for ${analysis.learnerName} (${analysis.grade}) based on their ${analysis.overallAverage}% report and ${activePathway?.shortName || 'recommended'} pathway.`
                  );
                }}
                className="px-3 py-2 rounded-xl bg-[#1A3A8F] hover:bg-[#0A1F4D] text-white font-extrabold text-[11px] cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>🪄 Build Home Plan with Elsie</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
