import React from 'react';
import {
  NativeAssessmentBooklet,
  NativeAssessmentBookletProps,
} from './NativeAssessmentBooklet';

export interface AssessmentPwaViewProps extends NativeAssessmentBookletProps {
  initialGrade?: string;
  initialTab?: 'book' | 'report';
  initialTerm?: string;
}

export const AssessmentPwaView: React.FC<AssessmentPwaViewProps> = (props) => {
  return <NativeAssessmentBooklet {...props} />;
};

export default AssessmentPwaView;
