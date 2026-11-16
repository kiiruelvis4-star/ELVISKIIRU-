import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CURRENT_APP_VERSION,
  checkForServerAppUpdate,
  executeChromeAppUpdate,
} from '../utils/appVersion';
import { sound } from '../utils/sound';
import { PWAInstallButton } from './PWAInstallButton';

interface AppUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [serverStatus, setServerStatus] = useState<'checking' | 'ready' | 'latest'>('checking');

  useEffect(() => {
    if (!isOpen) return;
    setServerStatus('checking');
    checkForServerAppUpdate()
      .then((res) => {
        setServerStatus(res.hasUpdate ? 'ready' : 'latest');
      })
      .catch(() => setServerStatus('latest'));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartUpdate = async () => {
    sound.playClick(600);
    setIsUpdating(true);
    setUpdateProgress(15);

    const interval = setInterval(() => {
      setUpdateProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 95;
        }
        return prev + 25;
      });
    }, 180);

    setTimeout(async () => {
      clearInterval(interval);
      setUpdateProgress(100);
      sound.playCompleteChime();
      if (onShowToast) {
        onShowToast('✓ Download complete! Activating updated version...');
      }

      await executeChromeAppUpdate();
    }, 900);
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div
        className="w-full max-w-lg rounded-3xl p-5 sm:p-6 border border-[#F5B301]/40 text-white shadow-2xl max-h-[88dvh] flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #112240 0%, #0A192F 100%)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="App Version Update"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#F5B301]/20 border border-[#F5B301]/40 flex items-center justify-center text-2xl shadow-inner">
              🚀
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  App Version Update
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {CURRENT_APP_VERSION.version}
                </span>
                {serverStatus === 'ready' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                    New Update Ready
                  </span>
                )}
              </div>
              <p className="text-xs text-[#F5D27A]">
                Little Roses Academy · Chrome PWA Package
              </p>
            </div>
          </div>
          {!isUpdating && (
            <button
              onClick={() => {
                sound.playClick(400);
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Data Preservation Guarantee Banner */}
        <div className="my-3 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5 flex-shrink-0">
          <span className="text-lg">🛡️</span>
          <div>
            <strong className="block text-emerald-300 font-bold mb-0.5">
              Zero Data Loss Guarantee
            </strong>
            <span className="text-[11px] leading-relaxed text-emerald-100/90">
              {CURRENT_APP_VERSION.dataPreservationNotice}
            </span>
          </div>
        </div>

        {/* Updating Progress Screen */}
        {isUpdating ? (
          <div className="py-8 text-center space-y-4 flex-1 flex flex-col justify-center items-center">
            <div className="text-4xl animate-bounce">📥</div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-white">Downloading Update Through Chrome…</h4>
              <p className="text-xs text-slate-300">
                Updating service worker cache & refreshing portal assets
              </p>
            </div>

            <div className="w-full max-w-xs bg-black/40 h-3 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-[#F5B301] to-emerald-400 transition-all duration-300"
                style={{ width: `${updateProgress}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-[#F5D27A]">
              {updateProgress}% complete
            </span>
          </div>
        ) : (
          /* Changelog & Features */
          <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold uppercase tracking-wider text-[#F5D27A]">
                What's New in this Release:
              </span>
              <span className="font-mono text-[10.5px]">Build: {CURRENT_APP_VERSION.buildNumber}</span>
            </div>

            <div className="space-y-2">
              {CURRENT_APP_VERSION.changelog.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/15 transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <span className="text-emerald-400">✓</span>
                      <span>{item.title}</span>
                    </h5>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug pl-4">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PWA Direct Installation Action */}
        {!isUpdating && (
          <div className="my-2 flex-shrink-0">
            <PWAInstallButton variant="primary" />
          </div>
        )}

        {/* Footer Actions */}
        {!isUpdating && (
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 flex-shrink-0">
            <button
              onClick={() => {
                sound.playClick(400);
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              Later
            </button>
            <button
              onClick={handleStartUpdate}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-[#F5B301] to-[#EAB308] text-[#0A192F] hover:brightness-105 transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              <span>⚡</span> Update App in Chrome (Keep Data)
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
