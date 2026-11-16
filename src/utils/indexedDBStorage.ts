/**
 * Little Roses Academy (Nakuru) — IndexedDB Assessment Offline Cache Engine
 * Provides persistent local database storage for learner assessment books,
 * assessment reports, CATs, assignments, curriculum strands, and focus zone records.
 * Enables seamless offline viewing when the internet or server is unavailable.
 */

import { DATA } from '../data/curriculumData';

export const DB_NAME = 'lra_school_assessment_db';
export const DB_VERSION = 1;

export const STORES = {
  ASSESSMENTS: 'assessments',
  BOOKLETS: 'booklets',
  LEARNERS: 'learners',
  CURRICULUM: 'curriculum',
  FOCUS_ZONE: 'focus_zone',
  SYNC_META: 'sync_meta',
} as const;

export interface CachedAssessmentRecord {
  key: string; // e.g. "l_01_Grade4_Term3_Mathematics" or "LRA/0001_Numbers"
  learnerId: string;
  learnerAdm: string;
  learnerName: string;
  grade: string;
  term: string;
  subject: string;
  strandId?: string;
  strandName?: string;
  cats: { id?: string; name?: string; s: number; t: number }[];
  assignments: { id?: string; name?: string; s: number; t: number }[];
  catAvg: number | null;
  asgAvg: number | null;
  finalScore: number | null; // CATs * 0.60 + Assignments * 0.40
  levelBand: 'EE' | 'ME' | 'AE' | 'BE' | null;
  isFocusZone: boolean; // score <= 70%
  updatedAt: number;
}

export interface CachedBookletSnapshot {
  key: string; // `${learnerId}_${grade}_${term}`
  learnerId: string;
  learnerAdm: string;
  learnerName: string;
  grade: string;
  academicYear: number | string;
  term: string;
  coverImage: string;
  reportCoverImage: string;
  bookData: any;
  reportData: any;
  summaryStats: {
    totalLearningAreas: number;
    eeCount: number;
    meCount: number;
    aeCount: number;
    beCount: number;
    focusZoneCount: number;
    averageScore: number;
  };
  cachedAt: number;
}

export interface CachedFocusZoneRecord {
  id: string;
  learnerAdm: string;
  learnerName: string;
  grade: string;
  subject: string;
  strandName: string;
  subStrandName: string;
  score: number;
  rubric: string;
  status: 'active' | 'cleared';
  attemptsCount: number;
  updatedAt: number;
}

/**
 * Open or upgrade the IndexedDB database instance
 */
export function openAssessmentDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Assessments store
      if (!db.objectStoreNames.contains(STORES.ASSESSMENTS)) {
        const store = db.createObjectStore(STORES.ASSESSMENTS, { keyPath: 'key' });
        store.createIndex('learnerAdm', 'learnerAdm', { unique: false });
        store.createIndex('grade', 'grade', { unique: false });
        store.createIndex('subject', 'subject', { unique: false });
        store.createIndex('term', 'term', { unique: false });
      }

      // 2. Booklets store (full master book & report snapshots)
      if (!db.objectStoreNames.contains(STORES.BOOKLETS)) {
        const store = db.createObjectStore(STORES.BOOKLETS, { keyPath: 'key' });
        store.createIndex('learnerAdm', 'learnerAdm', { unique: false });
        store.createIndex('grade', 'grade', { unique: false });
      }

      // 3. Learners directory store
      if (!db.objectStoreNames.contains(STORES.LEARNERS)) {
        const store = db.createObjectStore(STORES.LEARNERS, { keyPath: 'id' });
        store.createIndex('adm', 'adm', { unique: false });
        store.createIndex('grade', 'grade', { unique: false });
      }

      // 4. Curriculum strands store
      if (!db.objectStoreNames.contains(STORES.CURRICULUM)) {
        db.createObjectStore(STORES.CURRICULUM, { keyPath: 'key' });
      }

      // 5. Focus Zone store
      if (!db.objectStoreNames.contains(STORES.FOCUS_ZONE)) {
        const store = db.createObjectStore(STORES.FOCUS_ZONE, { keyPath: 'id' });
        store.createIndex('learnerAdm', 'learnerAdm', { unique: false });
        store.createIndex('grade', 'grade', { unique: false });
      }

      // 6. Metadata store
      if (!db.objectStoreNames.contains(STORES.SYNC_META)) {
        db.createObjectStore(STORES.SYNC_META, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Save an individual assessment record into IndexedDB
 */
export async function saveAssessmentToIndexedDB(record: CachedAssessmentRecord): Promise<void> {
  const db = await openAssessmentDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ASSESSMENTS, 'readwrite');
    const store = tx.objectStore(STORES.ASSESSMENTS);
    const req = store.put(record);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Save multiple assessment records in bulk transaction
 */
export async function saveBulkAssessmentsToIndexedDB(records: CachedAssessmentRecord[]): Promise<void> {
  if (records.length === 0) return;
  const db = await openAssessmentDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ASSESSMENTS, 'readwrite');
    const store = tx.objectStore(STORES.ASSESSMENTS);

    records.forEach((r) => store.put(r));

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Save a full booklet snapshot into IndexedDB
 */
export async function saveBookletSnapshotToIndexedDB(snapshot: CachedBookletSnapshot): Promise<void> {
  const db = await openAssessmentDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.BOOKLETS, 'readwrite');
    const store = tx.objectStore(STORES.BOOKLETS);
    const req = store.put(snapshot);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieve cached booklet snapshot from IndexedDB
 */
export async function getCachedBookletSnapshot(
  learnerIdOrAdm: string,
  grade: string,
  term: string = 'Term 3'
): Promise<CachedBookletSnapshot | null> {
  try {
    const db = await openAssessmentDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.BOOKLETS, 'readonly');
      const store = tx.objectStore(STORES.BOOKLETS);

      // Try exact key first
      const key = `${learnerIdOrAdm}_${grade}_${term}`.toLowerCase();
      const directReq = store.get(key);

      directReq.onsuccess = () => {
        if (directReq.result) {
          resolve(directReq.result);
          return;
        }

        // Fallback: search by learnerAdm index
        const index = store.index('learnerAdm');
        const admReq = index.getAll(learnerIdOrAdm.toUpperCase());

        admReq.onsuccess = () => {
          const list = admReq.result || [];
          const matched = list.find((b: CachedBookletSnapshot) => b.grade === grade && b.term === term);
          resolve(matched || list[0] || null);
        };

        admReq.onerror = () => resolve(null);
      };

      directReq.onerror = () => resolve(null);
    });
  } catch (e) {
    console.warn('Failed to read booklet snapshot from IndexedDB:', e);
    return null;
  }
}

/**
 * Save Focus Zone records into IndexedDB
 */
export async function saveFocusZoneRecordsToIndexedDB(records: CachedFocusZoneRecord[]): Promise<void> {
  if (records.length === 0) return;
  const db = await openAssessmentDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FOCUS_ZONE, 'readwrite');
    const store = tx.objectStore(STORES.FOCUS_ZONE);

    records.forEach((r) => store.put(r));

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieve Focus Zone records for a learner or grade from IndexedDB
 */
export async function getCachedFocusZoneRecords(
  learnerAdm?: string,
  grade?: string
): Promise<CachedFocusZoneRecord[]> {
  try {
    const db = await openAssessmentDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.FOCUS_ZONE, 'readonly');
      const store = tx.objectStore(STORES.FOCUS_ZONE);

      if (learnerAdm) {
        const index = store.index('learnerAdm');
        const req = index.getAll(learnerAdm.toUpperCase());
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } else if (grade) {
        const index = store.index('grade');
        const req = index.getAll(grade);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } else {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      }
    });
  } catch {
    return [];
  }
}

let curriculumCachedThisSession = false;
let idbSyncInFlight: Promise<{
  success: boolean;
  assessmentsCount: number;
  bookletsCount: number;
  focusZoneCount: number;
  lastSync: number;
}> | null = null;
let lastIdbSyncAt = 0;

/**
 * Cache curriculum structure (Grades, Strands, Sub-strands) into IndexedDB (once per session)
 */
export async function cacheCurriculumToIndexedDB(): Promise<void> {
  if (curriculumCachedThisSession) return;
  try {
    const db = await openAssessmentDB();
    const tx = db.transaction(STORES.CURRICULUM, 'readwrite');
    const store = tx.objectStore(STORES.CURRICULUM);

    const grades = Object.keys(DATA.grades);
    grades.forEach((g) => {
      const def = DATA.grades[g];
      store.put({
        key: g,
        grade: g,
        terms: def.terms,
        updatedAt: Date.now(),
      });
    });

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    curriculumCachedThisSession = true;
  } catch (e) {
    console.warn('Failed to cache curriculum to IndexedDB:', e);
  }
}

/**
 * Comprehensive Sync: Debounced & batched mirror of active assessment records into IndexedDB
 * without copying heavy base64 cover strings or blocking the UI main thread.
 */
export async function syncAllSchoolAssessmentsToIndexedDB(force: boolean = false): Promise<{
  success: boolean;
  assessmentsCount: number;
  bookletsCount: number;
  focusZoneCount: number;
  lastSync: number;
}> {
  if (idbSyncInFlight) return idbSyncInFlight;
  const nowCheck = Date.now();
  if (!force && nowCheck - lastIdbSyncAt < 2500) {
    return {
      success: true,
      assessmentsCount: 0,
      bookletsCount: 0,
      focusZoneCount: 0,
      lastSync: lastIdbSyncAt,
    };
  }

  idbSyncInFlight = (async () => {
    try {
      const db = await openAssessmentDB();

      let adminLearners: any[] = [];
      try {
        const rawAdmin = localStorage.getItem('lra_admin_v3');
        if (rawAdmin) {
          const parsed = JSON.parse(rawAdmin);
          adminLearners = parsed.learners || [];
        }
      } catch {
        // ignore
      }

      let cbcMarks: Record<string, any> = {};
      try {
        const rawMarks = localStorage.getItem('lra_cbc_marks_v1');
        if (rawMarks) {
          cbcMarks = JSON.parse(rawMarks);
        }
      } catch {
        // ignore
      }

      if (adminLearners.length > 0) {
        await new Promise<void>((resolve) => {
          const lTx = db.transaction(STORES.LEARNERS, 'readwrite');
          const lStore = lTx.objectStore(STORES.LEARNERS);
          adminLearners.forEach((l) => lStore.put(l));
          lTx.oncomplete = () => resolve();
          lTx.onerror = () => resolve();
        });
      }

      await cacheCurriculumToIndexedDB();

      const assessmentRecords: CachedAssessmentRecord[] = [];
      const focusZoneRecords: CachedFocusZoneRecord[] = [];
      const bookletSnapshots: CachedBookletSnapshot[] = [];
      const currentYear = new Date().getFullYear();
      const markEntries = Object.entries(cbcMarks);

      for (const learner of adminLearners) {
        const grade = learner.grade || 'Grade 4';
        const term = 'Term 3';
        let totalScoreSum = 0;
        let scoredSubjectsCount = 0;
        let fzItemsForLearner = 0;
        const admPrefix = `${learner.adm}_`;
        const idPrefix = `${learner.id}_`;

        for (const [key, record] of markEntries) {
          if (key.startsWith(admPrefix) || key.startsWith(idPrefix)) {
            const parts = key.split('_');
            const sid = parts[1] || 'Strand';
            const catsList = (record as any)?.cats || [];
            const asgList = (record as any)?.asg || [];

            const cScore =
              catsList.length > 0
                ? (catsList.reduce((acc: number, c: any) => acc + (Number(c.s) || 0), 0) /
                    (catsList.length * 10)) *
                  100
                : null;
            const aScore =
              asgList.length > 0
                ? (asgList.reduce((acc: number, a: any) => acc + (Number(a.s) || 0), 0) /
                    (asgList.length * 10)) *
                  100
                : null;

            let final: number | null = null;
            let band: 'EE' | 'ME' | 'AE' | 'BE' | null = null;
            if (cScore !== null && aScore !== null) {
              final = Math.round(cScore * 0.6 + aScore * 0.4);
              band = final >= 80 ? 'EE' : final >= 60 ? 'ME' : final >= 40 ? 'AE' : 'BE';
            }

            const isFz = final !== null && final <= 70;
            if (isFz) fzItemsForLearner++;

            assessmentRecords.push({
              key: `${learner.adm}_${grade}_${term}_${sid}`.toLowerCase(),
              learnerId: learner.id,
              learnerAdm: learner.adm,
              learnerName: learner.name,
              grade,
              term,
              subject: 'Core CBC Area',
              strandId: sid,
              strandName: sid,
              cats: catsList,
              assignments: asgList,
              catAvg: cScore,
              asgAvg: aScore,
              finalScore: final,
              levelBand: band,
              isFocusZone: isFz,
              updatedAt: Date.now(),
            });

            if (isFz) {
              focusZoneRecords.push({
                id: `fz_${learner.adm}_${sid}`,
                learnerAdm: learner.adm,
                learnerName: learner.name,
                grade,
                subject: 'Core CBC Area',
                strandName: sid,
                subStrandName: `${sid} Remediation`,
                score: final || 65,
                rubric: band || 'AE',
                status: 'active',
                attemptsCount: 1,
                updatedAt: Date.now(),
              });
            }

            if (final !== null) {
              totalScoreSum += final;
              scoredSubjectsCount++;
            }
          }
        }

        // Store compact snapshot (resolve static covers via DATA.covers[grade] at read time)
        bookletSnapshots.push({
          key: `${learner.id}_${grade}_${term}`.toLowerCase(),
          learnerId: learner.id,
          learnerAdm: learner.adm,
          learnerName: learner.name,
          grade,
          academicYear: currentYear,
          term,
          coverImage: '',
          reportCoverImage: '',
          bookData: { grade, term },
          reportData: { grade, term },
          summaryStats: {
            totalLearningAreas: grade.startsWith('Grade 1') || grade.startsWith('Grade 2') || grade.startsWith('Grade 3') ? 6 : 8,
            eeCount: 0,
            meCount: 0,
            aeCount: fzItemsForLearner,
            beCount: 0,
            focusZoneCount: fzItemsForLearner,
            averageScore: scoredSubjectsCount > 0 ? Math.round(totalScoreSum / scoredSubjectsCount) : 0,
          },
          cachedAt: Date.now(),
        });
      }

      await saveBulkAssessmentsToIndexedDB(assessmentRecords);
      await saveFocusZoneRecordsToIndexedDB(focusZoneRecords);

      if (bookletSnapshots.length > 0) {
        await new Promise<void>((resolve) => {
          const bTx = db.transaction(STORES.BOOKLETS, 'readwrite');
          const bStore = bTx.objectStore(STORES.BOOKLETS);
          bookletSnapshots.forEach((b) => bStore.put(b));
          bTx.oncomplete = () => resolve();
          bTx.onerror = () => resolve();
        });
      }

      const now = Date.now();
      lastIdbSyncAt = now;
      const metaTx = db.transaction(STORES.SYNC_META, 'readwrite');
      metaTx.objectStore(STORES.SYNC_META).put({
        id: 'last_sync_status',
        timestamp: now,
        assessmentsCount: assessmentRecords.length,
        bookletsCount: bookletSnapshots.length,
        focusZoneCount: focusZoneRecords.length,
        isIndexedDBCached: true,
      });

      return {
        success: true,
        assessmentsCount: assessmentRecords.length,
        bookletsCount: bookletSnapshots.length,
        focusZoneCount: focusZoneRecords.length,
        lastSync: now,
      };
    } catch (error) {
      console.error('Error during IndexedDB assessment synchronization:', error);
      return {
        success: false,
        assessmentsCount: 0,
        bookletsCount: 0,
        focusZoneCount: 0,
        lastSync: 0,
      };
    } finally {
      idbSyncInFlight = null;
    }
  })();

  return idbSyncInFlight;
}

/**
 * Read sync metadata from IndexedDB
 */
export async function getIndexedDBSyncMeta(): Promise<{
  timestamp: number;
  assessmentsCount: number;
  bookletsCount: number;
  focusZoneCount: number;
  isIndexedDBCached: boolean;
} | null> {
  try {
    const db = await openAssessmentDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.SYNC_META, 'readonly');
      const req = tx.objectStore(STORES.SYNC_META).get('last_sync_status');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Retrieve all cached learners from IndexedDB
 */
export async function getCachedLearnersFromIndexedDB(): Promise<any[]> {
  try {
    const db = await openAssessmentDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.LEARNERS, 'readonly');
      const req = tx.objectStore(STORES.LEARNERS).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Persist authoritative admin directory snapshot (teachers, learners, families, clientModifiedAt)
 * in IndexedDB so offline changes survive app restarts or cache resets without reverting to demo data.
 */
export async function saveAdminSnapshotToIndexedDB(adminState: any): Promise<void> {
  if (!adminState || typeof window === 'undefined') return;
  try {
    const db = await openAssessmentDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_META, 'readwrite');
      const store = tx.objectStore(STORES.SYNC_META);
      store.put({
        id: 'admin_state_backup',
        adminState,
        clientModifiedAt: Number(adminState.clientModifiedAt) || Date.now(),
        savedAt: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore storage errors
  }
}

export async function getAdminSnapshotFromIndexedDB(): Promise<{
  adminState: any;
  clientModifiedAt: number;
} | null> {
  if (typeof window === 'undefined') return null;
  try {
    const db = await openAssessmentDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORES.SYNC_META, 'readonly');
      const req = tx.objectStore(STORES.SYNC_META).get('admin_state_backup');
      req.onsuccess = () => {
        const res = req.result;
        if (res && res.adminState) {
          resolve({
            adminState: res.adminState,
            clientModifiedAt: Number(res.clientModifiedAt || res.adminState.clientModifiedAt || 0),
          });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Completely clear assessment marks, booklet snapshots, and Focus Zone caches
 * in IndexedDB once the 30-day post-Term 3 retention window completes.
 */
export async function clearAssessmentIndexedDB(): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) return;
  try {
    const db = await openAssessmentDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(
        [STORES.ASSESSMENTS, STORES.BOOKLETS, STORES.FOCUS_ZONE, STORES.SYNC_META],
        'readwrite'
      );
      tx.objectStore(STORES.ASSESSMENTS).clear();
      tx.objectStore(STORES.BOOKLETS).clear();
      tx.objectStore(STORES.FOCUS_ZONE).clear();
      tx.objectStore(STORES.SYNC_META).put({
        id: 'last_sync_status',
        timestamp: Date.now(),
        assessmentsCount: 0,
        bookletsCount: 0,
        focusZoneCount: 0,
        isIndexedDBCached: false,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Failed to clear IndexedDB assessment stores:', err);
  }
}


