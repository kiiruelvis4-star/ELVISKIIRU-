import React from 'react';
import { buildCoverSpec } from '../../utils/coverOverlaySpec';

interface AssessmentCoverViewProps {
  grade: string;
  viewMode: 'book' | 'report';
  learnerName: string;
  admissionNumber: string;
  academicYear: number | string;
  stream?: string;
  className?: string;
  showGuides?: boolean;
}

export const AssessmentCoverView: React.FC<AssessmentCoverViewProps> = ({
  grade,
  viewMode,
  learnerName,
  admissionNumber,
  academicYear,
  stream,
  className = '',
  showGuides = false,
}) => {
  const spec = buildCoverSpec({
    grade,
    viewMode,
    learnerName,
    admissionNumber,
    academicYear,
    stream,
  });

  const aspectRatio = `${spec.viewBoxWidth} / ${spec.viewBoxHeight}`;

  return (
    <div className={`w-full flex flex-col items-center select-none ${className}`}>
      {/* Official CBC Booklet Cover Container */}
      <div className="w-full rounded-2xl overflow-hidden shadow-xl border border-slate-300 dark:border-slate-700 bg-white">
        {/* Artwork + Aligned Line Overlays */}
        <div className="relative w-full bg-white" style={{ aspectRatio }}>
          {spec.coverSrc ? (
            <img
              src={spec.coverSrc}
              alt={`${grade} ${spec.isBook ? 'Assessment Book' : 'Assessment Report'} Cover`}
              className="w-full h-full block object-cover select-none pointer-events-none"
            />
          ) : (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs">
              Cover image loading...
            </div>
          )}

          {/* Calibration Guides Indicator (Optional in inspector) */}
          {showGuides && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-amber-300 text-[10px] font-mono pointer-events-none z-10">
              {spec.isBook ? 'BOOK' : 'REPORT'} · {grade} ({spec.viewBoxWidth}x{spec.viewBoxHeight})
            </div>
          )}

          {/* Responsive Scalable SVG Layer: Native Text written cleanly into exact measured spaces */}
          {spec.svgFieldsMarkup && (
            <div className="absolute inset-0 pointer-events-none select-none">
              <svg
                viewBox={`0 0 ${spec.viewBoxWidth} ${spec.viewBoxHeight}`}
                className="w-full h-full block"
                preserveAspectRatio="none"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                dangerouslySetInnerHTML={{ __html: spec.svgFieldsMarkup }}
              />
            </div>
          )}
        </div>

        {/* Grades 5 & 6 Official Report Particulars Footer placed cleanly BELOW the artwork (never covering pupil faces) */}
        {spec.isUpperReportFooter && (
          <div className="bg-[#0A1F4D] text-white px-3.5 py-3 border-t-2 border-amber-400">
            <div className="flex items-center justify-between gap-2 border-b border-amber-400/40 pb-1.5 mb-2">
              <span className="text-[9.5px] sm:text-[10px] font-black tracking-widest uppercase text-amber-400">
                Little Roses Academy · Official CBC Terminal Report
              </span>
              <span className="text-[9.5px] sm:text-[10px] font-black font-mono text-sky-300 shrink-0">
                {spec.displayYear} SESSION
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
              <div className="min-w-0">
                <div className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400">
                  Learner Name
                </div>
                <div className="font-black text-white truncate">{spec.displayName}</div>
              </div>
              <div className="min-w-0">
                <div className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400">
                  Admission No.
                </div>
                <div className="font-black font-mono text-amber-300 truncate">{spec.displayAdm}</div>
              </div>
              <div className="min-w-0">
                <div className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400">
                  Grade
                </div>
                <div className="font-black text-sky-300 truncate">
                  {spec.displayGrade}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400">
                  Academic Period
                </div>
                <div className="font-black font-mono text-white truncate">{spec.displayYear}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
