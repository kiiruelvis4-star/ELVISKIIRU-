import { DATA } from './curriculumData';

export interface BookletSubStrandUnit {
  id: string;
  no: number;
  code: string;
  name: string;
  subPoints: string[];
}

export interface BookletStrandGroup {
  strandHeader: string;
  units: BookletSubStrandUnit[];
}

export interface BookletSubjectTerm {
  subjectName: string;
  termLabel?: string;
  unitsLabel?: string;
  pageNumber?: number;
  strandGroups: BookletStrandGroup[];
}

export interface OfficialCbcBooklet {
  grade: string;
  gradeTitle: string;
  revisionEdition: string;
  learningAreas: string[];
  pdfUrl: string;
  pdfFileSize: string;
  isOfficialLoaded: boolean;
  termsData: Record<number, BookletSubjectTerm[]>;
}

export function getOfficialBooklet(grade: string): OfficialCbcBooklet | null {
  const gradeKey = grade.startsWith('Grade') ? grade : `Grade ${grade}`;
  const gradeData = DATA.grades[gradeKey];
  if (!gradeData || !gradeData.terms) return null;

  const termsData: Record<number, BookletSubjectTerm[]> = {
    1: [],
    2: [],
    3: [],
  };

  const learningAreasSet = new Set<string>();

  [1, 2, 3].forEach((termNum) => {
    const termKey = `Term ${termNum}`;
    const areas = gradeData.terms[termKey] || [];
    termsData[termNum] = areas.map((area, aIdx) => {
      learningAreasSet.add(area.name);
      return {
        subjectName: area.name,
        termLabel: `Term ${termNum}`,
        unitsLabel: `${area.strands.reduce((acc, s) => acc + s.subs.length, 0)} Sub-strands`,
        pageNumber: aIdx + 1,
        strandGroups: area.strands.map((strand) => ({
          strandHeader: `${strand.code}. ${strand.name}`,
          units: strand.subs.map((sub, idx) => ({
            id: `${strand.sid}_sub${idx}`,
            no: idx + 1,
            code: sub.code,
            name: sub.name,
            subPoints: [`Core concept: ${sub.name}`, 'Practical activity & assessment'],
          })),
        })),
      };
    });
  });

  const match = gradeKey.match(/\d+/);
  const num = match ? match[0] : '1';

  return {
    grade: gradeKey,
    gradeTitle: `Little Roses Academy ${gradeKey} Assessment Booklet`,
    revisionEdition: '2026/2027 CBC National Curriculum Edition',
    learningAreas: Array.from(learningAreasSet),
    pdfUrl: `/booklets/grade${num}-assessment-booklet.pdf`,
    pdfFileSize: '1.2 MB',
    isOfficialLoaded: true,
    termsData,
  };
}

export const OFFICIAL_CBC_BOOKLETS: Record<string, OfficialCbcBooklet> = {
  'Grade 1': getOfficialBooklet('Grade 1')!,
  'Grade 2': getOfficialBooklet('Grade 2')!,
  'Grade 3': getOfficialBooklet('Grade 3')!,
  'Grade 4': getOfficialBooklet('Grade 4')!,
  'Grade 5': getOfficialBooklet('Grade 5')!,
  'Grade 6': getOfficialBooklet('Grade 6')!,
};

export interface BookletPdfMetadata {
  grade: string;
  bookTitle: string;
  reportTitle: string;
  pdfPath: string;
  downloadUrl?: string;
  sizeBytes: number;
}

export const OFFICIAL_BOOKLET_PDFS: Record<string, BookletPdfMetadata> = {
  'Grade 1': {
    grade: 'Grade 1',
    bookTitle: 'LRA Grade 1 CBC Assessment Book',
    reportTitle: 'LRA Grade 1 CBC Assessment Report',
    pdfPath: '/booklets/grade1-assessment-booklet.pdf',
    sizeBytes: 1048576,
  },
  'Grade 2': {
    grade: 'Grade 2',
    bookTitle: 'LRA Grade 2 CBC Assessment Book',
    reportTitle: 'LRA Grade 2 CBC Assessment Report',
    pdfPath: '/booklets/grade2-assessment-booklet.pdf',
    sizeBytes: 1048576,
  },
  'Grade 3': {
    grade: 'Grade 3',
    bookTitle: 'LRA Grade 3 CBC Assessment Book',
    reportTitle: 'LRA Grade 3 CBC Assessment Report',
    pdfPath: '/booklets/grade3-assessment-booklet.pdf',
    sizeBytes: 1048576,
  },
  'Grade 4': {
    grade: 'Grade 4',
    bookTitle: 'LRA Grade 4 CBC Assessment Book',
    reportTitle: 'LRA Grade 4 CBC Assessment Report',
    pdfPath: '/booklets/grade4-assessment-booklet.pdf',
    sizeBytes: 1048576,
  },
  'Grade 5': {
    grade: 'Grade 5',
    bookTitle: 'LRA Grade 5 CBC Assessment Book',
    reportTitle: 'LRA Grade 5 CBC Assessment Report',
    pdfPath: '/booklets/grade5-assessment-booklet.pdf',
    sizeBytes: 1048576,
  },
  'Grade 6': {
    grade: 'Grade 6',
    bookTitle: 'LRA Grade 6 CBC Assessment Book',
    reportTitle: 'LRA Grade 6 CBC Assessment Report',
    pdfPath: '/booklets/grade6-assessment-booklet.pdf',
    sizeBytes: 1048576,
  },
};
