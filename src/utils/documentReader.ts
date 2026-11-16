// Little Roses Academy — Free Document Reading & Analysis Engine
// Supports reading PDF, Word (.docx), Plaintext, and Image files completely free
// with zero paid third-party dependencies, plus free AI CBC question extraction.

import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

export interface AttachedDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  ext: 'PDF' | 'DOCX' | 'TXT' | 'IMG' | 'OTHER';
  dataUrl?: string;
  blobUrl?: string;
  extractedText: string;
  htmlContent?: string;
  pageCount?: number;
  wordCount: number;
  uploadedAt: string;
  aiAnalysis?: {
    summary: string;
    questions: string[];
    suggestedQuestionsCount?: number;
    suggestedMarksEach?: number;
    suggestedMaxMarks?: number;
    competencyFocus: string;
    rubricAdvice: string;
  };
}

// Configure PDF.js worker using reliable cdnjs worker corresponding to pdfjs version
try {
  if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  }
} catch (e) {
  console.warn('PDF.js worker setup note:', e);
}

/**
 * Format bytes to readable size (e.g. 1.2 MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Reads any uploaded document (PDF, Word .docx, txt, image) using 100% free offline tools
 */
export async function readUploadedDocument(file: File): Promise<AttachedDocument> {
  const fileName = file.name;
  const lowerName = fileName.toLowerCase();
  const fileId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const nowStamp = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  let ext: AttachedDocument['ext'] = 'OTHER';
  let extractedText = '';
  let htmlContent = '';
  let pageCount = 1;
  let dataUrl = '';
  let blobUrl = '';

  // Create blob URL for in-browser iframe viewing
  if (typeof window !== 'undefined') {
    try {
      blobUrl = URL.createObjectURL(file);
    } catch (e) {
      console.warn('Blob URL generation note:', e);
    }
  }

  // 1. WORD DOCUMENTS (.docx)
  if (lowerName.endsWith('.docx') || file.type.includes('wordprocessingml')) {
    ext = 'DOCX';
    try {
      const arrayBuffer = await file.arrayBuffer();
      const rawTextResult = await mammoth.extractRawText({ arrayBuffer });
      extractedText = rawTextResult.value || '';

      const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
      htmlContent = htmlResult.value || '';
    } catch (err: any) {
      console.error('Mammoth .docx reading error:', err);
      extractedText = `[Word document loaded: ${fileName}. Content extraction failed: ${err.message}]`;
    }
  }
  // 2. PDF DOCUMENTS (.pdf)
  else if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
    ext = 'PDF';
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Read using PDF.js
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      pageCount = pdf.numPages || 1;

      const pageTexts: string[] = [];
      for (let p = 1; p <= Math.min(pdf.numPages, 30); p++) {
        const page = await pdf.getPage(p);
        const textContent = await page.getTextContent();
        const pageString = textContent.items
          .map((item: any) => item.str || '')
          .join(' ');
        pageTexts.push(`--- Page ${p} ---\n${pageString}`);
      }
      extractedText = pageTexts.join('\n\n');
    } catch (pdfErr) {
      console.warn('PDF.js text parse note, using native PDF viewer fallback:', pdfErr);
      extractedText = `[PDF Document: ${fileName} (${formatFileSize(file.size)}). Viewable via embedded PDF viewer.]`;
    }

    // Convert to DataURL for persistence if < 4MB
    if (file.size < 4 * 1024 * 1024) {
      dataUrl = await fileToDataUrl(file);
    }
  }
  // 3. TEXT & CSV & MARKDOWN FILES (.txt, .csv, .md, .json)
  else if (
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.csv') ||
    lowerName.endsWith('.md') ||
    lowerName.endsWith('.json') ||
    file.type.startsWith('text/')
  ) {
    ext = 'TXT';
    try {
      extractedText = await file.text();
    } catch (tErr) {
      extractedText = `[Text document: ${fileName}]`;
    }
  }
  // 4. IMAGES (.png, .jpg, .jpeg, .webp)
  else if (file.type.startsWith('image/')) {
    ext = 'IMG';
    dataUrl = await fileToDataUrl(file);
    extractedText = `[Image document: ${fileName} (${formatFileSize(file.size)}). Scanned worksheet/handwritten assessment submission.]`;
  } else {
    extractedText = `[Document: ${fileName} (${formatFileSize(file.size)})]`;
  }

  const wordCount = extractedText.trim()
    ? extractedText.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return {
    id: fileId,
    name: fileName,
    size: file.size,
    type: file.type || 'application/octet-stream',
    ext,
    dataUrl,
    blobUrl,
    extractedText,
    htmlContent,
    pageCount,
    wordCount,
    uploadedAt: nowStamp,
  };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Free AI Document Analysis via /api/docs/analyze
 * Extracts assessment questions, marks, and CBC rubrics.
 */
export async function analyzeDocumentWithAI(
  document: AttachedDocument,
  assessmentKind: 'CAT' | 'Assignment' = 'CAT'
): Promise<AttachedDocument['aiAnalysis']> {
  try {
    const res = await fetch('/api/docs/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: document.extractedText.slice(0, 15000),
        title: document.name,
        kind: assessmentKind,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.analysis) {
        return data.analysis;
      }
    }
  } catch (e) {
    console.warn('Backend doc analysis error, generating heuristic CBC analysis:', e);
  }

  // Fallback heuristic analysis (100% offline, free)
  return generateLocalDocAnalysis(document, assessmentKind);
}

/**
 * Free local heuristic parser for question extraction when offline
 */
export function generateLocalDocAnalysis(
  doc: AttachedDocument,
  kind: 'CAT' | 'Assignment'
): NonNullable<AttachedDocument['aiAnalysis']> {
  const text = doc.extractedText || '';
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Identify questions with numbers e.g. "1.", "Question 1", "Q1:"
  const detectedQuestions: string[] = [];
  const questionRegex = /^(?:(?:Q(?:uestion)?\s*\d+)|(?:\d+[\.\)]))\s*(.+)/i;

  for (const line of lines) {
    const match = line.match(questionRegex);
    if (match && match[1].length > 5) {
      detectedQuestions.push(line);
    }
  }

  const qCount = detectedQuestions.length > 0 ? Math.min(detectedQuestions.length, 20) : 10;
  const marksEach = kind === 'CAT' ? 1 : 2;
  const total = kind === 'CAT' ? 10 : qCount * marksEach;

  return {
    summary: `Analyzed document "${doc.name}" (${doc.wordCount} words, ${doc.pageCount || 1} page(s)). Contains CBC assessment tasks with investigative prompts.`,
    questions: detectedQuestions.length > 0 ? detectedQuestions.slice(0, 15) : [
      '1. Define the core concepts introduced in this strand.',
      '2. Solve the mathematical or scientific investigation problem.',
      '3. Draw and label the relevant real-world diagram.',
      '4. Explain how this knowledge applies to environmental conservation in Nakuru.',
      '5. Complete the practical group observation worksheet.',
    ],
    suggestedQuestionsCount: qCount,
    suggestedMarksEach: marksEach,
    suggestedMaxMarks: total,
    competencyFocus: 'Critical Thinking, Problem Solving & Digital Literacy (KICD CBC)',
    rubricAdvice: 'Formative Assessment: Continuous score out of 10 for CATs (60% weight); out of 100% for Assignment composite (40% weight).',
  };
}
