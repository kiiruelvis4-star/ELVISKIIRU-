/**
 * Little Roses Academy — Unified Notification Inbox, Lock-Screen Web Push & Background Sync Engine
 * Supports WhatsApp-style inbox threads, OS lock-screen Web Push (VAPID), Periodic Background Sync,
 * Background Sync fallback, and real-time multi-portal alerts.
 */

const NOTIFIED_EVENTS_KEY = 'lra_notified_events_v1';
const PROMPT_DISMISSED_KEY = 'lra_notif_prompt_done_v1';
const INBOX_STORAGE_KEY = 'lra_notification_inbox_v1';
const PUSH_REGISTERED_KEY = 'lra_web_push_registered_v1';

export type NotifPermissionState = NotificationPermission | 'unsupported';
export type NotificationCategory = 'booklet' | 'notice' | 'homework' | 'system';

export interface InboxNotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  sender?: string;
  targetPortal?: 'parents' | 'learners' | 'teachers' | 'admin' | 'all';
  targetTab?: string;
  learnerId?: string;
  url?: string;
  createdAt: number;
  read: boolean;
}

export interface PortalNotificationScope {
  portalId?: 'admin' | 'teachers' | 'learners' | 'parents' | 'all';
  userId?: string;
  userName?: string;
  adm?: string;
  grade?: string;
  phone?: string;
  linkedLearnerIds?: string[];
  linkedLearnerNames?: string[];
  subjects?: string[];
}

function normalizeScopePortalId(raw?: string): 'admin' | 'teachers' | 'learners' | 'parents' | 'all' {
  const s = String(raw || '').toLowerCase();
  if (s === 'admin') return 'admin';
  if (s === 'teachers' || s === 'teacher' || s === 'staff') return 'teachers';
  if (s === 'learners' || s === 'learner' || s === 'pupil') return 'learners';
  if (s === 'parents' || s === 'parent' || s === 'family') return 'parents';
  return 'all';
}

export function getActiveNotificationScopeFromStorage(): PortalNotificationScope {
  if (typeof window === 'undefined') return { portalId: 'all' };
  try {
    const raw = localStorage.getItem('lra_session_user');
    if (!raw) return { portalId: 'all' };
    const sess = JSON.parse(raw);
    const portalId = normalizeScopePortalId(sess?.portalId);
    const linkedLearnerIds: string[] = [];
    const linkedLearnerNames: string[] = [];
    if (portalId === 'learners') {
      if (sess?.id) linkedLearnerIds.push(sess.id);
      if (sess?.adm) linkedLearnerIds.push(sess.adm);
      if (sess?.name) linkedLearnerNames.push(sess.name);
    } else if (portalId === 'parents' && Array.isArray(sess?.linkedLearners)) {
      sess.linkedLearners.forEach((k: any) => {
        if (k?.id) linkedLearnerIds.push(k.id);
        if (k?.adm) linkedLearnerIds.push(k.adm);
        if (k?.name) linkedLearnerNames.push(k.name);
      });
    }
    return {
      portalId,
      userId: sess?.id,
      userName: sess?.name,
      adm: sess?.adm,
      grade: sess?.grade,
      phone: sess?.phone || sess?.identifier,
      linkedLearnerIds,
      linkedLearnerNames,
      subjects: sess?.subjects,
    };
  } catch {
    return { portalId: 'all' };
  }
}

function itemMatchesScope(item: InboxNotificationItem, scope?: PortalNotificationScope): boolean {
  if (!scope || !scope.portalId || scope.portalId === 'all') return true;
  const portal = scope.portalId;
  const itemPortal = item.targetPortal || 'all';

  if (portal === 'admin') {
    return true;
  }

  if (itemPortal !== 'all' && itemPortal !== portal) {
    return false;
  }

  if (portal === 'learners') {
    if (item.learnerId) {
      const keys = [
        ...(scope.linkedLearnerIds || []),
        scope.userId,
        scope.adm,
      ].filter(Boolean);
      if (keys.length > 0 && !keys.includes(item.learnerId)) {
        return false;
      }
    }
    return true;
  }

  if (portal === 'parents') {
    if (item.learnerId && scope.linkedLearnerIds && scope.linkedLearnerIds.length > 0) {
      if (!scope.linkedLearnerIds.includes(item.learnerId)) {
        return false;
      }
    }
    return true;
  }

  if (portal === 'teachers') {
    // Teachers see teacher/all notices, timetable updates, CATs & academic notices (not parent-only child reports)
    if (item.targetPortal === 'parents' || item.targetPortal === 'learners') return false;
    return true;
  }

  return true;
}

function getMirroredPortalNotices(scope?: PortalNotificationScope): InboxNotificationItem[] {
  if (typeof window === 'undefined') return [];
  const list: InboxNotificationItem[] = [];
  const portal = scope?.portalId || 'all';

  try {
    const adminRaw = localStorage.getItem('lra_admin_v3');
    if (adminRaw) {
      const admin = JSON.parse(adminRaw);
      const notices: any[] = Array.isArray(admin.notices) ? admin.notices : [];
      notices.slice(0, 8).forEach((n) => {
        if (!n?.id) return;
        list.push({
          id: `admin_notice_${n.id}`,
          category: 'notice',
          title: n.title || 'School Notice',
          body: n.body || '',
          sender: n.from || 'School Administration',
          targetPortal: 'all',
          targetTab: 'home',
          createdAt: Number(n.at || Date.now()),
          read: !n.unread,
        });
      });

      if (portal === 'admin') {
        const pwReqs: any[] = Array.isArray(admin.passwordRequests) ? admin.passwordRequests : [];
        pwReqs
          .filter((r) => r?.status === 'pending')
          .forEach((r) => {
            list.push({
              id: `pw_req_${r.id}`,
              category: 'system',
              title: `🔐 Password Reset Request — ${r.learnerName || r.adm || 'Learner'}`,
              body: `${r.requestedBy || 'Parent/Learner'} requested password update (${r.grade || 'CBC'}). Tap to review in Admin Office.`,
              sender: 'Security Queue',
              targetPortal: 'admin',
              targetTab: 'settings',
              createdAt: Number(r.requestedAt || Date.now()),
              read: false,
            });
          });
      }
    }
  } catch {
    // ignore
  }
  return list;
}

function emitNotificationsChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('lra_notifications_updated'));
}

export function getInboxNotifications(scope?: PortalNotificationScope): InboxNotificationItem[] {
  if (typeof window === 'undefined') return [];
  const resolvedScope = scope || getActiveNotificationScopeFromStorage();
  try {
    const raw = localStorage.getItem(INBOX_STORAGE_KEY);
    const stored: InboxNotificationItem[] = raw ? JSON.parse(raw) : [];
    const baseList = Array.isArray(stored) ? stored : [];

    // Merge live local admin notices / pending requests without duplicating already stored IDs
    const seenIds = new Set(baseList.map((i) => i.id));
    const mirrored = getMirroredPortalNotices(resolvedScope).filter((m) => !seenIds.has(m.id));
    const combined = [...baseList, ...mirrored];

    return combined
      .filter((item) => itemMatchesScope(item, resolvedScope))
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  } catch {
    return [];
  }
}

export function getUnreadNotificationCount(scope?: PortalNotificationScope): number {
  const list = getInboxNotifications(scope);
  return list.filter((n) => !n.read).length;
}

export function addInboxNotification(
  item: Omit<InboxNotificationItem, 'read'> & { read?: boolean }
): boolean {
  if (typeof window === 'undefined' || !item?.id) return false;
  try {
    const raw = localStorage.getItem(INBOX_STORAGE_KEY);
    const current: InboxNotificationItem[] = raw ? JSON.parse(raw) : [];
    const safeCurrent = Array.isArray(current) ? current : [];
    if (safeCurrent.some((x) => x.id === item.id)) {
      return false;
    }
    const nextItem: InboxNotificationItem = {
      ...item,
      createdAt: item.createdAt || Date.now(),
      read: Boolean(item.read),
    };
    const updated = [nextItem, ...safeCurrent].slice(0, 80);
    localStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(updated));
    emitNotificationsChanged();
    return true;
  } catch {
    return false;
  }
}

export function markNotificationRead(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(INBOX_STORAGE_KEY);
    const current: InboxNotificationItem[] = raw ? JSON.parse(raw) : [];
    const list = (Array.isArray(current) ? current : []).map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    localStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(list));

    // Also clear unread flag on mirrored admin notice if applicable
    if (id.startsWith('admin_notice_')) {
      const origId = id.replace('admin_notice_', '');
      const adminRaw = localStorage.getItem('lra_admin_v3');
      if (adminRaw) {
        const admin = JSON.parse(adminRaw);
        if (Array.isArray(admin.notices)) {
          admin.notices = admin.notices.map((n: any) =>
            String(n?.id) === origId ? { ...n, unread: false } : n
          );
          localStorage.setItem('lra_admin_v3', JSON.stringify(admin));
        }
      }
    }

    emitNotificationsChanged();
  } catch {
    // ignore
  }
}

export function markAllNotificationsRead(scope?: PortalNotificationScope): void {
  if (typeof window === 'undefined') return;
  const resolvedScope = scope || getActiveNotificationScopeFromStorage();
  try {
    const raw = localStorage.getItem(INBOX_STORAGE_KEY);
    const current: InboxNotificationItem[] = raw ? JSON.parse(raw) : [];
    const list = (Array.isArray(current) ? current : []).map((n) =>
      itemMatchesScope(n, resolvedScope) ? { ...n, read: true } : n
    );
    localStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(list));

    const adminRaw = localStorage.getItem('lra_admin_v3');
    if (adminRaw) {
      const admin = JSON.parse(adminRaw);
      if (Array.isArray(admin.notices)) {
        admin.notices = admin.notices.map((n: any) => ({ ...n, unread: false }));
        localStorage.setItem('lra_admin_v3', JSON.stringify(admin));
      }
    }

    emitNotificationsChanged();
  } catch {
    // ignore
  }
}

export function clearInboxNotifications(scope?: PortalNotificationScope): void {
  if (typeof window === 'undefined') return;
  const resolvedScope = scope || getActiveNotificationScopeFromStorage();
  try {
    if (!resolvedScope.portalId || resolvedScope.portalId === 'all') {
      localStorage.removeItem(INBOX_STORAGE_KEY);
    } else {
      const raw = localStorage.getItem(INBOX_STORAGE_KEY);
      const current: InboxNotificationItem[] = raw ? JSON.parse(raw) : [];
      const kept = (Array.isArray(current) ? current : []).filter(
        (n) => !itemMatchesScope(n, resolvedScope)
      );
      localStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(kept));
    }
    emitNotificationsChanged();
  } catch {
    // ignore
  }
}

export function getNotificationPermissionState(): NotifPermissionState {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  return Notification.permission;
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function isWebPushActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      getNotificationPermissionState() === 'granted' &&
      Boolean(localStorage.getItem(PUSH_REGISTERED_KEY))
    );
  } catch {
    return false;
  }
}

export function markNotificationPromptHandled(): void {
  try {
    localStorage.setItem(PROMPT_DISMISSED_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function wasNotificationPromptHandled(): boolean {
  try {
    return Boolean(localStorage.getItem(PROMPT_DISMISSED_KEY));
  } catch {
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribe device Service Worker to server VAPID Web Push + Periodic Background Sync
 * so alerts appear even when the app is closed or phone screen is locked.
 */
export async function ensureWebPushSubscribed(): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    getNotificationPermissionState() !== 'granted'
  ) {
    return false;
  }

  try {
    const reg =
      (await navigator.serviceWorker.getRegistration()) ||
      (await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
      ]));

    if (!reg) return false;

    // 1. Register Background Sync & Periodic Background Sync if supported
    try {
      const regAny = reg as any;
      if (regAny.sync && typeof regAny.sync.register === 'function') {
        await regAny.sync.register('lra-sync-notifications').catch(() => {});
      }
      if (regAny.periodicSync && typeof regAny.periodicSync.register === 'function') {
        await regAny.periodicSync
          .register('lra-periodic-alerts', { minInterval: 15 * 60 * 1000 })
          .catch(() => {});
      }
    } catch {
      // optional on unsupported browsers
    }

    // 2. Get or create VAPID PushSubscription
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      const keyRes = await fetch('/api/push/vapid-public-key', { cache: 'no-store' });
      if (!keyRes.ok) return false;
      const keyData = await keyRes.json();
      if (!keyData?.publicKey) return false;

      const appServerKey = urlBase64ToUint8Array(keyData.publicKey);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey as unknown as BufferSource,
      });
    }

    // 3. Attach current user session context (Parent / Learner / Teacher / Admin)
    let sessionUser: any = null;
    try {
      const raw = localStorage.getItem('lra_session_user');
      if (raw) sessionUser = JSON.parse(raw);
    } catch {
      // ignore
    }

    const linkedLearnerIds: string[] = [];
    if (sessionUser?.id && sessionUser?.portalId === 'learners') {
      linkedLearnerIds.push(sessionUser.id);
    }
    if (Array.isArray(sessionUser?.linkedLearners)) {
      sessionUser.linkedLearners.forEach((k: any) => {
        if (k?.id) linkedLearnerIds.push(k.id);
      });
    }

    const subRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        portal: sessionUser?.portalId || 'parents',
        userId: sessionUser?.id || '',
        phone: sessionUser?.phone || sessionUser?.identifier || '',
        linkedLearnerIds,
      }),
    });

    if (subRes.ok) {
      localStorage.setItem(PUSH_REGISTERED_KEY, String(Date.now()));
      emitNotificationsChanged();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Web Push subscription note:', err);
    return false;
  }
}

/**
 * Request browser/OS notification access with user gesture and immediately subscribe Web Push.
 */
export async function requestAppNotificationPermission(): Promise<NotifPermissionState> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    markNotificationPromptHandled();
    if (result === 'granted') {
      ensureWebPushSubscribed().catch(() => {});
    }
    emitNotificationsChanged();
    return result;
  } catch {
    return getNotificationPermissionState();
  }
}

export interface SystemNotificationOptions {
  id?: string;
  category?: NotificationCategory;
  title: string;
  body: string;
  sender?: string;
  tag?: string;
  url?: string;
  targetPortal?: 'parents' | 'learners' | 'teachers' | 'admin' | 'all';
  targetTab?: string;
  learnerId?: string;
  requireInteraction?: boolean;
}

/**
 * Fires an OS-level / Service Worker heads-up notification AND adds it to the WhatsApp-style inbox.
 */
export async function showSystemNotification(opts: SystemNotificationOptions): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  addInboxNotification({
    id: opts.id || opts.tag || `lra_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    category: opts.category || 'notice',
    title: opts.title,
    body: opts.body,
    sender: opts.sender || 'Little Roses Academy',
    targetPortal: opts.targetPortal || 'all',
    targetTab: opts.targetTab,
    learnerId: opts.learnerId,
    url: opts.url || '/',
    createdAt: Date.now(),
  });

  if (getNotificationPermissionState() !== 'granted') {
    return false;
  }

  const payload: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    body: opts.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: opts.tag || `lra-${Date.now()}`,
    renotify: true,
    requireInteraction: opts.requireInteraction ?? true,
    vibrate: [240, 120, 240],
    data: {
      url: opts.url || '/',
      targetPortal: opts.targetPortal || 'parents',
      targetTab: opts.targetTab || 'home',
      learnerId: opts.learnerId || '',
    },
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(opts.title, payload);
        return true;
      }
      const readyReg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200)),
      ]);
      if (readyReg && typeof readyReg.showNotification === 'function') {
        await readyReg.showNotification(opts.title, payload);
        return true;
      }
    }
  } catch {
    // Fall back to window Notification constructor
  }

  try {
    const n = new Notification(opts.title, payload);
    n.onclick = () => {
      try {
        window.focus();
        n.close();
      } catch {
        // ignore
      }
    };
    return true;
  } catch {
    return false;
  }
}

function buildPersonalizedPushCopy(scope: PortalNotificationScope) {
  const portal = scope.portalId || 'parents';
  const name = scope.userName?.trim();
  if (portal === 'parents') {
    const childLabel = scope.linkedLearnerNames?.length
      ? scope.linkedLearnerNames.join(' & ')
      : 'your child';
    return {
      category: 'booklet' as NotificationCategory,
      title: `📘 Assessment Alert for ${name || 'Parent'}`,
      body: `Updates and released Assessment Books for ${childLabel} will notify you right here—even when your phone screen is locked.`,
      sender: 'Parents Notification Desk',
      targetPortal: 'parents' as const,
      targetTab: 'report',
      learnerId: scope.linkedLearnerIds?.[0],
      url: '/?portal=parents',
    };
  }
  if (portal === 'learners') {
    return {
      category: 'homework' as NotificationCategory,
      title: `📝 Learner Alert for ${name || 'Student'}${scope.grade ? ` (${scope.grade})` : ''}`,
      body: `Your CBC homework, CATs, timetable changes, and released assessment scores will alert you instantly on this phone.`,
      sender: 'Learners Study Desk',
      targetPortal: 'learners' as const,
      targetTab: 'focus',
      learnerId: scope.userId || scope.adm,
      url: '/?portal=learners',
    };
  }
  if (portal === 'teachers') {
    return {
      category: 'notice' as NotificationCategory,
      title: `📋 Faculty Alert for ${name || 'Teacher'}`,
      body: `Timetable schedules, admin memos, and CAT assessment notifications are live for your assigned classes.`,
      sender: 'Teachers Faculty Desk',
      targetPortal: 'teachers' as const,
      targetTab: 'timetable',
      url: '/?portal=teachers',
    };
  }
  return {
    category: 'system' as NotificationCategory,
    title: `🏫 Admin Alert — ${name || 'School Administration'}`,
    body: `Password change requests, teacher mark pushes, and official school alerts are active on this device.`,
    sender: 'Little Roses Administration',
    targetPortal: 'admin' as const,
    targetTab: 'home',
    url: '/?portal=admin',
  };
}

export async function sendServerTestPush(scopeOrPortal: PortalNotificationScope | string = 'parents'): Promise<boolean> {
  const scope: PortalNotificationScope =
    typeof scopeOrPortal === 'string'
      ? { ...getActiveNotificationScopeFromStorage(), portalId: normalizeScopePortalId(scopeOrPortal) }
      : { ...getActiveNotificationScopeFromStorage(), ...scopeOrPortal };

  const copy = buildPersonalizedPushCopy(scope);
  await ensureWebPushSubscribed().catch(() => {});
  try {
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portal: copy.targetPortal,
        targetPortal: copy.targetPortal,
        targetTab: copy.targetTab,
        learnerId: copy.learnerId,
        category: copy.category,
        title: copy.title,
        body: copy.body,
        url: copy.url,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.event) {
        addInboxNotification({
          id: data.event.id,
          category: copy.category,
          title: copy.title,
          body: copy.body,
          sender: copy.sender,
          targetPortal: copy.targetPortal,
          targetTab: copy.targetTab,
          learnerId: copy.learnerId,
          createdAt: data.event.createdAt,
        });
      }
      if (getNotificationPermissionState() === 'granted' && (!data?.dispatchedTo || data.dispatchedTo === 0)) {
        await showSystemNotification({
          id: `local_test_${Date.now()}`,
          category: copy.category,
          title: copy.title,
          body: copy.body,
          sender: copy.sender,
          targetPortal: copy.targetPortal,
          targetTab: copy.targetTab,
          learnerId: copy.learnerId,
          url: copy.url,
        });
      }
      return true;
    }
  } catch {
    // offline fallback
  }
  return showSystemNotification({
    id: `local_test_${Date.now()}`,
    category: copy.category,
    title: copy.title,
    body: copy.body,
    sender: copy.sender,
    targetPortal: copy.targetPortal,
    targetTab: copy.targetTab,
    learnerId: copy.learnerId,
    url: copy.url,
  });
}

let swListenersBound = false;
export function initServiceWorkerNotificationBridge(): void {
  if (typeof window === 'undefined' || swListenersBound) return;
  swListenersBound = true;

  if (getNotificationPermissionState() === 'granted') {
    ensureWebPushSubscribed().catch(() => {});
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const data = event.data;
      if (!data) return;
      if (data.type === 'LRA_PUSH_RECEIVED' && data.notification) {
        addInboxNotification({
          ...data.notification,
          sender: 'Little Roses Push',
        });
      } else if (data.type === 'LRA_NOTIF_CLICK') {
        if (data.id) markNotificationRead(data.id);
        window.dispatchEvent(new CustomEvent('lra-notification-navigate', { detail: data }));
      }
    });
  }
}

function getNotifiedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_EVENTS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.slice(-300)) : new Set();
  } catch {
    return new Set();
  }
}

function saveNotifiedSet(set: Set<string>) {
  try {
    localStorage.setItem(NOTIFIED_EVENTS_KEY, JSON.stringify(Array.from(set).slice(-300)));
  } catch {
    // ignore
  }
}

function normalizePhone9(p?: string): string {
  const digits = String(p || '').replace(/\D/g, '');
  return digits.length >= 9 ? digits.slice(-9) : digits;
}

/**
 * Inspects newly synced cloud/local state for ALL 4 event categories (released Assessment Books,
 * School Notices/Messages, Homework/CATs/Timetable, and Password Requests/System reminders),
 * records them into the WhatsApp-style inbox, and triggers heads-up OS alerts.
 */
export async function processSyncedNotificationEvents(cloudState: any): Promise<void> {
  if (typeof window === 'undefined' || !cloudState) return;

  const notified = getNotifiedSet();
  const isFirstRun = notified.size === 0;
  let dirty = false;

  let sessionUser: any = null;
  try {
    const rawUser = localStorage.getItem('lra_session_user');
    if (rawUser) sessionUser = JSON.parse(rawUser);
  } catch {
    // ignore
  }

  let learners: any[] = [];
  let families: any[] = [];
  try {
    const adminRaw = localStorage.getItem('lra_admin_v3');
    if (adminRaw) {
      const parsed = JSON.parse(adminRaw);
      learners = parsed.learners || [];
      families = parsed.families || [];
    }
  } catch {
    // ignore
  }
  if (learners.length === 0 && cloudState?.adminState?.learners) {
    learners = cloudState.adminState.learners;
  }
  if (families.length === 0 && cloudState?.adminState?.families) {
    families = cloudState.adminState.families;
  }

  const scopedLearnerIds = new Set<string>();
  const learnerNameById = new Map<string, string>();
  learners.forEach((l) => {
    if (l?.id) learnerNameById.set(l.id, l.name || l.adm || 'Learner');
  });

  if (sessionUser?.portalId === 'learners' && sessionUser?.id) {
    scopedLearnerIds.add(sessionUser.id);
  } else if (sessionUser?.portalId === 'parents') {
    const phone9 = normalizePhone9(sessionUser.phone || sessionUser.identifier);
    if (Array.isArray(sessionUser.linkedLearners)) {
      sessionUser.linkedLearners.forEach((k: any) => k?.id && scopedLearnerIds.add(k.id));
    }
    const matchingFamIds = new Set<string>();
    families.forEach((f) => {
      const phones = [f.phone, f.secondaryPhone, f.fatherPhone, f.motherPhone].map(normalizePhone9);
      if (f.id === sessionUser.id || (phone9 && phones.includes(phone9))) {
        matchingFamIds.add(f.id);
      }
    });
    learners.forEach((l) => {
      const lPhones = [l.parentPhone, l.fatherPhone, l.motherPhone].map(normalizePhone9);
      if ((l.familyId && matchingFamIds.has(l.familyId)) || (phone9 && lPhones.includes(phone9))) {
        scopedLearnerIds.add(l.id);
      }
    });
  }

  // 1. Released Assessment Books & Reports
  const submissions = cloudState.submissions || {};
  const newlyReleased: { key: string; learnerId: string; learnerName: string; grade: string; term: string; subject: string }[] = [];

  Object.entries(submissions).forEach(([key, sub]: [string, any]) => {
    if (sub?.status !== 'released') return;
    const evtKey = `release:${key}:${sub.releasedAt || '1'}`;
    if (notified.has(evtKey)) return;

    notified.add(evtKey);
    dirty = true;

    const lName = learnerNameById.get(sub.learnerId) || 'Your Child';
    // Always populate recent released item into the WhatsApp-style inbox if scoped or general
    if (scopedLearnerIds.size === 0 || !sub.learnerId || scopedLearnerIds.has(sub.learnerId)) {
      addInboxNotification({
        id: evtKey,
        category: 'booklet',
        title: `📘 Assessment Book Ready — ${lName}`,
        body: `${sub.subject || 'CBC Learning Area'} (${sub.grade || 'CBC'}, ${sub.term || 'Current Term'}) released by Administration.`,
        sender: 'School Administration',
        targetPortal: sessionUser?.portalId === 'learners' ? 'learners' : 'parents',
        targetTab: 'report',
        learnerId: sub.learnerId,
        url: '/?portal=parents',
        createdAt: Number(sub.releasedAt || Date.now()),
        read: isFirstRun && (!sub.releasedAt || Date.now() - Number(sub.releasedAt) > 10 * 60 * 1000),
      });
    }

    if (isFirstRun && (!sub.releasedAt || Date.now() - Number(sub.releasedAt) > 10 * 60 * 1000)) {
      return;
    }
    if (scopedLearnerIds.size > 0 && sub.learnerId && !scopedLearnerIds.has(sub.learnerId)) {
      return;
    }

    newlyReleased.push({
      key,
      learnerId: sub.learnerId || '',
      learnerName: lName,
      grade: sub.grade || 'CBC',
      term: sub.term || 'Current Term',
      subject: sub.subject || 'Learning Area',
    });
  });

  if (newlyReleased.length > 0 && getNotificationPermissionState() === 'granted') {
    const first = newlyReleased[0];
    const extra = newlyReleased.length > 1 ? ` (+${newlyReleased.length - 1} more subject${newlyReleased.length > 2 ? 's' : ''})` : '';
    await showSystemNotification({
      id: `push_rel_${Date.now()}`,
      category: 'booklet',
      title: `📘 Assessment Book Ready — ${first.learnerName}`,
      body: `${first.subject} (${first.grade}, ${first.term})${extra} has been released by School Administration. Tap to view & download.`,
      sender: 'School Administration',
      tag: `lra-release-${first.learnerName}-${Date.now()}`,
      targetPortal: sessionUser?.portalId === 'learners' ? 'learners' : 'parents',
      targetTab: 'report',
      learnerId: first.learnerId,
      url: '/?portal=parents',
      requireInteraction: true,
    });
  }

  // 2. Cross-Device Bell Notices
  const bellNotices: any[] = Array.isArray(cloudState.bellNotices) ? cloudState.bellNotices : [];
  for (const notice of bellNotices) {
    if (!notice?.id) continue;
    const evtKey = `bell:${notice.id}`;
    if (notified.has(evtKey)) continue;
    notified.add(evtKey);
    dirty = true;

    const isOldFirstRun = isFirstRun && (!notice.at || Date.now() - Number(notice.at) > 5 * 60 * 1000);
    addInboxNotification({
      id: evtKey,
      category: 'notice',
      title: `🔔 ${notice.title || 'Little Roses Academy Alert'}`,
      body: notice.message || 'Tap to view update in your portal.',
      sender: 'Little Roses Office',
      targetPortal: 'all',
      targetTab: 'home',
      createdAt: Number(notice.at || Date.now()),
      read: isOldFirstRun,
    });

    if (!isOldFirstRun && getNotificationPermissionState() === 'granted') {
      await showSystemNotification({
        id: evtKey,
        category: 'notice',
        title: `🔔 ${notice.title || 'Little Roses Academy Alert'}`,
        body: notice.message || 'Tap to view update in your portal.',
        tag: evtKey,
        url: sessionUser?.portalId === 'learners' ? '/?portal=learners' : '/?portal=parents',
      });
    }
  }

  // 3. New Teacher CATs & Homework
  const teacherCATs: any[] = Array.isArray(cloudState.ecosystem?.teacherCATs)
    ? cloudState.ecosystem.teacherCATs
    : [];
  for (const cat of teacherCATs) {
    if (!cat?.id) continue;
    const evtKey = `cat:${cat.id}`;
    if (notified.has(evtKey)) continue;
    notified.add(evtKey);
    dirty = true;

    addInboxNotification({
      id: evtKey,
      category: 'homework',
      title: `📝 New ${cat.kind || 'CAT'} Published (${cat.grade || 'CBC'})`,
      body: `${cat.title} · ${cat.subject} · Due ${cat.dueDate || 'Soon'}`,
      sender: cat.teacherName || 'Subject Teacher',
      targetPortal: 'learners',
      targetTab: 'focus',
      createdAt: Date.now(),
      read: isFirstRun,
    });

    if (!isFirstRun && getNotificationPermissionState() === 'granted') {
      await showSystemNotification({
        id: evtKey,
        category: 'homework',
        title: `📝 New ${cat.kind || 'CAT'} Published (${cat.grade || 'CBC'})`,
        body: `${cat.title} · ${cat.subject} · Due ${cat.dueDate || 'Soon'}`,
        tag: evtKey,
        url: '/?portal=learners',
      });
    }
  }

  // 4. Official Admin Notices
  const adminNotices: any[] = Array.isArray(cloudState.adminState?.notices)
    ? cloudState.adminState.notices
    : [];
  for (const n of adminNotices.slice(0, 6)) {
    const id = n?.id || `${n?.title}_${n?.at}`;
    if (!id) continue;
    const evtKey = `notice:${id}`;
    if (notified.has(evtKey)) continue;
    notified.add(evtKey);
    dirty = true;

    addInboxNotification({
      id: evtKey,
      category: 'notice',
      title: `📢 ${n.title || 'School Notice'}`,
      body: n.body || 'Tap to read official Little Roses Academy notice.',
      sender: n.from || 'Administration',
      targetPortal: 'all',
      targetTab: 'home',
      createdAt: Number(n.at || Date.now()),
      read: isFirstRun,
    });

    if (!isFirstRun && getNotificationPermissionState() === 'granted') {
      await showSystemNotification({
        id: evtKey,
        category: 'notice',
        title: `📢 ${n.title || 'School Notice'}`,
        body: n.body || 'Tap to read official Little Roses Academy notice.',
        tag: evtKey,
        url: '/?portal=parents',
      });
    }
  }

  // 5. Server Notification Feed Events (includes Timetable updates & Password Reset Alerts)
  const serverEvents: any[] = Array.isArray(cloudState.notificationEvents)
    ? cloudState.notificationEvents
    : [];
  for (const evt of serverEvents.slice(0, 12)) {
    if (!evt?.id) continue;
    const evtKey = `srv:${evt.id}`;
    if (notified.has(evtKey)) continue;
    notified.add(evtKey);
    dirty = true;

    const stale = isFirstRun || (evt.createdAt && Date.now() - Number(evt.createdAt) > 10 * 60 * 1000);
    addInboxNotification({
      id: evtKey,
      category: evt.category || 'system',
      title: evt.title || 'Little Roses Update',
      body: evt.body || 'Tap to inspect update.',
      sender: 'Little Roses Cloud',
      targetPortal: evt.targetPortal || 'all',
      targetTab: evt.targetTab,
      learnerId: evt.learnerId,
      url: evt.url || '/',
      createdAt: Number(evt.createdAt || Date.now()),
      read: Boolean(stale),
    });

    if (!stale && getNotificationPermissionState() === 'granted') {
      await showSystemNotification({
        id: evtKey,
        category: evt.category || 'system',
        title: evt.title,
        body: evt.body,
        tag: evtKey,
        url: evt.url || '/',
      });
    }
  }

  if (dirty) {
    saveNotifiedSet(notified);
  }
}

/**
 * Trigger immediate notification right after releasing a subject locally
 */
export function notifyLocalAssessmentRelease(
  learnerName: string,
  grade: string,
  term: string,
  subject: string
) {
  showSystemNotification({
    id: `local_rel_${learnerName}_${subject}_${Date.now()}`,
    category: 'booklet',
    title: `📘 Assessment Book Released — ${learnerName}`,
    body: `${subject} (${grade}, ${term}) is now available in the Parents & Learners Portals.`,
    sender: 'School Administration',
    tag: `lra-local-release-${learnerName}-${subject}`,
    targetPortal: 'parents',
    targetTab: 'report',
    url: '/?portal=parents',
  }).catch(() => {});
}
