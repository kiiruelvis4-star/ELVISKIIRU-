import React from 'react';
import { sound } from '../utils/sound';

export interface DirectViewableDoc {
  id?: string;
  name: string;
  ext: string;
  size?: number | string;
  blobUrl?: string;
  dataUrl?: string;
  htmlContent?: string;
  extractedText?: string;
  rawContent?: string;
  uploadedAt?: string;
  grade?: string;
  subject?: string;
  folder?: string;
  description?: string;
}

interface DirectDocumentViewerModalProps {
  document: DirectViewableDoc | null;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
  isDark?: boolean;
}

export const DirectDocumentViewerModal: React.FC<DirectDocumentViewerModalProps> = ({
  document,
  onClose,
  onShowToast,
  isDark = false,
}) => {
  if (!document) return null;

  const extUpper = (document.ext || 'DOC').toUpperCase();
  const fileUrl = document.blobUrl || document.dataUrl;

  const badgeColor =
    extUpper === 'PDF'
      ? 'bg-rose-500/20 text-rose-500 dark:text-rose-400 border-rose-500/30'
      : extUpper === 'DOCX' || extUpper === 'DOC'
      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30'
      : extUpper === 'TXT'
      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
      : 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30';

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div
        className={`w-full max-w-4xl h-[92vh] max-h-[850px] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-[#0F172A] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Clean Header - NO AI, just direct document tools */}
        <header
          className={`p-4 border-b flex items-center justify-between gap-3 shrink-0 ${
            isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className={`px-2.5 py-1 rounded-xl text-xs font-mono font-black border uppercase shrink-0 ${badgeColor}`}>
              {extUpper}
            </span>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base truncate">
                {document.name}
              </h3>
              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                {document.size && <span>{typeof document.size === 'number' ? `${Math.round(document.size / 1024)} KB` : document.size}</span>}
                {document.uploadedAt && (
                  <>
                    <span>•</span>
                    <span>Uploaded {document.uploadedAt}</span>
                  </>
                )}
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Direct Resource View</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Download Button */}
            {fileUrl && (
              <a
                href={fileUrl}
                download={document.name}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
                title="Download file to device"
              >
                <span>💾</span>
                <span>Download</span>
              </a>
            )}

            {/* Print */}
            <button
              onClick={() => {
                sound.playClick(400);
                window.print();
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors hidden sm:flex items-center gap-1"
            >
              <span>🖨</span>
              <span>Print</span>
            </button>

            {/* Close */}
            <button
              onClick={() => {
                sound.playClick(400);
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
              title="Close Viewer"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Direct Document Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-[#0B1120]">
          {/* 1. PDF in clean full iframe */}
          {extUpper === 'PDF' && fileUrl ? (
            <div className="w-full h-full min-h-[550px] rounded-2xl overflow-hidden border border-slate-300 dark:border-white/10 bg-white shadow-inner">
              <iframe
                src={fileUrl}
                title={document.name}
                className="w-full h-full border-none rounded-2xl"
              />
            </div>
          ) : extUpper === 'DOCX' && document.htmlContent ? (
            /* 2. Word .docx rendered directly */
            <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-10 shadow-lg border border-slate-200 max-w-3xl mx-auto prose prose-slate font-serif leading-relaxed">
              <div
                dangerouslySetInnerHTML={{ __html: document.htmlContent }}
                className="space-y-4"
              />
            </div>
          ) : extUpper === 'PNG' || extUpper === 'JPG' || extUpper === 'JPEG' ? (
            /* 3. Image file */
            <div className="flex items-center justify-center p-4 bg-black/10 rounded-2xl">
              <img
                src={fileUrl}
                alt={document.name}
                className="max-h-[600px] max-w-full rounded-xl object-contain shadow-xl"
              />
            </div>
          ) : (
            /* 4. Text or formatted content */
            <div className="bg-white dark:bg-slate-950 rounded-2xl p-5 sm:p-8 border border-slate-300 dark:border-white/10 shadow-inner max-w-3xl mx-auto font-sans text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200">
              {document.extractedText || document.rawContent || (
                <div className="text-center py-16 text-slate-400 space-y-3">
                  <div className="text-4xl">📄</div>
                  <div className="font-bold text-sm text-slate-600 dark:text-slate-300">
                    {document.name}
                  </div>
                  <p className="text-xs max-w-md mx-auto">
                    Document binary loaded. Click the <strong>Download</strong> button in the top bar to open in Word or your preferred desktop application.
                  </p>
                  {fileUrl && (
                    <a
                      href={fileUrl}
                      download={document.name}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md mt-2"
                    >
                      <span>💾 Download & Open {document.name}</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
