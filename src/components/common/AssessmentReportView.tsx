import React, { useState, useEffect } from 'react';
import {
  LearningAreaDef,
  StrandDef,
  StrandAssessmentRecord,
  FocusZoneAttempt,
} from '../../types/cbcAssessment';
import {
  LEVEL_COLORS,
  resultOf,
  band,
  getStoredMarks,
  saveStoredMarks,
  getStoredFocusZone,
  saveStoredFocusZone,
  makeMarkKey,
  makeFzKey,
} from '../../utils/cbcAssessmentEngine';

interface AssessmentReportViewProps {
  learnerId: string;
  learnerAdm?: string;
  learningAreas: LearningAreaDef[];
  term: string;
  canEdit?: boolean;
  assignedSubjects?: string[]; // for teachers
  onMarksChanged?: () => void;
}

export const AssessmentReportView: React.FC<AssessmentReportViewProps> = ({
  learnerId,
  learnerAdm,
  learningAreas,
  canEdit = false,
  assignedSubjects,
  onMarksChanged,
}) => {
  const [marks, setMarks] = useState(() => getStoredMarks());
  const [focusZone, setFocusZone] = useState(() => getStoredFocusZone());
  const [fzSelectedSubs, setFzSelectedSubs] = useState<Record<string, number>>({});

  useEffect(() => {
    const handleSync = () => {
      setMarks(getStoredMarks());
      setFocusZone(getStoredFocusZone());
    };
    window.addEventListener('lra_data_sync', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('lra_data_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const canonicalSubj = (name: string): string => {
    const n = String(name || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/\s+/g, ' ')
      .trim();
    if (n === 'cre' || n === 'c.r.e' || n.includes('christian religious')) {
      return 'christian religious education';
    }
    if (n === 'ire' || n.includes('islamic religious')) {
      return 'islamic religious education';
    }
    if (n === 'hre' || n.includes('hindu religious')) {
      return 'hindu religious education';
    }
    if (n.includes('environmental')) return 'environmental activities';
    if (n.includes('creative arts') || n.includes('creative activities')) return 'creative';
    return n;
  };

  // Check if current user is allowed to edit this learning area
  const isSubjectEditable = (subjectName: string): boolean => {
    if (!canEdit) return false;
    if (!assignedSubjects || assignedSubjects.length === 0) return true;
    const areaCanon = canonicalSubj(subjectName);
    return assignedSubjects.some((raw) => {
      const s = canonicalSubj(raw);
      return Boolean(s) && (s === areaCanon || areaCanon.includes(s) || s.includes(areaCanon));
    });
  };

  // Helper to get or initialize a strand record
  const getRecord = (sid: string): StrandAssessmentRecord => {
    const key = makeMarkKey(learnerId, sid);
    if (marks[key]) return marks[key];
    if (learnerAdm) {
      const admKey = makeMarkKey(learnerAdm, sid);
      if (marks[admKey]) return marks[admKey];
    }
    return { cats: [], asg: [] };
  };

  // Add CAT row inline
  const handleAddCat = (sid: string) => {
    const key = makeMarkKey(learnerId, sid);
    const current = getRecord(sid);
    const updated = {
      ...current,
      cats: [...current.cats, { s: 0, t: 10 }],
    };
    const nextMarks = { ...marks, [key]: updated };
    setMarks(nextMarks);
    saveStoredMarks(nextMarks);
    if (onMarksChanged) onMarksChanged();
  };

  // Add Assignment row inline
  const handleAddAsg = (sid: string) => {
    const key = makeMarkKey(learnerId, sid);
    const current = getRecord(sid);
    const updated = {
      ...current,
      asg: [...current.asg, { s: 0, t: 10 }],
    };
    const nextMarks = { ...marks, [key]: updated };
    setMarks(nextMarks);
    saveStoredMarks(nextMarks);
    if (onMarksChanged) onMarksChanged();
  };

  // Update input value inline
  const handleUpdate = (
    sid: string,
    listKey: 'cats' | 'asg',
    index: number,
    field: 's' | 't',
    value: number
  ) => {
    const key = makeMarkKey(learnerId, sid);
    const current = getRecord(sid);
    const listCopy = [...current[listKey]];
    listCopy[index] = { ...listCopy[index], [field]: Math.max(0, value) };
    const updated = { ...current, [listKey]: listCopy };
    const nextMarks = { ...marks, [key]: updated };
    setMarks(nextMarks);
    saveStoredMarks(nextMarks);
    if (onMarksChanged) onMarksChanged();
  };

  // Delete row inline
  const handleDeleteRow = (sid: string, listKey: 'cats' | 'asg', index: number) => {
    const key = makeMarkKey(learnerId, sid);
    const current = getRecord(sid);
    const listCopy = current[listKey].filter((_, i) => i !== index);
    const updated = { ...current, [listKey]: listCopy };
    const nextMarks = { ...marks, [key]: updated };
    setMarks(nextMarks);
    saveStoredMarks(nextMarks);
    if (onMarksChanged) onMarksChanged();
  };

  // --- FOCUS ZONE HANDLERS ---
  const getFzAttempts = (sid: string, subIndex: number): FocusZoneAttempt[] => {
    const key = makeFzKey(learnerId, sid, subIndex);
    return focusZone[key] || [];
  };

  const handleAddFzAttempt = (sid: string, subIndex: number) => {
    const key = makeFzKey(learnerId, sid, subIndex);
    const current = focusZone[key] || [];
    const updated = [...current, { cats: [{ s: 0, t: 10 }], asg: [{ s: 0, t: 10 }] }];
    const nextFz = { ...focusZone, [key]: updated };
    setFocusZone(nextFz);
    saveStoredFocusZone(nextFz);
    if (onMarksChanged) onMarksChanged();
  };

  const handleFzUpdate = (
    sid: string,
    subIndex: number,
    attIdx: number,
    listKey: 'cats' | 'asg',
    rowIdx: number,
    field: 's' | 't',
    val: number
  ) => {
    const key = makeFzKey(learnerId, sid, subIndex);
    const current = focusZone[key] || [];
    const attCopy = [...current];
    const targetAtt = { ...attCopy[attIdx] };
    const listCopy = [...targetAtt[listKey]];
    listCopy[rowIdx] = { ...listCopy[rowIdx], [field]: Math.max(0, val) };
    targetAtt[listKey] = listCopy;
    attCopy[attIdx] = targetAtt;

    const nextFz = { ...focusZone, [key]: attCopy };
    setFocusZone(nextFz);
    saveStoredFocusZone(nextFz);
    if (onMarksChanged) onMarksChanged();
  };

  const handleFzAddRow = (
    sid: string,
    subIndex: number,
    attIdx: number,
    listKey: 'cats' | 'asg'
  ) => {
    const key = makeFzKey(learnerId, sid, subIndex);
    const current = focusZone[key] || [];
    const attCopy = [...current];
    const targetAtt = { ...attCopy[attIdx] };
    targetAtt[listKey] = [...targetAtt[listKey], { s: 0, t: 10 }];
    attCopy[attIdx] = targetAtt;

    const nextFz = { ...focusZone, [key]: attCopy };
    setFocusZone(nextFz);
    saveStoredFocusZone(nextFz);
    if (onMarksChanged) onMarksChanged();
  };

  const handleFzDelRow = (
    sid: string,
    subIndex: number,
    attIdx: number,
    listKey: 'cats' | 'asg',
    rowIdx: number
  ) => {
    const key = makeFzKey(learnerId, sid, subIndex);
    const current = focusZone[key] || [];
    const attCopy = [...current];
    const targetAtt = { ...attCopy[attIdx] };
    targetAtt[listKey] = targetAtt[listKey].filter((_item: any, i: number) => i !== rowIdx);
    attCopy[attIdx] = targetAtt;

    const nextFz = { ...focusZone, [key]: attCopy };
    setFocusZone(nextFz);
    saveStoredFocusZone(nextFz);
    if (onMarksChanged) onMarksChanged();
  };

  return (
    <div className="w-full flex flex-col gap-y-3">
      {learningAreas.map((area, aIdx) => {
        const editable = isSubjectEditable(area.name);

        return (
          <div key={aIdx} className="overflow-x-auto rounded-lg border border-slate-700 bg-white shadow-sm mb-3">
            <table className="w-full min-w-[540px] border-collapse text-[12px] text-[#0F1B33]">
              <thead>
                {/* Learning Area Header */}
                <tr className="bg-slate-800 text-white font-extrabold text-[12.5px]">
                  <th colSpan={5} className="text-left px-3 py-2 uppercase tracking-wide border border-slate-700">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span>{area.name}</span>
                      {canEdit && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold shrink-0 ${
                            editable ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-slate-300'
                          }`}
                        >
                          {editable ? 'Editable' : 'View Only (Not Assigned)'}
                        </span>
                      )}
                    </div>
                  </th>
                </tr>
                {/* Column Titles */}
                <tr className="bg-slate-100 font-bold text-[11px] text-slate-800">
                  <th className="border border-slate-400 px-2 py-1 text-left w-[24%]">STRAND</th>
                  <th className="border border-slate-400 px-2 py-1 text-left w-[28%]">SUB-STRANDS</th>
                  <th className="border border-slate-400 px-2 py-1 text-left w-[24%]">CATs / ASSIGNMENTS</th>
                  <th className="border border-slate-400 px-1 py-1 text-center w-[12%]">OUT OF</th>
                  <th className="border border-slate-400 px-1 py-1 text-center w-[12%]">SCORE</th>
                </tr>
              </thead>
              <tbody>
                {area.strands.map((strand: StrandDef) => {
                  const record = getRecord(strand.sid);
                  const res = resultOf(record);
                  const activeBand = res ? band(res.f) : null;
                  const totalRows = record.cats.length + record.asg.length + 2; // +1 for add row, +1 for result row

                  return (
                    <React.Fragment key={strand.sid}>
                      {/* CATs Rows */}
                      {record.cats.map((item, idx) => (
                        <tr key={`cat_${idx}`} className="hover:bg-slate-50">
                          {/* Strand Header Cell on first row */}
                          {idx === 0 && (
                            <>
                              <td
                                rowSpan={totalRows}
                                className="border border-slate-400 p-1.5 font-bold align-top text-[11.5px]"
                                style={{ backgroundColor: '#E5E7EB' }}
                              >
                                <span className="inline-block min-w-[17px] mr-1 px-1 py-0.5 rounded bg-[#0F1B33] text-white text-[9.5px] font-bold text-center">
                                  {strand.code}
                                </span>
                                {strand.name}
                              </td>
                              <td rowSpan={totalRows} className="border border-slate-400 p-1.5 align-top text-[11.5px]">
                                {strand.subs.map((s) => (
                                  <div key={s.code} className="py-0.5 border-b border-dotted border-slate-300 last:border-b-0">
                                    <span className="inline-block min-w-[17px] mr-1 px-1 py-0.5 rounded bg-slate-700 text-white text-[9.5px] font-bold text-center">
                                      {s.code}
                                    </span>
                                    {s.name}
                                  </div>
                                ))}
                              </td>
                            </>
                          )}
                          <td className="border border-slate-400 px-2 py-1 text-slate-800 font-semibold">
                            CAT {idx + 1}
                          </td>
                          <td className="border border-slate-400 px-1 py-1 text-center">
                            {editable ? (
                              <input
                                type="number"
                                min={1}
                                value={item.t}
                                onChange={(e) =>
                                  handleUpdate(strand.sid, 'cats', idx, 't', parseInt(e.target.value, 10) || 1)
                                }
                                className="w-11 px-1 py-0.5 border border-slate-400 rounded text-center text-xs font-bold text-[#0F1B33]"
                              />
                            ) : (
                              <span className="font-bold">{item.t}</span>
                            )}
                          </td>
                          <td className="border border-slate-400 px-1 py-1 text-center whitespace-nowrap">
                            {editable ? (
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  value={item.s}
                                  onChange={(e) =>
                                    handleUpdate(strand.sid, 'cats', idx, 's', parseInt(e.target.value, 10) || 0)
                                  }
                                  className="w-11 px-1 py-0.5 border border-slate-400 rounded text-center text-xs font-bold text-[#0F1B33]"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(strand.sid, 'cats', idx)}
                                  className="bg-slate-500 hover:bg-slate-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded"
                                  title="Delete row"
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <span className="font-bold text-blue-700">{item.s}</span>
                            )}
                          </td>
                        </tr>
                      ))}

                      {/* Assignments Rows */}
                      {record.asg.map((item, idx) => {
                        const showSpans = record.cats.length === 0 && idx === 0;
                        return (
                          <tr key={`asg_${idx}`} className="hover:bg-slate-50">
                            {showSpans && (
                              <>
                                <td
                                  rowSpan={totalRows}
                                  className="border border-slate-400 p-1.5 font-bold align-top text-[11.5px]"
                                  style={{ backgroundColor: '#E5E7EB' }}
                                >
                                  <span className="inline-block min-w-[17px] mr-1 px-1 py-0.5 rounded bg-[#0F1B33] text-white text-[9.5px] font-bold text-center">
                                    {strand.code}
                                  </span>
                                  {strand.name}
                                </td>
                                <td rowSpan={totalRows} className="border border-slate-400 p-1.5 align-top text-[11.5px]">
                                  {strand.subs.map((s) => (
                                    <div key={s.code} className="py-0.5 border-b border-dotted border-slate-300 last:border-b-0">
                                      <span className="inline-block min-w-[17px] mr-1 px-1 py-0.5 rounded bg-slate-700 text-white text-[9.5px] font-bold text-center">
                                        {s.code}
                                      </span>
                                      {s.name}
                                    </div>
                                  ))}
                                </td>
                              </>
                            )}
                            <td className="border border-slate-400 px-2 py-1 text-slate-800 font-semibold">
                              Assignment {idx + 1}
                            </td>
                            <td className="border border-slate-400 px-1 py-1 text-center">
                              {editable ? (
                                <input
                                  type="number"
                                  min={1}
                                  value={item.t}
                                  onChange={(e) =>
                                    handleUpdate(strand.sid, 'asg', idx, 't', parseInt(e.target.value, 10) || 1)
                                  }
                                  className="w-11 px-1 py-0.5 border border-slate-400 rounded text-center text-xs font-bold text-[#0F1B33]"
                                />
                              ) : (
                                <span className="font-bold">{item.t}</span>
                              )}
                            </td>
                            <td className="border border-slate-400 px-1 py-1 text-center whitespace-nowrap">
                              {editable ? (
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    value={item.s}
                                    onChange={(e) =>
                                      handleUpdate(strand.sid, 'asg', idx, 's', parseInt(e.target.value, 10) || 0)
                                    }
                                    className="w-11 px-1 py-0.5 border border-slate-400 rounded text-center text-xs font-bold text-[#0F1B33]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRow(strand.sid, 'asg', idx)}
                                    className="bg-slate-500 hover:bg-slate-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded"
                                    title="Delete row"
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : (
                                <span className="font-bold text-pink-700">{item.s}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {/* If no CATs and no assignments yet, render initial span cells */}
                      {record.cats.length === 0 && record.asg.length === 0 && (
                        <tr>
                          <td
                            rowSpan={2}
                            className="border border-slate-400 p-1.5 font-bold align-top text-[11.5px]"
                            style={{ backgroundColor: '#E5E7EB' }}
                          >
                            <span className="inline-block min-w-[17px] mr-1 px-1 py-0.5 rounded bg-[#0F1B33] text-white text-[9.5px] font-bold text-center">
                              {strand.code}
                            </span>
                            {strand.name}
                          </td>
                          <td rowSpan={2} className="border border-slate-400 p-1.5 align-top text-[11.5px]">
                            {strand.subs.map((s) => (
                              <div key={s.code} className="py-0.5 border-b border-dotted border-slate-300 last:border-b-0">
                                <span className="inline-block min-w-[17px] mr-1 px-1 py-0.5 rounded bg-slate-700 text-white text-[9.5px] font-bold text-center">
                                  {s.code}
                                </span>
                                {s.name}
                              </div>
                            ))}
                          </td>
                          <td colSpan={3} className="border border-slate-400 px-2 py-1.5 text-slate-500 italic text-[11px]">
                            {editable
                              ? 'No CATs or assignments entered yet. Use buttons below to add rows inline.'
                              : 'Waiting for educator marks.'}
                          </td>
                        </tr>
                      )}

                      {/* Action Row: Inline + Add CAT and + Add assignment buttons */}
                      {editable && (
                        <tr>
                          <td colSpan={3} className="border border-slate-400 px-2 py-1 bg-slate-50">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleAddCat(strand.sid)}
                                className="bg-[#2F6BFF] hover:bg-blue-700 text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-sm transition-transform active:scale-95"
                              >
                                + Add CAT
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddAsg(strand.sid)}
                                className="bg-[#DB2777] hover:bg-pink-700 text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-sm transition-transform active:scale-95"
                              >
                                + Add assignment
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Strand Calculation & Level Result Row */}
                      <tr className="bg-[#EEF2FF] border-b-2 border-slate-400">
                        <td colSpan={3} className="border border-slate-400 px-2.5 py-2 text-[11.5px] text-slate-800">
                          {res ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span>
                                CATs <b>{res.c.toFixed(1)}%</b> × 0.60 + Assignments <b>{res.a.toFixed(1)}%</b> × 0.40 =
                              </span>
                              <span className="text-[13px] font-black text-[#0F1B33]">{res.f.toFixed(1)}%</span>
                              {activeBand && (
                                <span
                                  className="text-white font-extrabold text-[10px] px-2 py-0.5 rounded shadow-sm ml-1"
                                  style={{ backgroundColor: LEVEL_COLORS[activeBand] }}
                                >
                                  {activeBand}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">
                              Incomplete: needs at least one CAT and one assignment
                            </span>
                          )}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {/* FOCUS ZONE REMEDIATION BOX: Automatically opens when strand result <= 70% */}
            {area.strands.map((strand: StrandDef) => {
              const record = getRecord(strand.sid);
              const res = resultOf(record);

              // Focus Zone only triggers if base result is complete and <= 70%
              if (!res || res.f > 70) return null;

              const activeSubIdx = fzSelectedSubs[strand.sid] || 0;
              const activeSub = strand.subs[activeSubIdx] || strand.subs[0];
              const attempts = getFzAttempts(strand.sid, activeSubIdx);
              const lastAtt = attempts.length > 0 ? resultOf(attempts[attempts.length - 1]) : null;
              const isCleared = !!(lastAtt && lastAtt.f >= 70);
              const editable = isSubjectEditable(area.name);

              return (
                <div
                  key={`fz_${strand.sid}`}
                  className="m-2 p-3 rounded-xl border-2 border-dashed border-[#EA580C] bg-[#FFF7ED] text-xs"
                >
                  {/* Focus Zone Header & Sub-strand selector */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-200 pb-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#C2410C] font-black uppercase tracking-wider text-[11.5px]">
                        FOCUS ZONE
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="font-bold text-slate-800">{strand.name}</span>
                    </div>

                    {/* Sub-strand dropdown selector */}
                    <div className="flex items-center gap-1">
                      <label className="text-[10px] font-bold text-orange-900">Sub-strand:</label>
                      <select
                        value={activeSubIdx}
                        onChange={(e) =>
                          setFzSelectedSubs({
                            ...fzSelectedSubs,
                            [strand.sid]: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="bg-white border border-orange-300 rounded-md px-2 py-1 text-[11px] font-bold text-[#0F1B33] outline-none"
                      >
                        {strand.subs.map((s, idx) => (
                          <option key={s.code} value={idx}>
                            {s.code} {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Notice line */}
                  <div className="bg-orange-100/70 border border-orange-200 rounded-md p-1.5 mb-2 text-[11px] text-orange-950 font-semibold flex items-center justify-between">
                    <span>
                      Base strand result: <b className="text-orange-700">{res.f.toFixed(1)}%</b> · Needs 70.0% to close focus zone.
                    </span>
                    {isCleared && (
                      <span className="bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded text-[10px]">
                        CLEARED
                      </span>
                    )}
                  </div>

                  {/* Remediation Attempt Tables */}
                  {attempts.map((att, attIdx) => {
                    const attRes = resultOf(att);
                    const attBand = attRes ? band(attRes.f) : null;

                    return (
                      <div
                        key={`att_${attIdx}`}
                        className="bg-white rounded-lg border border-orange-200 p-2 mb-2 shadow-xs"
                      >
                        <div className="font-extrabold text-slate-800 text-[11.5px] border-b border-slate-100 pb-1 mb-1.5">
                          Attempt {attIdx + 1} · {activeSub?.code} {activeSub?.name}
                        </div>

                        {/* Attempt Rows */}
                        <div className="flex flex-col gap-y-1 mb-2">
                          {att.cats.map((catItem, cIdx) => (
                            <div key={`att_cat_${cIdx}`} className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-700">CAT {cIdx + 1}</span>
                              <div className="flex items-center gap-1.5">
                                <span>Out of:</span>
                                {editable ? (
                                  <input
                                    type="number"
                                    min={1}
                                    value={catItem.t}
                                    disabled={isCleared}
                                    onChange={(e) =>
                                      handleFzUpdate(
                                        strand.sid,
                                        activeSubIdx,
                                        attIdx,
                                        'cats',
                                        cIdx,
                                        't',
                                        parseInt(e.target.value, 10) || 1
                                      )
                                    }
                                    className="w-10 px-1 py-0.5 border border-slate-300 rounded text-center text-xs font-bold text-[#0F1B33]"
                                  />
                                ) : (
                                  <span className="font-bold">{catItem.t}</span>
                                )}
                                <span>Score:</span>
                                {editable ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min={0}
                                      value={catItem.s}
                                      disabled={isCleared}
                                      onChange={(e) =>
                                        handleFzUpdate(
                                          strand.sid,
                                          activeSubIdx,
                                          attIdx,
                                          'cats',
                                          cIdx,
                                          's',
                                          parseInt(e.target.value, 10) || 0
                                        )
                                      }
                                      className="w-10 px-1 py-0.5 border border-slate-300 rounded text-center text-xs font-bold text-[#0F1B33]"
                                    />
                                    {!isCleared && (
                                      <button
                                        type="button"
                                        onClick={() => handleFzDelRow(strand.sid, activeSubIdx, attIdx, 'cats', cIdx)}
                                        className="text-slate-400 hover:text-red-600 font-bold px-1"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="font-bold text-blue-700">{catItem.s}</span>
                                )}
                              </div>
                            </div>
                          ))}

                          {att.asg.map((asgItem, aIdx) => (
                            <div key={`att_asg_${aIdx}`} className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-700">Assignment {aIdx + 1}</span>
                              <div className="flex items-center gap-1.5">
                                <span>Out of:</span>
                                {editable ? (
                                  <input
                                    type="number"
                                    min={1}
                                    value={asgItem.t}
                                    disabled={isCleared}
                                    onChange={(e) =>
                                      handleFzUpdate(
                                        strand.sid,
                                        activeSubIdx,
                                        attIdx,
                                        'asg',
                                        aIdx,
                                        't',
                                        parseInt(e.target.value, 10) || 1
                                      )
                                    }
                                    className="w-10 px-1 py-0.5 border border-slate-300 rounded text-center text-xs font-bold text-[#0F1B33]"
                                  />
                                ) : (
                                  <span className="font-bold">{asgItem.t}</span>
                                )}
                                <span>Score:</span>
                                {editable ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min={0}
                                      value={asgItem.s}
                                      disabled={isCleared}
                                      onChange={(e) =>
                                        handleFzUpdate(
                                          strand.sid,
                                          activeSubIdx,
                                          attIdx,
                                          'asg',
                                          aIdx,
                                          's',
                                          parseInt(e.target.value, 10) || 0
                                        )
                                      }
                                      className="w-10 px-1 py-0.5 border border-slate-300 rounded text-center text-xs font-bold text-[#0F1B33]"
                                    />
                                    {!isCleared && (
                                      <button
                                        type="button"
                                        onClick={() => handleFzDelRow(strand.sid, activeSubIdx, attIdx, 'asg', aIdx)}
                                        className="text-slate-400 hover:text-red-600 font-bold px-1"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="font-bold text-pink-700">{asgItem.s}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Inline add buttons for this attempt */}
                        {editable && !isCleared && (
                          <div className="flex items-center gap-2 mb-2">
                            <button
                              type="button"
                              onClick={() => handleFzAddRow(strand.sid, activeSubIdx, attIdx, 'cats')}
                              className="bg-[#2F6BFF] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs"
                            >
                              + Add CAT
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFzAddRow(strand.sid, activeSubIdx, attIdx, 'asg')}
                              className="bg-[#DB2777] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs"
                            >
                              + Add assignment
                            </button>
                          </div>
                        )}

                        {/* Attempt result banner */}
                        <div className="bg-slate-50 border border-slate-200 rounded p-1.5 text-[10.5px]">
                          {attRes ? (
                            <div className="flex items-center justify-between">
                              <span>
                                Attempt Result: <b>{attRes.f.toFixed(1)}%</b>
                              </span>
                              {attBand && (
                                <span
                                  className="text-white font-extrabold px-1.5 py-0.2 rounded text-[9.5px]"
                                  style={{ backgroundColor: LEVEL_COLORS[attBand] }}
                                >
                                  {attBand}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">
                              Incomplete: needs at least one CAT and one assignment
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* HURRAH celebration or New Attempt button */}
                  {isCleared && lastAtt ? (
                    <div className="p-3 bg-emerald-50 border-2 border-emerald-500 rounded-xl text-center animate-bounce-subtle">
                      <div className="text-emerald-700 font-black text-sm tracking-wide">
                        HURRAH! Reached {lastAtt.f.toFixed(1)}% 🎈🎈🎈
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                        Focus Zone successfully mastered and closed. Further attempts frozen.
                      </div>
                    </div>
                  ) : editable ? (
                    <button
                      type="button"
                      onClick={() => handleAddFzAttempt(strand.sid, activeSubIdx)}
                      className="w-full bg-[#EA580C] hover:bg-orange-700 text-white font-extrabold text-[11px] py-1.5 px-3 rounded-lg shadow-sm transition-transform active:scale-98"
                    >
                      + New Focus Attempt
                    </button>
                  ) : (
                    <div className="text-center text-slate-500 italic text-[10.5px]">
                      Awaiting teacher remediation attempt entry.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
