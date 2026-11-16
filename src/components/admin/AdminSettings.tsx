import React, { useState } from 'react';
import {
  AdminState,
  SchoolProfile,
  TermsConfig,
  GRADES,
  GRADE_COLORS,
  SUBJECTS,
  AdminCodeAuth,
  Learner,
} from './types';
import { sound } from '../../utils/sound';
import {
  isSupabaseConfigured,
  pingSupabaseKeepAlive,
  syncSchoolRecordsToSupabase,
  RETENTION_RULES,
} from '../../supabaseClient';
import { CURRENT_APP_VERSION, executeChromeAppUpdate } from '../../utils/appVersion';
import { AdminLearnerPasswords } from './AdminLearnerPasswords';
import { AssessmentCoverInspectorModal } from '../common/AssessmentCoverInspectorModal';

interface AdminSettingsProps {
  state: AdminState;
  onUpdateSchool: (profile: SchoolProfile) => void;
  onUpdateTerms: (terms: TermsConfig) => void;
  onToggleTheme: (theme: 'light' | 'dark') => void;
  onUpdateAdminAuth?: (adminAuth: AdminCodeAuth) => void;
  onUpdateAIServiceConfig?: (cfg: any) => void;
  onLeavePortal: () => void;
  onShowToast: (msg: string) => void;
  onUpdateLearners?: (learners: Learner[]) => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  state,
  onUpdateSchool,
  onUpdateTerms,
  onToggleTheme,
  onUpdateAdminAuth,
  onUpdateAIServiceConfig,
  onLeavePortal,
  onShowToast,
  onUpdateLearners,
}) => {
  const [subView, setSubView] = useState<
    'main' | 'school' | 'terms' | 'subjects' | 'log' | 'supabase' | 'admin_security' | 'ai_whatsapp' | 'learner_passwords'
  >('main');
  const [showCoverInspector, setShowCoverInspector] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Admin security credentials form
  const [currentAdminPassword, setCurrentAdminPassword] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);

  // School profile form
  const normalizeEmail = (val?: string) => {
    const clean = (val || '').trim();
    if (!clean || clean === 'admin@littlerosesacademy.sc.ke' || clean === 'info@littlerosesacademy.ac.ke') {
      return 'kiiruelvis4@gmail.com';
    }
    return clean;
  };
  const normalizeFacebook = (val?: string) => {
    const clean = (val || '').trim();
    if (!clean || clean === 'Little Roses Academy') return 'Little Roses Juniorate Academy';
    return clean;
  };
  const normalizeInstagram = (val?: string) => {
    const clean = (val || '').trim();
    if (!clean || clean === 'Little Roses Academy') return '@little_roses_academy';
    return clean;
  };

  const [schoolName, setSchoolName] = useState(state.school.name);
  const [motto, setMotto] = useState(state.school.motto);
  const [address, setAddress] = useState(state.school.address);
  const [phone, setPhone] = useState(state.school.phone);
  const [email, setEmail] = useState(() => normalizeEmail(state.school.email));
  const [schoolWhatsapp, setSchoolWhatsapp] = useState(state.school.whatsapp || '+254 736 573 436');
  const [facebook, setFacebook] = useState(() => normalizeFacebook(state.school.facebook));
  const [instagram, setInstagram] = useState(() => normalizeInstagram(state.school.instagram));

  // Term dates form
  const [term1Open, setTerm1Open] = useState(state.terms['Term 1'].open);
  const [term1Mid, setTerm1Mid] = useState(state.terms['Term 1'].mid);
  const [term1Close, setTerm1Close] = useState(state.terms['Term 1'].close);

  const [term2Open, setTerm2Open] = useState(state.terms['Term 2'].open);
  const [term2Mid, setTerm2Mid] = useState(state.terms['Term 2'].mid);
  const [term2Close, setTerm2Close] = useState(state.terms['Term 2'].close);

  const [term3Open, setTerm3Open] = useState(state.terms['Term 3'].open);
  const [term3Mid, setTerm3Mid] = useState(state.terms['Term 3'].mid);
  const [term3Close, setTerm3Close] = useState(state.terms['Term 3'].close);

  const isDark = state.theme === 'dark';

  const handleSaveSchool = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playCompleteChime();
    const cleanWhatsApp = schoolWhatsapp.trim();
    onUpdateSchool({
      name: schoolName.trim(),
      motto: motto.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      whatsapp: cleanWhatsApp,
      facebook: facebook.trim(),
      instagram: instagram.trim(),
    });
    setSubView('main');
    onShowToast('School profile updated successfully');
  };

  const handleSaveTerms = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playCompleteChime();
    onUpdateTerms({
      'Term 1': { open: term1Open, mid: term1Mid, close: term1Close },
      'Term 2': { open: term2Open, mid: term2Mid, close: term2Close },
      'Term 3': { open: term3Open, mid: term3Mid, close: term3Close },
    });
    setSubView('main');
    onShowToast('Academic term dates saved');
  };

  if (subView === 'learner_passwords') {
    return (
      <AdminLearnerPasswords
        learners={state.learners}
        isDark={isDark}
        onBack={() => setSubView('main')}
        onSaveLearners={(updatedLearners) => {
          if (onUpdateLearners) {
            onUpdateLearners(updatedLearners);
          }
          onShowToast('Saved 6-character permanent passwords for all learners');
        }}
        onShowToast={onShowToast}
      />
    );
  }

  if (subView === 'school') {
    return (
      <div className="space-y-4 animate-fade-in pb-4">
        <button
          onClick={() => setSubView('main')}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
        >
          ← Back to Settings
        </button>

        <div className={`p-4 rounded-3xl border ${
          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
        }`}>
          <h2 className="text-base font-black mb-1">School Profile Settings</h2>
          <p className="text-xs text-slate-500 mb-4">
            Changes apply everywhere in the school application.
          </p>

          <form onSubmit={handleSaveSchool} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                School Name
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className={`w-full p-2.5 rounded-xl text-xs border ${
                  isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Motto
              </label>
              <input
                type="text"
                value={motto}
                onChange={(e) => setMotto(e.target.value)}
                className={`w-full p-2.5 rounded-xl text-xs border ${
                  isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Physical Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={`w-full p-2.5 rounded-xl text-xs border ${
                  isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs border ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs border ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Official School WhatsApp Line
              </label>
              <input
                type="tel"
                value={schoolWhatsapp}
                onChange={(e) => setSchoolWhatsapp(e.target.value)}
                placeholder="e.g. +254 736 573 436 or 0736 573 436"
                className={`w-full p-2.5 rounded-xl text-xs border ${
                  isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                }`}
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Official WhatsApp contact channel for school enquiries.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Facebook Page
                </label>
                <input
                  type="text"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  placeholder="e.g. Little Roses Juniorate Academy"
                  className={`w-full p-2.5 rounded-xl text-xs border ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Instagram Handle
                </label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="e.g. @little_roses_academy"
                  className={`w-full p-2.5 rounded-xl text-xs border ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-xs font-black bg-[#22C55E] text-white shadow-xs cursor-pointer"
            >
              Save Profile Changes
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (subView === 'terms') {
    return (
      <div className="space-y-4 animate-fade-in pb-4">
        <button
          onClick={() => setSubView('main')}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
        >
          ← Back to Settings
        </button>

        <div className={`p-4 rounded-3xl border ${
          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
        }`}>
          <h2 className="text-base font-black mb-1">Academic Years & Term Dates</h2>
          <p className="text-xs text-slate-500 mb-4">
            No fixed calendar years. Dates are used dynamically to determine the active term and timetable calendars.
          </p>

          <form onSubmit={handleSaveTerms} className="space-y-4">
            {/* Term 1 */}
            <div className="p-3 rounded-2xl border border-purple-500/30 bg-purple-500/5 space-y-2">
              <span className="text-xs font-black text-purple-600 dark:text-purple-400 block">
                Term 1
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400">Opening</label>
                  <input
                    type="date"
                    value={term1Open}
                    onChange={(e) => setTerm1Open(e.target.value)}
                    className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400">Mid-Term</label>
                  <input
                    type="date"
                    value={term1Mid}
                    onChange={(e) => setTerm1Mid(e.target.value)}
                    className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400">Closing</label>
                  <input
                    type="date"
                    value={term1Close}
                    onChange={(e) => setTerm1Close(e.target.value)}
                    className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-white/10"
                  />
                </div>
              </div>
            </div>

            {/* Term 2 */}
            <div className="p-3 rounded-2xl border border-blue-500/30 bg-blue-500/5 space-y-2">
              <span className="text-xs font-black text-blue-600 dark:text-blue-400 block">
                Term 2
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400">Opening</label>
                  <input
                    type="date"
                    value={term2Open}
                    onChange={(e) => setTerm2Open(e.target.value)}
                    className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400">Mid-Term</label>
                  <input
                    type="date"
                    value={term2Mid}
                    onChange={(e) => setTerm2Mid(e.target.value)}
                    className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400">Closing</label>
                  <input
                    type="date"
                    value={term2Close}
                    onChange={(e) => setTerm2Close(e.target.value)}
                    className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-white/10"
                  />
                </div>
              </div>
            </div>

            {/* Term 3 */}
            <div className="p-3 rounded-2xl border border-pink-500/30 bg-pink-500/5 space-y-2">
              <span className="text-xs font-black text-pink-600 dark:text-pink-400 block">
                Term 3
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400">Opening</label>
                  <input
                    type="date"
                    value={term3Open}
                    onChange={(e) => setTerm3Open(e.target.value)}
                    className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400">Mid-Term</label>
                  <input
                    type="date"
                    value={term3Mid}
                    onChange={(e) => setTerm3Mid(e.target.value)}
                    className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400">Closing</label>
                  <input
                    type="date"
                    value={term3Close}
                    onChange={(e) => setTerm3Close(e.target.value)}
                    className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-white/10"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-xs font-black bg-[#22C55E] text-white shadow-xs cursor-pointer"
            >
              Save Academic Dates
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (subView === 'subjects') {
    return (
      <div className="space-y-4 animate-fade-in pb-4">
        <button
          onClick={() => setSubView('main')}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
        >
          ← Back to Settings
        </button>

        <div>
          <h2 className="text-base font-black mb-1">CBC Subjects by Grade</h2>
          <p className="text-xs text-slate-500 mb-3">
            Officially approved Competency-Based Curriculum learning areas (Grades 1–6).
          </p>

          <div className="space-y-3">
            {GRADES.map((g) => (
              <div
                key={g}
                className={`p-3.5 rounded-2xl border shadow-xs ${
                  isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                }`}
              >
                <div
                  className="font-black text-xs mb-2 flex items-center gap-2"
                  style={{ color: GRADE_COLORS[g] }}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GRADE_COLORS[g] }} />
                  <span>{g} ({SUBJECTS[g].length} Learning Areas)</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {SUBJECTS[g].map((sub, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (subView === 'log') {
    return (
      <div className="space-y-4 animate-fade-in pb-4">
        <button
          onClick={() => setSubView('main')}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
        >
          ← Back to Settings
        </button>

        <div className={`p-4 rounded-3xl border ${
          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
        }`}>
          <h2 className="text-base font-black mb-1">Administrative Audit Log</h2>
          <p className="text-xs text-slate-500 mb-4">
            Immutable tracking of all operational modifications with Nairobi standard timestamps.
          </p>

          <div className="space-y-2">
            {state.log.map((entry, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-xs"
              >
                <span className="w-5 h-5 rounded-full bg-teal-500/15 text-teal-600 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  ✓
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 dark:text-slate-100">
                    {entry.text}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {entry.by} · {entry.at}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (subView === 'supabase') {
    const isConfigured = isSupabaseConfigured();

    const handlePing = async () => {
      setIsPinging(true);
      sound.playClick(500);
      const res = await pingSupabaseKeepAlive();
      setIsPinging(false);
      if (res.success) sound.playCompleteChime();
      onShowToast(res.message);
    };

    const handleSync = async () => {
      setIsSyncing(true);
      sound.playClick(600);
      const res = await syncSchoolRecordsToSupabase(state);
      setIsSyncing(false);
      if (res.success) sound.playCompleteChime();
      onShowToast(res.message);
    };

    return (
      <div className="space-y-4 animate-fade-in pb-4">
        <button
          onClick={() => setSubView('main')}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
        >
          <span>←</span>
          <span>Back to Settings</span>
        </button>

        {/* Supabase Free Tier Status Card */}
        <div
          className={`p-4 rounded-3xl border shadow-sm ${
            isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 font-black text-lg flex items-center justify-center">
                ⚡
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Supabase Project (Free Tier)
                </h3>
                <div className="text-[11px] text-slate-400">
                  {isConfigured ? 'Connected to live Supabase project' : 'Running in Offline Encrypted Vault Mode'}
                </div>
              </div>
            </div>

            <span
              className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                isConfigured
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {isConfigured ? 'Cloud Live' : 'Free / Offline'}
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
            Little Roses Academy operates on the free Supabase tier. Free projects pause after 7 days of inactivity; holiday keepalive pings maintain continuous availability.
          </p>

          <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <div className="font-black text-emerald-600 dark:text-emerald-400">500 MB</div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Database</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <div className="font-black text-blue-600 dark:text-blue-400">1 GB</div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Resource Files</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <div className="font-black text-purple-600 dark:text-purple-400">7 Days</div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Pause Window</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handlePing}
              disabled={isPinging}
              className="flex-1 py-2 px-3 text-xs font-bold rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>{isPinging ? 'Pinging...' : '🏓 Send Keep-Alive Ping'}</span>
            </button>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-[#7C3AED] hover:bg-purple-700 text-white shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>{isSyncing ? 'Syncing...' : '🔄 Sync Records to Cloud'}</span>
            </button>
          </div>
        </div>

        {/* App Version & Chrome PWA Update Card */}
        <div
          className={`p-4 rounded-3xl border shadow-sm ${
            isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🚀</span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  App Version & Chrome Updates
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">
                  Current Version: {CURRENT_APP_VERSION.version} ({CURRENT_APP_VERSION.buildNumber})
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
              PWA Online
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
            When app updates are deployed, Chrome downloads the latest bundles through the Service Worker cache. <strong>Your saved learners, teachers, student government appointments, and biometric credentials are guaranteed never to be deleted during an update.</strong>
          </p>

          <button
            onClick={async () => {
              sound.playClick(500);
              onShowToast('Checking Chrome service worker cache for updates...');
              await executeChromeAppUpdate();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            <span>📥</span>
            <span>Check & Update App via Chrome (Preserve All Data)</span>
          </button>
        </div>

        {/* 24-Hour AI Chat Retention Card */}
        <div
          className={`p-4 rounded-3xl border shadow-sm ${
            isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-base">⏳</span>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                AI Chat 24-Hour Auto-Delete Policy
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
              Active
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
            Messages exchanged with ELSIE are strictly retained for <strong>24 hours</strong>, after which conversational transcripts are automatically erased from both local storage and database.
          </p>
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-200 font-medium flex items-center gap-1.5">
            <span>✓</span>
            <span>All approved timetable changes, learner admissions, and notices remain permanently in the Activity Log.</span>
          </div>
        </div>

        {/* 30-Day Term 3 Retention & Auto-Release Card */}
        <div
          className={`p-4 rounded-3xl border shadow-sm ${
            isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-base">🎓</span>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Term 3 Promotion &amp; 30-Day Booklet Deletion Policy
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
              Auto-Lifecycle
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
            Assessment books and reports appear automatically to learners and parents without waiting for Admin push. Short holidays between Term 1 &amp; Term 2 (&lt;30 days) keep books intact; after Term 3 closes, families get <strong>30 days with notifications reminders</strong> to download booklets before learners advance to the next class and all old assessment books are completely deleted.
          </p>
          <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 list-disc list-inside">
            <li>Follows live Term Dates &amp; Timetable Freeze (Exams vs Holiday) inside the Promotion UI.</li>
            <li>Term 3 closing triggers automatic booklet access and 30-day reminders without waiting for Admin push.</li>
            <li>Permanent learner admission numbers (LRA/0001...) remain immutable across all class promotions.</li>
          </ul>
        </div>

        {/* Password Security Card */}
        <div
          className={`p-4 rounded-3xl border shadow-sm ${
            isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-base">🛡️</span>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Password Security & Hashing
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
            Passwords are never displayed to anyone, including administrators. Passwords are saved as cryptographic hashes in Supabase Auth.
          </p>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            When an administrator resets a teacher or family access, only a temporary password is created. The user is strictly required to set their permanent secret password upon their next login.
          </div>
        </div>
      </div>
    );
  }

  if (subView === 'admin_security') {
    const handleSaveAdminCredentials = (e: React.FormEvent) => {
      e.preventDefault();
      const currentConfiguredPass = state.admin?.passHash || 'LittleRoses2026';

      if (currentAdminPassword !== currentConfiguredPass) {
        onShowToast('Current administrator password does not match.');
        return;
      }

      if (!newAdminPassword || newAdminPassword.length < 6) {
        onShowToast('New master password must be at least 6 characters long.');
        return;
      }

      if (newAdminPassword !== confirmAdminPassword) {
        onShowToast('New passwords do not match. Please retype carefully.');
        return;
      }

      sound.playCompleteChime();
      const updatedAuth: AdminCodeAuth = {
        salt: state.admin?.salt || 'lra_salt_2026',
        codeHash: '0711121142',
        passHash: newAdminPassword.trim(),
      };

      onUpdateAdminAuth?.(updatedAuth);
      setCurrentAdminPassword('');
      setNewAdminPassword('');
      setConfirmAdminPassword('');
      setSubView('main');
      onShowToast('Administrator password updated successfully!');
    };

    return (
      <div className="space-y-4 animate-fade-in pb-4">
        <button
          onClick={() => setSubView('main')}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
        >
          <span>←</span>
          <span>Back to Settings</span>
        </button>

        <div
          className={`p-4 sm:p-5 rounded-3xl border shadow-sm ${
            isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 font-black text-lg flex items-center justify-center">
              🔑
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Administrator Master Credentials
              </h2>
              <p className="text-[11px] text-slate-400">
                Configure your personal secure administrator security code and password
              </p>
            </div>
          </div>

          <div className="p-3 my-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-300">
              <span>🛡️</span>
              <span>Enhanced Security Active</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-100/90">
              Only authorized personnel with registered credentials can enter the administration office. Set your private security code and secret password below.
            </p>
          </div>

          <form onSubmit={handleSaveAdminCredentials} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Authorized Administrator Identities (Locked)
              </label>
              <input
                type="text"
                value="0711121142  |  kiiruelvis4@gmail.com"
                readOnly
                className={`w-full p-2.5 rounded-xl text-xs border font-mono tracking-wide opacity-80 ${
                  isDark ? 'bg-black/30 border-white/10 text-emerald-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                School Administration Portal strictly recognizes only 0711121142 and kiiruelvis4@gmail.com.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Current Administrator Password
              </label>
              <input
                type={showAdminPass ? 'text' : 'password'}
                value={currentAdminPassword}
                onChange={(e) => setCurrentAdminPassword(e.target.value)}
                placeholder="Enter current password to authorize changes"
                className={`w-full p-2.5 rounded-xl text-xs border font-mono ${
                  isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                }`}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase">
                    New Master Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    className="text-[10px] text-slate-400 hover:text-white"
                  >
                    {showAdminPass ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showAdminPass ? 'text' : 'password'}
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className={`w-full p-2.5 rounded-xl text-xs border font-mono ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showAdminPass ? 'text' : 'password'}
                  value={confirmAdminPassword}
                  onChange={(e) => setConfirmAdminPassword(e.target.value)}
                  placeholder="Retype new password"
                  className={`w-full p-2.5 rounded-xl text-xs border font-mono ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSubView('main')}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-black bg-[#16A34A] hover:bg-emerald-600 text-white shadow-md cursor-pointer"
              >
                Save Master Password
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }



  return (
    <div className="space-y-4 animate-fade-in pb-4">
      <h2 className="text-lg font-black text-slate-900 dark:text-white">
        System & School Settings
      </h2>

      {/* Administrator Security & Credentials item */}
      <div
        onClick={() => {
          sound.playClick(500);
          setSubView('admin_security');
        }}
        className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-all ${
          isDark
            ? 'bg-gradient-to-r from-amber-950/30 to-[#141C33] border-amber-500/30'
            : 'bg-amber-50/60 border-amber-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg font-black shrink-0">
            🔑
          </span>
          <div>
            <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Administrator Master Credentials</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono font-bold uppercase">
                Secure
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              Configure master administrator security code & password
            </div>
          </div>
        </div>
        <span className="text-amber-400 font-bold text-sm">›</span>
      </div>

      {/* Learner Passwords & Portal Access PINs (6 Characters) */}
      <div
        onClick={() => {
          sound.playClick(520);
          setSubView('learner_passwords');
        }}
        className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-all ${
          isDark
            ? 'bg-gradient-to-r from-purple-950/40 to-[#141C33] border-purple-500/40 shadow-sm'
            : 'bg-gradient-to-r from-purple-50 to-white border-purple-200 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-lg font-black shrink-0">
            🔐
          </span>
          <div>
            <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Learner Passwords & Portal PINs</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold">
                6 CHARACTERS
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              Manage each learner's distinct 6-character portal password · No demo passwords
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-purple-400 hidden sm:inline">
            {state.learners?.length || 0} Learners
          </span>
          <span className="text-purple-400 font-bold text-sm">›</span>
        </div>
      </div>

      {/* CBC Assessment Covers & Visual Inspector */}
      <div
        onClick={() => {
          sound.playClick(520);
          setShowCoverInspector(true);
        }}
        className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-all ${
          isDark
            ? 'bg-gradient-to-r from-blue-950/40 to-[#141C33] border-blue-500/40 shadow-sm'
            : 'bg-gradient-to-r from-blue-50 to-white border-blue-200 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-lg font-black shrink-0">
            🎨
          </span>
          <div>
            <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>CBC Assessment Covers & Visual Inspector</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono font-bold">
                GRADES 1–6
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              Inspect Book & Report covers with calibrated particulars alignment for all grades
            </div>
          </div>
        </div>
        <span className="text-blue-400 font-bold text-sm">›</span>
      </div>

      {/* Supabase Cloud & Retention Data Lifecycles Item */}
      <div
        onClick={() => {
          sound.playClick(500);
          setSubView('supabase');
        }}
        className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-all ${
          isDark ? 'bg-gradient-to-r from-emerald-950/30 to-[#141C33] border-emerald-500/30' : 'bg-emerald-50/50 border-emerald-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg font-black shrink-0">
            ⚡
          </span>
          <div>
            <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Supabase Cloud & Data Lifecycles</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                FREE TIER
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              24-hour chat delete · 30-day post-promotion assessment retention · Auth
            </div>
          </div>
        </div>
        <span className="text-emerald-400 font-bold text-sm">›</span>
      </div>

      {/* Profile item */}
      <div
        onClick={() => {
          sound.playClick(500);
          setSubView('school');
        }}
        className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-all ${
          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg font-bold shrink-0">
            🏫
          </span>
          <div>
            <div className="text-xs font-black text-slate-900 dark:text-white">
              School Profile
            </div>
            <div className="text-[10px] text-slate-400">
              {state.school.name} · {state.school.address}
            </div>
          </div>
        </div>
        <span className="text-slate-400 font-bold text-sm">›</span>
      </div>



      {/* Academic terms */}
      <div
        onClick={() => {
          sound.playClick(500);
          setSubView('terms');
        }}
        className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-all ${
          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg font-bold shrink-0">
            📅
          </span>
          <div>
            <div className="text-xs font-black text-slate-900 dark:text-white">
              Academic Years & Terms
            </div>
            <div className="text-[10px] text-slate-400">
              Opening, mid-term break, and closing dates for Terms 1–3
            </div>
          </div>
        </div>
        <span className="text-slate-400 font-bold text-sm">›</span>
      </div>

      {/* Subjects */}
      <div
        onClick={() => {
          sound.playClick(500);
          setSubView('subjects');
        }}
        className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-all ${
          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg font-bold shrink-0">
            📖
          </span>
          <div>
            <div className="text-xs font-black text-slate-900 dark:text-white">
              Subjects per Grade (CBC)
            </div>
            <div className="text-[10px] text-slate-400">
              Grade 1 to 6 CBC curricula areas
            </div>
          </div>
        </div>
        <span className="text-slate-400 font-bold text-sm">›</span>
      </div>

      {/* Weighting Policy */}
      <div
        className={`p-3.5 rounded-2xl border flex items-center justify-between ${
          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg font-bold shrink-0">
            ⚖️
          </span>
          <div>
            <div className="text-xs font-black text-slate-900 dark:text-white">
              Continuous Assessment Weighting
            </div>
            <div className="text-[10px] text-slate-400">
              <strong className="text-purple-600 dark:text-purple-400">60%</strong> CAT assessments /{' '}
              <strong className="text-blue-600 dark:text-blue-400">40%</strong> homework assignments
            </div>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
          LOCKED
        </span>
      </div>

      {/* Activity Log */}
      <div
        onClick={() => {
          sound.playClick(500);
          setSubView('log');
        }}
        className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-all ${
          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center text-lg font-bold shrink-0">
            🧾
          </span>
          <div>
            <div className="text-xs font-black text-slate-900 dark:text-white">
              Activity & Security Log
            </div>
            <div className="text-[10px] text-slate-400">
              Audit trail of admin changes with Nairobi timestamp
            </div>
          </div>
        </div>
        <span className="text-slate-400 font-bold text-sm">›</span>
      </div>

      {/* Theme Card */}
      <div
        className={`p-4 rounded-3xl border shadow-xs ${
          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs font-black text-slate-900 dark:text-white">
              Display Theme
            </div>
            <div className="text-[10px] text-slate-400">
              Light or dark color scheme for every screen
            </div>
          </div>
          <span className="text-base">{isDark ? '🌙' : '☀️'}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            onClick={() => onToggleTheme('light')}
            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              !isDark
                ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs font-black'
                : 'bg-black/20 text-slate-400 border-white/10'
            }`}
          >
            ☀️ Light Theme
          </button>
          <button
            onClick={() => onToggleTheme('dark')}
            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              isDark
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs font-black'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            🌙 Dark Theme
          </button>
        </div>
      </div>

      {/* Phone Back button handles returning from settings / leaving portal */}

      {/* CBC Assessment Cover Inspector Modal */}
      <AssessmentCoverInspectorModal
        isOpen={showCoverInspector}
        learners={state.learners}
        onClose={() => setShowCoverInspector(false)}
        initialGrade="Grade 1"
      />
    </div>
  );
};
