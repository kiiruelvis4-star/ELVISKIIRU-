import gradesTree from './cbcGradesTree.json';
import coversData from './cbcCoversBase64.json';
import { GradeCurriculumDef } from '../types/cbcAssessment';

export interface AssessmentDataStructure {
  covers: Record<string, string>;
  reportCovers: Record<string, string>;
  grades: Record<string, GradeCurriculumDef>;
}

export const DATA: AssessmentDataStructure = {
  covers: coversData.covers as Record<string, string>,
  reportCovers: coversData.reportCovers as Record<string, string>,
  grades: gradesTree as unknown as Record<string, GradeCurriculumDef>,
};

export const GRADE_KEYS = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
export const TERM_KEYS = ['Term 1', 'Term 2', 'Term 3'];
