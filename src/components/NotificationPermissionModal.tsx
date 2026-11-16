import React, { useEffect, useMemo, useState } from 'react';
import {
  clearInboxNotifications,
  ensureWebPushSubscribed,
  getInboxNotifications,
  getNotificationPermissionState,
  InboxNotificationItem,
  isWebPushActive,
  markAllNotificationsRead,
  markNotificationPromptHandled,
  markNotificationRead,
  NotificationCategory,
  NotifPermissionState,
  PortalNotificationScope,
  getActiveNotificationScopeFromStorage,
  requestAppNotificationPermission,
  sendServerTestPush,
  showSystemNotification,
} from '../utils/notifications';
import { sound } from '../utils/sound';

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
  triggeredByInstall?: boolean;
  initialView?: 'inbox' | 'setup';
  portalScope?: PortalNotificationScope;
  onNavigateItem?: (item: InboxNotificationItem) => void;
}

type PhoneBrand = 'samsung' | 'tecno' | 'xiaomi' | 'android' | 'ios';
type CategoryFilter = 'all' | NotificationCategory;

const BRAND_GUIDES: Record<
  PhoneBrand,
  {
    label: string;
    steps: string[];
  }
> = {
  samsung: {
    label: 'Samsung Galaxy',
    steps: [
      'Open Phone Settings → Apps → Little Roses Academy (or Chrome / Samsung Internet).',
      'Tap Notifications → Allow notifications, turn ON "Pop-up / Show as brief pop-up" & "Show on lock screen".',
      'To float over other apps: Settings → Apps → Special access (⋮ top-right) → "Appear on top" → Enable for Little Roses / Chrome.',
    ],
  },
  tecno: {
    label: 'Tecno / Infinix / Itel',
    steps: [
      'Open Settings → App Management → App List → Little Roses Academy (or Chrome).',
      'Tap Notifications → Enable "Allow notifications", "Floating / Banner", and "Lock screen notifications".',
      'Tap "Display over other apps" → Toggle ON and enable Background Auto-Start so alerts arrive even when closed.',
    ],
  },
  xiaomi: {
    label: 'Xiaomi / Redmi / Poco',
    steps: [
      'Open Settings → Apps → Manage apps → Little Roses Academy (or Chrome).',
      'Tap Notifications → Turn ON "Show notifications", "Floating notifications", and "Lock screen notifications".',
      'Tap "Other permissions" → Allow "Display pop-up windows while running in the background" & enable Autostart.',
    ],
  },
  android: {
    label: 'Pixel / Nokia / Android',
    steps: [
      'Long-press the Little Roses Academy app icon → tap "App info" (ⓘ).',
      'Tap Notifications → Enable "All notifications" and set channel importance to Urgent / Pop on screen.',
      'Tap Advanced → "Display over other apps" → Enable Allowed for instant floating assessment alerts.',
    ],
  },
  ios: {
    label: 'iPhone / iPad (iOS)',
    steps: [
      'Install the app via Safari Share → "Add to Home Screen" (required for lock-screen push on iOS 16.4+).',
      'Open iPhone Settings → Notifications → Little Roses Academy.',
      'Turn ON "Allow Notifications", check Lock Screen + Banners, and set Banner Style to "Persistent".',
    ],
  },
};

function formatRelativeTime(ts: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Nairobi',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleDateString();
  }
}

function getCategoryMeta(category: NotificationCategory) {
  switch (category) {
    case 'booklet':
      return { icon: '📘', label: 'Assessment Book', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' };
    case 'homework':
      return { icon: '📝', label: 'Homework & CAT', bg: 'bg-purple-500/20 text-purple-300 border-purple-400/30' };
    case 'notice':
      return { icon: '📢', label: 'School Notice', bg: 'bg-amber-500/20 text-amber-300 border-amber-400/30' };
    default:
      return { icon: '⚙️', label: 'System Alert', bg: 'bg-sky-500/20 text-sky-300 border-sky-400/30' };
  }
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  triggeredByInstall = false,
  initialView,
  portalScope,
  onNavigateItem,
}) => {
  const effectiveScope = useMemo<PortalNotificationScope>(
    () => portalScope || getActiveNotificationScopeFromStorage(),
    [portalScope, isOpen]
  );

  const scopeBadgeLabel = useMemo(() => {
    const p = effectiveScope.portalId || 'all';
    const roleLabel =
      p === 'parents'
        ? 'Parents Portal'
        : p === 'learners'
        ? 'Learners Portal'
        : p === 'teachers'
        ? 'Teachers Portal'
        : p === 'admin'
        ? 'Admin Office'
        : 'All Portals';
    return effectiveScope.userName ? `${roleLabel} · ${effectiveScope.userName}` : roleLabel;
  }, [effectiveScope]);

  const [permState, setPermState] = useState<NotifPermissionState>(() =>
    getNotificationPermissionState()
  );
  const [pushReady, setPushReady] = useState<boolean>(() => isWebPushActive());
  const [items, setItems] = useState<InboxNotificationItem[]>(() =>
    getInboxNotifications(effectiveScope)
  );
  const [activeTab, setActiveTab] = useState<'inbox' | 'setup'>(() => {
    if (initialView) return initialView;
    if (triggeredByInstall || getNotificationPermissionState() !== 'granted') return 'setup';
    return 'inbox';
  });
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selectedBrand, setSelectedBrand] = useState<PhoneBrand>(() => {
    if (typeof navigator === 'undefined') return 'android';
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (/samsung|sm-/.test(ua)) return 'samsung';
    if (/tecno|infinix|itel/.test(ua)) return 'tecno';
    if (/xiaomi|redmi|poco|miui/.test(ua)) return 'xiaomi';
    return 'android';
  });
  const [showDisplayOverGuide, setShowDisplayOverGuide] = useState<boolean>(true);
  const [isRequesting, setIsRequesting] = useState<boolean>(false);
  const [isTestingPush, setIsTestingPush] = useState<boolean>(false);

  // Sync inbox and permission status live
  useEffect(() => {
    if (!isOpen) return;
    setItems(getInboxNotifications(effectiveScope));
    setPermState(getNotificationPermissionState());
    setPushReady(isWebPushActive());
    if (triggeredByInstall || initialView === 'setup') {
      setActiveTab('setup');
    } else if (initialView === 'inbox') {
      setActiveTab('inbox');
    } else {
      setActiveTab(getNotificationPermissionState() === 'granted' ? 'inbox' : 'setup');
    }
  }, [isOpen, triggeredByInstall, initialView, effectiveScope]);

  useEffect(() => {
    const refresh = () => {
      setItems(getInboxNotifications(effectiveScope));
      setPermState(getNotificationPermissionState());
      setPushReady(isWebPushActive());
    };
    window.addEventListener('lra_notifications_updated', refresh);
    window.addEventListener('lra_data_sync', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('lra_notifications_updated', refresh);
      window.removeEventListener('lra_data_sync', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [effectiveScope]);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);
  const filteredItems = useMemo(() => {
    if (categoryFilter === 'all') return items;
    return items.filter((n) => n.category === categoryFilter);
  }, [items, categoryFilter]);

  if (!isOpen) return null;

  const handleEnableNotifications = async () => {
    sound.playClick(600);
    setIsRequesting(true);
    const next = await requestAppNotificationPermission();
    setPermState(next);
    if (next === 'granted') {
      const subOk = await ensureWebPushSubscribed();
      setPushReady(subOk || isWebPushActive());
      await showSystemNotification({
        id: `welcome_${Date.now()}`,
        category: 'system',
        title: '🌹 Little Roses Lock-Screen Push Active!',
        body: 'You will now receive instant WhatsApp-style pop-up alerts for Assessment Books, Notices, Homework & System Updates—even when your phone screen is off.',
        tag: 'lra-welcome-notif',
        targetPortal: 'parents',
        targetTab: 'report',
        url: '/?portal=parents',
      });
      if (onShowToast) {
        onShowToast('Notifications & background lock-screen push enabled!');
      }
    } else if (next === 'denied') {
      if (onShowToast) {
        onShowToast('Notifications blocked in browser settings — follow steps below to allow them.');
      }
    }
    setIsRequesting(false);
  };

  const handleSendTestAlert = async () => {
    sound.playCompleteChime();
    if (permState !== 'granted') {
      await handleEnableNotifications();
      return;
    }
    setIsTestingPush(true);
    const sent = await sendServerTestPush(effectiveScope);
    setPushReady(isWebPushActive());
    setItems(getInboxNotifications(effectiveScope));
    setIsTestingPush(false);
    if (onShowToast) {
      onShowToast(
        sent
          ? `Notification sent for ${effectiveScope.userName || scopeBadgeLabel}!`
          : 'Could not send test push — check browser notification settings.'
      );
    }
  };

  const handleItemClick = (item: InboxNotificationItem) => {
    sound.playClick(520);
    markNotificationRead(item.id);
    if (onNavigateItem) {
      onNavigateItem(item);
      onClose();
    } else {
      window.dispatchEvent(new CustomEvent('lra-notification-navigate', { detail: item }));
      onClose();
    }
  };

  const handleDismiss = () => {
    sound.playClick(450);
    markNotificationPromptHandled();
    onClose();
  };

  const guide = BRAND_GUIDES[selectedBrand];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg max-h-[92dvh] rounded-3xl bg-[#0B141A] text-[#E9EDEF] border border-emerald-400/30 shadow-2xl flex flex-col overflow-hidden">
        {/* WhatsApp-Inspired Top Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-[#075E54] via-[#0A4F48] to-[#0A1F4D] border-b border-white/15 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-10 h-10 rounded-full bg-white/15 border border-emerald-300/40 flex items-center justify-center text-xl shrink-0">
              <span>🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border border-[#075E54]">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-300 truncate">
                {triggeredByInstall
                  ? 'App Installed — Enable Phone Alerts'
                  : scopeBadgeLabel}
              </div>
              <h2 className="text-sm sm:text-base font-black text-white m-0 truncate">
                School Inbox &amp; Lock-Screen Push
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-xs font-black cursor-pointer shrink-0"
            aria-label="Close notification center"
          >
            ✕
          </button>
        </div>

        {/* Mode Switcher Tabs: Inbox vs Push & Lock-Screen Setup */}
        <div className="px-3 pt-2.5 pb-2 bg-[#111B21] border-b border-white/10 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              sound.playClick(450);
              setActiveTab('inbox');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'inbox'
                ? 'bg-[#00A884] text-[#0B141A] shadow-sm'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <span>💬</span>
            <span>Alerts Inbox</span>
            {unreadCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'inbox' ? 'bg-[#0B141A] text-emerald-300' : 'bg-rose-500 text-white'
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick(450);
              setActiveTab('setup');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'setup'
                ? 'bg-amber-400 text-[#0A1F4D] shadow-sm'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <span>📲</span>
            <span>Lock-Screen &amp; Pop-Up Setup</span>
            {permState !== 'granted' && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
        </div>

        {/* TAB 1: WHATSAPP-STYLE INBOX */}
        {activeTab === 'inbox' ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Permission warning strip if not yet granted */}
            {permState !== 'granted' && (
              <div className="mx-3 mt-2.5 p-2.5 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-between gap-2 shrink-0">
                <div className="text-[11px] leading-snug text-amber-100">
                  <strong>Turn on lock-screen alerts</strong> so released Assessment Books &amp; Notices wake your phone even when closed.
                </div>
                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  disabled={isRequesting}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0A1F4D] font-black text-[10.5px] shrink-0 cursor-pointer"
                >
                  {isRequesting ? '...' : 'Allow Push'}
                </button>
              </div>
            )}

            {/* Category Filter Chips */}
            <div className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 border-b border-white/5">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'booklet', label: '📘 Booklets' },
                  { id: 'notice', label: '📢 Notices' },
                  { id: 'homework', label: '📝 CATs & Timetable' },
                  { id: 'system', label: '⚙️ System' },
                ] as { id: CategoryFilter; label: string }[]
              ).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    sound.playClick(420);
                    setCategoryFilter(chip.id);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors border ${
                    categoryFilter === chip.id
                      ? 'bg-[#00A884]/25 border-[#00A884] text-emerald-200'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Notification Thread List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredItems.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-2.5">
                  <div className="w-14 h-14 mx-auto rounded-full bg-[#202C33] border border-white/10 flex items-center justify-center text-2xl">
                    📭
                  </div>
                  <div className="font-extrabold text-sm text-white">
                    No notifications in this category yet
                  </div>
                  <p className="text-[11.5px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                    When Administration releases Assessment Books, teachers publish CATs, or school notices arrive, they appear here and wake your lock screen.
                  </p>
                  <button
                    type="button"
                    onClick={handleSendTestAlert}
                    disabled={isTestingPush}
                    className="mt-1 px-4 py-2 rounded-xl bg-[#00A884] hover:bg-emerald-500 text-[#0B141A] font-black text-xs cursor-pointer"
                  >
                    {isTestingPush ? 'Sending...' : '📲 Send Test Notification'}
                  </button>
                </div>
              ) : (
                filteredItems.map((item) => {
                  const meta = getCategoryMeta(item.category);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleItemClick(item)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-2.5 hover:bg-[#202C33] active:scale-[0.99] ${
                        item.read
                          ? 'bg-[#111B21] border-white/10 opacity-85'
                          : 'bg-[#18262E] border-emerald-400/45 shadow-sm'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#202C33] border border-white/10 flex items-center justify-center text-lg shrink-0 mt-0.5">
                        {meta.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-emerald-300 truncate">
                            {item.sender || 'Little Roses Academy'}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-slate-400 font-medium">
                              {formatRelativeTime(item.createdAt)}
                            </span>
                            {!item.read && (
                              <span className="w-2 h-2 rounded-full bg-[#00A884] shrink-0" />
                            )}
                          </div>
                        </div>

                        <div
                          className={`text-xs mt-0.5 leading-snug ${
                            item.read ? 'font-bold text-slate-200' : 'font-black text-white'
                          }`}
                        >
                          {item.title}
                        </div>

                        <p className="text-[11px] text-slate-300 mt-1 mb-0 leading-relaxed line-clamp-2">
                          {item.body}
                        </p>

                        <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-white/5">
                          <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${meta.bg}`}>
                            {meta.label}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-300">
                            Tap to open →
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Inbox Quick Footer Bar */}
            {items.length > 0 && (
              <div className="px-3 py-2 bg-[#111B21] border-t border-white/10 flex items-center justify-between gap-2 shrink-0 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(450);
                    markAllNotificationsRead(effectiveScope);
                    setItems(getInboxNotifications(effectiveScope));
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-emerald-300 font-bold cursor-pointer"
                >
                  ✓✓ Mark All Read
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSendTestAlert}
                    disabled={isTestingPush}
                    className="px-2.5 py-1.5 rounded-lg bg-[#00A884]/20 hover:bg-[#00A884]/30 text-emerald-200 font-bold cursor-pointer"
                  >
                    {isTestingPush ? '...' : '📲 Test Push'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick(400);
                      clearInboxNotifications(effectiveScope);
                      setItems(getInboxNotifications(effectiveScope));
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-200 font-bold cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: PUSH & LOCK-SCREEN / DISPLAY-OVER-APPS SETUP */
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-[#111B21]">
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 space-y-1.5">
              <div className="font-black text-emerald-300 text-xs flex items-center gap-1.5">
                <span>🔐</span>
                <span>WhatsApp-Style Background &amp; Lock-Screen Alerts</span>
              </div>
              <p className="text-[11px] text-slate-200 leading-relaxed m-0">
                Receive instant alerts even when Little Roses Academy is closed or your phone screen is locked: Assessment Books released to parents, School Notices, CATs &amp; Homework, and Password Updates.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-300 text-[11px]">Phone Alert Permission:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    permState === 'granted'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                      : permState === 'denied'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                  }`}
                >
                  {permState === 'granted'
                    ? '✓ Allowed'
                    : permState === 'denied'
                    ? '✕ Blocked'
                    : permState === 'unsupported'
                    ? 'Use Chrome/Safari'
                    : '⏳ Not Enabled'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-bold text-slate-300">Background Web Push &amp; Sync:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    pushReady
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                      : 'bg-white/10 text-slate-300 border border-white/15'
                  }`}
                >
                  {pushReady ? '⚡ Subscribed (Screen-Off Ready)' : 'Waiting for Permission'}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {permState !== 'granted' ? (
                  <button
                    type="button"
                    onClick={handleEnableNotifications}
                    disabled={isRequesting}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-[#0A1F4D] font-black text-xs shadow-md cursor-pointer active:scale-98 transition-transform disabled:opacity-60"
                  >
                    {isRequesting ? 'Enabling Push...' : '🔔 Allow Notifications & Lock-Screen Push'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendTestAlert}
                    disabled={isTestingPush}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#00A884] hover:bg-emerald-500 text-[#0B141A] font-black text-xs shadow-md cursor-pointer active:scale-98 transition-transform disabled:opacity-60"
                  >
                    {isTestingPush ? 'Dispatching...' : '📲 Send Test Lock-Screen Notification'}
                  </button>
                )}
              </div>
            </div>

            {/* Phone-Specific Display Over Other Apps / Lock Screen Instructions */}
            <div className="p-3 rounded-2xl bg-blue-950/45 border border-blue-400/30 space-y-2.5">
              <button
                type="button"
                onClick={() => setShowDisplayOverGuide((v) => !v)}
                className="w-full flex items-center justify-between text-left cursor-pointer"
              >
                <div>
                  <div className="font-black text-sky-300 text-xs flex items-center gap-1.5">
                    <span>📱</span>
                    <span>Display Over Other Apps &amp; Lock Screen Guide</span>
                  </div>
                  <div className="text-[10px] text-slate-300 mt-0.5">
                    Select your phone brand to allow floating &amp; screen-off alerts
                  </div>
                </div>
                <span className="text-xs font-bold text-sky-300">{showDisplayOverGuide ? '▲' : '▼'}</span>
              </button>

              {showDisplayOverGuide && (
                <div className="space-y-2.5 pt-1 border-t border-white/10">
                  <div className="flex flex-wrap gap-1">
                    {(Object.keys(BRAND_GUIDES) as PhoneBrand[]).map((bKey) => (
                      <button
                        key={bKey}
                        type="button"
                        onClick={() => {
                          sound.playClick(450);
                          setSelectedBrand(bKey);
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                          selectedBrand === bKey
                            ? 'bg-sky-400 text-[#0A1F4D] font-black'
                            : 'bg-white/10 text-slate-200 hover:bg-white/20'
                        }`}
                      >
                        {BRAND_GUIDES[bKey].label}
                      </button>
                    ))}
                  </div>

                  <ol className="space-y-1.5 pl-4 m-0 list-decimal text-[11px] text-slate-200 leading-relaxed">
                    {guide.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-white/10 bg-[#0A141A] flex gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer"
          >
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
};
