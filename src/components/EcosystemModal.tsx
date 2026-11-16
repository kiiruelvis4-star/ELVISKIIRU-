import React, { useState, useEffect } from 'react';
import { ScreenType } from '../types';
import { sound } from '../utils/sound';
import { ecosystemSync, EcosystemState, computeCbcBand, BAND_DESCRIPTIONS } from '../utils/ecosystemSync';
import {
  Network,
  BookOpen,
  CalendarCheck,
  Award,
  Wallet,
  Sparkles,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Shield,
  GraduationCap,
  Users,
  Building2,
  X,
  Play,
  Activity,
  Sliders,
  Send,
  Layers,
} from 'lucide-react';

interface EcosystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchPortal: (screen: ScreenType) => void;
  onShowToast: (msg: string) => void;
}

type TabType = 'synergy' | 'works' | 'simulator' | 'switch';

export const EcosystemModal: React.FC<EcosystemModalProps> = ({
  isOpen,
  onClose,
  onLaunchPortal,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('synergy');
  const [ecoState, setEcoState] = useState<EcosystemState>(ecosystemSync.getState());

  // Simulator local form controls
  const [simCatScore, setSimCatScore] = useState<number>(ecoState.subjectGrades['Mathematics']?.catScore || 82);
  const [simAsgScore, setSimAsgScore] = useState<number>(ecoState.subjectGrades['Mathematics']?.asgScore || 88);
  const [simNoticeTitle, setSimNoticeTitle] = useState('Grade 4 Science Practical Materials Required');
  const [simNoticeCategory, setSimNoticeCategory] = useState<'Assessment' | 'Official Circular' | 'Event'>('Official Circular');
  const [simNoticeContent, setSimNoticeContent] = useState('Learners in Grade 4 should bring 2 small flower specimens on Thursday for plant pollination study.');

  // Subscribe to real-time changes
  useEffect(() => {
    const unsub = ecosystemSync.subscribe((s) => {
      setEcoState(s);
      if (s.subjectGrades['Mathematics']) {
        setSimCatScore(s.subjectGrades['Mathematics'].catScore);
        setSimAsgScore(s.subjectGrades['Mathematics'].asgScore);
      }
    });
    return unsub;
  }, []);

  // Keyboard escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        sound.playClick(400);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTabChange = (tab: TabType) => {
    sound.playClick(550);
    setActiveTab(tab);
  };

  const handleUpdateSimScore = (newCat: number, newAsg: number) => {
    setSimCatScore(newCat);
    setSimAsgScore(newAsg);
    ecosystemSync.updateSubjectScore('Mathematics', newCat, newAsg);
  };

  const handleSetSimAttendance = (status: 'Present' | 'Late' | 'Absent') => {
    sound.playClick(600);
    ecosystemSync.setAttendanceStatus(status);
    onShowToast(`Simulated: Faith marked ${status}. Updated Parent & Learner view!`);
  };

  const handlePublishSimNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simNoticeTitle.trim()) return;
    sound.playClick(650);
    ecosystemSync.publishNotice(simNoticeTitle, simNoticeCategory, simNoticeContent);
    onShowToast(`Notice broadcasted across all 4 portals!`);
  };

  const currentMath = ecoState.subjectGrades['Mathematics'] || {
    totalPct: 84,
    band: 'EE',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border text-white overflow-hidden shadow-2xl"
        style={{
          backgroundColor: '#070F1E',
          borderColor: '#F5B301',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.9), 0 0 35px rgba(245,179,1,0.25)',
        }}
      >
        {/* Top Header */}
        <div className="relative px-4 sm:px-6 py-4 border-b border-white/10 bg-gradient-to-r from-[#0A192F] via-[#102447] to-[#0A192F] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/images/lra_crest.jpg"
              alt="LRA Badge"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-[#F5B301] shadow-[0_0_12px_rgba(245,179,1,0.4)]"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#F5B301] text-[#0A192F]">
                  LRA 4-PORTAL ECOSYSTEM
                </span>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Synchronized
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
                How the 4 Portals Work Together & Their Works
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick(400);
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Close Ecosystem Guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-white/10 bg-[#0A192F]/80 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => handleTabChange('synergy')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-[13px] transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'synergy'
                ? 'bg-[#F5B301] text-[#0A192F] shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>1. How They Work Together</span>
          </button>

          <button
            onClick={() => handleTabChange('works')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-[13px] transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'works'
                ? 'bg-[#3B82F6] text-white shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>2. Their Works (Roles & Tools)</span>
          </button>

          <button
            onClick={() => handleTabChange('simulator')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-[13px] transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-[#10B981] text-[#0A192F] shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>3. Live Cross-Portal Simulator</span>
          </button>

          <button
            onClick={() => handleTabChange('switch')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-[13px] transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'switch'
                ? 'bg-[#A78BFA] text-[#0A192F] shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>4. Direct Portal Switcher</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* ===================== TAB 1: HOW THEY WORK TOGETHER ===================== */}
          {activeTab === 'synergy' && (
            <div className="space-y-6 animate-fade-in">
              {/* Executive Summary Card */}
              <div
                className="p-4 sm:p-5 rounded-2xl border relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,179,1,0.12), rgba(37,99,235,0.08), rgba(20,184,166,0.08))',
                  borderColor: 'rgba(245,179,1,0.4)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F5B301]/20 flex items-center justify-center shrink-0 border border-[#F5B301]/40 text-xl">
                    🌐
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-[#F5D27A]">
                      The Unified Little Roses Academy Platform
                    </h3>
                    <p className="text-xs sm:text-[13px] text-slate-200 mt-1 leading-relaxed">
                      Little Roses Academy operates as a <strong className="text-white">fully connected school ecosystem</strong> where 
                      data flows automatically in real-time across four distinct roles. When an action occurs in one portal (e.g. roll call attendance, 
                      CAT assessment, fee receipt, or circular), it immediately updates the relevant dashboards for Teachers, Parents, and Pupils.
                    </p>
                  </div>
                </div>
              </div>

              {/* High-Level 4-Node Visual Architecture */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl border bg-[#0D1C38] border-[#F5B301]/40 flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-[#F5B301]/15 border border-[#F5B301] flex items-center justify-center text-lg mb-2">
                    🏢
                  </div>
                  <div className="text-[12px] font-black text-[#F5B301]">1. Administration</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Governance & Bursar</div>
                  <div className="mt-2 text-[10px] text-slate-300 bg-white/5 py-1 px-2 rounded-lg w-full">
                    Fees, Admissions, Notices
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border bg-[#0D1C38] border-[#3B82F6]/40 flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-[#3B82F6]/15 border border-[#3B82F6] flex items-center justify-center text-lg mb-2">
                    👨‍🏫
                  </div>
                  <div className="text-[12px] font-black text-[#3B82F6]">2. Teachers Faculty</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Tr. Peter Kibet</div>
                  <div className="mt-2 text-[10px] text-slate-300 bg-white/5 py-1 px-2 rounded-lg w-full">
                    Roll Call, CATs, Rubrics
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border bg-[#0D1C38] border-[#A78BFA]/40 flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-[#A78BFA]/15 border border-[#A78BFA] flex items-center justify-center text-lg mb-2">
                    🎒
                  </div>
                  <div className="text-[12px] font-black text-[#A78BFA]">3. Learners Center</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Faith Wanjiku (LRA/0001)</div>
                  <div className="mt-2 text-[10px] text-slate-300 bg-white/5 py-1 px-2 rounded-lg w-full">
                    Quizzes, Timetable, Focus
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border bg-[#0D1C38] border-[#14B8A6]/40 flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-[#14B8A6]/15 border border-[#14B8A6] flex items-center justify-center text-lg mb-2">
                    👨‍👩‍👧‍👦
                  </div>
                  <div className="text-[12px] font-black text-[#14B8A6]">4. Parents Portal</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Mr. James Mwangi</div>
                  <div className="mt-2 text-[10px] text-slate-300 bg-white/5 py-1 px-2 rounded-lg w-full">
                    Assessment Book, SMS, Fees
                  </div>
                </div>
              </div>

              {/* 5 Core Interconnected Pipelines */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#F5D27A] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#F5B301]" />
                  <span>The 5 Core Inter-Portal Data Pipelines</span>
                </h4>

                {/* Pipeline 1 */}
                <div className="p-4 rounded-2xl bg-black/30 border border-white/10 hover:border-white/20 transition-all">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 font-extrabold text-xs flex items-center justify-center border border-blue-500/30">
                        1
                      </span>
                      <h5 className="text-[13px] font-extrabold text-white">
                        The CBC Academic Assessment Pipeline (Teachers ➔ Learners & Parents)
                      </h5>
                    </div>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">
                      CAT 60% + Asg 40%
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Class teachers input continuous assessment tests (CATs) and practical assignments in the <span className="text-[#3B82F6] font-semibold">Teacher Portal</span>. 
                    The system automatically computes the weighted total and assigns Kenyan CBC 4-bands (<strong className="text-emerald-400">EE</strong>, <strong className="text-blue-400">ME</strong>, <strong className="text-amber-400">AE</strong>, <strong className="text-rose-400">BE</strong>). 
                    The pupil (<span className="text-[#A78BFA] font-semibold">Faith Wanjiku</span>) sees her subject mastery badges, while the parent (<span className="text-[#14B8A6] font-semibold">Mr. Mwangi</span>) 
                    instantly accesses the official gold-crested CBC Assessment Book and printable termly progress report card.
                  </p>
                </div>

                {/* Pipeline 2 */}
                <div className="p-4 rounded-2xl bg-black/30 border border-white/10 hover:border-white/20 transition-all">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-extrabold text-xs flex items-center justify-center border border-emerald-500/30">
                        2
                      </span>
                      <h5 className="text-[13px] font-extrabold text-white">
                        Daily Roll-Call & Pupil Safety Net (Teachers ➔ Parents & Admin)
                      </h5>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                      8:20 AM Check-in
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Every morning at 8:20 AM, teachers conduct live roll call. Marking a pupil <strong className="text-emerald-400">Present</strong>, <strong className="text-amber-400">Late</strong>, or <strong className="text-rose-400">Absent</strong> immediately 
                    syncs with the Parent Portal attendance register (42 Present / 2 Absent / 3 Late). On unexcused absence, an automated SMS alert is dispatched to Mr. Mwangi's registered phone, while Administration monitors school-wide daily turnout metrics.
                  </p>
                </div>

                {/* Pipeline 3 */}
                <div className="p-4 rounded-2xl bg-black/30 border border-white/10 hover:border-white/20 transition-all">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 font-extrabold text-xs flex items-center justify-center border border-purple-500/30">
                        3
                      </span>
                      <h5 className="text-[13px] font-extrabold text-white">
                        Homework, Quizzes & Active Learning Cycle (Teachers ➔ Learners ➔ Parents)
                      </h5>
                    </div>
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold">
                      Focus & Review
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Teachers assign homework tasks directly to Grade 4A. Faith accesses her daily timetable and homework checklist in the <span className="text-[#A78BFA] font-semibold">Learners Portal</span>, 
                    takes timed CBC interactive revision quizzes, and logs study minutes in the Focus Zone. Parents can track assignment status or query ELSIE AI directly ("Did Faith complete her Mathematics homework?").
                  </p>
                </div>

                {/* Pipeline 4 */}
                <div className="p-4 rounded-2xl bg-black/30 border border-white/10 hover:border-white/20 transition-all">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-extrabold text-xs flex items-center justify-center border border-amber-500/30">
                        4
                      </span>
                      <h5 className="text-[13px] font-extrabold text-white">
                        Institutional Governance, Fees & Broadcast Circulars (Admin ➔ Parents & Staff)
                      </h5>
                    </div>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                      Paybill & Calendar
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    The School Bursar & Principal manage school fee ledgers, admissions, and term dates. When a parent pays via M-Pesa Paybill 247247, the bursar reconciles the receipt, instantly updating the parent's fee balance statement (KSh 12,000 paid / KSh 6,500 balance). 
                    Official circulars (e.g. Mid-term Assessment Schedule or Sports Day) published by Admin surface instantly in Parent and Learner noticeboards.
                  </p>
                </div>

                {/* Pipeline 5 */}
                <div className="p-4 rounded-2xl bg-black/30 border border-white/10 hover:border-white/20 transition-all">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <img
                        src="/images/lra_crest.jpg"
                        alt="ELSIE"
                        className="w-6 h-6 rounded-full object-contain bg-[#0A192F]/60 p-0.5 border border-pink-400/40 shrink-0"
                      />
                      <h5 className="text-[13px] font-extrabold text-white">
                        The ELSIE Assistant Ecosystem (Personalized for Learners & Parents)
                      </h5>
                    </div>
                    <span className="text-[10px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full font-bold">
                      Dual Persona
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    ELSIE (Learn • Love • Lead) operates in two specialized capacities: in the <span className="text-[#A78BFA] font-semibold">Learners Portal</span>, ELSIE acts as a fun Socratic study buddy, 
                    guiding learners through tricky fractions, Kiswahili sarufi, and plant life cycles without revealing direct test answers. In the <span className="text-[#14B8A6] font-semibold">Parents Portal</span>, 
                    ELSIE functions as an executive academic advisor, explaining Focus Zone remedial work (≤ 70%), breaking down weighted marks, and providing timely updates.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 2: THEIR WORKS ===================== */}
          {activeTab === 'works' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-xs text-slate-300">
                Each of the 4 portals is purpose-built for its user group. Here is the comprehensive breakdown of <strong className="text-white">"Their Works"</strong>:
              </div>

              {/* 1. Admin Portal Works */}
              <div className="p-4 sm:p-5 rounded-2xl border bg-black/25 border-[#F5B301]/40">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">🏢</span>
                    <div>
                      <h4 className="text-sm font-black text-[#F5B301]">
                        1. School Administration Office
                      </h4>
                      <p className="text-[11px] text-slate-400">Headteacher, Board of Management & Bursar</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-extrabold bg-[#F5B301]/20 text-[#F5B301] border border-[#F5B301]/40">
                    Governance
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-200">
                  <div className="flex items-start gap-2 bg-white/5 p-2 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#F5B301] shrink-0 mt-0.5" />
                    <span><strong>Fee Ledger & Banking:</strong> Invoicing, receipting M-Pesa payments, tracking fee balances, and issuing payment clearance certificates.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/5 p-2 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#F5B301] shrink-0 mt-0.5" />
                    <span><strong>Learner Registry:</strong> Enrolling pupils (Playgroup to Grade 6), assigning admission numbers (e.g. LRA/0001), and managing NEMIS/CBA synchronizations.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/5 p-2 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#F5B301] shrink-0 mt-0.5" />
                    <span><strong>Staff & Teacher Management:</strong> Teacher directories, subject allocations, biometric credentials, security codes, and lesson timetable master builder.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/5 p-2 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#F5B301] shrink-0 mt-0.5" />
                    <span><strong>Official Communications:</strong> Publishing executive circulars, calendar events, sports days, and parent-teacher conference schedules.</span>
                  </div>
                </div>
              </div>

              {/* 2. Teachers Portal Works */}
              <div className="p-4 sm:p-5 rounded-2xl border bg-black/25 border-[#3B82F6]/40">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">👨‍🏫</span>
                    <div>
                      <h4 className="text-sm font-black text-[#3B82F6]">
                        2. Teachers & Academic Faculty
                      </h4>
                      <p className="text-[11px] text-slate-400">Class Teachers & Subject Specialists (e.g. Tr. Peter Kibet)</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-extrabold bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/40">
                    Pedagogy & Assessment
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-200">
                  <div className="flex items-start gap-2 bg-white/5 p-2 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#3B82F6] shrink-0 mt-0.5" />
                    <span><strong>CBC Formative & Summative Scoring:</strong> Inputting CATs (60%) and Assignments (40%) across 8 subjects and evaluating CBC strand performance bands.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/5 p-2 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#3B82F6] shrink-0 mt-0.5" />
                    <span><strong>Daily Morning Roll Call:</strong> Logging daily attendance at 8:20 AM with instant automated sync to parents and school administration.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/5 p-2 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#3B82F6] shrink-0 mt-0.5" />
                    <span><strong>Lesson Delivery & Bell Schedule:</strong> Timetable navigation (L1 through L7), tracking syllabus coverage, and health break supervision.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/5 p-2 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#3B82F6] shrink-0 mt-0.5" />
                    <span><strong>Homework & Lesson Notes:</strong> Distributing exercises, worksheets, revision quizzes, and individualized learner feedback notes.</span>
                  </div>
                </div>
              </div>

              {/* 3. Learners Portal Works */}
              <div className="p-4 sm:p-5 rounded-2xl border bg-black/25 border-[#A78BFA]/40">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">🎒</span>
                    <div>
                      <h4 className="text-sm font-black text-[#A78BFA]">
                        3. Learners Student Center
                      </h4>
                      <p className="text-[11px] text-slate-400">Little Roses Pupils (e.g. Faith Wanjiku, Grade 4A)</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-extrabold bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/40">
                    Active Study & Focus
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-200">
                  <div className="flex items-start gap-2 bg-white/5 p-2 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#A78BFA] shrink-0 mt-0.5" />
                    <span><strong>Daily Timetable & Lessons:</strong> Checking the day's class schedule, rotating subject spotlight, and classroom announcements.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/5 p-2 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#A78BFA] shrink-0 mt-0.5" />
                    <span><strong>Interactive CBC Revision Tests:</strong> Completing fun multiple-choice tests across Math, English, Kiswahili, Science, and Social Studies with instant score feedback.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/5 p-2 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#A78BFA] shrink-0 mt-0.5" />
                    <span><strong>Focus Zone Timer:</strong> Built-in study timer (Pomodoro-style) that tracks daily focus minutes and builds consistent learning discipline.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/5 p-2 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#A78BFA] shrink-0 mt-0.5" />
                    <span><strong>ELSIE Study Buddy:</strong> An interactive assistant explaining concepts step-by-step to help pupils learn how to solve problems.</span>
                  </div>
                </div>
              </div>

              {/* 4. Parents Portal Works */}
              <div className="p-4 sm:p-5 rounded-2xl border bg-black/25 border-[#14B8A6]/40">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">👨‍👩‍👧‍👦</span>
                    <div>
                      <h4 className="text-sm font-black text-[#14B8A6]">
                        4. Parents and Guardians Portal
                      </h4>
                      <p className="text-[11px] text-slate-400">Parents & Caregivers</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-extrabold bg-[#14B8A6]/20 text-[#14B8A6] border border-[#14B8A6]/40">
                    Supervision & Partnership
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-200">
                  <div className="flex items-start gap-2 bg-white/5 p-2 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#14B8A6] shrink-0 mt-0.5" />
                    <span><strong>Official CBC Assessment Book:</strong> Inspecting weighted 60/40 report cards, 4-band performance charts, and downloadable official signed PDF reports.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/5 p-2 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#14B8A6] shrink-0 mt-0.5" />
                    <span><strong>Attendance Register:</strong> Real-time daily presence checks with official roll call synchronization from the class teacher.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/5 p-2 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#14B8A6] shrink-0 mt-0.5" />
                    <span><strong>Multi-Child Switcher:</strong> Effortlessly toggling between siblings on the same family parent account.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/5 p-2 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#14B8A6] shrink-0 mt-0.5" />
                    <span><strong>Focus Zone & ELSIE:</strong> Asking ELSIE questions about assessment marks, remedial focus zones (≤ 70%), and term progress.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 3: LIVE CROSS-PORTAL SIMULATOR ===================== */}
          {activeTab === 'simulator' && (
            <div className="space-y-6 animate-fade-in">
              <div
                className="p-4 rounded-2xl border"
                style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(59,130,246,0.1))',
                  borderColor: '#10B981',
                }}
              >
                <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm">
                  <Activity className="w-4 h-4 animate-pulse" />
                  <span>Interactive Proof of Interconnection</span>
                </div>
                <p className="text-xs text-slate-200 mt-1">
                  Adjust the controls below to trigger live cross-portal events. Watch how changes in 
                  <strong className="text-white"> Teacher or Admin</strong> immediately reflect in the 
                  <strong className="text-white"> Learner and Parent</strong> portals!
                </p>
              </div>

              {/* Simulation 1: Academic Grading Sync */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#3B82F6]" />
                    <span className="text-xs sm:text-sm font-extrabold text-white">
                      Test 1: Teacher Marks CAT Score ➔ CBC Band Sync
                    </span>
                  </div>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">
                    Subject: Mathematics
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Slider controls (Teacher action) */}
                  <div className="space-y-3 bg-white/5 p-3 rounded-xl border border-white/10">
                    <div className="text-[11px] font-bold text-blue-300">
                      👨‍🏫 Teacher Input (Tr. Peter Kibet)
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>CAT Score (60% weight):</span>
                        <strong className="text-blue-400 font-mono text-sm">{simCatScore}%</strong>
                      </div>
                      <input
                        type="range"
                        min="30"
                        max="100"
                        value={simCatScore}
                        onChange={(e) => handleUpdateSimScore(Number(e.target.value), simAsgScore)}
                        className="w-full accent-[#3B82F6] cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Assignment Score (40% weight):</span>
                        <strong className="text-teal-400 font-mono text-sm">{simAsgScore}%</strong>
                      </div>
                      <input
                        type="range"
                        min="30"
                        max="100"
                        value={simAsgScore}
                        onChange={(e) => handleUpdateSimScore(simCatScore, Number(e.target.value))}
                        className="w-full accent-[#14B8A6] cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Real-time reflection across other portals */}
                  <div className="bg-[#0A192F] p-3 rounded-xl border border-white/10 space-y-2">
                    <div className="text-[11px] font-bold text-amber-300">
                      ⚡ Instant Cross-Portal Reflection:
                    </div>

                    <div className="flex items-center justify-between bg-black/40 p-2 rounded-lg text-xs">
                      <span className="text-slate-300">Weighted Total Score:</span>
                      <span className="font-extrabold text-white font-mono text-sm">
                        {currentMath.totalPct}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-black/40 p-2 rounded-lg text-xs">
                      <span className="text-slate-300">Kenyan CBC 4-Band:</span>
                      <span
                        className="font-black px-2 py-0.5 rounded text-xs"
                        style={{
                          backgroundColor: BAND_DESCRIPTIONS[currentMath.band].bg,
                          color: BAND_DESCRIPTIONS[currentMath.band].color,
                        }}
                      >
                        {currentMath.band} — {BAND_DESCRIPTIONS[currentMath.band].label}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 italic pt-1">
                      ✓ Faith Wanjiku sees <span className="text-[#A78BFA] font-bold">"{currentMath.band}"</span> badge on her Learner app.<br />
                      ✓ Mr. James Mwangi's Parent Assessment Book recalculates to <span className="text-[#14B8A6] font-bold">{currentMath.totalPct}%</span>.
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulation 2: Morning Roll-Call Sync */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs sm:text-sm font-extrabold text-white">
                      Test 2: Teacher Marks Morning Roll Call ➔ Parent SMS & Attendance Log
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="space-y-2 bg-white/5 p-3 rounded-xl border border-white/10">
                    <div className="text-[11px] font-bold text-emerald-300">
                      👨‍🏫 Teacher Roll Call (Click to change today's status):
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSetSimAttendance('Present')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          ecoState.attendance.todayStatus === 'Present'
                            ? 'bg-emerald-500 text-slate-900 font-extrabold shadow'
                            : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                        }`}
                      >
                        ✓ Present
                      </button>
                      <button
                        onClick={() => handleSetSimAttendance('Late')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          ecoState.attendance.todayStatus === 'Late'
                            ? 'bg-amber-500 text-slate-900 font-extrabold shadow'
                            : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                        }`}
                      >
                        ⏱ Late
                      </button>
                      <button
                        onClick={() => handleSetSimAttendance('Absent')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          ecoState.attendance.todayStatus === 'Absent'
                            ? 'bg-rose-500 text-white font-extrabold shadow'
                            : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                        }`}
                      >
                        ✕ Absent
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#0A192F] p-3 rounded-xl border border-white/10 space-y-1.5 text-xs">
                    <div className="text-[11px] font-bold text-teal-300">
                      👨‍👩‍👧‍👦 Live Parent Portal Status:
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Today's Check-in:</span>
                      <span
                        className={`font-black px-2 py-0.5 rounded text-xs ${
                          ecoState.attendance.todayStatus === 'Present'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : ecoState.attendance.todayStatus === 'Late'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {ecoState.attendance.todayStatus} ({ecoState.attendance.lastCheckInTime})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Term Totals:</span>
                      <span>
                        {ecoState.attendance.presentCount} Present · {ecoState.attendance.absentCount} Absent · {ecoState.attendance.lateCount} Late
                      </span>
                    </div>
                    {ecoState.attendance.todayStatus === 'Absent' && (
                      <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-[10px] text-rose-200 mt-1">
                        📲 <strong>Automated SMS dispatched</strong> to Mr. Mwangi (0711 223 344): "LRA Notice: Faith has not been marked present in Class 4A at 8:20 AM."
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Simulation 3: Admin Circular Broadcast */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-[#F5B301]" />
                    <span className="text-xs sm:text-sm font-extrabold text-white">
                      Test 3: Admin Publishes Official School Circular ➔ All Portals
                    </span>
                  </div>
                </div>

                <form onSubmit={handlePublishSimNotice} className="space-y-3 bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={simNoticeTitle}
                      onChange={(e) => setSimNoticeTitle(e.target.value)}
                      placeholder="Circular Title"
                      className="sm:col-span-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/15 text-xs text-white"
                      required
                    />
                    <select
                      value={simNoticeCategory}
                      onChange={(e) => setSimNoticeCategory(e.target.value as any)}
                      className="px-2 py-1.5 rounded-lg bg-black/40 border border-white/15 text-xs text-white"
                    >
                      <option value="Official Circular">Official Circular</option>
                      <option value="Assessment">Assessment</option>
                      <option value="Event">Event</option>
                    </select>
                  </div>
                  <textarea
                    value={simNoticeContent}
                    onChange={(e) => setSimNoticeContent(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/15 text-xs text-white resize-none"
                    placeholder="Notice Content..."
                    required
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">
                      Total Active Circulars: <strong className="text-white">{ecoState.notices.length}</strong>
                    </span>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#F5B301] text-[#0A192F] hover:bg-[#F5B301]/90 flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      <span>Broadcast to All Portals</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ===================== TAB 4: DIRECT PORTAL SWITCHER & LAUNCH ===================== */}
          {activeTab === 'switch' && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-xs text-slate-300">
                Click any portal below to <strong className="text-white">jump directly into it</strong> with authorized test credentials:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Admin Office */}
                <div
                  className="p-4 rounded-2xl border transition-all hover:scale-[1.01] flex flex-col justify-between"
                  style={{
                    backgroundColor: 'rgba(245, 179, 1, 0.08)',
                    borderColor: '#F5B301',
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🏢</span>
                        <h4 className="text-sm font-black text-[#F5B301]">
                          School Administration
                        </h4>
                      </div>
                      <span className="text-[9px] bg-[#F5B301] text-[#0A192F] font-black px-2 py-0.5 rounded-full">
                        ADMIN
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Manage fees, admissions, student government, circulars, and teacher directories.
                    </p>
                    <div className="mt-2 text-[10px] text-slate-400 font-mono bg-black/40 p-1.5 rounded">
                      ID: <strong className="text-[#F5D27A]">0711121142</strong> or <strong className="text-white">kiiruelvis4@gmail.com</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      sound.playClick(600);
                      onClose();
                      onLaunchPortal('admin');
                      onShowToast('Entered Administration Office');
                    }}
                    className="mt-3 w-full py-2 rounded-xl text-xs font-black bg-[#F5B301] text-[#0A192F] hover:bg-[#F5B301]/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
                  >
                    <span>Launch Admin Office</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 2. Teachers Portal */}
                <div
                  className="p-4 rounded-2xl border transition-all hover:scale-[1.01] flex flex-col justify-between"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    borderColor: '#3B82F6',
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">👨‍🏫</span>
                        <h4 className="text-sm font-black text-[#3B82F6]">
                          Teachers & Academic Faculty
                        </h4>
                      </div>
                      <span className="text-[9px] bg-[#3B82F6] text-white font-black px-2 py-0.5 rounded-full">
                        STAFF
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Class 4A roll call, CBC 60/40 mark input, strand assessments, and digital lesson plans.
                    </p>
                    <div className="mt-2 text-[10px] text-slate-400 font-mono bg-black/40 p-1.5 rounded">
                      Phone: <strong className="text-blue-300">0712 345 678</strong> · Pass: <strong className="text-white">password123</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      sound.playClick(600);
                      onClose();
                      onLaunchPortal('teachers');
                      onShowToast('Entered Teachers Portal');
                    }}
                    className="mt-3 w-full py-2 rounded-xl text-xs font-black bg-[#3B82F6] text-white hover:bg-[#2563EB] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
                  >
                    <span>Launch Teachers Portal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 3. Learners Portal */}
                <div
                  className="p-4 rounded-2xl border transition-all hover:scale-[1.01] flex flex-col justify-between"
                  style={{
                    backgroundColor: 'rgba(167, 139, 250, 0.08)',
                    borderColor: '#A78BFA',
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🎒</span>
                        <h4 className="text-sm font-black text-[#A78BFA]">
                          Learners Student Center
                        </h4>
                      </div>
                      <span className="text-[9px] bg-[#A78BFA] text-[#0A192F] font-black px-2 py-0.5 rounded-full">
                        STUDENT
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Faith Wanjiku's homework checklist, timetable, interactive quizzes, and ELSIE AI tutor.
                    </p>
                    <div className="mt-2 text-[10px] text-slate-400 font-mono bg-black/40 p-1.5 rounded">
                      ADM: <strong className="text-purple-300">LRA/0001</strong> · PIN: <strong className="text-white">1234</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      sound.playClick(600);
                      onClose();
                      onLaunchPortal('learners');
                      onShowToast('Welcome, Faith! Entered Learners Portal');
                    }}
                    className="mt-3 w-full py-2 rounded-xl text-xs font-black bg-[#A78BFA] text-[#0A192F] hover:bg-[#A78BFA]/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
                  >
                    <span>Launch Learners Portal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 4. Parents Portal */}
                <div
                  className="p-4 rounded-2xl border transition-all hover:scale-[1.01] flex flex-col justify-between"
                  style={{
                    backgroundColor: 'rgba(20, 184, 166, 0.08)',
                    borderColor: '#14B8A6',
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">👨‍👩‍👧‍👦</span>
                        <h4 className="text-sm font-black text-[#14B8A6]">
                          Parents & Guardians Portal
                        </h4>
                      </div>
                      <span className="text-[9px] bg-[#14B8A6] text-white font-black px-2 py-0.5 rounded-full">
                        PARENT
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Gold-crested CBC Assessment Book, attendance logs, M-Pesa fee receipts, and ELSIE.
                    </p>
                    <div className="mt-2 text-[10px] text-slate-400 font-mono bg-black/40 p-1.5 rounded">
                      Phone: <strong className="text-teal-300">0711 223 344</strong> · Pass: <strong className="text-white">password123</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      sound.playClick(600);
                      onClose();
                      onLaunchPortal('parents');
                      onShowToast('Welcome, Mr. Mwangi! Entered Parents Portal');
                    }}
                    className="mt-3 w-full py-2 rounded-xl text-xs font-black bg-[#14B8A6] text-white hover:bg-[#0D9488] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
                  >
                    <span>Launch Parents Portal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-white/10 bg-[#050C18] flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[11px]">Little Roses Academy · Nakuru, Kenya</span>
          </div>
          <button
            onClick={() => {
              sound.playClick(400);
              onClose();
            }}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors cursor-pointer text-[11px]"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
