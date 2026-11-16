import React, { useState, useEffect } from 'react';
import { sound } from '../utils/sound';

interface Splash2Props {
  onComplete: () => void;
}

export const Splash2: React.FC<Splash2Props> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let p = 0;
    const interval = setInterval(() => {
      p = Math.min(100, p + 2);
      setProgress(p);

      if (p >= 100) {
        clearInterval(interval);
        sound.playCompleteChime();
        setTimeout(() => {
          onComplete();
        }, 350);
      }
    }, 45);

    return () => clearInterval(interval);
  }, [onComplete]);

  const handleFastForward = () => {
    sound.playClick(800, 0.05);
    setProgress(100);
    sound.playCompleteChime();
    setTimeout(() => {
      onComplete();
    }, 150);
  };

  return (
    <div 
      className="relative w-full h-full overflow-hidden bg-[#0A192F] select-none"
      onClick={handleFastForward}
      title="Tap to accelerate loading"
    >
      {/* Learner at Computer Photo - Shown exactly as supplied with cover fit */}
      <img
        src="/images/learner_computer.jpg"
        alt="Learner at computer - Little Roses Academy"
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
          <span className="text-[9.5px] text-amber-300 font-bold">CBC Digital Learning Center</span>
        </div>
      </div>

      {/* Progress Bar Container at the bottom */}
      <div className="absolute left-0 right-0 bottom-0 pb-[max(env(safe-area-inset-bottom),22px)] pt-4 px-6 bg-gradient-to-t from-[#0A192F]/90 via-[#0A192F]/50 to-transparent">
        <div className="mx-auto max-w-sm">
          {/* Track */}
          <div className="h-2.5 rounded-full bg-[#0A192F]/70 overflow-hidden border border-white/30 backdrop-blur-sm shadow-inner">
            {/* Animated Fill with the exact approved linear gradient */}
            <div
              className="h-full rounded-full transition-all duration-150 ease-linear shadow-[0_0_12px_rgba(219,39,119,0.7)]"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #A21CAF 0%, #DB2777 50%, #F472B6 100%)',
              }}
            />
          </div>

          {/* Percentage Indicator */}
          <div className="flex items-center justify-between mt-2.5 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            <span className="text-[11px] font-medium text-white/90">
              Initializing Secure Environment...
            </span>
            <span className="text-xs font-extrabold tracking-wider tabular-nums font-mono">
              {progress}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
