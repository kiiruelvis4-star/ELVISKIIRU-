import React, { useEffect } from 'react';
import { sound } from '../utils/sound';

interface Splash1Props {
  onSkip: () => void;
}

export const Splash1: React.FC<Splash1Props> = ({ onSkip }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onSkip();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onSkip]);

  const handleSkipClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick(750, 0.05);
    onSkip();
  };

  return (
    <div 
      className="relative w-full h-full overflow-hidden bg-[#0A192F] select-none cursor-pointer"
      onClick={handleSkipClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSkip();
        }
      }}
      aria-label="Little Roses Academy Campus View"
    >
      {/* School Compound Photo - Full screen cover fit */}
      <img
        src="/images/school_compound.jpg"
        alt="Little Roses Academy compound, Nakuru"
        className="absolute inset-0 w-full h-full object-cover animate-fade-in"
        loading="eager"
      />

      {/* School Crest Badge Header */}
      <div className="absolute top-[max(env(safe-area-inset-top),20px)] left-4 z-20 flex items-center gap-2.5 bg-[#0A192F]/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 shadow-xl">
        <img
          src="/images/lra_crest.jpg"
          alt="LRA Crest"
          className="w-7 h-7 rounded-full border border-[#F5B301] shadow"
        />
        <div className="leading-tight">
          <span className="font-extrabold text-white text-xs block">Little Roses Academy</span>
          <span className="text-[9.5px] text-amber-300 font-bold">Nakuru · CBC Preschool & Primary</span>
        </div>
      </div>

      {/* Skip Button */}
      <button
        onClick={handleSkipClick}
        className="absolute top-[max(env(safe-area-inset-top),20px)] right-4 z-20 border border-white/60 bg-[#0A192F]/80 text-white text-xs font-bold px-4 py-1.5 rounded-full backdrop-blur-md hover:bg-[#0A192F]/95 active:scale-95 transition-all shadow-xl cursor-pointer flex items-center gap-1"
        aria-label="Skip to loading screen"
      >
        <span>Skip</span>
        <span>›</span>
      </button>
    </div>
  );
};
