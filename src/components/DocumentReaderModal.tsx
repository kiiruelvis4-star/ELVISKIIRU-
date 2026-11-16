import React, { useState } from 'react';
import { AttachedDocument, formatFileSize, analyzeDocumentWithAI } from '../utils/documentReader';
import { sound } from '../utils/sound';

interface DocumentReaderModalProps {
  document: AttachedDocument | null;
  onClose: () => void;
  onApplyExtractedQuestions?: (questionsCount: number, marksEach: number, summary?: string) => void;
  assessmentKind?: 'CAT' | 'Assignment';
  onGenerateCATDraft?: (doc: AttachedDocument) => void;
}

export const DocumentReaderModal: React.FC<DocumentReaderModalProps> = ({
  document,
  onClose,
  onApplyExtractedQuestions,
  assessmentKind = 'CAT',
  onGenerateCATDraft,
}) => {
  const [activeTab, setActiveTab] = useState<'reader' | 'ai' | 'raw'>('reader');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AttachedDocument['aiAnalysis'] | null>(
    document?.aiAnalysis || null
  );
  const [copied, setCopied] = useState(false);

  if (!document) return null;

  const handleRunAIAnalysis = async () => {
    sound.playClick(600);
    setIsAnalyzing(true);
    try {
      const result = await analyzeDocumentWithAI(document, assessmentKind);
      setAiResult(result);
      sound.playCompleteChime();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyText = () => {
    sound.playClick(450);
    navigator.clipboard.writeText(document.extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const badgeColor =
    document.ext === 'PDF'
      ? 'bg-red-500/20 text-red-400 border-red-500/30'
      : document.ext === 'DOCX'
      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      : document.ext === 'TXT'
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      : 'bg-purple-500/20 text-purple-400 border-purple-500/30';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-4xl h-[92vh] max-h-[820px] bg-[#0F172A] border border-white/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-white">
        {/* Top Navigation Header */}
        <header className="p-4 bg-[#1E293B] border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`px-2.5 py-1 rounded-xl text-xs font-mono font-black border uppercase shrink-0 ${badgeColor}`}
            >
              {document.ext}
            </span>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                {document.name}
              </h3>
              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{formatFileSize(document.size)}</span>
                <span>•</span>
                <span>{document.wordCount.toLocaleString()} words</span>
                {document.pageCount && document.pageCount > 1 && (
                  <>
                    <span>•</span>
                    <span>{document.pageCount} pages</span>
                  </>
                )}
                <span>•</span>
                <span className="font-mono text-[10px] text-slate-500">{document.uploadedAt}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Generate CAT draft button */}
            {onGenerateCATDraft && (
              <button
                type="button"
                onClick={() => {
                  sound.playClick(500);
                  onGenerateCATDraft(document);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
                title="Generate CAT from this document for Teacher Review & Approval"
              >
                <span>⚡</span>
                <span className="hidden sm:inline">Generate CAT (Approval Draft)</span>
              </button>
            )}

            {/* Download Button */}
            {document.blobUrl && (
              <a
                href={document.blobUrl}
                download={document.name}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-slate-200 transition-colors hidden sm:flex items-center gap-1.5"
                title="Download local file"
              >
                <span>💾</span>
                <span>Download</span>
              </a>
            )}

            {/* Close */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
              title="Close Viewer"
            >
              ✕
            </button>
          </div>
        </header>

        {/* View Mode Tabs */}
        <div className="px-4 py-2 bg-[#0F172A] border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                sound.playClick(400);
                setActiveTab('reader');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'reader'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400'
              }`}
            >
              <span>📖</span>
              <span>Document Reader</span>
            </button>

            <button
              onClick={() => {
                sound.playClick(400);
                setActiveTab('ai');
                if (!aiResult && !isAnalyzing) {
                  handleRunAIAnalysis();
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ai'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400'
              }`}
            >
              <span>✨</span>
              <span>AI Question Extractor</span>
            </button>

            <button
              onClick={() => {
                sound.playClick(400);
                setActiveTab('raw');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'raw'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400'
              }`}
            >
              <span>📄</span>
              <span>Extracted Text</span>
            </button>
          </div>

          {activeTab === 'raw' && (
            <button
              onClick={handleCopyText}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>{copied ? '✓' : '📋'}</span>
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>
          )}
        </div>

        {/* Content Body Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0B1120]">
          {/* TAB 1: DOCUMENT READER */}
          {activeTab === 'reader' && (
            <div className="h-full flex flex-col space-y-4">
              {/* If Word Document (.docx) with HTML */}
              {document.ext === 'DOCX' && document.htmlContent ? (
                <div className="flex-1 bg-white text-slate-900 rounded-2xl p-6 sm:p-8 overflow-y-auto shadow-inner prose prose-slate max-w-none font-serif leading-relaxed">
                  <div
                    dangerouslySetInnerHTML={{ __html: document.htmlContent }}
                    className="space-y-3"
                  />
                </div>
              ) : document.ext === 'PDF' && (document.blobUrl || document.dataUrl) ? (
                /* Native PDF Viewer inside iframe */
                <div className="flex-1 rounded-2xl overflow-hidden border border-white/10 bg-slate-900 flex flex-col shadow-inner">
                  <iframe
                    src={document.blobUrl || document.dataUrl}
                    title={document.name}
                    className="w-full h-full min-h-[480px] border-none rounded-2xl"
                  />
                </div>
              ) : document.ext === 'IMG' && (document.dataUrl || document.blobUrl) ? (
                /* Image viewer */
                <div className="flex-1 flex items-center justify-center p-4 bg-black/40 rounded-2xl border border-white/10 overflow-auto">
                  <img
                    src={document.dataUrl || document.blobUrl}
                    alt={document.name}
                    className="max-h-[580px] max-w-full rounded-xl object-contain shadow-2xl"
                  />
                </div>
              ) : (
                /* Text fallback viewer */
                <div className="flex-1 bg-slate-950/80 rounded-2xl p-5 border border-white/10 font-mono text-xs leading-relaxed overflow-y-auto text-slate-200 whitespace-pre-wrap shadow-inner">
                  {document.extractedText || 'No text extracted from document.'}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AI QUESTION EXTRACTOR & CBC MARK CALCULATOR */}
          {activeTab === 'ai' && (
            <div className="space-y-4 animate-fade-in max-w-3xl mx-auto">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-purple-900/40 border border-purple-500/30 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-purple-200 flex items-center gap-2">
                    <span>✨ Free AI Document Analysis</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                      FREE TIER
                    </span>
                  </h4>
                  <p className="text-xs text-purple-300/80 mt-0.5">
                    Extracts assessment questions, suggested marks, and CBC rubric targets.
                  </p>
                </div>
                <button
                  onClick={handleRunAIAnalysis}
                  disabled={isAnalyzing}
                  className="px-3.5 py-2 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-500 text-white shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  {isAnalyzing ? 'Analyzing…' : '↻ Re-Analyze'}
                </button>
              </div>

              {isAnalyzing && (
                <div className="text-center py-12 space-y-3">
                  <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-bold text-purple-300">
                    Scanning {document.name} with free cognitive tools…
                  </p>
                </div>
              )}

              {!isAnalyzing && aiResult && (
                <div className="space-y-4">
                  {/* Summary & Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                      <span className="text-[10.5px] text-slate-400 block font-medium">
                        Extracted Questions
                      </span>
                      <span className="text-2xl font-black text-white mt-1 block">
                        {aiResult.suggestedQuestionsCount || aiResult.questions?.length || 10}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                      <span className="text-[10.5px] text-slate-400 block font-medium">
                        Suggested Marks Each
                      </span>
                      <span className="text-2xl font-black text-amber-400 mt-1 block">
                        {aiResult.suggestedMarksEach || 1} mark(s)
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                      <span className="text-[10.5px] text-slate-400 block font-medium">
                        Composite Max Score
                      </span>
                      <span className="text-2xl font-black text-emerald-400 mt-1 block">
                        {aiResult.suggestedMaxMarks || 10} marks
                      </span>
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <h5 className="font-bold text-xs text-slate-300 uppercase tracking-wider">
                      Executive Document Summary
                    </h5>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {aiResult.summary}
                    </p>
                  </div>

                  {/* Target Competencies */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <h5 className="font-bold text-xs text-slate-300 uppercase tracking-wider">
                      CBC Competencies Target
                    </h5>
                    <p className="text-xs text-purple-200 font-semibold leading-relaxed">
                      {aiResult.competencyFocus}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {aiResult.rubricAdvice}
                    </p>
                  </div>

                  {/* Questions List */}
                  <div className="space-y-2">
                    <h5 className="font-bold text-xs text-slate-300 uppercase tracking-wider px-1">
                      Detected Assessment Prompts & Items
                    </h5>
                    <div className="space-y-2">
                      {aiResult.questions.map((q, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-200 flex items-start gap-2.5"
                        >
                          <span className="text-purple-400 font-bold shrink-0">{idx + 1}.</span>
                          <span className="flex-1">{q.replace(/^\d+[\.\)]\s*/, '')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Apply Button */}
                  {onApplyExtractedQuestions && (
                    <button
                      onClick={() => {
                        sound.playCompleteChime();
                        onApplyExtractedQuestions(
                          aiResult.suggestedQuestionsCount || 10,
                          aiResult.suggestedMarksEach || 1,
                          aiResult.summary
                        );
                        onClose();
                      }}
                      className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-[#25D366] hover:brightness-105 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>✓</span>
                      <span>Apply Questions & Marks to {assessmentKind} Draft</span>
                    </button>
                  )}

                  {onGenerateCATDraft && (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playCompleteChime();
                        onGenerateCATDraft(document);
                        onClose();
                      }}
                      className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>⚡</span>
                      <span>AI Generate Full CBC CAT from this Document (Requires Teacher Approval)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EXTRACTED TEXT */}
          {activeTab === 'raw' && (
            <div className="h-full flex flex-col space-y-3">
              <div className="text-xs text-slate-400 px-1">
                Extracted plain text stream ({document.wordCount.toLocaleString()} words). Ready for copying, quoting, or printing.
              </div>
              <div className="flex-1 bg-black/60 rounded-2xl p-4 sm:p-5 border border-white/10 font-mono text-xs text-slate-300 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                {document.extractedText || 'No plain text extracted.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
