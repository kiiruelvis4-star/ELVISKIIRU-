import { DATA } from '../data/curriculumData';

export interface CoverOverlayParams {
  grade: string;
  viewMode: 'book' | 'report';
  learnerName: string;
  admissionNumber: string;
  academicYear: number | string;
  stream?: string;
}

export interface CoverSpec {
  coverSrc: string;
  gradeNum: number;
  isBook: boolean;
  isLowerPrimary: boolean;
  isGrade4: boolean;
  isUpperReportFooter: boolean;
  viewBoxWidth: number;
  viewBoxHeight: number;
  displayName: string;
  displayAdm: string;
  displayGrade: string;
  displayYear: string;
  svgFieldsMarkup: string;
}

function escapeXml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Computes exact, mathematically measured pixel coordinates and SVG overlay markup
 * for every Little Roses Academy cover (Grades 1–6 Assessment Books & Reports).
 * Shared identically by the live React cover view and downloadable HTML/PDF booklets.
 */
export function buildCoverSpec(params: CoverOverlayParams): CoverSpec {
  const { grade, viewMode, learnerName, admissionNumber, academicYear } = params;
  const match = String(grade || 'Grade 1').match(/\d+/);
  const gradeNum = match ? Math.max(1, Math.min(6, parseInt(match[0], 10))) : 1;
  const normalizedGradeKey = `Grade ${gradeNum}`;
  const isBook = viewMode === 'book';
  const coverSrc =
    (isBook ? DATA.covers[normalizedGradeKey] : DATA.reportCovers[normalizedGradeKey]) || '';

  const isLowerPrimary = gradeNum <= 3;
  const isGrade4 = gradeNum === 4;
  const isUpperReportFooter = !isBook && gradeNum >= 5;

  const displayName = (learnerName || '—').trim().toUpperCase();
  const displayAdm = (admissionNumber || '—').trim().toUpperCase();
  const displayGrade = normalizedGradeKey.toUpperCase();
  const displayYear = String(academicYear || new Date().getFullYear()).trim().toUpperCase();

  const viewBoxWidth = isBook ? 520 : isUpperReportFooter ? 520 : 298;
  const viewBoxHeight = isBook ? 735 : isUpperReportFooter ? 441 : 429;

  const fontSans = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const fontMono = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

  let svgFieldsMarkup = '';

  if (isBook && isLowerPrimary) {
    // Grades 1, 2, 3 Assessment Book (520x735):
    // NAME underline y=615 x=[89..392], ADM underline y=647 x=[212..395]
    // GRADE underline y=677 x=[97..160] (63px), ACADEMIC PERIOD underline y=677 x=[335..399] (64px)
    const nameSize = displayName.length > 26 ? 10 : displayName.length > 20 ? 11.2 : 12.8;
    const admSize = displayAdm.length > 14 ? 10.5 : 12.2;
    svgFieldsMarkup = `
      <g id="lower-primary-book-particulars">
        <text x="92" y="609" fill="#0A1F4D" font-size="${nameSize}" font-weight="900" font-family="${fontSans}" letter-spacing="0.03em">${escapeXml(displayName)}</text>
        <text x="216" y="641" fill="#0A1F4D" font-size="${admSize}" font-weight="900" font-family="${fontMono}" letter-spacing="0.05em">${escapeXml(displayAdm)}</text>
        <text x="128" y="671" text-anchor="middle" fill="#0A1F4D" font-size="10.2" font-weight="900" font-family="${fontSans}" letter-spacing="0.02em">${escapeXml(displayGrade)}</text>
        <text x="367" y="671" text-anchor="middle" fill="#0A1F4D" font-size="11.2" font-weight="900" font-family="${fontMono}" letter-spacing="0.05em">${escapeXml(displayYear)}</text>
      </g>
    `;
  } else if (isBook && !isLowerPrimary) {
    // Grades 4, 5, 6 Assessment Book (520x735):
    // White box spans x=[165..410], y=[585..667]
    // Grade 4 lines: NAME y=612, ADM y=635, GRADE x=[216..247] y=657 (empty), PERIOD x=[363..400] y=657
    // Grade 5 lines: NAME y=605, ADM y=627, GRADE pre-printed "5", PERIOD x=[363..403] y=649
    // Grade 6 lines: NAME y=614, ADM y=636, GRADE pre-printed "6", PERIOD x=[363..403] y=658
    const nameSize = displayName.length > 22 ? 9.0 : displayName.length > 16 ? 10.2 : 11.2;
    const admSize = displayAdm.length > 12 ? 9.5 : 10.8;
    const nameY = gradeNum === 4 ? 607 : gradeNum === 5 ? 600 : 609;
    const admY = gradeNum === 4 ? 630 : gradeNum === 5 ? 622 : 631;
    const yearY = gradeNum === 4 ? 652 : gradeNum === 5 ? 644 : 653;
    const yearX = gradeNum === 4 ? 381 : 383;

    svgFieldsMarkup = `
      <g id="upper-primary-book-particulars">
        <text x="216" y="${nameY}" fill="#0A1F4D" font-size="${nameSize}" font-weight="900" font-family="${fontSans}" letter-spacing="0.02em">${escapeXml(displayName)}</text>
        <text x="298" y="${admY}" fill="#0A1F4D" font-size="${admSize}" font-weight="900" font-family="${fontMono}" letter-spacing="0.04em">${escapeXml(displayAdm)}</text>
        ${
          isGrade4
            ? `<text x="231" y="652" text-anchor="middle" fill="#0A1F4D" font-size="10.5" font-weight="900" font-family="${fontSans}">${gradeNum}</text>`
            : ''
        }
        <text x="${yearX}" y="${yearY}" text-anchor="middle" fill="#0A1F4D" font-size="10.2" font-weight="900" font-family="${fontMono}" letter-spacing="0.04em">${escapeXml(displayYear)}</text>
      </g>
    `;
  } else if (!isBook && isLowerPrimary) {
    // Grades 1, 2, 3 Assessment Report (298x429):
    // Grade 3 is shifted 5px left compared to Grade 1 & 2
    const isG3 = gradeNum === 3;
    const nameX = isG3 ? 56 : 61;
    const admX = isG3 ? 128 : 133;
    const gradeX = isG3 ? 76 : 82;
    const yearX = isG3 ? 214 : 220;
    const nameSize = displayName.length > 24 ? 5.8 : displayName.length > 18 ? 6.8 : 7.8;
    const admSize = displayAdm.length > 12 ? 6.6 : 7.6;

    svgFieldsMarkup = `
      <g id="lower-primary-report-particulars">
        <text x="${nameX}" y="357" fill="#0A1F4D" font-size="${nameSize}" font-weight="900" font-family="${fontSans}" letter-spacing="0.02em">${escapeXml(displayName)}</text>
        <text x="${admX}" y="376" fill="#0A1F4D" font-size="${admSize}" font-weight="900" font-family="${fontMono}" letter-spacing="0.04em">${escapeXml(displayAdm)}</text>
        <text x="${gradeX}" y="394" text-anchor="middle" fill="#0A1F4D" font-size="6.1" font-weight="900" font-family="${fontSans}" letter-spacing="0.01em">${escapeXml(displayGrade)}</text>
        <text x="${yearX}" y="394" text-anchor="middle" fill="#0A1F4D" font-size="7.1" font-weight="900" font-family="${fontMono}" letter-spacing="0.03em">${escapeXml(displayYear)}</text>
      </g>
    `;
  } else if (!isBook && isGrade4) {
    // Grade 4 Assessment Report (298x429):
    // NAME y=359 x=[111..228], ADM y=374 x=[162..228], GRADE y=389 x=[113..131] (18px), PERIOD y=389 x=[204..228] (24px)
    const nameSize = displayName.length > 20 ? 5.6 : displayName.length > 15 ? 6.4 : 7.2;
    const admSize = displayAdm.length > 12 ? 6.2 : 7.2;
    svgFieldsMarkup = `
      <g id="grade4-report-particulars">
        <text x="112" y="355" fill="#0A1F4D" font-size="${nameSize}" font-weight="900" font-family="${fontSans}" letter-spacing="0.01em">${escapeXml(displayName)}</text>
        <text x="164" y="370" fill="#0A1F4D" font-size="${admSize}" font-weight="900" font-family="${fontMono}" letter-spacing="0.03em">${escapeXml(displayAdm)}</text>
        <text x="122" y="385" text-anchor="middle" fill="#0A1F4D" font-size="7.5" font-weight="900" font-family="${fontSans}">4</text>
        <text x="216" y="385" text-anchor="middle" fill="#0A1F4D" font-size="6.9" font-weight="900" font-family="${fontMono}" letter-spacing="0.02em">${escapeXml(displayYear)}</text>
      </g>
    `;
  }

  return {
    coverSrc,
    gradeNum,
    isBook,
    isLowerPrimary,
    isGrade4,
    isUpperReportFooter,
    viewBoxWidth,
    viewBoxHeight,
    displayName,
    displayAdm,
    displayGrade,
    displayYear,
    svgFieldsMarkup,
  };
}
