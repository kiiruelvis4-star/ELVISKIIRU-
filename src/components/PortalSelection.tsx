import React from 'react';
import { PORTALS } from '../data/portalData';
import { PortalConfig, PortalId } from '../types';
import { sound } from '../utils/sound';
import { PWAInstallButton } from './PWAInstallButton';

interface PortalSelectionProps {
  onSelectPortal: (portal: PortalConfig) => void;
  onOpenAbout: () => void;
  onReplaySplash: () => void;
  onOpenEcosystemGuide?: () => void;
}

export const PortalSelection: React.FC<PortalSelectionProps> = ({
  onSelectPortal,
  onOpenAbout,
  onReplaySplash,
  onOpenEcosystemGuide: _onOpenEcosystemGuide,
}) => {
  const getPortalSvg = (id: PortalId) => {
    switch (id) {
      case 'admin':
        return (
          <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 40V22l16-10 16 10v18" />
            <path d="M4 40h40" />
            <path d="M18 40v-8h12v8" />
            <path d="M24 12V6" />
            <path d="M24 6l6 2-6 2" />
            <path d="M14 24h4M30 24h4" />
          </svg>
        );
      case 'staff':
        return (
          <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="24" cy="15" r="7" />
            <path d="M12 42c0-7 5-12 12-12s12 5 12 12" />
            <path d="M30 30l8 3-2 6" />
          </svg>
        );
      case 'parents':
        return (
          <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="17" cy="16" r="6" />
            <circle cx="31" cy="18" r="5" />
            <path d="M6 40c0-7 5-11 11-11s11 4 11 11" />
            <path d="M26 40c0-6 3-9 7-9s7 3 7 9" />
          </svg>
        );
      case 'learners':
        return (
          <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M24 10L4 19l20 9 20-9z" />
            <path d="M12 23v9c0 3 6 6 12 6s12-3 12-6v-9" />
            <path d="M40 19v10" />
          </svg>
        );
    }
  };

  const handlePortalClick = (portal: PortalConfig) => {
    const toneMap: Record<PortalId, string> = {
      admin: 'gold',
      staff: 'blue',
      parents: 'teal',
      learners: 'purple',
    };
    sound.playPortalChime(toneMap[portal.id] || 'gold');
    onSelectPortal(portal);
  };

  return (
    <div
      id="portals"
      className="relative w-full h-full overflow-y-auto px-4 py-6 flex flex-col justify-between"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, #15306B 0%, #0A192F 55%, #050C18 100%)',
      }}
    >
      {/* Main Hero Header: School Crest + Title + Gold Divider */}
      <div className="text-center flex-shrink-0 animate-fade-in">
        {/* School Crest Badge */}
        <div className="relative inline-block my-1.5">
          <img
            src="/images/lra_crest.jpg"
            alt="Little Roses Academy Official Crest"
            className="w-24 h-24 sm:w-[104px] sm:h-[104px] mx-auto rounded-full object-cover border-2 border-[#F5B301]/70 shadow-[0_0_26px_rgba(245,179,1,0.38)]"
            loading="eager"
          />
        </div>

        {/* Title */}
        <h1 className="text-lg sm:text-[20px] font-black tracking-[1.2px] uppercase gold-gradient-text mt-1">
          SELECT SECURITY PORTAL
        </h1>

        {/* Gold Shimmer Divider */}
        <div
          className="w-28 sm:w-[120px] h-[2px] mx-auto mt-2 mb-4"
          style={{
            background: 'linear-gradient(90deg, transparent, #F5B301, transparent)',
          }}
        />
      </div>

      {/* 2x2 Grid of Portal Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-3.5 max-w-sm mx-auto w-full flex-grow my-auto">
        {PORTALS.map((portal) => {
          const c = portal.accentColor;
          return (
            <button
              key={portal.id}
              onClick={() => handlePortalClick(portal)}
              className="group relative rounded-[20px] p-3 sm:p-4 text-center text-white cursor-pointer transition-all duration-200 active:scale-[0.97] hover:scale-[1.01] flex flex-col items-center gap-2 min-h-[168px] sm:min-h-[174px] justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A192F]"
              style={{
                borderColor: `color-mix(in srgb, ${c} 55%, transparent)`,
                borderWidth: '1px',
                borderStyle: 'solid',
                background: `linear-gradient(170deg, color-mix(in srgb, ${c} 16%, #0F1E3A), #0B1730)`,
                boxShadow: `0 0 18px color-mix(in srgb, ${c} 18%, transparent), inset 0 1px 0 rgba(255,255,255,0.08)`,
              }}
              aria-label={`Open ${portal.name} login`}
            >
              {/* Circular Ring with Icon */}
              <div
                className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full flex items-center justify-center transition-transform group-hover:scale-105"
                style={{
                  color: c,
                  border: `1.5px solid ${c}`,
                  backgroundColor: `color-mix(in srgb, ${c} 12%, transparent)`,
                  boxShadow: `0 0 16px color-mix(in srgb, ${c} 45%, transparent)`,
                }}
              >
                {getPortalSvg(portal.id)}
              </div>

              {/* Portal Name */}
              <div className="text-[13px] sm:text-[14px] font-extrabold leading-[1.2] text-white/95 mt-1">
                {portal.id === 'admin' ? (
                  <>School<br />Administration</>
                ) : portal.id === 'staff' ? (
                  <>Staff and<br />Teachers</>
                ) : portal.id === 'parents' ? (
                  <>Parents and<br />Guardians</>
                ) : (
                  <>Learners</>
                )}
              </div>

              {/* Security Requirement Label */}
              <div
                className="text-[10px] sm:text-[11px] font-bold mt-auto leading-tight transition-opacity"
                style={{ color: c }}
              >
                {portal.securityPrompt}
              </div>

              {/* Arrow Pill Indicator */}
              <div
                className="w-6 h-6 sm:w-[26px] sm:h-[26px] rounded-full flex items-center justify-center text-[15px] leading-none transition-all group-hover:translate-x-0.5"
                style={{
                  border: `1px solid ${c}`,
                  color: c,
                  backgroundColor: `color-mix(in srgb, ${c} 10%, transparent)`,
                }}
              >
                ›
              </div>
            </button>
          );
        })}
      </div>

      {/* PWA Home Screen Install Card */}
      <div className="w-full max-w-sm mx-auto mt-3 flex-shrink-0 animate-fade-in">
        <PWAInstallButton variant="card" />
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-400 mt-3 pt-1 flex-shrink-0">
        <p className="font-medium">Little Roses Academy · Nakuru</p>
        <p className="text-[10px] text-slate-500 mt-0.5">CBC Preschool & Primary School Platform</p>
      </footer>
    </div>
  );
};
