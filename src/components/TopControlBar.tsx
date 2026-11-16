import React, { useEffect, useState } from 'react';
import { ScreenType } from '../types';
import { sound } from '../utils/sound';
import { PWAInstallButton } from './PWAInstallButton';
import { isUpdateAvailable } from '../utils/appVersion';

interface TopControlBarProps {
  currentScreen: ScreenType;
  onSetScreen: (screen: ScreenType) => void;
  viewMode: 'mobile' | 'expanded';
  onToggleViewMode: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onOpenAbout: () => void;
  onOpenUpdate: () => void;
  onOpenEcosystemGuide?: () => void;
  onOpenNotifications?: () => void;
}

export const TopControlBar: React.FC<TopControlBarProps> = ({
  currentScreen,
  onSetScreen,
  viewMode,
  onToggleViewMode,
  onOpenAbout,
  onOpenUpdate,
  onOpenEcosystemGuide: _onOpenEcosystemGuide,
  onOpenNotifications: _onOpenNotifications,
}) => {
  const [hasUpdate, setHasUpdate] = useState<boolean>(() => isUpdateAvailable());

  useEffect(() => {
    const syncUpdateFlag = () => {
      setHasUpdate(isUpdateAvailable());
    };
    window.addEventListener('lra_version_update_change', syncUpdateFlag);
    window.addEventListener('storage', syncUpdateFlag);
    window.addEventListener('focus', syncUpdateFlag);
    return () => {
      window.removeEventListener('lra_version_update_change', syncUpdateFlag);
      window.removeEventListener('storage', syncUpdateFlag);
      window.removeEventListener('focus', syncUpdateFlag);
    };
  }, []);

  return (
    <header className="w-full max-w-full overflow-hidden bg-[#050C18]/90 border-b border-white/10 px-2.5 sm:px-4 py-2 sm:py-2.5 backdrop-blur-md z-30 sticky top-0 flex items-center justify-between gap-2 sm:gap-4 text-xs">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 sm:flex-initial">
        <img
          src="/images/lra_crest.jpg"
          alt="LRA Badge"
          className="w-7 h-7 rounded-full border border-[#F5B301] shrink-0"
        />
        <div className="leading-tight min-w-0">
          <span className="font-extrabold text-white text-xs sm:text-sm tracking-tight block truncate">
            Little Roses Academy
          </span>
          <button
            type="button"
            onClick={() => {
              sound.playClick(500);
              onOpenAbout();
            }}
            className="text-[10px] text-[#F5B301] hover:text-[#F5D27A] font-semibold flex items-center gap-1 cursor-pointer transition-colors group"
            title="About Little Roses Academy"
          >
            <span>About School</span>
            <span className="text-[9px] opacity-80 group-hover:translate-x-0.5 transition-transform">›</span>
          </button>
        </div>
      </div>

      {/* Zone 2: Step 1 Screen Jump Navigation (Single-line, unboxed tabs) */}
      <nav className="hidden md:flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
        <button
          onClick={() => {
            sound.playClick(500);
            onSetScreen('splash1');
          }}
          className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer whitespace-nowrap ${
            currentScreen === 'splash1'
              ? 'bg-[#F5B301] text-[#0A192F] shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          1. Campus Splash
        </button>

        <button
          onClick={() => {
            sound.playClick(550);
            onSetScreen('splash2');
          }}
          className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer whitespace-nowrap ${
            currentScreen === 'splash2'
              ? 'bg-[#F5B301] text-[#0A192F] shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          2. Loading Bar (0-100%)
        </button>

        <button
          onClick={() => {
            sound.playClick(600);
            onSetScreen('portals');
          }}
          className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer whitespace-nowrap ${
            currentScreen === 'portals'
              ? 'bg-[#F5B301] text-[#0A192F] shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          3. Security Portals
        </button>

        <button
          onClick={() => {
            sound.playClick(650);
            onSetScreen('admin');
          }}
          className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer whitespace-nowrap ${
            currentScreen === 'admin'
              ? 'bg-[#7C3AED] text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          4. Admin Office
        </button>

        <button
          onClick={() => {
            sound.playClick(680);
            onSetScreen('teachers');
          }}
          className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer whitespace-nowrap ${
            currentScreen === 'teachers'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          5. Teachers Portal
        </button>

        <button
          onClick={() => {
            sound.playClick(700);
            onSetScreen('learners');
          }}
          className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer whitespace-nowrap ${
            currentScreen === 'learners'
              ? 'bg-[#7C3AED] text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          6. Learners Portal
        </button>

        <button
          onClick={() => {
            sound.playClick(720);
            onSetScreen('parents');
          }}
          className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer whitespace-nowrap ${
            currentScreen === 'parents'
              ? 'bg-[#2F6BFF] text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          7. Parents Portal
        </button>
      </nav>

      {/* Zone 3: Actions & Controls (Speaker removed from front view; audio stays active) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* View Mode Switcher (Mobile Mockup vs Expanded) */}
        <button
          onClick={onToggleViewMode}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white font-medium text-[11px] transition-colors cursor-pointer"
          title="Toggle phone frame vs expanded screen view"
        >
          <span>{viewMode === 'mobile' ? '📱 Mobile Frame (390px)' : '🖥️ Expanded Responsive'}</span>
        </button>

        {/* Install App onto Device (PWA) */}
        <PWAInstallButton variant="topbar" />

        {/* Update App via Chrome Button */}
        <button
          onClick={onOpenUpdate}
          className={`relative px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border font-bold text-[10.5px] sm:text-[11px] transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap ${
            hasUpdate
              ? 'bg-emerald-500/30 hover:bg-emerald-500/40 border-emerald-400 text-emerald-200 animate-pulse'
              : 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40 text-emerald-300'
          }`}
          title="Download & apply updates via Chrome without losing content"
        >
          <span>🚀</span>
          <span>{hasUpdate ? 'Update Ready' : 'Update'}</span>
          {!hasUpdate && <span className="hidden sm:inline">App</span>}
          {hasUpdate && (
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          )}
        </button>

        {/* About School Button (desktop; mobile uses link under brand title) */}
        <button
          onClick={onOpenAbout}
          className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg bg-[#F5B301] hover:bg-[#F5D27A] text-[#0A192F] font-bold text-[11px] transition-colors cursor-pointer whitespace-nowrap"
        >
          About School
        </button>
      </div>
    </header>
  );
};
