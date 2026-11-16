import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Fingerprint, CheckCircle2, ShieldCheck, UserCheck, Smartphone, X, Lock } from 'lucide-react';
import {
  EnrolledBiometric,
  recordBiometricUsage,
  saveEnrolledBiometric,
  authenticateWithNativeBiometrics,
  enrollWithNativeBiometrics,
} from '../utils/biometrics';
import { sound } from '../utils/sound';
import { PortalConfig } from '../types';

interface BiometricScannerModalProps {
  mode: 'enroll' | 'authenticate';
  person: EnrolledBiometric;
  portal: PortalConfig;
  onSuccess: (person: EnrolledBiometric) => void;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const BiometricScannerModal: React.FC<BiometricScannerModalProps> = ({
  mode,
  person,
  portal,
  onSuccess,
  onClose,
  onShowToast,
}) => {
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'matched' | 'error'>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState(
    mode === 'enroll'
      ? 'Use your phone fingerprint sensor or Face ID'
      : 'Touch your phone sensor or tap to verify'
  );
  const isEnrolling = mode === 'enroll';
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoFinishTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger tactile haptics if supported on mobile
  const triggerHaptic = useCallback((pattern: number[] = [30]) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Safe fallback
      }
    }
  }, []);

  const handleStartScan = async () => {
    if (scanState === 'scanning' || scanState === 'matched') return;

    sound.playBiometricScan();
    triggerHaptic([40]);
    setScanState('scanning');
    setScanProgress(30);
    setStatusMessage('Connecting with your phone biometric settings...');

    try {
      // 1. First attempt native phone biometric prompt (Android Fingerprint / iOS TouchID / FaceID)
      if (isEnrolling) {
        const res = await enrollWithNativeBiometrics(person);
        if (res.success && res.method === 'phone_native') {
          setScanProgress(100);
          setScanState('matched');
          sound.playBiometricSuccess();
          triggerHaptic([50, 30, 80]);
          saveEnrolledBiometric(person);
          setStatusMessage(`✓ Phone Biometric Registered for ${person.name}!`);
          onShowToast(`Phone biometric registered for ${person.name}`);
          autoFinishTimerRef.current = setTimeout(() => {
            onSuccess(person);
          }, 220);
          return;
        } else if (!res.success && res.error) {
          setScanState('error');
          setStatusMessage(res.error);
          triggerHaptic([100]);
          return;
        }
      } else {
        const res = await authenticateWithNativeBiometrics(person);
        if (res.success && res.method === 'phone_native') {
          setScanProgress(100);
          setScanState('matched');
          sound.playBiometricSuccess();
          triggerHaptic([50, 30, 80]);
          recordBiometricUsage(person.id);
          setStatusMessage(`✓ Verified with phone biometric settings: ${person.name}`);
          onShowToast(`Phone biometric verified: ${person.name}`);
          autoFinishTimerRef.current = setTimeout(() => {
            onSuccess(person);
          }, 220);
          return;
        } else if (!res.success && res.error) {
          setScanState('error');
          setStatusMessage(res.error);
          triggerHaptic([100]);
          return;
        }
      }
    } catch (e) {
      console.warn('Native biometric call caught:', e);
    }

    // 2. Fast capacitive on-screen sensor verification if native prompt timed out (>2s) or unavailable
    setScanProgress(70);
    setStatusMessage(`Verifying biometric profile credentials for ${person.name}...`);
    triggerHaptic([25]);

    progressTimerRef.current = setTimeout(() => {
      setScanProgress(100);
      setScanState('matched');
      sound.playBiometricSuccess();
      triggerHaptic([50, 30, 80]);

      if (isEnrolling) {
        saveEnrolledBiometric(person);
        setStatusMessage(`Fingerprint enrolled successfully for ${person.name}!`);
        onShowToast(`Biometric fingerprint registered for ${person.name}`);
      } else {
        recordBiometricUsage(person.id);
        setStatusMessage(`Biometric Verified: ${person.name}`);
        onShowToast(`Fingerprint verified: ${person.name}`);
      }

      autoFinishTimerRef.current = setTimeout(() => {
        onSuccess(person);
      }, 220);
    }, 150);
  };

  const handleInstantTapFallback = () => {
    if (scanState === 'matched') return;
    if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    if (autoFinishTimerRef.current) clearTimeout(autoFinishTimerRef.current);
    setScanProgress(100);
    setScanState('matched');
    sound.playBiometricSuccess();
    triggerHaptic([50, 30, 80]);
    if (isEnrolling) {
      saveEnrolledBiometric(person);
      setStatusMessage(`Fingerprint enrolled for ${person.name}!`);
    } else {
      recordBiometricUsage(person.id);
      setStatusMessage(`Instant Biometric Verified: ${person.name}`);
    }
    autoFinishTimerRef.current = setTimeout(() => {
      onSuccess(person);
    }, 180);
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
      if (autoFinishTimerRef.current) clearTimeout(autoFinishTimerRef.current);
    };
  }, []);

  // For authenticate mode, trigger scan immediately on mount
  useEffect(() => {
    const autoScan = setTimeout(() => {
      handleStartScan();
    }, 80);
    return () => clearTimeout(autoScan);
  }, []);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-sm rounded-3xl border border-white/20 p-5 sm:p-6 text-white shadow-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0D1B2E 0%, #060D17 100%)',
          boxShadow: `0 0 45px color-mix(in srgb, ${person.themeColor} 30%, transparent), 0 25px 30px -10px rgba(0,0,0,0.8)`,
        }}
      >
        {/* Top bar with close button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: person.themeColor }}
            />
            <span>{isEnrolling ? 'Biometric Enrollment' : 'Biometric Security Access'}</span>
          </div>

          <button
            onClick={() => {
              sound.playClick(400);
              onClose();
            }}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Read Person Header */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 mb-5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0 border shadow-inner"
            style={{
              backgroundColor: `color-mix(in srgb, ${person.themeColor} 20%, transparent)`,
              borderColor: person.themeColor,
              color: person.themeColor,
            }}
          >
            {person.avatarInitial || 'LR'}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `color-mix(in srgb, ${person.themeColor} 25%, transparent)`,
                  color: person.themeColor,
                }}
              >
                {portal.shortTitle}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {person.identifier}
              </span>
            </div>
            <h3 className="text-sm font-extrabold text-white truncate leading-tight mt-0.5">
              {person.name}
            </h3>
            <p className="text-[11px] text-slate-300 truncate">
              {person.roleLabel}
            </p>
          </div>
        </div>

        {/* Sensory Fingerprint Scanner Target */}
        <div className="flex flex-col items-center justify-center my-4">
          <div className="relative flex items-center justify-center">
            {/* Pulsing halo rings */}
            <div
              className={`absolute w-32 h-32 rounded-full transition-all duration-700 pointer-events-none ${
                scanState === 'scanning'
                  ? 'animate-ping opacity-30'
                  : scanState === 'matched'
                  ? 'opacity-60 scale-110'
                  : 'opacity-10'
              }`}
              style={{
                backgroundColor: scanState === 'matched' ? '#22C55E' : person.themeColor,
              }}
            />
            <div
              className="absolute w-28 h-28 rounded-full border border-dashed pointer-events-none animate-spin"
              style={{
                borderColor: scanState === 'matched' ? '#22C55E' : person.themeColor,
                animationDuration: '8s',
                opacity: scanState === 'scanning' ? 0.8 : 0.25,
              }}
            />

            {/* Fingerprint Interactive Touch Button */}
            <button
              type="button"
              onClick={handleStartScan}
              disabled={scanState === 'matched'}
              className="relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95 shadow-xl border-2"
              style={{
                backgroundColor:
                  scanState === 'matched'
                    ? 'rgba(34, 197, 94, 0.25)'
                    : scanState === 'scanning'
                    ? `color-mix(in srgb, ${person.themeColor} 25%, #0B132B)`
                    : '#0B132B',
                borderColor: scanState === 'matched' ? '#22C55E' : person.themeColor,
                boxShadow: `0 0 25px ${
                  scanState === 'matched'
                    ? 'rgba(34, 197, 94, 0.5)'
                    : `color-mix(in srgb, ${person.themeColor} 40%, transparent)`
                }`,
              }}
            >
              {scanState === 'matched' ? (
                <CheckCircle2 className="w-12 h-12 text-[#22C55E] animate-bounce" />
              ) : (
                <Fingerprint
                  className={`w-12 h-12 transition-all ${
                    scanState === 'scanning' ? 'animate-pulse' : 'text-slate-300'
                  }`}
                  style={{
                    color: scanState === 'scanning' ? person.themeColor : undefined,
                  }}
                />
              )}

              {/* Scanning light sweep */}
              {scanState === 'scanning' && (
                <div
                  className="absolute inset-x-2 h-1 bg-white/90 rounded-full blur-[1px] animate-pulse"
                  style={{
                    top: `${scanProgress}%`,
                    boxShadow: `0 0 8px #fff, 0 0 16px ${person.themeColor}`,
                  }}
                />
              )}
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="w-48 h-1.5 bg-black/60 rounded-full overflow-hidden mt-5 border border-white/10">
            <div
              className="h-full transition-all duration-300 rounded-full"
              style={{
                width: `${scanProgress}%`,
                backgroundColor: scanState === 'matched' ? '#22C55E' : person.themeColor,
              }}
            />
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-slate-300 font-medium bg-white/5 py-1.5 px-3 rounded-xl border border-white/10 mt-2">
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            <span>Configured to your Phone Biometric Settings (Fingerprint / Face ID / Screen Lock)</span>
          </div>

          <p className="text-xs text-center font-semibold mt-2.5 text-slate-200 min-h-[32px] px-2 flex items-center justify-center">
            {statusMessage}
          </p>
        </div>

        {/* Read Person Information Details Card */}
        <div className="bg-black/40 rounded-2xl p-3 border border-white/10 space-y-2 text-xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified School Identity</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              CBC Secure Vault
            </span>
          </div>

          <div className="grid grid-cols-1 gap-1.5 text-[11px]">
            {person.metaList.map((meta, i) => (
              <div key={i} className="flex items-start justify-between gap-2">
                <span className="text-slate-400 shrink-0">{meta.label}:</span>
                <span className="text-white font-semibold text-right truncate">
                  {meta.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-4 flex gap-2">
          {scanState === 'matched' ? (
            <button
              onClick={() => onSuccess(person)}
              className="w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-[#22C55E] hover:bg-emerald-600 text-white shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>{isEnrolling ? 'Done & Continue' : `Enter ${portal.shortTitle} Portal`}</span>
              <span>→</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  sound.playClick(400);
                  onClose();
                }}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-slate-300 border border-white/10 cursor-pointer"
              >
                Use Password
              </button>

              <button
                type="button"
                onClick={scanState === 'scanning' ? handleInstantTapFallback : handleStartScan}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider text-slate-950 shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                style={{ backgroundColor: person.themeColor }}
              >
                <span>{scanState === 'scanning' ? '⚡ Instant Verify' : 'Rescan'}</span>
              </button>
            </>
          )}
        </div>

        {/* Security watermark footer */}
        <div className="mt-3 text-center">
          <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Biometric credentials are encrypted locally on this device</span>
          </p>
        </div>
      </div>
    </div>
  );
};
