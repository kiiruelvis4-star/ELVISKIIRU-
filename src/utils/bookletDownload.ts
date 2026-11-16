import { DATA } from '../data/curriculumData';
import {
  getStoredMarks,
  makeMarkKey,
  resultOf,
  band,
  LEVEL_COLORS,
  LEVEL_NAMES,
  getCalendarAcademicYear,
} from './cbcAssessmentEngine';
import { buildCoverSpec } from './coverOverlaySpec';

export interface BookletDownloadLearner {
  id: string;
  name: string;
  adm: string;
  grade: string;
  stream?: string;
}

export interface DownloadAssessmentOptions {
  learner: BookletDownloadLearner;
  mode: 'book' | 'report';
  term: string;
  academicYear?: number | string;
  onlyReleasedSubjects?: boolean;
  allowedSubjects?: string[];
  submissions?: Record<string, { status?: string }>;
  comments?: Record<string, string>;
}

function canonicalSubjectName(name: string): string {
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
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generates a self-contained, printable official HTML document for the CBC
 * Assessment Book or Termly Assessment Report (with the authentic grade-specific
 * Front Cover embedded as Page 1) and triggers a direct file download.
 */
export function downloadAssessmentDocument(opts: DownloadAssessmentOptions): {
  filename: string;
  subjectCount: number;
} {
  const {
    learner,
    mode,
    term,
    academicYear = getCalendarAcademicYear(),
    onlyReleasedSubjects = false,
    allowedSubjects,
    submissions = {},
    comments = {},
  } = opts;

  const gradeKey = learner.grade || 'Grade 1';
  const gradeData = DATA.grades[gradeKey];
  const allAreas = gradeData?.terms?.[term] || [];
  const filteredByTeacher =
    Array.isArray(allowedSubjects) && allowedSubjects.length > 0
      ? allAreas.filter((area) => {
          const areaCanon = canonicalSubjectName(area.name);
          return allowedSubjects.some((s) => canonicalSubjectName(s) === areaCanon);
        })
      : allAreas;
  const rawAreas = onlyReleasedSubjects
    ? filteredByTeacher.filter((area) => {
        const subKey = `${learner.id}_${gradeKey}_${term}_${area.name}`
          .toLowerCase()
          .replace(/\s+/g, '_');
        return submissions[subKey]?.status === 'released';
      })
    : filteredByTeacher;

  const marks = getStoredMarks();
  const isBook = mode === 'book';
  const docTitle = isBook
    ? 'OFFICIAL CBC ASSESSMENT BOOK'
    : 'OFFICIAL TERMLY ASSESSMENT REPORT';

  const coverSpec = buildCoverSpec({
    grade: gradeKey,
    viewMode: mode,
    learnerName: learner.name,
    admissionNumber: learner.adm,
    academicYear,
    stream: '',
  });

  const safeNameSlug = (learner.name || 'Learner')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const safeGradeSlug = gradeKey.replace(/\s+/g, '_');
  const safeTermSlug = term.replace(/\s+/g, '_');
  const filename = `LRA_${safeGradeSlug}_${isBook ? 'Assessment_Book' : 'Assessment_Report'}_${safeNameSlug}_${safeTermSlug}.html`;

  const coverAspectRatio = `${coverSpec.viewBoxWidth} / ${coverSpec.viewBoxHeight}`;
  const coverPageHtml = `
    <div class="cover-page">
      <div class="cover-card">
        <div class="cover-art-wrap" style="aspect-ratio:${coverAspectRatio};">
          ${
            coverSpec.coverSrc
              ? `<img src="${coverSpec.coverSrc}" alt="${escapeHtml(gradeKey)} Cover" class="cover-img" />`
              : `<div class="cover-fallback">Little Roses Academy · ${escapeHtml(gradeKey)}</div>`
          }
          ${
            coverSpec.svgFieldsMarkup
              ? `<svg viewBox="0 0 ${coverSpec.viewBoxWidth} ${coverSpec.viewBoxHeight}" preserveAspectRatio="none" class="cover-svg">${coverSpec.svgFieldsMarkup}</svg>`
              : ''
          }
        </div>
        ${
          coverSpec.isUpperReportFooter
            ? `<div class="upper-report-footer">
                <div class="upper-report-head">
                  <span>LITTLE ROSES ACADEMY &bull; OFFICIAL CBC TERMINAL REPORT</span>
                  <span style="color:#38BDF8;font-family:ui-monospace,monospace;">${escapeHtml(coverSpec.displayYear)} SESSION</span>
                </div>
                <div class="upper-report-grid">
                  <div><div class="ur-label">LEARNER NAME</div><div class="ur-val">${escapeHtml(coverSpec.displayName)}</div></div>
                  <div><div class="ur-label">ADMISSION NO.</div><div class="ur-val" style="color:#FBBF24;font-family:ui-monospace,monospace;">${escapeHtml(coverSpec.displayAdm)}</div></div>
                  <div><div class="ur-label">GRADE</div><div class="ur-val" style="color:#38BDF8;">${escapeHtml(coverSpec.displayGrade)}</div></div>
                  <div><div class="ur-label">ACADEMIC PERIOD</div><div class="ur-val" style="font-family:ui-monospace,monospace;">${escapeHtml(coverSpec.displayYear)}</div></div>
                </div>
              </div>`
            : ''
        }
      </div>
    </div>`;

  const areasHtml = rawAreas
    .map((area) => {
      const rowsHtml = area.strands
        .map((strand) => {
          const rec =
            marks[makeMarkKey(learner.id, strand.sid)] ||
            marks[makeMarkKey(learner.adm, strand.sid)];
          const res = resultOf(rec);
          const lvl = res ? band(res.f) : null;
          const badgeColor = lvl ? LEVEL_COLORS[lvl] : '#94A3B8';

          if (isBook) {
            const subRows = strand.subs
              .map(
                (sub, idx) => `
                <tr>
                  ${
                    idx === 0
                      ? `<td rowspan="${strand.subs.length}" class="strand-cell"><span class="code-pill">${escapeHtml(strand.code)}</span> ${escapeHtml(strand.name)}</td>`
                      : ''
                  }
                  <td class="sub-cell"><span class="sub-pill">${escapeHtml(sub.code)}</span> ${escapeHtml(sub.name)}</td>
                  ${(['EE', 'ME', 'AE', 'BE'] as const)
                    .map(
                      (b) =>
                        `<td class="band-cell" style="${
                          lvl === b
                            ? `background:${LEVEL_COLORS[b]};color:#fff;font-weight:900;`
                            : 'color:#cbd5e1;'
                        }">${lvl === b ? '✓' : '•'}</td>`
                    )
                    .join('')}
                </tr>`
              )
              .join('');

            return `
              ${subRows}
              <tr class="summary-row">
                <td colspan="2"><strong>${escapeHtml(strand.name)} Summary:</strong> ${
              res
                ? `<span style="color:#1d4ed8;font-weight:800;">${res.f.toFixed(1)}% (${lvl} — ${LEVEL_NAMES[lvl!]})</span>`
                : '<span style="color:#64748b;font-style:italic;">Awaiting teacher evaluation</span>'
            }</td>
                <td colspan="4" class="center" style="${
                  lvl ? `background:${badgeColor};color:#fff;font-weight:900;` : 'color:#64748b;'
                }">${lvl || '—'}</td>
              </tr>`;
          } else {
            const catsHtml = (rec?.cats || [])
              .map(
                (c, i) =>
                  `<div class="score-line">CAT ${i + 1}: <strong>${c.s}/${c.t}</strong></div>`
              )
              .join('');
            const asgHtml = (rec?.asg || [])
              .map(
                (a, i) =>
                  `<div class="score-line">Asg ${i + 1}: <strong>${a.s}/${a.t}</strong></div>`
              )
              .join('');
            const subsList = strand.subs
              .map((s) => `${escapeHtml(s.code)} ${escapeHtml(s.name)}`)
              .join('<br/>');

            return `
              <tr>
                <td class="strand-cell"><span class="code-pill">${escapeHtml(strand.code)}</span> ${escapeHtml(strand.name)}</td>
                <td class="sub-cell">${subsList}</td>
                <td class="sub-cell">${catsHtml || '<em>No CATs yet</em>'}${asgHtml || ''}</td>
                <td class="center">${res ? `${res.c.toFixed(0)}%` : '—'}</td>
                <td class="center">${res ? `${res.a.toFixed(0)}%` : '—'}</td>
                <td class="center" style="${
                  lvl ? `background:${badgeColor};color:#fff;font-weight:900;` : 'color:#64748b;'
                }">${res ? `${res.f.toFixed(1)}% (${lvl})` : 'Pending'}</td>
              </tr>`;
          }
        })
        .join('');

      const commentKey = `${learner.id}_${gradeKey}_${term}_${area.name}`
        .toLowerCase()
        .replace(/\s+/g, '_');
      const teacherComment = comments[commentKey] || '';

      return `
        <section class="area-card">
          <div class="area-header">${escapeHtml(area.name)}</div>
          <div class="table-wrap">
            <table>
              <thead>
                ${
                  isBook
                    ? `<tr>
                        <th style="width:28%">STRAND</th>
                        <th style="width:40%">SUB-STRAND</th>
                        <th class="center" style="width:8%;background:${LEVEL_COLORS.EE};color:#fff;">EE</th>
                        <th class="center" style="width:8%;background:${LEVEL_COLORS.ME};color:#fff;">ME</th>
                        <th class="center" style="width:8%;background:${LEVEL_COLORS.AE};color:#fff;">AE</th>
                        <th class="center" style="width:8%;background:${LEVEL_COLORS.BE};color:#fff;">BE</th>
                      </tr>`
                    : `<tr>
                        <th style="width:22%">STRAND</th>
                        <th style="width:28%">SUB-STRANDS</th>
                        <th style="width:22%">CATs &amp; ASSIGNMENTS</th>
                        <th class="center" style="width:9%">CAT %</th>
                        <th class="center" style="width:9%">ASG %</th>
                        <th class="center" style="width:10%">TOTAL</th>
                      </tr>`
                }
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
          ${
            teacherComment
              ? `<div class="comment-box"><strong>Teacher Comment:</strong> ${escapeHtml(teacherComment)}</div>`
              : ''
          }
        </section>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(docTitle)} — ${escapeHtml(learner.name)} (${escapeHtml(gradeKey)})</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 18px; background: #EEF2FA; color: #0F1B33; }
    .sheet { max-width: 900px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px rgba(10,31,77,0.12); }
    .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
    .toolbar-note { font-size: 12px; font-weight: 700; color: #475569; }
    .btn { background: #0A1F4D; color: #fff; border: 0; border-radius: 10px; padding: 10px 16px; font-weight: 800; font-size: 13px; cursor: pointer; }
    .cover-page { display: flex; justify-content: center; margin-bottom: 26px; page-break-after: always; break-after: page; }
    .cover-card { width: 100%; max-width: 560px; border-radius: 18px; overflow: hidden; border: 2px solid #cbd5e1; box-shadow: 0 16px 36px rgba(10,31,77,0.18); background: #fff; }
    .cover-art-wrap { position: relative; width: 100%; background: #fff; }
    .cover-img { width: 100%; height: 100%; display: block; object-fit: cover; }
    .cover-svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; pointer-events: none; }
    .cover-fallback { padding: 80px 24px; text-align: center; font-weight: 900; color: #0A1F4D; }
    .upper-report-footer { background: #0A1F4D; color: #fff; padding: 14px 16px; border-top: 3px solid #F59E0B; }
    .upper-report-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; border-bottom: 1px solid rgba(245,158,11,0.4); padding-bottom: 6px; margin-bottom: 10px; font-size: 10px; font-weight: 900; letter-spacing: 0.08em; color: #FBBF24; }
    .upper-report-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 14px; font-size: 11.5px; }
    .ur-label { font-size: 9px; text-transform: uppercase; color: #94A3B8; font-weight: 800; letter-spacing: 0.05em; }
    .ur-val { font-weight: 900; margin-top: 1px; }
    .cover-banner { background: linear-gradient(135deg, #0A1F4D 0%, #1E3A8A 100%); color: #fff; border-radius: 14px; padding: 18px 20px; margin-bottom: 18px; }
    .school-title { font-size: 19px; font-weight: 900; letter-spacing: 0.04em; margin: 0; text-transform: uppercase; }
    .school-sub { font-size: 11.5px; color: #FBBF24; font-weight: 700; margin-top: 3px; }
    .doc-badge { display: inline-block; margin-top: 10px; padding: 4px 12px; border-radius: 999px; background: #F59E0B; color: #0A1F4D; font-size: 10.5px; font-weight: 900; letter-spacing: 0.05em; }
    .particulars { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin-top: 14px; background: rgba(255,255,255,0.1); padding: 11px; border-radius: 10px; }
    .part-label { font-size: 10px; text-transform: uppercase; color: #BFDBFE; font-weight: 700; }
    .part-val { font-size: 12.5px; font-weight: 900; color: #fff; margin-top: 2px; }
    .legend { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 18px; font-size: 11px; }
    .legend-item { padding: 8px 10px; border-radius: 8px; color: #fff; font-weight: 800; text-align: center; }
    .area-card { margin-bottom: 18px; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; page-break-inside: avoid; }
    .area-header { background: #1e293b; color: #fff; padding: 9px 12px; font-weight: 900; font-size: 13px; text-transform: uppercase; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; min-width: 520px; border-collapse: collapse; font-size: 11.5px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
    thead th { background: #f1f5f9; font-size: 10.5px; font-weight: 800; }
    .center { text-align: center !important; }
    .band-cell { text-align: center; vertical-align: middle; font-size: 13px; }
    .strand-cell { background: #f8fafc; font-weight: 700; }
    .code-pill { display: inline-block; background: #0A1F4D; color: #fff; border-radius: 4px; padding: 1px 5px; font-size: 10px; font-weight: 800; margin-right: 4px; }
    .sub-pill { display: inline-block; background: #475569; color: #fff; border-radius: 4px; padding: 1px 5px; font-size: 10px; font-weight: 700; margin-right: 4px; }
    .summary-row td { background: #f1f5f9; }
    .score-line { font-size: 11px; margin-bottom: 2px; }
    .comment-box { padding: 8px 12px; background: #fefce8; border-top: 1px solid #fde047; font-size: 11.5px; }
    .footer { margin-top: 20px; padding-top: 12px; border-top: 1px dashed #cbd5e1; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { box-shadow: none; padding: 8px; max-width: 100%; }
      .toolbar { display: none; }
      .cover-page { min-height: 92vh; align-items: center; margin-bottom: 0; }
      .cover-card { box-shadow: none; max-width: 540px; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="toolbar">
      <span class="toolbar-note">Official Front Cover + Full ${escapeHtml(term)} CBC Records</span>
      <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>

    ${coverPageHtml}

    <div class="cover-banner">
      <h1 class="school-title">Little Roses Academy</h1>
      <div class="school-sub">Much from little &bull; Nakuru, Kenya &bull; Official Kenya CBC Record</div>
      <div class="doc-badge">${escapeHtml(docTitle)}</div>
      <div class="particulars">
        <div><div class="part-label">Learner Name</div><div class="part-val">${escapeHtml(learner.name)}</div></div>
        <div><div class="part-label">Admission No.</div><div class="part-val">${escapeHtml(learner.adm)}</div></div>
        <div><div class="part-label">Grade</div><div class="part-val">${escapeHtml(gradeKey)}</div></div>
        <div><div class="part-label">Term &amp; Year</div><div class="part-val">${escapeHtml(term)} &bull; ${escapeHtml(String(academicYear))}</div></div>
      </div>
    </div>

    <div class="legend">
      <div class="legend-item" style="background:${LEVEL_COLORS.EE};">EE (80–100%)<br/>Exceeding Expectations</div>
      <div class="legend-item" style="background:${LEVEL_COLORS.ME};">ME (60–79%)<br/>Meeting Expectations</div>
      <div class="legend-item" style="background:${LEVEL_COLORS.AE};">AE (40–59%)<br/>Approaching Expectations</div>
      <div class="legend-item" style="background:${LEVEL_COLORS.BE};">BE (&lt;40%)<br/>Below Expectations</div>
    </div>

    ${areasHtml || '<p style="text-align:center;color:#64748b;padding:24px;">No learning areas found for this term yet.</p>'}

    <div class="footer">
      <span>Generated from Little Roses Academy Official CBC Portal</span>
      <span>Weighting Formula: Final % = CATs (60%) + Assignments (40%)</span>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);

  return { filename, subjectCount: rawAreas.length };
}
