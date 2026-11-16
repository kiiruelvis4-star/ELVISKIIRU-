/**
 * Little Roses Academy — Real-Time Cloud Synchronization Engine
 * Bridges all 4 Portals (Admin, Teachers, Learners, Parents) across devices.
 * Includes a persistent offline mutation outbox, deletion tombstones, and
 * clientModifiedAt precedence so offline-added teachers & learners are NEVER
 * overwritten by demo seed data when reconnecting or when the server restarts.
 */

import { AdminState } from '../components/admin/types';
import { StrandAssessmentRecord } from '../types/cbcAssessment';
import { processSyncedNotificationEvents } from './notifications';
import { saveAdminSnapshotToIndexedDB, clearAssessmentIndexedDB } from './indexedDBStorage';

const ADMIN_STORAGE_KEY = 'lra_admin_v3';
const MARKS_STORAGE_KEY = 'lra_cbc_marks_v1';
const SUBMISSIONS_STORAGE_KEY = 'lra_cbc_submissions_v1';
const COMMENTS_STORAGE_KEY = 'lra_assessment_comments_v1';
const ECOSYSTEM_STORAGE_KEY = 'lra_ecosystem_sync_v1';
const CALENDAR_STORAGE_KEY = 'lra_cbc_calendar_v1';
const BELL_NOTICES_KEY = 'lra_cbc_notices_v1';
const OUTBOX_STORAGE_KEY = 'lra_sync_outbox_v1';
const TOMBSTONES_STORAGE_KEY = 'lra_deleted_ids_v1';

interface SyncDelta {
  adminState?: Partial<AdminState> & { clientModifiedAt?: number };
  marks?: Record<string, StrandAssessmentRecord>;
  comments?: Record<string, string>;
  submissions?: Record<string, any>;
  ecosystem?: any;
  calendar?: any;
  bellNotices?: any[];
  deletedTeacherIds?: string[];
  deletedLearnerIds?: string[];
  deletedFamilyIds?: string[];
  replaceLists?: boolean;
  clearAssessments?: boolean;
  queuedAt?: number;
}

interface DeletionTombstones {
  teachers: string[];
  learners: string[];
  families: string[];
}

let lastKnownSyncTime = 0;
let isPollingActive = false;
let pollTimer: any = null;
let flushInFlight: Promise<boolean> | null = null;

function readTombstones(): DeletionTombstones {
  try {
    const raw = localStorage.getItem(TOMBSTONES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        teachers: Array.isArray(parsed.teachers) ? parsed.teachers : [],
        learners: Array.isArray(parsed.learners) ? parsed.learners : [],
        families: Array.isArray(parsed.families) ? parsed.families : [],
      };
    }
  } catch {
    // ignore
  }
  return { teachers: [], learners: [], families: [] };
}

function writeTombstones(t: DeletionTombstones) {
  try {
    localStorage.setItem(
      TOMBSTONES_STORAGE_KEY,
      JSON.stringify({
        teachers: Array.from(new Set(t.teachers)).slice(-300),
        learners: Array.from(new Set(t.learners)).slice(-500),
        families: Array.from(new Set(t.families)).slice(-300),
      })
    );
  } catch {
    // ignore
  }
}

export function recordAdminDeletions(opts: {
  teacherIds?: string[];
  learnerIds?: string[];
  familyIds?: string[];
}) {
  if (typeof window === 'undefined') return;
  const cur = readTombstones();
  if (opts.teacherIds?.length) cur.teachers.push(...opts.teacherIds);
  if (opts.learnerIds?.length) cur.learners.push(...opts.learnerIds);
  if (opts.familyIds?.length) cur.families.push(...opts.familyIds);
  writeTombstones(cur);

  enqueueOutboxDelta({
    deletedTeacherIds: opts.teacherIds,
    deletedLearnerIds: opts.learnerIds,
    deletedFamilyIds: opts.familyIds,
  });
}

export function clearDeletionTombstonesFor(opts: {
  teacherIds?: string[];
  learnerIds?: string[];
  familyIds?: string[];
}) {
  if (typeof window === 'undefined') return;
  const cur = readTombstones();
  if (opts.teacherIds?.length) {
    const remove = new Set(opts.teacherIds);
    cur.teachers = cur.teachers.filter((id) => !remove.has(id));
  }
  if (opts.learnerIds?.length) {
    const remove = new Set(opts.learnerIds.map((x) => x.toUpperCase()));
    cur.learners = cur.learners.filter((id) => !remove.has(id.toUpperCase()));
  }
  if (opts.familyIds?.length) {
    const remove = new Set(opts.familyIds);
    cur.families = cur.families.filter((id) => !remove.has(id));
  }
  writeTombstones(cur);
}

function readOutbox(): SyncDelta | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeOutbox(delta: SyncDelta | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!delta) {
      localStorage.removeItem(OUTBOX_STORAGE_KEY);
    } else {
      localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(delta));
    }
  } catch {
    // ignore
  }
}

export function hasPendingOutbox(): boolean {
  const out = readOutbox();
  if (!out) return false;
  return Boolean(
    out.adminState ||
      out.marks ||
      out.comments ||
      out.submissions ||
      out.ecosystem ||
      out.calendar ||
      out.bellNotices?.length ||
      out.deletedTeacherIds?.length ||
      out.deletedLearnerIds?.length ||
      out.deletedFamilyIds?.length
  );
}

function enqueueOutboxDelta(delta: SyncDelta) {
  if (typeof window === 'undefined') return;
  const prev = readOutbox() || {};
  const merged: SyncDelta = {
    ...prev,
    ...delta,
    adminState: delta.adminState
      ? { ...(prev.adminState || {}), ...delta.adminState }
      : prev.adminState,
    marks: delta.marks ? { ...(prev.marks || {}), ...delta.marks } : prev.marks,
    comments: delta.comments ? { ...(prev.comments || {}), ...delta.comments } : prev.comments,
    submissions: delta.submissions
      ? { ...(prev.submissions || {}), ...delta.submissions }
      : prev.submissions,
    ecosystem: delta.ecosystem
      ? { ...(prev.ecosystem || {}), ...delta.ecosystem }
      : prev.ecosystem,
    calendar: delta.calendar ? { ...(prev.calendar || {}), ...delta.calendar } : prev.calendar,
    bellNotices: delta.bellNotices
      ? [...delta.bellNotices, ...(prev.bellNotices || [])].slice(0, 40)
      : prev.bellNotices,
    deletedTeacherIds: Array.from(
      new Set([...(prev.deletedTeacherIds || []), ...(delta.deletedTeacherIds || [])])
    ),
    deletedLearnerIds: Array.from(
      new Set([...(prev.deletedLearnerIds || []), ...(delta.deletedLearnerIds || [])])
    ),
    deletedFamilyIds: Array.from(
      new Set([...(prev.deletedFamilyIds || []), ...(delta.deletedFamilyIds || [])])
    ),
    replaceLists: Boolean(delta.replaceLists ?? prev.replaceLists),
    queuedAt: Date.now(),
  };
  writeOutbox(merged);
}

/**
 * Stamps local AdminState as locally authored/modified and mirrors to IndexedDB + outbox.
 */
export function markLocalAdminModified(adminState: AdminState): AdminState {
  const stamped = {
    ...adminState,
    clientModifiedAt: Date.now(),
  } as AdminState & { clientModifiedAt: number };
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(stamped));
  } catch {
    // ignore
  }
  saveAdminSnapshotToIndexedDB(stamped).catch(() => {});
  return stamped;
}

/**
 * Flush queued offline changes to the cloud database BEFORE pulling remote state.
 */
export async function flushOfflineOutbox(): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.onLine) return false;
  if (flushInFlight) return flushInFlight;

  const pending = readOutbox();
  if (!pending) return true;

  flushInFlight = (async () => {
    try {
      const tombstones = readTombstones();
      const payload: SyncDelta = {
        ...pending,
        deletedTeacherIds: Array.from(
          new Set([...(pending.deletedTeacherIds || []), ...tombstones.teachers])
        ),
        deletedLearnerIds: Array.from(
          new Set([...(pending.deletedLearnerIds || []), ...tombstones.learners])
        ),
        deletedFamilyIds: Array.from(
          new Set([...(pending.deletedFamilyIds || []), ...tombstones.families])
        ),
      };
      const res = await fetch('/api/school/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.lastUpdated) {
        lastKnownSyncTime = Math.max(lastKnownSyncTime, data.lastUpdated);
      }
      writeOutbox(null);
      return true;
    } catch {
      return false;
    } finally {
      flushInFlight = null;
    }
  })();

  return flushInFlight;
}

/**
 * Fetch complete cloud database state from server and safely merge into local storage
 * after flushing any pending offline changes.
 */
export async function pullSchoolStateFromCloud(): Promise<boolean> {
  let updated = false;

  // CRITICAL: Always flush pending offline changes BEFORE accepting server snapshots
  if (hasPendingOutbox() && typeof navigator !== 'undefined' && navigator.onLine) {
    await flushOfflineOutbox();
  }

  try {
    const res = await fetch('/api/school/state', {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.state) {
        applyCloudStateToLocal(data.state, data.lastUpdated);
        updated = true;
      }
    }
  } catch (err) {
    console.warn('Could not pull cloud state (offline or dev server busy):', err);
  }

  try {
    const sbMod = await import('../supabaseClient');
    if (sbMod.isSupabaseConfigured()) {
      const sbData = await sbMod.pullSchoolRecordsFromSupabase();
      if (sbData && Object.keys(sbData).length > 0) {
        const currentRaw = localStorage.getItem(ADMIN_STORAGE_KEY);
        const currentAdmin = currentRaw ? JSON.parse(currentRaw) : {};
        const mergedAdmin = {
          ...currentAdmin,
          ...(sbData.school
            ? {
                school: {
                  ...(currentAdmin.school || {}),
                  ...sbData.school,
                  whatsapp: sbData.school.whatsapp || currentAdmin.school?.whatsapp || '+254 736 573 436',
                  facebook: sbData.school.facebook || currentAdmin.school?.facebook || 'Little Roses Juniorate Academy',
                  instagram: sbData.school.instagram || currentAdmin.school?.instagram || '@little_roses_academy',
                },
              }
            : {}),
          ...(sbData.teachers && sbData.teachers.length > 0 ? { teachers: sbData.teachers } : {}),
          ...(sbData.learners && sbData.learners.length > 0 ? { learners: sbData.learners } : {}),
          ...(sbData.families && sbData.families.length > 0 ? { families: sbData.families } : {}),
          ...(sbData.timetable ? { timetable: sbData.timetable } : {}),
          ...(sbData.timetableSlots ? { timetableSlots: sbData.timetableSlots } : {}),
        };
        applyCloudStateToLocal({ adminState: mergedAdmin, lastClientWriteAt: Date.now() });
        updated = true;
      }
    }
  } catch {
    // optional Supabase merge
  }

  return updated;
}

/**
 * Apply cloud database state into client storage without ever clobbering local offline edits
 * with demo seed state.
 */
export function applyCloudStateToLocal(cloudState: any, lastUpdated?: number) {
  if (typeof window === 'undefined' || !cloudState) return;

  try {
    if (lastUpdated) {
      lastKnownSyncTime = Math.max(lastKnownSyncTime, lastUpdated);
    }

    const localTombstones = readTombstones();
    const delTeacherSet = new Set<string>([
      ...localTombstones.teachers,
      ...(Array.isArray(cloudState.deletedTeacherIds) ? cloudState.deletedTeacherIds : []),
    ]);
    const delLearnerSet = new Set<string>(
      [
        ...localTombstones.learners,
        ...(Array.isArray(cloudState.deletedLearnerIds) ? cloudState.deletedLearnerIds : []),
      ].map((x) => String(x).toUpperCase())
    );
    const delFamilySet = new Set<string>([
      ...localTombstones.families,
      ...(Array.isArray(cloudState.deletedFamilyIds) ? cloudState.deletedFamilyIds : []),
    ]);

    // 1. Admin State (Teachers, Learners, Families, Timetable, Notices, Admin credentials)
    let nextAdminState = cloudState.adminState;
    if (cloudState.adminState) {
      const currentRaw = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (currentRaw) {
        try {
          const current = JSON.parse(currentRaw);
          const localModifiedAt = Number(current?.clientModifiedAt || 0);
          const serverModifiedAt = Number(
            cloudState.lastClientWriteAt || cloudState.adminState?.clientModifiedAt || 0
          );
          const pendingLocal = hasPendingOutbox();

          // Protect local edits if:
          // 1. Outbox still has unsynced mutations
          // 2. Local edits are strictly newer than last real client write on server
          // 3. Server returned an untouched seed (!serverModifiedAt) while user has modified local records
          const shouldPreserveLocalLists =
            pendingLocal ||
            (localModifiedAt > 0 && (!serverModifiedAt || localModifiedAt > serverModifiedAt));

          if (shouldPreserveLocalLists) {
            nextAdminState = {
              ...cloudState.adminState,
              ...current,
              teachers: (current.teachers || []).filter(
                (t: any) => !t?.id || !delTeacherSet.has(t.id)
              ),
              learners: (current.learners || []).filter(
                (l: any) =>
                  (!l?.id || !delLearnerSet.has(String(l.id).toUpperCase())) &&
                  (!l?.adm || !delLearnerSet.has(String(l.adm).toUpperCase()))
              ),
              families: (current.families || []).filter(
                (f: any) => !f?.id || !delFamilySet.has(f.id)
              ),
              theme: current.theme || cloudState.adminState.theme || 'light',
            };
            // Schedule authoritative re-push so server matches this device
            if (!pendingLocal && navigator.onLine) {
              pushSchoolStateToCloud({
                adminState: nextAdminState,
                replaceLists: true,
              }).catch(() => {});
            }
          } else {
            nextAdminState = {
              ...current,
              ...cloudState.adminState,
              teachers: (cloudState.adminState.teachers || current.teachers || []).filter(
                (t: any) => !t?.id || !delTeacherSet.has(t.id)
              ),
              learners: (cloudState.adminState.learners || current.learners || []).filter(
                (l: any) =>
                  (!l?.id || !delLearnerSet.has(String(l.id).toUpperCase())) &&
                  (!l?.adm || !delLearnerSet.has(String(l.adm).toUpperCase()))
              ),
              families: (cloudState.adminState.families || current.families || []).filter(
                (f: any) => !f?.id || !delFamilySet.has(f.id)
              ),
              clientModifiedAt: Math.max(localModifiedAt, serverModifiedAt),
              theme: current.theme || cloudState.adminState.theme || 'light',
            };
          }
        } catch {
          // ignore
        }
      }
      if (nextAdminState) {
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(nextAdminState));
        saveAdminSnapshotToIndexedDB(nextAdminState).catch(() => {});
      }
    }

    const cloudClearedAt = Number(cloudState.assessmentClearedAt || 0);
    const localClearedAt = Number(localStorage.getItem('lra_last_assessment_clear_at') || 0);
    if (cloudClearedAt > localClearedAt) {
      localStorage.setItem('lra_last_assessment_clear_at', String(cloudClearedAt));
      localStorage.setItem(MARKS_STORAGE_KEY, JSON.stringify({}));
      localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify({}));
      localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify({}));
      localStorage.setItem('lra_cbc_fz_v1', JSON.stringify({}));
      clearAssessmentIndexedDB().catch(() => {});
    } else {
      // 2. Assessment Marks
      if (cloudState.marks) {
        const currentMarksRaw = localStorage.getItem(MARKS_STORAGE_KEY);
        let mergedMarks = cloudState.marks;
        if (currentMarksRaw) {
          try {
            const currentMarks = JSON.parse(currentMarksRaw);
            mergedMarks = { ...cloudState.marks, ...currentMarks };
            // Prefer non-empty records from cloud while preserving unsynced local additions
            for (const [k, v] of Object.entries(cloudState.marks)) {
              if (!currentMarks[k]) mergedMarks[k] = v;
            }
          } catch {
            // ignore
          }
        }
        localStorage.setItem(MARKS_STORAGE_KEY, JSON.stringify(mergedMarks));
      }

      // 3. Booklet Comments
      if (cloudState.comments) {
        const currentCommentsRaw = localStorage.getItem(COMMENTS_STORAGE_KEY);
        let mergedComments = cloudState.comments;
        if (currentCommentsRaw) {
          try {
            const currentComments = JSON.parse(currentCommentsRaw);
            mergedComments = { ...currentComments, ...cloudState.comments };
          } catch {
            // ignore
          }
        }
        localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(mergedComments));
      }

      // 4. Submissions & Releases
      if (cloudState.submissions) {
        const currentSubsRaw = localStorage.getItem(SUBMISSIONS_STORAGE_KEY);
        let mergedSubs = cloudState.submissions;
        if (currentSubsRaw) {
          try {
            const currentSubs = JSON.parse(currentSubsRaw);
            mergedSubs = { ...currentSubs, ...cloudState.submissions };
          } catch {
            // ignore
          }
        }
        localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(mergedSubs));
      }
    }

    // 5. Ecosystem (Attendance, notices, homework, fees, cbc documents)
    if (cloudState.ecosystem) {
      const currentEcoRaw = localStorage.getItem(ECOSYSTEM_STORAGE_KEY);
      let mergedEco = cloudState.ecosystem;
      if (currentEcoRaw) {
        try {
          const currentEco = JSON.parse(currentEcoRaw);
          mergedEco = { ...currentEco, ...cloudState.ecosystem };
        } catch {
          // ignore
        }
      }
      localStorage.setItem(ECOSYSTEM_STORAGE_KEY, JSON.stringify(mergedEco));
      window.dispatchEvent(new CustomEvent('lra-cloud-ecosystem-updated', { detail: mergedEco }));
    }

    // 6. Calendar & Promotion
    if (cloudState.calendar) {
      localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(cloudState.calendar));
    }

    // 7. Cross-device Bell Notices
    if (Array.isArray(cloudState.bellNotices) && cloudState.bellNotices.length > 0) {
      try {
        const existingRaw = localStorage.getItem(BELL_NOTICES_KEY);
        const existingList: any[] = existingRaw ? JSON.parse(existingRaw) : [];
        const map = new Map<string, any>();
        [...cloudState.bellNotices, ...existingList].forEach((n) => {
          if (n?.id && !map.has(n.id)) map.set(n.id, n);
        });
        const mergedNotices = Array.from(map.values())
          .sort((a, b) => Number(b.at || 0) - Number(a.at || 0))
          .slice(0, 30);
        localStorage.setItem(BELL_NOTICES_KEY, JSON.stringify(mergedNotices));
      } catch {
        // ignore
      }
    }

    // 8. Trigger heads-up OS notifications for newly released booklets / notices / CATs
    processSyncedNotificationEvents(cloudState).catch(() => {});

    // Broadcast synchronization to all active React hooks and components
    window.dispatchEvent(new CustomEvent('lra_data_sync', { detail: { source: 'cloud_sync' } }));
    if (nextAdminState) {
      window.dispatchEvent(
        new CustomEvent('lra-admin-state-updated', {
          detail: { ...nextAdminState, __fromCloud: true },
        })
      );
    }
  } catch (err) {
    console.error('Error applying cloud state to local storage:', err);
  }
}

/**
 * Push local changes to cloud database (learners, teachers, marks, notices, etc.).
 * Automatically queues to persistent offline outbox whenever offline or network fails.
 */
export async function pushSchoolStateToCloud(delta: {
  adminState?: Partial<AdminState> & { clientModifiedAt?: number };
  marks?: Record<string, StrandAssessmentRecord>;
  comments?: Record<string, string>;
  submissions?: Record<string, any>;
  ecosystem?: any;
  calendar?: any;
  bellNotices?: any[];
  deletedTeacherIds?: string[];
  deletedLearnerIds?: string[];
  deletedFamilyIds?: string[];
  replaceLists?: boolean;
  clearAssessments?: boolean;
}): Promise<boolean> {
  const tombstones = readTombstones();
  const payload: SyncDelta = {
    ...delta,
    deletedTeacherIds: Array.from(
      new Set([...(delta.deletedTeacherIds || []), ...tombstones.teachers])
    ),
    deletedLearnerIds: Array.from(
      new Set([...(delta.deletedLearnerIds || []), ...tombstones.learners])
    ),
    deletedFamilyIds: Array.from(
      new Set([...(delta.deletedFamilyIds || []), ...tombstones.families])
    ),
  };

  // Persist to outbox before attempting network so offline additions are guaranteed safe
  enqueueOutboxDelta(payload);

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  try {
    const res = await fetch('/api/school/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return false;
    const data = await res.json();
    if (data.lastUpdated) {
      lastKnownSyncTime = Math.max(lastKnownSyncTime, data.lastUpdated);
    }
    writeOutbox(null);
    return true;
  } catch (err) {
    console.warn('Queued changes in offline outbox (server unreachable):', err);
    return false;
  }
}

/**
 * Dedicated helper to push assessment book marks and comments (queues offline automatically)
 */
export async function pushMarksToCloud(
  marks: Record<string, StrandAssessmentRecord>,
  comments?: Record<string, string>,
  submissions?: Record<string, any>
): Promise<boolean> {
  enqueueOutboxDelta({ marks, comments, submissions });
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  try {
    const res = await fetch('/api/school/marks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marks, comments, submissions }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.lastUpdated) {
      lastKnownSyncTime = Math.max(lastKnownSyncTime, data.lastUpdated);
    }
    // Clear marks/comments/submissions fields from outbox while keeping any adminState pending
    const existing = readOutbox();
    if (existing) {
      delete existing.marks;
      delete existing.comments;
      delete existing.submissions;
      const stillHasData = Boolean(
        existing.adminState ||
          existing.ecosystem ||
          existing.calendar ||
          existing.bellNotices?.length ||
          existing.deletedTeacherIds?.length
      );
      writeOutbox(stillHasData ? existing : null);
    }
    return true;
  } catch (err) {
    console.warn('Queued marks in offline outbox:', err);
    return false;
  }
}

/**
 * Push 30-day Term 3 complete assessment book erasure to cloud database
 */
export async function pushAssessmentClearToCloud(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const now = Date.now();
  try {
    localStorage.setItem('lra_last_assessment_clear_at', String(now));
  } catch {
    // ignore
  }
  if (!navigator.onLine) return false;
  try {
    const res = await fetch('/api/school/marks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clearAssessments: true }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

let isPollInFlight = false;
let visibilityHandlerRef: (() => void) | null = null;
let onlineHandlerRef: (() => void) | null = null;

/**
 * Start background polling for cross-device updates (e.g. Teacher enters marks on Phone A, Parent sees on Phone B)
 */
export function startCloudPolling(intervalMs: number = 4000): void {
  if (typeof window === 'undefined' || isPollingActive) return;
  isPollingActive = true;

  // Immediate flush of offline work + initial pull
  pullSchoolStateFromCloud().catch(console.warn);

  const poll = async () => {
    if (!isPollingActive) return;
    if (document.hidden || !navigator.onLine || isPollInFlight) {
      pollTimer = setTimeout(poll, intervalMs);
      return;
    }

    isPollInFlight = true;
    try {
      if (hasPendingOutbox()) {
        await flushOfflineOutbox();
      }
      const res = await fetch(`/api/school/poll?since=${lastKnownSyncTime}`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.hasUpdates && data.state) {
          applyCloudStateToLocal(data.state, data.lastUpdated);
        }
      }
    } catch {
      // transient failure, ignore
    } finally {
      isPollInFlight = false;
    }

    if (isPollingActive) {
      pollTimer = setTimeout(poll, intervalMs);
    }
  };

  pollTimer = setTimeout(poll, intervalMs);

  visibilityHandlerRef = () => {
    if (!document.hidden && navigator.onLine) {
      pullSchoolStateFromCloud().catch(console.warn);
    }
  };
  onlineHandlerRef = () => {
    pullSchoolStateFromCloud().catch(console.warn);
  };

  window.addEventListener('visibilitychange', visibilityHandlerRef);
  window.addEventListener('online', onlineHandlerRef);
}

/**
 * Stop background polling
 */
export function stopCloudPolling(): void {
  isPollingActive = false;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  if (typeof window !== 'undefined') {
    if (visibilityHandlerRef) {
      window.removeEventListener('visibilitychange', visibilityHandlerRef);
      visibilityHandlerRef = null;
    }
    if (onlineHandlerRef) {
      window.removeEventListener('online', onlineHandlerRef);
      onlineHandlerRef = null;
    }
  }
}
