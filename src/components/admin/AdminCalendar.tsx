import React, { useState, useEffect } from 'react';
import { AdminState } from './types';
import { nairobiClock, nairobiDateLabel, nairobiParts } from './adminUtils';
import { sound } from '../../utils/sound';

interface AdminCalendarProps {
  state: AdminState;
  onOpenTermDates: () => void;
}

export const AdminCalendar: React.FC<AdminCalendarProps> = ({
  state,
  onOpenTermDates,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  const today = nairobiParts(new Date());
  const [viewMonth, setViewMonth] = useState({ y: today.y, m: today.m });

  const isDark = state.theme === 'dark';

  // Live ticking clock in Africa/Nairobi
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTimeStr(nairobiClock(now));
      setDateStr(nairobiDateLabel(now));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute month dots
  const marks: Record<string, { label: string; color: string }[]> = {};
  const addMark = (key: string, label: string, color: string) => {
    if (!key) return;
    if (!marks[key]) marks[key] = [];
    marks[key].push({ label, color });
  };

  (['Term 1', 'Term 2', 'Term 3'] as const).forEach((t) => {
    const d = state.terms[t];
    addMark(d.open, `${t} opens`, '#7C3AED');
    addMark(d.mid, `${t} mid-term break`, '#F59E0B');
    addMark(d.close, `${t} closes`, '#EC4899');
  });

  if (state.freeze) {
    let x = new Date(state.freeze.from + 'T00:00:00Z');
    const end = new Date(state.freeze.to + 'T00:00:00Z');
    while (x <= end) {
      addMark(
        x.toISOString().slice(0, 10),
        `Timetable frozen (${state.freeze.why})`,
        '#78350F'
      );
      x = new Date(x.getTime() + 864e5);
    }
  }

  // Generate calendar grid for viewMonth
  const firstOfMonth = new Date(Date.UTC(viewMonth.y, viewMonth.m, 1));
  const daysInMonth = new Date(Date.UTC(viewMonth.y, viewMonth.m + 1, 0)).getUTCDate();
  const leadingBlanks = (firstOfMonth.getUTCDay() + 6) % 7; // Monday = 0
  const monthName = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(firstOfMonth);

  const monthPrefix = `${viewMonth.y}-${String(viewMonth.m + 1).padStart(2, '0')}`;
  const thisMonthMarks = Object.keys(marks)
    .filter((k) => k.startsWith(monthPrefix))
    .sort();

  const handleMonthNav = (delta: number) => {
    sound.playClick(450);
    setViewMonth((prev) => {
      let nextM = prev.m + delta;
      let nextY = prev.y;
      if (nextM < 0) {
        nextM = 11;
        nextY--;
      } else if (nextM > 11) {
        nextM = 0;
        nextY++;
      }
      return { y: nextY, m: nextM };
    });
  };

  return (
    <div className="space-y-4 animate-fade-in pb-4">
      {/* Live Nairobi Clock Banner */}
      <div
        className="rounded-3xl p-5 text-center text-white shadow-lg relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0A1F4D 0%, #3B166A 50%, #172554 100%)',
          boxShadow: '0 10px 25px -5px rgba(10,31,77,0.5)',
        }}
      >
        <div className="text-[11px] font-black uppercase tracking-wider text-purple-200">
          Nairobi Live Standard Time · EAT (UTC+3)
        </div>
        <div className="text-4xl sm:text-5xl font-black tracking-wider my-2 font-mono tabular-nums text-white drop-shadow-md">
          {timeStr || '--:--:--'}
        </div>
        <div className="text-xs sm:text-sm font-semibold text-purple-100/90">
          {dateStr}
        </div>
      </div>

      {/* Month Calendar Card */}
      <div
        className={`rounded-3xl p-4 border shadow-xs ${
          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => handleMonthNav(-1)}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold hover:bg-slate-200 cursor-pointer"
          >
            ‹
          </button>
          <span className="text-sm font-black text-slate-800 dark:text-white">
            {monthName}
          </span>
          <button
            onClick={() => handleMonthNav(1)}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold hover:bg-slate-200 cursor-pointer"
          >
            ›
          </button>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400 uppercase mb-1">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>

        {/* Calendar Cells */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {/* Leading Blanks */}
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} className="min-h-[44px]" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const key = `${viewMonth.y}-${String(viewMonth.m + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isToday = key === today.key;
            const dayMarks = marks[key] || [];

            return (
              <div
                key={`day-${dayNum}`}
                className={`min-h-[44px] rounded-xl p-1 flex flex-col items-center justify-between transition-all ${
                  isToday
                    ? 'bg-gradient-to-tr from-[#7C3AED] to-[#EC4899] text-white font-black shadow-sm'
                    : 'bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="text-xs font-bold">{dayNum}</span>

                {/* Event Dots */}
                <div className="flex gap-0.5 mt-0.5 justify-center flex-wrap">
                  {dayMarks.slice(0, 3).map((m, mIdx) => (
                    <span
                      key={mIdx}
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ backgroundColor: m.color }}
                      title={m.label}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 pt-3 mt-3 border-t border-slate-100 dark:border-white/10 text-[10px] text-slate-500 font-bold flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#7C3AED]" /> Term Opens
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Mid-Term Break
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#EC4899]" /> Term Closes
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#78350F]" /> Exam Freeze
          </span>
        </div>
      </div>

      {/* Events Scheduled This Month */}
      <div
        className={`rounded-3xl p-4 border shadow-xs ${
          isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Key Dates in {monthName}
          </h3>
          <button
            onClick={() => {
              sound.playClick(500);
              onOpenTermDates();
            }}
            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Configure Term Dates ›
          </button>
        </div>

        {thisMonthMarks.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400 italic">
            No term milestones or examination freezes scheduled in this month.
          </div>
        ) : (
          <div className="space-y-2">
            {thisMonthMarks.map((k) => (
              <div
                key={k}
                className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-xs"
              >
                <div
                  className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: marks[k][0].color }}
                />
                <div>
                  <div className="font-mono text-[10px] font-extrabold text-slate-400">
                    {k}
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-100">
                    {marks[k].map((m) => m.label).join(' · ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
