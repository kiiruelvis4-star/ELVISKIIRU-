import React, { useState, useEffect } from 'react';
import { PortalConfig, PortalId } from '../types';
import { PORTALS } from '../data/portalData';
import { sound } from '../utils/sound';
import {
  authenticatePortalUser,
  updateTemporaryPassword,
  isSupabaseConfigured,
  AuthResult,
} from '../supabaseClient';
import { pushSchoolStateToCloud, pullSchoolStateFromCloud } from '../utils/cloudSync';
import { INITIAL_ADMIN_STATE } from './admin/initialData';
import { AdminState, GradeName, PasswordChangeRequest } from './admin/types';
import {
  EnrolledBiometric,
  getActiveBiometricForPortal,
  getAllEnrolledForPortal,
  setActiveBiometric,
  removeEnrolledBiometric,
  resolvePersonProfile,
} from '../utils/biometrics';
import { BiometricScannerModal } from './BiometricScannerModal';
import { useBackHandler } from '../utils/navigationHistory';
import {
  Fingerprint,
  UserCheck,
  ShieldCheck,
  Sparkles,
  KeyRound,
  Trash2,
  Users,
  ChevronDown,
} from 'lucide-react';

interface PortalLoginModalProps {
  portal: PortalConfig;
  onClose: () => void;
  onSelectPortal: (portal: PortalConfig) => void;
  onShowToast: (msg: string) => void;
  onEnterPortal?: (portalId: PortalId, sessionUser?: any) => void;
}

export const PortalLoginModal: React.FC<PortalLoginModalProps> = ({
  portal,
  onClose,
  onSelectPortal,
  onShowToast,
  onEnterPortal,
}) => {
  // Security: Inputs must start completely empty without any auto-fill
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [authResult, setAuthResult] = useState<AuthResult | null>(null);
  const [authenticatedPerson, setAuthenticatedPerson] = useState<EnrolledBiometric | null>(null);

  // Biometrics state
  const [activeBiometric, setActiveBiometricState] = useState<EnrolledBiometric | null>(null);
  const [allPortalBiometrics, setAllPortalBiometrics] = useState<EnrolledBiometric[]>([]);
  const [loginMode, setLoginMode] = useState<'biometric' | 'password'>('biometric');
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerMode, setScannerMode] = useState<'enroll' | 'authenticate'>('authenticate');
  const [pendingEnrollProfile, setPendingEnrollProfile] = useState<EnrolledBiometric | null>(null);
  const [showEnrollPrompt, setShowEnrollPrompt] = useState(false);
  const [showSwitchUserDropdown, setShowSwitchUserDropdown] = useState(false);

  // Temporary password change step
  const [isChangingTempPassword, setIsChangingTempPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSubmittingNewPassword, setIsSubmittingNewPassword] = useState(false);

  // User Password Change Request state
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const [resetName, setResetName] = useState('');
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetReason, setResetReason] = useState('Forgotten existing password / PIN');
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // --- PHONE BACK BUTTON INTEGRATION FOR LOGIN MODAL & SUB-VIEWS ---
  // 1. Biometric scanner modal (priority 48)
  useBackHandler(
    () => {
      sound.playClick(400);
      setShowScannerModal(false);
      return true;
    },
    showScannerModal,
    48,
    'login_scanner_modal'
  );

  // 2. Biometric enroll prompt (priority 46)
  useBackHandler(
    () => {
      sound.playClick(400);
      setShowEnrollPrompt(false);
      return true;
    },
    showEnrollPrompt,
    46,
    'login_enroll_prompt'
  );

  // 3. User switcher dropdown (priority 44)
  useBackHandler(
    () => {
      sound.playClick(400);
      setShowSwitchUserDropdown(false);
      return true;
    },
    showSwitchUserDropdown,
    44,
    'login_switch_dropdown'
  );

  // 4. Password reset form (priority 42)
  useBackHandler(
    () => {
      sound.playClick(400);
      setIsRequestingReset(false);
      return true;
    },
    isRequestingReset,
    42,
    'login_reset_form'
  );

  // 5. Change temporary password screen (priority 42)
  useBackHandler(
    () => {
      sound.playClick(400);
      setIsChangingTempPassword(false);
      return true;
    },
    isChangingTempPassword,
    42,
    'login_temp_pw_screen'
  );

  // 6. Authenticated success splash screen (priority 40)
  useBackHandler(
    () => {
      sound.playClick(400);
      setAuthSuccess(false);
      return true;
    },
    authSuccess,
    40,
    'login_auth_success'
  );

  // 7. Base Portal Login Modal dismissal (priority 30)
  useBackHandler(
    () => {
      sound.playClick(400);
      onClose();
      return true;
    },
    !showScannerModal &&
      !showEnrollPrompt &&
      !showSwitchUserDropdown &&
      !isRequestingReset &&
      !isChangingTempPassword &&
      !authSuccess,
    30,
    'login_modal_base'
  );

  const c = portal.accentColor;
  const isCloudSupabase = isSupabaseConfigured();

  // Load latest school records from local storage for offline validation
  const getLocalState = (): AdminState => {
    try {
      const stored = localStorage.getItem('lra_admin_v3');
      if (stored) {
        return { ...INITIAL_ADMIN_STATE, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to parse local storage for auth:', e);
    }
    return INITIAL_ADMIN_STATE;
  };

  const refreshBiometrics = () => {
    const active = getActiveBiometricForPortal(portal.id);
    const all = getAllEnrolledForPortal(portal.id);
    setActiveBiometricState(active);
    setAllPortalBiometrics(all);
    if (active) {
      setLoginMode('biometric');
    } else {
      setLoginMode('password');
    }
  };

  useEffect(() => {
    refreshBiometrics();
    setShowEnrollPrompt(false);
    setPendingEnrollProfile(null);
    setAuthenticatedPerson(null);
    setShowSwitchUserDropdown(false);
    pullSchoolStateFromCloud().catch(() => {});
  }, [portal.id]);

  const handleSwitchTab = (newPortal: PortalConfig) => {
    sound.playClick(500);
    // Security: Clear all credentials when switching portal contexts
    setCredential('');
    setPassword('');
    setAuthSuccess(false);
    setAuthResult(null);
    setAuthenticatedPerson(null);
    setShowEnrollPrompt(false);
    setPendingEnrollProfile(null);
    setIsChangingTempPassword(false);
    setIsRequestingReset(false);
    setShowSwitchUserDropdown(false);
    onSelectPortal(newPortal);
  };

  const buildSessionObject = (person?: EnrolledBiometric | null, userResult?: any) => {
    const defaultName =
      portal.id === 'admin'
        ? 'School Administrator'
        : portal.id === 'staff'
        ? 'Teacher'
        : portal.id === 'parents'
        ? 'Parent / Guardian'
        : 'Learner';

    const bioExtractedId = person?.id?.match(/^BIO-(?:STAFF|PARENT|LEARNER)-(.+)-\d+$/)?.[1];
    const canonicalId =
      userResult?.id ||
      person?.entityId ||
      bioExtractedId ||
      (person?.id && !person.id.startsWith('BIO-') ? person.id : undefined) ||
      credential;

    const sessionObj = {
      portalId: portal.id,
      id: canonicalId,
      name: userResult?.displayName || person?.name || defaultName,
      identifier: person?.identifier || userResult?.phone || userResult?.adm || credential,
      role: portal.id,
      portalRole: userResult?.portalRole || portal.id,
      phone: userResult?.phone,
      grades: userResult?.grades,
      subjects: userResult?.subjects,
      gradeSubjects: userResult?.gradeSubjects,
      adm: userResult?.adm,
      grade: userResult?.grade,
      stream: userResult?.stream,
      linkedLearners: userResult?.linkedLearners,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem('lra_session_user', JSON.stringify(sessionObj));
    } catch (e) {
      console.warn('Failed to save session user:', e);
    }
    return sessionObj;
  };

  const handleBiometricAuthSuccess = (person: EnrolledBiometric) => {
    setShowScannerModal(false);
    if (portal.id === 'admin') {
      const digits = (person.identifier || '').replace(/\D/g, '');
      const cleanId = (person.identifier || '').trim().toLowerCase();
      const isAllowedAdmin =
        (digits.length >= 9 && digits.slice(-9) === '711121142') ||
        cleanId === 'kiiruelvis4@gmail.com';
      if (!isAllowedAdmin) {
        onShowToast('Access denied. Admin only recognizes 0711121142 or kiiruelvis4@gmail.com.');
        setLoginMode('password');
        return;
      }
    }
    setAuthenticatedPerson(person);
    setCredential(person.identifier);
    buildSessionObject(person);
    setAuthSuccess(true);
    sound.playBiometricSuccess();
    onShowToast(`Fingerprint verified for ${person.name}`);
  };

  const handleStartBiometricAuth = () => {
    if (!activeBiometric) return;
    sound.playClick(600);
    setScannerMode('authenticate');
    setShowScannerModal(true);
  };

  const handleStartEnrollment = () => {
    if (!pendingEnrollProfile) return;
    sound.playClick(600);
    setScannerMode('enroll');
    setShowScannerModal(true);
  };

  const handleBiometricEnrollSuccess = (enrolled: EnrolledBiometric) => {
    setShowScannerModal(false);
    setShowEnrollPrompt(false);
    refreshBiometrics();
    setAuthenticatedPerson(enrolled);
    buildSessionObject(enrolled);
    setAuthSuccess(true);
    sound.playBiometricSuccess();
    onShowToast(`Fingerprint enrolled & verified for ${enrolled.name}`);
  };

  const handleSkipEnrollment = () => {
    sound.playClick(450);
    setShowEnrollPrompt(false);
    if (pendingEnrollProfile) {
      buildSessionObject(pendingEnrollProfile, authResult?.user);
    }
    setAuthSuccess(true);
    sound.playCompleteChime();
    onShowToast(`Welcome to ${portal.name}`);
  };

  const handleRemoveBiometric = (id: string, name: string) => {
    sound.playClick(400);
    removeEnrolledBiometric(id);
    refreshBiometrics();
    onShowToast(`Removed saved fingerprint for ${name}`);
  };

  const handleSelectActiveBiometric = (bio: EnrolledBiometric) => {
    sound.playClick(500);
    setActiveBiometric(portal.id, bio.id);
    setActiveBiometricState(bio);
    setShowSwitchUserDropdown(false);
    onShowToast(`Active profile set to ${bio.name}`);
  };

  const handleSendResetRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetName.trim() || !resetIdentifier.trim()) {
      onShowToast('Please provide your name and registered mobile or admission number');
      return;
    }

    setIsSubmittingReset(true);
    sound.playCompleteChime();

    const id = 'REQ-' + Math.floor(1000 + Math.random() * 9000);
    const nowStamp = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
    const userTypeMap: Record<string, PasswordChangeRequest['userType']> = {
      staff: 'teacher',
      parents: 'family',
      learners: 'learner',
      admin: 'staff',
    };

    const newReq: PasswordChangeRequest = {
      id,
      userType: userTypeMap[portal.id] || 'staff',
      name: resetName.trim(),
      identifier: resetIdentifier.trim(),
      reason: resetReason,
      urgency: 'normal',
      requestedAt: nowStamp,
      status: 'pending',
    };

    try {
      const raw = localStorage.getItem('lra_admin_v3');
      const parsed = raw ? JSON.parse(raw) : INITIAL_ADMIN_STATE;
      const reqs = parsed.passwordRequests || [];
      parsed.passwordRequests = [newReq, ...reqs];
      localStorage.setItem('lra_admin_v3', JSON.stringify(parsed));
      pushSchoolStateToCloud({ adminState: { passwordRequests: parsed.passwordRequests } }).catch(console.warn);
    } catch (err) {
      console.warn('Failed to queue password request locally:', err);
    }

    setIsSubmittingReset(false);
    setIsRequestingReset(false);
    setResetName('');
    setResetIdentifier('');
    onShowToast(`Password Change Request ${id} submitted to Administrator queue.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick(700);

    if (!credential) {
      onShowToast(`Please enter your ${portal.securityPrompt.split('+')[0]}`);
      return;
    }

    if (!password) {
      onShowToast(`Please enter your password or PIN`);
      return;
    }

    setIsLoading(true);

    try {
      const localState = getLocalState();
      const result = await authenticatePortalUser(
        portal.id,
        credential,
        password,
        localState
      );

      setIsLoading(false);

      if (result.success) {
        setAuthResult(result);
        await pullSchoolStateFromCloud().catch(() => {});
        const latestState = getLocalState();
        if (portal.id === 'staff' && result.user?.id) {
          const exists = latestState.teachers.some((t) => t.id === result.user?.id);
          if (!exists) {
            latestState.teachers = [
              ...latestState.teachers,
              {
                id: result.user.id,
                name: result.user.displayName || 'Teacher',
                phone: result.user.phone || credential.trim(),
                subjects: Array.isArray(result.user.subjects) ? result.user.subjects : [],
                grades: Array.isArray(result.user.grades) ? (result.user.grades as GradeName[]) : [],
                gradeSubjects: (result.user.gradeSubjects || {}) as Partial<Record<GradeName, string[]>>,
                color: '#2F6BFF',
                photo: null,
                files: {},
                mustChangePw: !!result.mustChangePassword,
              },
            ];
            try {
              localStorage.setItem('lra_admin_v3', JSON.stringify(latestState));
            } catch {
              // ignore storage errors
            }
          }
        }
        const resolvedPerson = resolvePersonProfile(portal.id, credential, latestState);
        setAuthenticatedPerson(resolvedPerson);

        // Check if user has temporary password (requires immediate change per LRA spec)
        if (result.mustChangePassword) {
          setIsChangingTempPassword(true);
          sound.playClick(550);
          onShowToast('Temporary password detected. Please set your permanent secret password.');
        } else {
          // Check if this specific person has already enrolled their fingerprint
          const currentEnrolled = getAllEnrolledForPortal(portal.id);
          const isAlreadyEnrolled = currentEnrolled.some(
            (b) =>
              b.identifier.replace(/\D/g, '') === credential.replace(/\D/g, '') ||
              b.identifier.toUpperCase() === credential.toUpperCase()
          );

          buildSessionObject(resolvedPerson, result.user);
          if (resolvedPerson && !isAlreadyEnrolled) {
            // First time password login: Prompt user to enroll fingerprint for their profile!
            setPendingEnrollProfile(resolvedPerson);
            setShowEnrollPrompt(true);
            sound.playCompleteChime();
          } else {
            setAuthSuccess(true);
            sound.playCompleteChime();
            onShowToast(`Welcome to ${portal.name} (Supabase Auth Verified)`);
          }
        }
      } else {
        sound.playClick(350);
        onShowToast(result.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      onShowToast(err.message || 'Authentication error occurred');
    }
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick(600);

    if (!newPassword || newPassword.length < 4) {
      onShowToast('New password must be at least 4 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      onShowToast('Passwords do not match. Please retype carefully.');
      return;
    }

    setIsSubmittingNewPassword(true);

    try {
      const resp = await updateTemporaryPassword(portal.id, credential, newPassword);

      // Update in local state & cloud as well to clear temporary password flag and store permanent passHash
      try {
        const local = getLocalState();
        const norm = (p?: string) => {
          const d = (p || '').replace(/\D/g, '');
          return d.length >= 9 ? d.slice(-9) : d;
        };
        const cleanCred9 = norm(credential);
        const cleanNewPass = newPassword.trim();
        if (portal.id === 'staff') {
          local.teachers = local.teachers.map((t) =>
            norm(t.phone) === cleanCred9 ? { ...t, mustChangePw: false, passHash: cleanNewPass } : t
          );
        } else if (portal.id === 'parents') {
          local.families = local.families.map((f) => {
            const matchAny =
              norm(f.phone) === cleanCred9 ||
              norm(f.secondaryPhone) === cleanCred9 ||
              norm(f.fatherPhone) === cleanCred9 ||
              norm(f.motherPhone) === cleanCred9;
            return matchAny ? { ...f, passwordReset: false, passHash: cleanNewPass } : f;
          });
        }
        localStorage.setItem('lra_admin_v3', JSON.stringify(local));
        pushSchoolStateToCloud({ adminState: local, replaceLists: true }).catch(console.warn);
      } catch (err) {
        console.warn('Could not persist updated password state locally:', err);
      }

      setIsSubmittingNewPassword(false);
      setIsChangingTempPassword(false);
      setAuthSuccess(true);
      sound.playCompleteChime();
      onShowToast(resp.message);
    } catch (err: any) {
      setIsSubmittingNewPassword(false);
      onShowToast(err.message || 'Failed to update temporary password');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-[28px] sm:rounded-3xl border border-white/20 p-5 sm:p-6 text-white shadow-2xl transition-all"
        style={{
          background: 'linear-gradient(180deg, #112240 0%, #0A192F 100%)',
          boxShadow: `0 0 35px color-mix(in srgb, ${c} 25%, transparent), 0 20px 25px -5px rgba(0,0,0,0.7)`,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Mobile Pull Indicator */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-black border"
              style={{
                borderColor: c,
                color: c,
                backgroundColor: `color-mix(in srgb, ${c} 15%, transparent)`,
              }}
            >
              {portal.id === 'admin' ? '🛡️' : portal.id === 'staff' ? '👨‍🏫' : portal.id === 'parents' ? '👨‍👩‍👧' : '🎓'}
            </div>
            <div>
              <span
                className="text-[10px] font-bold uppercase tracking-wider block"
                style={{ color: c }}
              >
                {portal.roleBadge}
              </span>
              <h2 id="modal-title" className="text-base sm:text-lg font-extrabold text-white leading-tight">
                {portal.name}
              </h2>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => {
              sound.playClick(400);
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Supabase Status Pill */}
        <div className="mb-4 flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-slate-200">Supabase Auth</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
              Free Tier
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            {isCloudSupabase ? '☁️ Cloud Connected' : '🔒 Offline Vault Active'}
          </span>
        </div>

        {/* Portal Switcher Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-black/40 rounded-xl mb-5 border border-white/10 text-xs">
          {PORTALS.map((p) => {
            const isCurrent = p.id === portal.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSwitchTab(p)}
                className={`py-1.5 px-1 rounded-lg font-bold text-[11px] truncate transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                style={{
                  borderBottom: isCurrent ? `2px solid ${p.accentColor}` : 'none',
                }}
              >
                {p.shortTitle}
              </button>
            );
          })}
        </div>

        {/* State 1: Temporary Password Reset Required */}
        {isChangingTempPassword ? (
          <form onSubmit={handleSaveNewPassword} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs space-y-1">
              <div className="font-black flex items-center gap-1.5 text-amber-300">
                <span>🔐</span>
                <span>Mandatory Temporary Password Change</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-100/90">
                School policy specifies that temporary passwords set by administration must be changed at your first sign-in. Your new password will be stored securely with cryptographic hashing and will never be displayed to anyone.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  New Permanent Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
                >
                  {showNewPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new secret password"
                className="w-full bg-black/40 border border-white/20 focus:border-white rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-white/40 font-mono tracking-wider"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                Confirm Permanent Password
              </label>
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retype new password"
                className="w-full bg-black/40 border border-white/20 focus:border-white rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-white/40 font-mono tracking-wider"
                required
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsChangingTempPassword(false)}
                className="flex-1 py-2.5 px-3 text-xs font-bold rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmittingNewPassword}
                className="flex-1 py-2.5 px-3 text-xs font-black rounded-xl bg-[#22C55E] hover:bg-emerald-600 text-white shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSubmittingNewPassword ? (
                  <span>Securing...</span>
                ) : (
                  <>
                    <span>Save & Sign In</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : isRequestingReset ? (
          /* State 1b: Submit Password / PIN Reset Request to Admin */
          <form onSubmit={handleSendResetRequest} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[#0F2850]/70 border border-[#2F6BFF]/40 text-blue-100 text-xs space-y-1.5">
              <div className="font-black flex items-center gap-1.5 text-white">
                <span>🔐</span>
                <span>Submit Password Change Request ({portal.shortTitle})</span>
              </div>
              <p className="text-[11px] leading-relaxed text-blue-200/90">
                Submit an official reset request to the Little Roses Academy administration. Upon verification, the administrator will approve your request and issue a temporary credential.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                Your Full Official Name
              </label>
              <input
                type="text"
                value={resetName}
                onChange={(e) => setResetName(e.target.value)}
                placeholder="e.g. Mdm. Mary Atieno or John Kamau"
                autoComplete="off"
                className="w-full bg-black/40 border border-white/20 focus:border-white rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-white/40 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                {portal.id === 'learners' ? 'Student Admission Number' : 'Registered Mobile Number'}
              </label>
              <input
                type="text"
                value={resetIdentifier}
                onChange={(e) => setResetIdentifier(e.target.value)}
                placeholder={portal.credentialPlaceholder}
                autoComplete="off"
                className="w-full bg-black/40 border border-white/20 focus:border-white rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-white/40 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                Reason for Request
              </label>
              <select
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                className="w-full bg-black/60 border border-white/20 focus:border-white rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/40"
              >
                <option value="Forgotten existing password / PIN">Forgotten existing password / PIN</option>
                <option value="Temporary password expired">Temporary password expired</option>
                <option value="New device / phone number update">New device / phone number update</option>
                <option value="Security precaution / compromised">Security precaution / compromised</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRequestingReset(false)}
                className="flex-1 py-2.5 px-3 text-xs font-bold rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingReset}
                className="flex-1 py-2.5 px-3 text-xs font-black rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSubmittingReset ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <span>Queue Request</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : showEnrollPrompt && pendingEnrollProfile ? (
          /* State 1c: Post-Password Biometric Enrollment Offer */
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0F2850]/90 to-[#0A192F] border border-amber-500/40 text-xs space-y-2 shadow-lg">
              <div className="flex items-center gap-2 text-amber-300 font-extrabold text-sm">
                <Sparkles className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                <span>Enable Fingerprint for Fast Login?</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-200">
                First-time password authentication successful for <strong className="text-white">{pendingEnrollProfile.name}</strong>.
                You can now register your fingerprint on this device for one-touch login without having to type your password each time.
              </p>
            </div>

            {/* Person profile being enrolled */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-black shrink-0 border"
                style={{
                  backgroundColor: `color-mix(in srgb, ${pendingEnrollProfile.themeColor} 20%, transparent)`,
                  borderColor: pendingEnrollProfile.themeColor,
                  color: pendingEnrollProfile.themeColor,
                }}
              >
                {pendingEnrollProfile.avatarInitial || 'LR'}
              </div>
              <div className="min-w-0 flex-1">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider block"
                  style={{ color: pendingEnrollProfile.themeColor }}
                >
                  {pendingEnrollProfile.roleLabel}
                </span>
                <h4 className="text-sm font-extrabold text-white truncate">
                  {pendingEnrollProfile.name}
                </h4>
                <p className="text-[11px] text-slate-400 truncate">
                  {pendingEnrollProfile.subDetails}
                </p>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 bg-black/40 rounded-xl p-2.5 border border-white/10 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Biometric Hardware Protection</span>
              </div>
              <p className="text-slate-400 leading-snug">
                Biometric data is securely bound to your specific profile and encrypted locally on this device.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={handleStartEnrollment}
                className="w-full py-3 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider text-slate-950 shadow-xl cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                style={{ backgroundColor: '#F5B301' }}
              >
                <Fingerprint className="w-4 h-4 text-slate-950" />
                <span>Touch Sensor to Enroll Fingerprint</span>
              </button>

              <button
                type="button"
                onClick={handleSkipEnrollment}
                className="w-full py-2.5 px-3 text-xs font-bold rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
              >
                Skip for Now & Enter Portal
              </button>
            </div>
          </div>
        ) : authSuccess ? (
          /* State 2: Success Preview State with Full Person Profile Reader */
          <div className="text-center py-4 px-2 space-y-4 animate-fade-in">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-500 rounded-full flex items-center justify-center text-2xl mx-auto shadow-[0_0_25px_rgba(16,185,129,0.35)]">
              ✓
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block mb-0.5">
                Authentication Verified
              </span>
              <h3 className="text-base sm:text-lg font-black text-white">
                {authenticatedPerson ? authenticatedPerson.name : 'Welcome to Little Roses Academy'}
              </h3>
              <p className="text-xs text-slate-300">
                {authenticatedPerson ? authenticatedPerson.roleLabel : `Signed in with ${credential}`}
              </p>
            </div>

            {/* Read Person Information Details Card */}
            {authenticatedPerson && (
              <div className="text-left bg-black/40 rounded-2xl p-3.5 border border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>School Records Profile</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    Authenticated
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                  {authenticatedPerson.metaList.map((meta, i) => (
                    <div key={i} className="flex items-start justify-between gap-2">
                      <span className="text-slate-400 shrink-0">{meta.label}:</span>
                      <span className="text-white font-semibold text-right truncate">
                        {meta.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-left bg-white/5 rounded-xl p-3 border border-white/10 space-y-1.5 text-xs">
              <div className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                Authorized Capabilities:
              </div>
              {portal.features.slice(0, 3).map((feat, i) => (
                <div key={i} className="flex items-center gap-2 text-slate-200 text-[11px]">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem('lra_session_user');
                  } catch {
                    // ignore
                  }
                  setAuthSuccess(false);
                  sound.playClick(500);
                }}
                className="flex-1 py-2 px-3 text-xs font-bold rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white cursor-pointer"
              >
                Sign Out
              </button>
              {portal.id === 'admin' ? (
                <button
                  onClick={() => {
                    const session = buildSessionObject(authenticatedPerson, authResult?.user);
                    onClose();
                    onEnterPortal?.('admin', session);
                  }}
                  className="flex-1 py-2 px-3 text-xs font-black rounded-xl bg-[#22C55E] text-white hover:bg-emerald-600 shadow-md cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>Enter Office</span>
                  <span>→</span>
                </button>
              ) : portal.id === 'staff' ? (
                <button
                  onClick={() => {
                    const session = buildSessionObject(authenticatedPerson, authResult?.user);
                    onClose();
                    onEnterPortal?.('staff', session);
                  }}
                  className="flex-1 py-2 px-3 text-xs font-black rounded-xl bg-[#3B82F6] text-white hover:bg-blue-600 shadow-md cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>Enter Teachers Portal</span>
                  <span>→</span>
                </button>
              ) : portal.id === 'learners' ? (
                <button
                  onClick={() => {
                    const session = buildSessionObject(authenticatedPerson, authResult?.user);
                    onClose();
                    onEnterPortal?.('learners', session);
                  }}
                  className="flex-1 py-2 px-3 text-xs font-black rounded-xl bg-[#7C3AED] text-white hover:bg-purple-600 shadow-md cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>Enter Learners Portal</span>
                  <span>→</span>
                </button>
              ) : portal.id === 'parents' ? (
                <button
                  onClick={() => {
                    const session = buildSessionObject(authenticatedPerson, authResult?.user);
                    onClose();
                    onEnterPortal?.('parents', session);
                  }}
                  className="flex-1 py-2 px-3 text-xs font-black rounded-xl bg-[#2F6BFF] text-white hover:bg-blue-600 shadow-md cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>Enter Parents Portal</span>
                  <span>→</span>
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-[#F5B301] text-[#0A192F] hover:bg-[#F5D27A] cursor-pointer"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        ) : (
          /* State 3: Primary Login (Supports Biometric Fast Login or Password/PIN) */
          <div className="space-y-4">
            {/* If biometric is enrolled for this portal, offer tab toggle between Fingerprint and Password */}
            {activeBiometric && (
              <div className="flex rounded-xl bg-black/50 p-1 border border-white/15 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(500);
                    setLoginMode('biometric');
                  }}
                  className={`flex-1 py-2 px-2 rounded-lg font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    loginMode === 'biometric'
                      ? 'bg-[#F5B301] text-slate-950 shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                  <span>Fingerprint Login</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(500);
                    setLoginMode('password');
                  }}
                  className={`flex-1 py-2 px-2 rounded-lg font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    loginMode === 'password'
                      ? 'bg-white/20 text-white shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Password / PIN</span>
                </button>
              </div>
            )}

            {loginMode === 'biometric' && activeBiometric ? (
              /* Sub-State 3a: Biometric Touch ID Quick Access Card */
              <div className="space-y-4 animate-fade-in">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Touch ID / Fingerprint sensor is active for this device. Place your enrolled finger on the scanner to sign in directly.
                </p>

                {/* Enrolled Person Badge */}
                <div
                  className="p-4 rounded-2xl border text-xs relative overflow-hidden"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderColor: `color-mix(in srgb, ${activeBiometric.themeColor} 40%, rgba(255,255,255,0.15))`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-black shrink-0 border shadow-inner"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${activeBiometric.themeColor} 20%, transparent)`,
                          borderColor: activeBiometric.themeColor,
                          color: activeBiometric.themeColor,
                        }}
                      >
                        {activeBiometric.avatarInitial || 'LR'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${activeBiometric.themeColor} 25%, transparent)`,
                              color: activeBiometric.themeColor,
                            }}
                          >
                            {activeBiometric.roleLabel}
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-white leading-snug mt-0.5">
                          {activeBiometric.name}
                        </h4>
                        <p className="text-[11px] text-slate-300 truncate max-w-[210px]">
                          {activeBiometric.subDetails}
                        </p>
                      </div>
                    </div>

                    {/* Switch user selector if multiple are enrolled */}
                    {allPortalBiometrics.length > 1 && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowSwitchUserDropdown(!showSwitchUserDropdown)}
                          className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Users className="w-3 h-3" />
                          <span>Switch</span>
                          <ChevronDown className="w-2.5 h-2.5" />
                        </button>

                        {showSwitchUserDropdown && (
                          <div className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-[#0A192F] border border-white/20 shadow-2xl p-1 z-30">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 block">
                              Enrolled {portal.shortTitle} Profiles:
                            </span>
                            {allPortalBiometrics.map((b) => (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => handleSelectActiveBiometric(b)}
                                className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] truncate flex items-center justify-between cursor-pointer ${
                                  b.id === activeBiometric.id
                                    ? 'bg-white/20 text-white font-bold'
                                    : 'text-slate-300 hover:bg-white/10'
                                }`}
                              >
                                <span className="truncate">{b.name}</span>
                                {b.id === activeBiometric.id && <span>✓</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Registered Metadata Snapshot */}
                  <div className="bg-black/40 rounded-xl p-2.5 border border-white/10 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Registered Identifier:</span>
                      <span className="text-white font-mono font-bold">{activeBiometric.identifier}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Sensor Hardware:</span>
                      <span className="text-emerald-400 font-semibold">{activeBiometric.deviceName}</span>
                    </div>
                  </div>
                </div>

                {/* Primary Touch to Sign In Action */}
                <button
                  type="button"
                  onClick={handleStartBiometricAuth}
                  className="w-full py-3.5 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2.5 shadow-xl cursor-pointer active:scale-[0.98] border border-white/20"
                  style={{
                    backgroundColor: activeBiometric.themeColor,
                    color: portal.id === 'admin' ? '#0A192F' : '#ffffff',
                    boxShadow: `0 0 25px color-mix(in srgb, ${activeBiometric.themeColor} 40%, transparent)`,
                  }}
                >
                  <Fingerprint className="w-5 h-5 animate-pulse" />
                  <span>Touch Sensor to Sign In</span>
                </button>

                {/* Switch to password or remove */}
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick(450);
                      setLoginMode('password');
                    }}
                    className="text-slate-300 hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Or Sign In with Password</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveBiometric(activeBiometric.id, activeBiometric.name)}
                    className="text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove Fingerprint</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Sub-State 3b: Traditional Password / PIN Login Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Banner when biometric is available */}
                {activeBiometric && (
                  <div
                    onClick={() => setLoginMode('biometric')}
                    className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200 cursor-pointer hover:bg-amber-500/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-4 h-4 text-amber-400" />
                      <span>Fingerprint active for <strong>{activeBiometric.name}</strong></span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-300">Touch to Scan →</span>
                  </div>
                )}

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {portal.description}
                </p>

                {/* Input 1: Primary Credential */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    {portal.id === 'admin'
                      ? 'Authorized Admin Phone or Email'
                      : portal.id === 'learners'
                      ? 'Student Admission Number'
                      : 'Registered Mobile Phone'}
                  </label>
                  <div className="relative">
                    <input
                      type={portal.credentialType === 'phone' ? 'tel' : 'text'}
                      value={credential}
                      onChange={(e) => setCredential(e.target.value)}
                      placeholder={
                        portal.id === 'admin'
                          ? '0711121142 or kiiruelvis4@gmail.com'
                          : portal.credentialPlaceholder
                      }
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      className="w-full bg-black/40 border border-white/20 focus:border-white rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-white/40 font-mono tracking-wide"
                      required
                    />
                  </div>
                </div>

                {/* Input 2: Password or PIN */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                      {portal.id === 'learners' ? '6-Character Student Secret PIN' : 'Password'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(portal.id === 'learners' ? e.target.value.toUpperCase() : e.target.value)}
                      placeholder={
                        portal.id === 'admin'
                          ? 'Enter administrator password'
                          : portal.id === 'learners'
                          ? '6-character PIN (e.g. LR0010)'
                          : 'Enter your password'
                      }
                      maxLength={portal.id === 'learners' ? 6 : 40}
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      className="w-full bg-black/40 border border-white/20 focus:border-white rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-white/40 font-mono tracking-wider"
                      required
                    />
                  </div>
                </div>

                {/* Security note */}
                <div className="text-[10px] text-slate-400 bg-white/5 rounded-xl p-2 border border-white/5 leading-snug">
                  🛡️ Passwords are encrypted as secure hashes and never displayed or auto-filled without user request.
                </div>

                {/* Remember Me & Help Links */}
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded bg-black/40 border-white/30 text-[#F5B301] focus:ring-0"
                    />
                    <span>Remember session</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick(450);
                      if (portal.id === 'admin') {
                        onShowToast('For administrator security recovery, please verify with school director governance.');
                      } else {
                        setResetIdentifier(credential);
                        setIsRequestingReset(true);
                      }
                    }}
                    className="text-[11px] font-bold text-[#F5D27A] hover:underline cursor-pointer"
                  >
                    Forgot Password / PIN?
                  </button>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl font-extrabold text-xs tracking-wide uppercase transition-all duration-150 flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-[0.98]"
                    style={{
                      backgroundColor: c,
                      color: portal.id === 'admin' ? '#0A192F' : '#ffffff',
                    }}
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Verifying with Supabase Auth...</span>
                      </>
                    ) : (
                      <>
                        <span>Enter {portal.shortTitle} Portal</span>
                        <span>→</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Features preview */}
                <div className="pt-3 border-t border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Key Portal Features:
                  </span>
                  <ul className="grid grid-cols-1 gap-1 text-[11px] text-slate-300">
                    {portal.features.slice(0, 3).map((f, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <span className="text-[#F5B301]">✦</span>
                        <span className="truncate">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Biometric Scanner Modal Overlay */}
        {showScannerModal && (scannerMode === 'enroll' ? pendingEnrollProfile : activeBiometric) && (
          <BiometricScannerModal
            mode={scannerMode}
            person={(scannerMode === 'enroll' ? pendingEnrollProfile : activeBiometric)!}
            portal={portal}
            onSuccess={scannerMode === 'enroll' ? handleBiometricEnrollSuccess : handleBiometricAuthSuccess}
            onClose={() => setShowScannerModal(false)}
            onShowToast={onShowToast}
          />
        )}
      </div>
    </div>
  );
};
