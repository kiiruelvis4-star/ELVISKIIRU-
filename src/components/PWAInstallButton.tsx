import React, { useState } from 'react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { sound } from '../utils/sound';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'primary' | 'topbar' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'topbar',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showGenericGuide, setShowGenericGuide] = useState(false);

  // If already running inside standalone installed PWA, hide
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    sound.playClick(600);
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      setShowGenericGuide(true);
    }
  };

  const buttonContent = (
    <>
      {variant === 'topbar' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-[10.5px] sm:text-[11px] transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 shadow-[0_0_12px_rgba(245,179,1,0.35)] hover:scale-105 active:scale-95 whitespace-nowrap shrink-0 ${className}`}
          title="Install Little Roses Academy App onto your home screen"
        >
          <span className="text-xs">📲</span>
          <span>Install</span>
          <span className="hidden sm:inline">App</span>
        </button>
      )}

      {variant === 'primary' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:brightness-110 text-white font-black text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 ${className}`}
        >
          <span className="text-base">📲</span>
          <span>Install App to Home Screen (Offline CBC Access)</span>
        </button>
      )}

      {variant === 'card' && (
        <div
          onClick={handleInstallClick}
          className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-all bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-rose-500/15 border-amber-400/50 shadow-md ${className}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-xl shrink-0 border border-amber-400/40">
              📲
            </div>
            <div>
              <div className="text-xs font-black text-amber-200 flex items-center gap-1.5">
                <span>Install Little Roses App</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black">
                  PWA
                </span>
              </div>
              <div className="text-[10px] text-slate-300 mt-0.5">
                Install on phone for 1-tap offline CBC access and fast loading
              </div>
            </div>
          </div>
          <span className="text-amber-400 font-black text-sm">Install ↗</span>
        </div>
      )}

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#0A192F] border-2 border-amber-400 p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🍎</span>
                <h3 className="text-base font-black text-amber-200">Install on iPhone / iPad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-200 leading-relaxed">
              <p>
                To install <strong>Little Roses Academy</strong> on iOS Safari:
              </p>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0 text-[10px]">
                    1
                  </span>
                  <span>
                    Tap the <strong>Share button</strong> <span className="inline-block px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded font-bold">⎋</span> in your Safari bottom bar.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0 text-[10px]">
                    2
                  </span>
                  <span>
                    Scroll down and tap <strong>Add to Home Screen</strong> <span className="inline-block px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-bold">⊞</span>.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0 text-[10px]">
                    3
                  </span>
                  <span>
                    Tap <strong>Add</strong> in the top-right corner to launch directly from your home screen.
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs transition-colors cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Chrome / Desktop Generic Guide Modal */}
      {showGenericGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#0A192F] border-2 border-amber-400 p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📲</span>
                <h3 className="text-base font-black text-amber-200">Install Little Roses App</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGenericGuide(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-200 leading-relaxed">
              <p>
                Install <strong>Little Roses Academy</strong> onto your device:
              </p>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0 text-[10px]">
                    •
                  </span>
                  <span>
                    In <strong>Google Chrome</strong> or <strong>Edge</strong>: Look for the <strong>Install icon ⊕</strong> in your address bar or menu (⋮) and tap <strong>Install App</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0 text-[10px]">
                    •
                  </span>
                  <span>
                    On <strong>Android</strong>: Tap the Chrome menu (⋮) and select <strong>Add to Home Screen</strong> or <strong>Install App</strong>.
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGenericGuide(false)}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );

  return buttonContent;
};
