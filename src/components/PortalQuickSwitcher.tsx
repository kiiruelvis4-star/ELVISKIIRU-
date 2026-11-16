import React, { useState, useRef, useEffect } from 'react';
import { ScreenType } from '../types';
import { sound } from '../utils/sound';
import { Network, Layers, ArrowRight, X, ExternalLink, HelpCircle, CheckCircle2 } from 'lucide-react';

interface PortalQuickSwitcherProps {
  currentScreen: ScreenType;
  onSwitchPortal: (screen: ScreenType) => void;
  onOpenEcosystemGuide: () => void;
  direction?: 'up' | 'down';
  compact?: boolean;
}

const PORTAL_META: Record<ScreenType, { name: string; short: string; role: string; color: string; icon: string }> = {
  admin: {
    name: 'School Administration Office',
    short: 'Admin Office',
    role: 'Governance & Finance',
    color: '#F5B301',
    icon: '🏢',
  },
  teachers: {
    name: 'Teachers & Academic Faculty',
    short: 'Teachers Portal',
    role: 'Pedagogy & CBC Grading',
    color: '#3B82F6',
    icon: '👨‍🏫',
  },
  learners: {
    name: 'Learners Student Center',
    short: 'Learners Portal',
    role: 'Ann Rovey (Grade 1)',
    color: '#A78BFA',
    icon: '🎒',
  },
  parents: {
    name: 'Parents & Guardians Portal',
    short: 'Parents Portal',
    role: 'Mr. James Mwangi',
    color: '#14B8A6',
    icon: '👨‍👩‍👧‍👦',
  },
  portals: {
    name: 'Security Portals Hub',
    short: 'Portals Selection',
    role: 'Security Gate',
    color: '#F5B301',
    icon: '🔐',
  },
  splash1: {
    name: 'Campus Splash',
    short: 'Splash 1',
    role: 'Welcome',
    color: '#F5B301',
    icon: '🏫',
  },
  splash2: {
    name: 'System Loading',
    short: 'Splash 2',
    role: 'Loader',
    color: '#F5B301',
    icon: '⏳',
  },
};

export const PortalQuickSwitcher: React.FC<PortalQuickSwitcherProps> = ({
  currentScreen,
  onSwitchPortal,
  onOpenEcosystemGuide,
  direction = 'down',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeMeta = PORTAL_META[currentScreen] || PORTAL_META.admin;

  // Close when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const portalsList: { screen: ScreenType; label: string; sub: string; color: string; icon: string }[] = [
    { screen: 'admin', label: '1. School Admin Office', sub: 'Governance, Admissions, Fees, Notices', color: '#F5B301', icon: '🏢' },
    { screen: 'teachers', label: '2. Teachers Faculty', sub: 'Roll Call, CBC 60/40 Marks, CATs', color: '#3B82F6', icon: '👨‍🏫' },
    { screen: 'learners', label: '3. Learners Center', sub: 'Timetable, Assessment Book & Focus Zone', color: '#A78BFA', icon: '🎒' },
    { screen: 'parents', label: '4. Parents Portal', sub: 'Official Assessment Reports & Fee Clearance', color: '#14B8A6', icon: '👨‍👩‍👧‍👦' },
  ];

  return (
    <div ref={dropdownRef} className="relative inline-block z-40 text-left">
      {/* Pill Trigger */}
      <button
        onClick={() => {
          sound.playClick(600);
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border backdrop-blur-md transition-all active:scale-95 shadow-lg cursor-pointer hover:brightness-110"
        style={{
          backgroundColor: 'rgba(10, 25, 47, 0.94)',
          borderColor: activeMeta.color,
          color: '#FFFFFF',
          boxShadow: `0 0 16px ${activeMeta.color}40`,
        }}
        title="Inter-Portal Quick Switcher & Synergy Hub"
        aria-label="Toggle Portal Switcher Menu"
      >
        <span className="text-xs">{activeMeta.icon}</span>
        {!compact && (
          <span className="hidden xs:inline-block text-[11px] font-extrabold max-w-[110px] truncate" style={{ color: activeMeta.color }}>
            {activeMeta.short}
          </span>
        )}
        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-amber-300 font-bold border border-amber-300/30">
          🌐 4 Portals
        </span>
        <svg
          className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? (direction === 'up' ? '' : 'rotate-180') : (direction === 'up' ? 'rotate-180' : '')}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute right-0 w-72 sm:w-80 rounded-2xl p-3 shadow-2xl border text-white animate-fade-in ${
            direction === 'up' ? 'bottom-full mb-2' : 'mt-2'
          }`}
          style={{
            backgroundColor: '#0A192F',
            borderColor: '#F5B301',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.8), 0 0 25px rgba(245,179,1,0.25)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <Network className="w-4 h-4 text-[#F5B301]" />
              <span className="text-[12px] font-black uppercase tracking-wider text-[#F5D27A]">
                Unified Portals Hub
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Core Feature: Read How They Work Together */}
          <button
            onClick={() => {
              sound.playClick(650);
              setIsOpen(false);
              onOpenEcosystemGuide();
            }}
            className="w-full text-left p-2.5 mb-2.5 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2.5 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, rgba(245,179,1,0.2), rgba(37,99,235,0.15))',
              borderColor: '#F5B301',
            }}
          >
            <div className="w-8 h-8 rounded-lg bg-[#F5B301]/20 flex items-center justify-center shrink-0 border border-[#F5B301]/40">
              <Layers className="w-4 h-4 text-[#F5B301]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-extrabold text-[#F5D27A] flex items-center gap-1">
                <span>How the 4 Portals Work Together</span>
                <span className="text-[9px] bg-[#F5B301] text-[#0A192F] font-black px-1.5 py-0.5 rounded-full">
                  GUIDE
                </span>
              </div>
              <div className="text-[10px] text-slate-300 truncate">
                Interactive synergy map, data flows & simulator
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#F5D27A] shrink-0" />
          </button>

          {/* Quick Jump List */}
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1.5">
            Switch Active Portal
          </div>

          <div className="space-y-1">
            {portalsList.map((p) => {
              const isActive = currentScreen === p.screen;
              return (
                <button
                  key={p.screen}
                  onClick={() => {
                    sound.playClick(500);
                    setIsOpen(false);
                    onSwitchPortal(p.screen);
                  }}
                  className={`w-full text-left p-2 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isActive
                      ? 'bg-white/10 border-white/20'
                      : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{p.icon}</span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold truncate" style={{ color: p.color }}>
                        {p.label}
                      </div>
                      <div className="text-[9.5px] text-slate-400 truncate">{p.sub}</div>
                    </div>
                  </div>
                  {isActive && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                      ACTIVE
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Back to Selection */}
          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
            <button
              onClick={() => {
                sound.playClick(450);
                setIsOpen(false);
                onSwitchPortal('portals');
              }}
              className="text-[10px] text-[#F5D27A] hover:underline font-semibold flex items-center gap-1"
            >
              <span>← Exit to Security Portals</span>
            </button>
            <span className="text-[9px] text-slate-500">Little Roses Academy</span>
          </div>
        </div>
      )}
    </div>
  );
};
