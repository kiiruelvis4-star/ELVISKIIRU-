import { useState, useCallback, useEffect } from 'react';
import { ScreenType, PortalConfig } from './types';
import { PORTALS } from './data/portalData';
import { sound } from './utils/sound';
import { Splash1 } from './components/Splash1';
import { Splash2 } from './components/Splash2';
import { PortalSelection } from './components/PortalSelection';
import { PortalLoginModal } from './components/PortalLoginModal';
import { SchoolInfoModal } from './components/SchoolInfoModal';
import { AppUpdateModal } from './components/AppUpdateModal';
import { TopControlBar } from './components/TopControlBar';
import { AdminPortal } from './components/admin/AdminPortal';
import { TeacherPortal } from './components/teacher/TeacherPortal';
import { LearnerPortal } from './components/learner/LearnerPortal';
import { ParentPortal } from './components/parent/ParentPortal';
import { EcosystemModal } from './components/EcosystemModal';
import { NotificationPermissionModal } from './components/NotificationPermissionModal';
import { useBackHandler, initNavigationHistory } from './utils/navigationHistory';
import { registerServiceWorker } from './utils/appVersion';
import { syncAllSchoolAssessmentsToIndexedDB } from './utils/indexedDBStorage';
import { startCloudPolling, stopCloudPolling } from './utils/cloudSync';
import { usePWAInstall } from './utils/usePWAInstall';
import { runAcademicLifecycleAutomation } from './utils/academicLifecycle';
import {
  ensureWebPushSubscribed,
  getActiveNotificationScopeFromStorage,
  getNotificationPermissionState,
  InboxNotificationItem,
  initServiceWorkerNotificationBridge,
  PortalNotificationScope,
  wasNotificationPromptHandled,
} from './utils/notifications';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('splash1');
  const [selectedPortal, setSelectedPortal] = useState<PortalConfig | null>(null);
  const [activeSessionUser, setActiveSessionUser] = useState<any>(null);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [showEcosystemModal, setShowEcosystemModal] = useState<boolean>(false);
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);
  const [notifTriggeredByInstall, setNotifTriggeredByInstall] = useState<boolean>(false);
  const [notifInitialView, setNotifInitialView] = useState<'inbox' | 'setup' | undefined>(undefined);
  const [activeNotifScope, setActiveNotifScope] = useState<PortalNotificationScope | undefined>(undefined);
  const [showRootExitConfirm, setShowRootExitConfirm] = useState<boolean>(false);
  const [showPortalExitConfirm, setShowPortalExitConfirm] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'mobile' | 'expanded'>('mobile');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const { isInstalled, justInstalled, clearJustInstalled } = usePWAInstall();

  // Initialize phone navigation listener, register Chrome PWA service worker, sync IndexedDB, start cloud polling, and check direct URL entry
  useEffect(() => {
    initNavigationHistory();
    registerServiceWorker();
    initServiceWorkerNotificationBridge();
    startCloudPolling(4000);

    // Initial and reactive sync of assessment data to local IndexedDB for offline viewing
    syncAllSchoolAssessmentsToIndexedDB().catch(console.warn);
    runAcademicLifecycleAutomation().catch(console.warn);

    const handleOnline = () => {
      setIsOnline(true);
      showToast('Connected to Little Roses Cloud');
      syncAllSchoolAssessmentsToIndexedDB().catch(console.warn);
      runAcademicLifecycleAutomation().catch(console.warn);
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('Offline Mode: Reading assessment records from local IndexedDB');
    };

    const handleDataSync = () => {
      syncAllSchoolAssessmentsToIndexedDB().catch(console.warn);
    };

    const handleOpenNotifSetup = (e: any) => {
      setNotifTriggeredByInstall(false);
      const detail = e?.detail;
      if (detail && typeof detail === 'object' && detail.portalId) {
        setActiveNotifScope(detail as PortalNotificationScope);
        setNotifInitialView(detail.initialView);
      } else {
        setActiveNotifScope(getActiveNotificationScopeFromStorage());
        setNotifInitialView(undefined);
      }
      setShowNotificationModal(true);
    };

    const handleInstalledPopup = () => {
      setNotifTriggeredByInstall(true);
      setNotifInitialView('setup');
      setShowNotificationModal(true);
    };

    const handleNotifNavigate = (e: any) => {
      const detail = e?.detail || {};
      const targetPortal = String(detail.targetPortal || '').toLowerCase();
      let mappedScreen: ScreenType | null = null;
      if (targetPortal === 'parents' || targetPortal === 'parent') mappedScreen = 'parents';
      else if (targetPortal === 'learners' || targetPortal === 'learner') mappedScreen = 'learners';
      else if (targetPortal === 'teachers' || targetPortal === 'teacher' || targetPortal === 'staff') mappedScreen = 'teachers';
      else if (targetPortal === 'admin') mappedScreen = 'admin';

      if (mappedScreen) {
        // Require portal login modal if not already inside that portal
        setCurrentScreen((curr) => {
          if (curr === mappedScreen) return curr;
          const pId = mappedScreen === 'teachers' ? 'staff' : mappedScreen;
          const pObj = PORTALS.find((p) => p.id === pId);
          if (pObj) {
            setCurrentScreen('portals');
            setSelectedPortal(pObj);
          }
          return curr;
        });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('lra_data_sync', handleDataSync);
    window.addEventListener('storage', handleDataSync);
    window.addEventListener('lra-open-notification-setup', handleOpenNotifSetup);
    window.addEventListener('lra-app-installed', handleInstalledPopup);
    window.addEventListener('lra-notification-navigate', handleNotifNavigate);

    // Direct URL link support (/teacher, /admin, /parent, /learner or ?portal=... / ?role=...)
    // Opens the portal with required role passcode verification
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const roleParam = (params.get('portal') || params.get('role') || '').toLowerCase();

      let targetPortalId: string | null = null;
      if (path.includes('/admin') || roleParam === 'admin') targetPortalId = 'admin';
      else if (path.includes('/teacher') || path.includes('/staff') || roleParam === 'teacher' || roleParam === 'staff') targetPortalId = 'staff';
      else if (path.includes('/parent') || roleParam === 'parent' || roleParam === 'parents') targetPortalId = 'parents';
      else if (path.includes('/learner') || path.includes('/pupil') || roleParam === 'learner' || roleParam === 'learners') targetPortalId = 'learners';

      if (targetPortalId) {
        const portalObj = PORTALS.find((p) => p.id === targetPortalId);
        if (portalObj) {
          setCurrentScreen('portals');
          setSelectedPortal(portalObj);
        }
      }
    }

    return () => {
      stopCloudPolling();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('lra_data_sync', handleDataSync);
      window.removeEventListener('storage', handleDataSync);
      window.removeEventListener('lra-open-notification-setup', handleOpenNotifSetup);
      window.removeEventListener('lra-app-installed', handleInstalledPopup);
      window.removeEventListener('lra-notification-navigate', handleNotifNavigate);
    };
  }, []);

  // Automatically pop up notification & display-over-apps access modal immediately after install or first standalone launch
  useEffect(() => {
    if (justInstalled) {
      setNotifTriggeredByInstall(true);
      setShowNotificationModal(true);
      clearJustInstalled();
      return;
    }
    if (
      isInstalled &&
      currentScreen !== 'splash1' &&
      currentScreen !== 'splash2' &&
      !wasNotificationPromptHandled() &&
      getNotificationPermissionState() === 'default'
    ) {
      const timer = setTimeout(() => {
        setNotifTriggeredByInstall(true);
        setShowNotificationModal(true);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [justInstalled, clearJustInstalled, isInstalled, currentScreen]);

  // --- TOP LEVEL PHONE BACK BUTTON HANDLERS ---
  // 1. Portal Exit Confirmation Modal (priority 56) - stays inside portal if Back pressed again
  useBackHandler(
    () => {
      sound.playClick(400);
      setShowPortalExitConfirm(false);
      return true;
    },
    showPortalExitConfirm,
    56,
    'app_portal_exit_confirm'
  );

  // 1b. Root Exit confirmation modal (priority 55)
  useBackHandler(
    () => {
      sound.playClick(400);
      setShowRootExitConfirm(false);
      return true;
    },
    showRootExitConfirm,
    55,
    'app_root_exit_confirm'
  );

  // 2. School Info Modal (priority 40)
  useBackHandler(
    () => {
      sound.playClick(400);
      setShowAboutModal(false);
      return true;
    },
    showAboutModal,
    40,
    'app_about_modal'
  );

  // 2b. App Version Update Modal (priority 42)
  useBackHandler(
    () => {
      sound.playClick(400);
      setShowUpdateModal(false);
      return true;
    },
    showUpdateModal,
    42,
    'app_update_modal'
  );

  // 2c. Ecosystem Synergy Guide Modal (priority 38)
  useBackHandler(
    () => {
      sound.playClick(400);
      setShowEcosystemModal(false);
      return true;
    },
    showEcosystemModal,
    38,
    'app_ecosystem_modal'
  );

  // 2d. Notification Permission & WhatsApp-Style Inbox Modal (priority 46)
  useBackHandler(
    () => {
      sound.playClick(400);
      setShowNotificationModal(false);
      return true;
    },
    showNotificationModal,
    46,
    'app_notification_modal'
  );

  // 3. Portal Login Modal (priority 25)
  useBackHandler(
    () => {
      sound.playClick(400);
      setSelectedPortal(null);
      return true;
    },
    selectedPortal !== null,
    25,
    'app_selected_portal'
  );

  // 4. Universal Portal Exit Guard (priority 10):
  // Fires ONLY at the root Home tab of ANY portal (Admin, Teachers, Learners, Parents)
  // after all inner modals, subviews, and tabs have stepped back.
  // Shows "ARE YOU LEAVING ALREADY?" and NEVER exits until the user clicks to leave.
  useBackHandler(
    () => {
      sound.playClick(400);
      setShowPortalExitConfirm(true);
      return true;
    },
    ['admin', 'teachers', 'learners', 'parents'].includes(currentScreen) &&
      !selectedPortal &&
      !showNotificationModal &&
      !showAboutModal &&
      !showUpdateModal &&
      !showEcosystemModal &&
      !showPortalExitConfirm,
    10,
    'app_universal_portal_exit_guard'
  );

  // 5. Back from Splash 2 to Splash 1 (priority 15)
  useBackHandler(
    () => {
      sound.playClick(400);
      setCurrentScreen('splash1');
      return true;
    },
    currentScreen === 'splash2',
    15,
    'app_splash2_back'
  );

  // 6. At Root Portals selection screen: Trigger "ARE YOU LEAVING ALREADY 🥺" modal (priority 5)
  useBackHandler(
    () => {
      sound.playClick(400);
      setShowRootExitConfirm(true);
      return true;
    },
    currentScreen === 'portals' && !selectedPortal && !showAboutModal && !showRootExitConfirm,
    5,
    'app_portals_exit_prompt'
  );

  // Show floating toast matching approved design
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    const timer = setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  // Screen transition handlers
  const handleGoSplash2 = useCallback(() => {
    setCurrentScreen('splash2');
  }, []);

  const handleSplash2Complete = useCallback(() => {
    setCurrentScreen('portals');
  }, []);

  const handleSelectPortal = (portal: PortalConfig) => {
    sound.playClick(600);
    setSelectedPortal(portal);
  };

  const handleReplayIntro = () => {
    sound.playClick(450);
    setSelectedPortal(null);
    setCurrentScreen('splash1');
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.enabled = next;
    if (next) sound.playClick(600);
  };

  const handleToggleViewMode = () => {
    sound.playClick(550);
    setViewMode((prev) => (prev === 'mobile' ? 'expanded' : 'mobile'));
  };

  const isSplash = currentScreen === 'splash1' || currentScreen === 'splash2';

  return (
    <div className="w-full h-[100dvh] min-h-screen bg-[#070F1E] flex flex-col items-center justify-start text-white overflow-hidden overflow-x-hidden">
      {/* Top Desktop Control Bar (shown once past splashes) */}
      {!isSplash && (
        <TopControlBar
          currentScreen={currentScreen}
          onSetScreen={(s) => {
            setSelectedPortal(null);
            setCurrentScreen(s);
          }}
          viewMode={viewMode}
          onToggleViewMode={handleToggleViewMode}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onOpenAbout={() => setShowAboutModal(true)}
          onOpenUpdate={() => setShowUpdateModal(true)}
          onOpenEcosystemGuide={() => setShowEcosystemModal(true)}
          onOpenNotifications={() => {
            setNotifTriggeredByInstall(false);
            setNotifInitialView(undefined);
            setShowNotificationModal(true);
          }}
        />
      )}

      {/* Offline Mode Banner (IndexedDB Cache Active) */}
      {!isSplash && !isOnline && (
        <div className="w-full bg-amber-500 text-[#0F1B33] text-[11px] font-black py-1 px-3 text-center flex items-center justify-center gap-2 shadow-xs z-30 select-none">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <span>Offline Mode · Assessment Data Served Directly From Local IndexedDB</span>
        </div>
      )}

      {/* Main Viewport Container: Fits Screen Edge-to-Edge on Mobile, or Framed/Expanded on Desktop */}
      <main className="flex-1 w-full h-full min-h-0 flex flex-col items-center justify-start relative overflow-hidden">
        <div
          className={`relative w-full h-full flex-1 flex flex-col overflow-hidden transition-all duration-200 ${
            viewMode === 'mobile'
              ? 'sm:max-w-[430px] sm:my-1.5 sm:rounded-[28px] sm:border sm:border-white/15 sm:shadow-[0_20px_50px_rgba(0,0,0,0.65)]'
              : ''
          }`}
        >
          {/* Screen 1: Splash 1 (School Compound) */}
          {currentScreen === 'splash1' && (
            <div className="fixed inset-0 w-full h-full z-50 animate-fade-in bg-[#070F1E]">
              <Splash1 onSkip={handleGoSplash2} />
            </div>
          )}

          {/* Screen 2: Splash 2 (Learner at Computer + Loading Bar) */}
          {currentScreen === 'splash2' && (
            <div className="fixed inset-0 w-full h-full z-50 animate-fade-in bg-[#070F1E]">
              <Splash2 onComplete={handleSplash2Complete} />
            </div>
          )}

          {/* Screen 3: Portals Selection */}
          {currentScreen === 'portals' && (
            <div className="w-full h-full animate-fade-in">
              <PortalSelection
                onSelectPortal={handleSelectPortal}
                onOpenAbout={() => setShowAboutModal(true)}
                onReplaySplash={handleReplayIntro}
                onOpenEcosystemGuide={() => setShowEcosystemModal(true)}
              />
            </div>
          )}

          {/* Screen 4: Administration Portal */}
          {currentScreen === 'admin' && (
            <div className="w-full h-full animate-fade-in">
              <AdminPortal
                onExitPortal={() => {
                  sound.playClick(450);
                  try {
                    localStorage.removeItem('lra_session_user');
                  } catch {
                    // ignore
                  }
                  setActiveSessionUser(null);
                  setCurrentScreen('portals');
                }}
                onShowToast={showToast}
              />
            </div>
          )}

          {/* Screen 5: Teachers & Academic Faculty Portal */}
          {currentScreen === 'teachers' && (
            <div className="w-full h-full animate-fade-in">
              <TeacherPortal
                initialTeacherId={
                  activeSessionUser?.portalId === 'staff' ? activeSessionUser.id : undefined
                }
                onExitPortal={() => {
                  sound.playClick(450);
                  try {
                    localStorage.removeItem('lra_session_user');
                  } catch {
                    // ignore
                  }
                  setActiveSessionUser(null);
                  setCurrentScreen('portals');
                }}
                onShowToast={showToast}
              />
            </div>
          )}

          {/* Screen 6: Learners Portal */}
          {currentScreen === 'learners' && (
            <div className="w-full h-full animate-fade-in">
              <LearnerPortal
                onExitPortal={() => {
                  sound.playClick(450);
                  try {
                    localStorage.removeItem('lra_session_user');
                  } catch {
                    // ignore
                  }
                  setActiveSessionUser(null);
                  setCurrentScreen('portals');
                }}
                onShowToast={showToast}
              />
            </div>
          )}

          {/* Screen 7: Parents & Guardians Portal */}
          {currentScreen === 'parents' && (
            <div className="w-full h-full animate-fade-in">
              <ParentPortal
                onExitPortal={() => {
                  sound.playClick(450);
                  try {
                    localStorage.removeItem('lra_session_user');
                  } catch {
                    // ignore
                  }
                  setActiveSessionUser(null);
                  setCurrentScreen('portals');
                }}
                onShowToast={showToast}
              />
            </div>
          )}



          {/* Toast Notification (Exact color & styling from approved prototype: #F9A8D4 pink, #0A192F navy text, font-extrabold) */}
          {toastMessage && (
            <div
              className="absolute left-1/2 bottom-[24px] -translate-x-1/2 z-40 px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-extrabold shadow-2xl transition-all duration-200 pointer-events-none max-w-[90%] text-center animate-fade-in"
              style={{
                backgroundColor: '#F9A8D4',
                color: '#0A192F',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(249, 168, 212, 0.4)',
              }}
              role="status"
              aria-live="polite"
            >
              {toastMessage}
            </div>
          )}
        </div>
      </main>

      {/* Interactive Portal Login Preview Modal */}
      {selectedPortal && (
        <PortalLoginModal
          portal={selectedPortal}
          onClose={() => setSelectedPortal(null)}
          onSelectPortal={(p) => setSelectedPortal(p)}
          onShowToast={showToast}
          onEnterPortal={(portalId, sessionUser) => {
            const userName = sessionUser?.name || '';
            setActiveSessionUser(sessionUser || null);
            const normalizedPortalId: PortalNotificationScope['portalId'] =
              portalId === 'admin'
                ? 'admin'
                : portalId === 'staff'
                ? 'teachers'
                : portalId === 'learners'
                ? 'learners'
                : 'parents';
            const linkedIds = Array.isArray(sessionUser?.linkedLearners)
              ? sessionUser.linkedLearners.flatMap((k: any) => [k?.id, k?.adm].filter(Boolean))
              : sessionUser?.portal === 'learners'
              ? [sessionUser?.id, sessionUser?.identifier].filter(Boolean)
              : [];
            const linkedNames = Array.isArray(sessionUser?.linkedLearners)
              ? sessionUser.linkedLearners.map((k: any) => k?.name).filter(Boolean)
              : sessionUser?.portal === 'learners' && userName
              ? [userName]
              : [];
            setActiveNotifScope({
              portalId: normalizedPortalId,
              userId: sessionUser?.id || sessionUser?.identifier,
              userName:
                userName ||
                (normalizedPortalId === 'admin'
                  ? 'Administrator'
                  : normalizedPortalId === 'teachers'
                  ? 'Teacher'
                  : normalizedPortalId === 'learners'
                  ? 'Learner'
                  : 'Parent / Guardian'),
              adm: normalizedPortalId === 'learners' ? sessionUser?.identifier : undefined,
              phone: sessionUser?.phone,
              grade: sessionUser?.grade,
              subjects: Array.isArray(sessionUser?.subjects) ? sessionUser.subjects : undefined,
              linkedLearnerIds: linkedIds,
              linkedLearnerNames: linkedNames,
            });
            if (getNotificationPermissionState() === 'granted') {
              ensureWebPushSubscribed().catch(() => {});
            } else if (portalId === 'parents' && !wasNotificationPromptHandled()) {
              setTimeout(() => {
                setNotifTriggeredByInstall(false);
                setNotifInitialView('setup');
                setShowNotificationModal(true);
              }, 700);
            }
            if (portalId === 'admin') {
              setSelectedPortal(null);
              setCurrentScreen('admin');
              showToast('Entered School Administration Office');
            } else if (portalId === 'staff') {
              setSelectedPortal(null);
              setCurrentScreen('teachers');
              showToast(userName ? `Welcome, ${userName}! Entered Teachers Portal` : 'Entered Teachers & Academic Faculty Portal');
            } else if (portalId === 'learners') {
              setSelectedPortal(null);
              setCurrentScreen('learners');
              showToast(userName ? `Welcome, ${userName}! Entered Learners Portal` : 'Entered Learners Portal');
            } else if (portalId === 'parents') {
              setSelectedPortal(null);
              setCurrentScreen('parents');
              showToast(userName ? `Welcome, ${userName}! Entered Parents Portal` : 'Entered Parents & Guardians Portal');
            }
          }}
        />
      )}

      {/* 4-Portal Unified Ecosystem & Interconnection Guide Modal */}
      {showEcosystemModal && (
        <EcosystemModal
          isOpen={showEcosystemModal}
          onClose={() => setShowEcosystemModal(false)}
          onLaunchPortal={(screen) => {
            setSelectedPortal(null);
            setCurrentScreen(screen);
          }}
          onShowToast={showToast}
        />
      )}

      {/* School Info Modal */}
      {showAboutModal && (
        <SchoolInfoModal
          onClose={() => setShowAboutModal(false)}
        />
      )}

      {/* App Version Update via Chrome Modal */}
      {showUpdateModal && (
        <AppUpdateModal
          isOpen={showUpdateModal}
          onClose={() => setShowUpdateModal(false)}
          onShowToast={showToast}
        />
      )}

      {/* Unified WhatsApp-Style Notification Center & Lock-Screen Push Setup Modal */}
      <NotificationPermissionModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        onShowToast={showToast}
        triggeredByInstall={notifTriggeredByInstall}
        initialView={notifInitialView}
        portalScope={activeNotifScope}
        onNavigateItem={(item: InboxNotificationItem) => {
          window.dispatchEvent(new CustomEvent('lra-notification-navigate', { detail: item }));
        }}
      />

      {/* Universal Portal Exit Confirmation Modal: "ARE YOU LEAVING ALREADY?" */}
      {showPortalExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl p-6 border shadow-2xl text-center bg-[#141C33] border-white/20 text-white">
            <div className="text-4xl mb-2">🥺</div>
            <h3 className="text-base font-black tracking-tight mb-2">
              ARE YOU LEAVING ALREADY?
            </h3>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Do you want to leave this portal and return to portal selection, or stay inside?
            </p>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  sound.playClick(450);
                  setShowPortalExitConfirm(false);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-black bg-[#7C3AED] text-white shadow-xs cursor-pointer hover:bg-[#6D28D9] transition-all"
              >
                No, stay
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick(400);
                  setShowPortalExitConfirm(false);
                  try {
                    localStorage.removeItem('lra_session_user');
                  } catch {
                    // ignore
                  }
                  setActiveSessionUser(null);
                  setCurrentScreen('portals');
                }}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border border-white/20 hover:bg-white/10 text-white cursor-pointer transition-all"
              >
                Yes, leave portal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Root Portal Exit Confirmation Modal: "ARE YOU LEAVING ALREADY 🥺" */}
      {showRootExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl p-6 border shadow-2xl text-center bg-[#141C33] border-white/20 text-white">
            <div className="text-4xl mb-2">🥺</div>
            <h3 className="text-base font-black tracking-tight mb-2">
              ARE YOU LEAVING ALREADY?
            </h3>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Would you like to exit Little Roses Academy or continue exploring the school portals?
            </p>

            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  sound.playClick(400);
                  setShowRootExitConfirm(false);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-black bg-[#7C3AED] text-white shadow-xs cursor-pointer hover:bg-[#6D28D9] transition-all"
              >
                No, stay
              </button>

              <button
                onClick={() => {
                  sound.playClick(450);
                  setShowRootExitConfirm(false);
                  showToast('Thank you for visiting Little Roses Academy');
                  try {
                    if (window.history.length > 1) {
                      window.history.go(-2);
                    }
                  } catch (e) {
                    console.debug(e);
                  }
                }}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border border-white/20 hover:bg-white/10 text-white cursor-pointer transition-all"
              >
                Yes, exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
