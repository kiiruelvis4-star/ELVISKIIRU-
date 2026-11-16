import React, { useState, useMemo } from 'react';
import { LOWER_GRADES } from '../admin/types';
import { sound } from '../../utils/sound';

interface LowerAssignmentRow {
  day: string;
  shortDay: string;
  assignment1: string;
  assignment2: string;
}

interface UpperAssignmentRow {
  day: string;
  shortDay: string;
  assignment1: string;
  assignment2?: string;
  isRevisionSpan?: boolean;
}

const LOWER_PRIMARY_ASSIGNMENTS: LowerAssignmentRow[] = [
  { day: 'Monday', shortDay: 'Mon', assignment1: 'Mathematics', assignment2: 'English' },
  { day: 'Tuesday', shortDay: 'Tue', assignment1: 'Kiswahili', assignment2: 'Environmental Activities' },
  { day: 'Wednesday', shortDay: 'Wed', assignment1: 'Mathematics', assignment2: 'CRE' },
  { day: 'Thursday', shortDay: 'Thu', assignment1: 'English', assignment2: 'Creative Arts' },
  { day: 'Friday', shortDay: 'Fri', assignment1: 'Mathematics', assignment2: 'Kiswahili' },
];

const UPPER_PRIMARY_ASSIGNMENTS: UpperAssignmentRow[] = [
  { day: 'Monday', shortDay: 'Mon', assignment1: 'Mathematics', assignment2: 'English' },
  { day: 'Tuesday', shortDay: 'Tue', assignment1: 'Kiswahili', assignment2: 'Science & Technology' },
  { day: 'Wednesday', shortDay: 'Wed', assignment1: 'Mathematics', assignment2: 'Social Studies' },
  { day: 'Thursday', shortDay: 'Thu', assignment1: 'English', assignment2: 'Agriculture' },
  { day: 'Friday', shortDay: 'Fri', assignment1: 'Mathematics', assignment2: 'CRE' },
  {
    day: 'Saturday',
    shortDay: 'Sat',
    assignment1: 'Creative Arts & Sports Revision',
    isRevisionSpan: true,
  },
];

interface LearnerAssignmentTimetableProps {
  learnerGrade: string;
}

export const LearnerAssignmentTimetable: React.FC<LearnerAssignmentTimetableProps> = ({
  learnerGrade,
}) => {
  const isDefaultLower = LOWER_GRADES.includes(learnerGrade as any);
  const [selectedBand, setSelectedBand] = useState<'lower' | 'upper'>(
    isDefaultLower ? 'lower' : 'upper'
  );

  const todayShort = useMemo(() => {
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return names[new Date().getDay()];
  }, []);

  const showingLower = selectedBand === 'lower';

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--line)] overflow-hidden shadow-xs">
      {/* Header + Grade Band Selector */}
      <div className="px-3.5 py-3 border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-2 bg-[var(--sub)]">
        <div>
          <h3 className="text-sm font-black text-[var(--ink)] m-0">
            Assignment Timetable
          </h3>
          <div className="text-[11px] text-[var(--muted)] mt-0.5">
            {showingLower
              ? 'Grades 1–3 (Lower Primary) · Monday to Friday'
              : 'Grades 4–6 (Upper Primary) · Monday to Saturday'}
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--card)] border border-[var(--line)]">
          <button
            type="button"
            onClick={() => {
              sound.playClick(420);
              setSelectedBand('lower');
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
              showingLower
                ? 'bg-[#0A1F4D] text-white'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            Grades 1–3
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick(420);
              setSelectedBand('upper');
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
              !showingLower
                ? 'bg-[#0A1F4D] text-white'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            Grades 4–6
          </button>
        </div>
      </div>

      {/* Exact Assignment Schedule Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs min-w-[420px]">
          <thead>
            <tr className="bg-[#0A1F4D] text-white text-[10.5px] uppercase font-black tracking-wider">
              <th className="py-2.5 px-3.5 w-28">Day</th>
              <th className="py-2.5 px-3">Assignment 1</th>
              <th className="py-2.5 px-3.5">Assignment 2</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {showingLower
              ? LOWER_PRIMARY_ASSIGNMENTS.map((row) => {
                  const isToday = todayShort === row.shortDay;
                  return (
                    <tr
                      key={row.day}
                      className={
                        isToday
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/30 font-semibold'
                          : 'hover:bg-[var(--sub)]/60'
                      }
                    >
                      <td className="py-2.5 px-3.5 font-extrabold text-[var(--ink)] whitespace-nowrap">
                        <span>{row.day}</span>
                        {isToday && (
                          <span className="ml-1.5 text-[9px] font-black text-indigo-700 dark:text-indigo-300">
                            · Today
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--ink)] font-semibold">
                        {row.assignment1}
                      </td>
                      <td className="py-2.5 px-3.5 text-[var(--ink)] font-semibold">
                        {row.assignment2}
                      </td>
                    </tr>
                  );
                })
              : UPPER_PRIMARY_ASSIGNMENTS.map((row) => {
                  const isToday = todayShort === row.shortDay;
                  return (
                    <tr
                      key={row.day}
                      className={
                        isToday
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/30 font-semibold'
                          : 'hover:bg-[var(--sub)]/60'
                      }
                    >
                      <td className="py-2.5 px-3.5 font-extrabold text-[var(--ink)] whitespace-nowrap">
                        <span>{row.day}</span>
                        {isToday && (
                          <span className="ml-1.5 text-[9px] font-black text-indigo-700 dark:text-indigo-300">
                            · Today
                          </span>
                        )}
                      </td>
                      {row.isRevisionSpan ? (
                        <td
                          colSpan={2}
                          className="py-2.5 px-3 text-[var(--ink)] font-bold"
                        >
                          {row.assignment1}
                        </td>
                      ) : (
                        <>
                          <td className="py-2.5 px-3 text-[var(--ink)] font-semibold">
                            {row.assignment1}
                          </td>
                          <td className="py-2.5 px-3.5 text-[var(--ink)] font-semibold">
                            {row.assignment2}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
