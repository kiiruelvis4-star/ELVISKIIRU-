import React, { useState, useEffect } from 'react';
import { LearningAreaDef, LevelBand, StrandAssessmentRecord } from '../../types/cbcAssessment';
import {
  LEVEL_COLORS,
  resultOf,
  band,
  getStoredMarks,
  saveStoredMarks,
  makeMarkKey,
} from '../../utils/cbcAssessmentEngine';
import { sound } from '../../utils/sound';

interface AssessmentBookViewProps {
  learnerId: string;
  learnerAdm?: string;
  gradeLabel?: string;
  learningAreas: LearningAreaDef[];
  term: string;
  editable?: boolean;
  readOnlyLabel?: string;
}

const LEVEL_BANDS: LevelBand[] = ['EE', 'ME', 'AE', 'BE'];

export const AssessmentBookView: React.FC<AssessmentBookViewProps> = ({
  learnerId,
  learnerAdm,
  gradeLabel,
  learningAreas,
  term,
  editable = false,
  readOnlyLabel = 'Official Read-Only',
}) => {
  const [marks, setMarks] = useState<Record<string, StrandAssessmentRecord>>(() => getStoredMarks());

  useEffect(() => {
    const handleSync = () => {
      setMarks(getStoredMarks());
    };
    window.addEventListener('lra_data_sync', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('lra_data_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const getStrandRecord = (sid: string): StrandAssessmentRecord | undefined => {
    const k1 = makeMarkKey(learnerId, sid);
    if (marks[k1]) return marks[k1];
    if (learnerAdm) {
      const k2 = makeMarkKey(learnerAdm, sid);
      if (marks[k2]) return marks[k2];
    }
    return undefined;
  };

  const handleSetBand = (sid: string, lvl: LevelBand) => {
    if (!editable) return;
    sound.playClick(600);
    const markKey = makeMarkKey(learnerId, sid);

    // Standard CBC formative scores: EE=88%, ME=72%, AE=50%, BE=30%
    const scoreMap: Record<LevelBand, number> = {
      EE: 9,
      ME: 7,
      AE: 5,
      BE: 3,
    };
    const s = scoreMap[lvl];

    const updatedRecord: StrandAssessmentRecord = {
      cats: [{ id: 'cat_1', name: 'CAT Evaluation', s, t: 10 }],
      asg: [{ id: 'asg_1', name: 'Class Assignment', s, t: 10 }],
    };

    const nextMarks = {
      ...marks,
      [markKey]: updatedRecord,
    };

    setMarks(nextMarks);
    saveStoredMarks(nextMarks);
  };

  let totalStrands = 0;
  let assessedStrands = 0;
  learningAreas.forEach((area) => {
    area.strands.forEach((strand) => {
      totalStrands++;
      if (resultOf(getStrandRecord(strand.sid))) assessedStrands++;
    });
  });

  return (
    <div className="w-full flex flex-col gap-y-3">
      {/* Compact CBC Competency Key & Progress Header */}
      <div className="rounded-xl border border-slate-300 bg-white p-2.5 shadow-xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span className="font-black text-[#0F1B33]">
            {gradeLabel ? `${gradeLabel} • ` : ''}{term} CBC Assessment Book
          </span>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 font-extrabold text-[10px]">
              {assessedStrands}/{totalStrands} Strands Assessed
            </span>
            <span
              className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] ${
                editable
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border border-slate-300'
              }`}
            >
              {editable ? 'Teacher Marking Active' : readOnlyLabel}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1 text-[9.5px] font-black text-white text-center">
          <div className="rounded py-1 px-1" style={{ backgroundColor: LEVEL_COLORS.EE }}>EE 80–100%</div>
          <div className="rounded py-1 px-1" style={{ backgroundColor: LEVEL_COLORS.ME }}>ME 60–79%</div>
          <div className="rounded py-1 px-1" style={{ backgroundColor: LEVEL_COLORS.AE }}>AE 40–59%</div>
          <div className="rounded py-1 px-1" style={{ backgroundColor: LEVEL_COLORS.BE }}>BE &lt;40%</div>
        </div>
      </div>

      {learningAreas.map((area, aIdx) => (
        <div key={aIdx} className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm mb-1">
          <table className="w-full min-w-[440px] border-collapse text-[12px] text-[#0F1B33]">
            <thead>
              {/* Learning Area Header */}
              <tr className="bg-[#0F1B33] text-white font-extrabold text-[12.5px]">
                <th colSpan={6} className="text-left px-3 py-2 uppercase tracking-wide border border-slate-700">
                  {area.name}
                </th>
              </tr>
              {/* Table Column Titles */}
              <tr className="bg-slate-100 font-bold text-[11px] text-slate-800">
                <th className="border border-slate-300 px-2 py-1.5 text-left w-[28%]">STRAND</th>
                <th className="border border-slate-300 px-2 py-1.5 text-left w-[36%]">SUB-STRAND</th>
                {LEVEL_BANDS.map((lvl) => (
                  <th
                    key={lvl}
                    className="border border-slate-300 px-1 py-1.5 text-center w-[9%] text-white font-black"
                    style={{ backgroundColor: LEVEL_COLORS[lvl] }}
                  >
                    {lvl}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {area.strands.map((strand) => {
                const strandRecord = getStrandRecord(strand.sid);
                const res = resultOf(strandRecord);
                const activeBand = res ? band(res.f) : null;

                return (
                  <React.Fragment key={strand.sid}>
                    {/* Sub-strands listed under the strand */}
                    {strand.subs.map((sub, sIdx) => (
                      <tr key={sub.code} className="hover:bg-slate-50">
                        {/* Strand cell spanned across all its sub-strands */}
                        {sIdx === 0 && (
                          <td
                            rowSpan={strand.subs.length}
                            className="border border-slate-300 p-1.5 font-bold align-top text-[11.5px] bg-slate-100/90"
                          >
                            <span className="inline-block min-w-[17px] mr-1 px-1 py-0.5 rounded bg-[#0F1B33] text-white text-[9.5px] font-bold text-center">
                              {strand.code}
                            </span>
                            {strand.name}
                          </td>
                        )}
                        {/* Sub-strand cell */}
                        <td className="border border-slate-300 p-1.5 align-top text-[11.5px] text-slate-800">
                          <span className="inline-block min-w-[17px] mr-1 px-1 py-0.5 rounded bg-slate-700 text-white text-[9.5px] font-bold text-center">
                            {sub.code}
                          </span>
                          {sub.name}
                        </td>
                        {/* 4 Performance Level columns */}
                        {LEVEL_BANDS.map((lvl) => {
                          const isMatch = activeBand === lvl;
                          return (
                            <td
                              key={lvl}
                              onClick={editable ? () => handleSetBand(strand.sid, lvl) : undefined}
                              className={`border border-slate-300 text-center w-[36px] p-0 select-none ${
                                editable ? 'cursor-pointer hover:bg-slate-100 transition-colors' : ''
                              }`}
                              title={editable ? `Tap to award ${lvl} (${strand.name})` : `${strand.name}: ${activeBand || 'Pending'}`}
                            >
                              {isMatch ? (
                                <span
                                  className="inline-block w-5 h-5 rounded-full text-white text-[11px] font-black leading-5 shadow-xs"
                                  style={{ backgroundColor: LEVEL_COLORS[lvl] }}
                                >
                                  ✓
                                </span>
                              ) : (
                                <span className="text-slate-300">•</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Strand Score & Band row */}
                    <tr className="bg-slate-100 font-bold border-b-2 border-slate-300">
                      <td colSpan={2} className="border border-slate-300 px-2 py-1.5 text-[11.5px]">
                        <span className="text-[#0F1B33]">{strand.name}: score </span>
                        <span className={res ? 'text-blue-700 font-extrabold' : 'text-slate-500 font-normal italic'}>
                          {res
                            ? `${res.f.toFixed(1)}% (${activeBand})`
                            : editable
                            ? 'incomplete (tap band to evaluate)'
                            : 'awaiting teacher evaluation'}
                        </span>
                      </td>
                      {LEVEL_BANDS.map((lvl) => {
                        const isMatch = activeBand === lvl;
                        return (
                          <td
                            key={lvl}
                            onClick={editable ? () => handleSetBand(strand.sid, lvl) : undefined}
                            className={`border border-slate-300 text-center font-black text-[13px] transition-all select-none ${
                              editable ? 'cursor-pointer' : ''
                            }`}
                            style={{
                              backgroundColor: isMatch ? LEVEL_COLORS[lvl] : 'transparent',
                              color: isMatch ? '#FFFFFF' : '#94A3B8',
                            }}
                            title={editable ? `Tap to evaluate as ${lvl}` : undefined}
                          >
                            {isMatch ? '✓' : '•'}
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};
