// Little Roses Academy App Version & Chrome PWA Update Manager

export interface AppVersionInfo {
  version: string;
  buildNumber: string;
  releaseDate: string;
  codename: string;
  changelog: {
    title: string;
    description: string;
    tag: string;
  }[];
  dataPreservationNotice: string;
}

export const CURRENT_APP_VERSION: AppVersionInfo = {
  version: 'v2.6.0',
  buildNumber: '2026.11.14-PROD',
  releaseDate: 'November 14, 2026',
  codename: 'Live Faculty Metrics, Pathway Advisor & Seamless PWA Updates',
  changelog: [
    {
      title: 'Installed Phone Cross-Device Updates (Zero Data Loss)',
      description: 'Future deployments automatically clear stale Service Worker caches and refresh installed phones while preserving all pupils, teachers, marks, and biometrics.',
      tag: 'PWA Update',
    },
    {
      title: 'Live Lessons Taught & Assessment Book CAT Metrics',
      description: 'Admin Teachers tab tracks live lessons marked taught and CAT completion percentages directly from CBC Assessment Books.',
      tag: 'Teachers',
    },
    {
      title: 'Elsie AI Senior School Pathway Recommendations',
      description: 'Parents receive personalized STEM, Social Sciences, or Arts & Sports recommendations powered by Elsie AI from assessment books.',
      tag: 'AI Advisor',
    },
    {
      title: 'Enhanced Pupils Search & Centered Modals',
      description: 'Instant pupil search by name, ADM, grade, or parent phone with centered credential confirmation popups.',
      tag: 'Admin Tools',
    },
    {
      title: 'Strictly Isolated Learners Portal',
      description: 'Learners only view their own assessment book, timetable, and Focus Zone without access to other learners.',
      tag: 'Security',
    },
  ],
  dataPreservationNotice:
    'All existing local data (admitted learners, faculty files, assessment book marks, biometric fingerprints, and timetables) are strictly preserved in localStorage & IndexedDB across every update.',
};

const VERSION_STORAGE_KEY = 'lra_installed_version';
const BUILD_ID_STORAGE_KEY = 'lra_server_build_id';
const UPDATE_AVAILABLE_KEY = 'lra_update_available_flag';

// Clean cache-busting query param from URL after an update reload
if (typeof window !== 'undefined' && window.location.search.includes('_pwa_u=')) {
  try {
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('_pwa_u');
    const qs = cleanUrl.searchParams.toString();
    window.history.replaceState({}, '', `${cleanUrl.pathname}${qs ? `?${qs}` : ''}${cleanUrl.hash}`);
  } catch {
    // ignore
  }
}

/**
 * Query server /api/app/version to detect new deployments even on installed phones
 */
export async function checkForServerAppUpdate(): Promise<{
  hasUpdate: boolean;
  serverVersion?: string;
  serverBuildId?: string;
}> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { hasUpdate: isUpdateAvailable() };
  }
  try {
    const res = await fetch(`/api/app/version?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { hasUpdate: isUpdateAvailable() };
    const data = await res.json();
    const serverBuildId = data?.buildId ? String(data.buildId) : '';
    const serverVersion = data?.version ? String(data.version) : CURRENT_APP_VERSION.version;
    if (!serverBuildId) return { hasUpdate: isUpdateAvailable() };

    const knownBuildId = localStorage.getItem(BUILD_ID_STORAGE_KEY);
    if (!knownBuildId) {
      localStorage.setItem(BUILD_ID_STORAGE_KEY, serverBuildId);
      localStorage.setItem(VERSION_STORAGE_KEY, serverVersion);
      return { hasUpdate: isUpdateAvailable(), serverVersion, serverBuildId };
    }

    if (knownBuildId !== serverBuildId) {
      markUpdateAvailable(true);
      // Proactively tell browser to check for updated sw.js
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => Promise.all(regs.map((r) => r.update().catch(() => {}))))
          .catch(() => {});
      }
      return { hasUpdate: true, serverVersion, serverBuildId };
    }

    return { hasUpdate: isUpdateAvailable(), serverVersion, serverBuildId };
  } catch {
    return { hasUpdate: isUpdateAvailable() };
  }
}

/**
 * Register service worker with updateViaCache: 'none' and poll server version when reopening PWA
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          reg.update().catch(() => {});

          if (reg.waiting && navigator.serviceWorker.controller) {
            markUpdateAvailable(true);
          }

          reg.onupdatefound = () => {
            const installing = reg.installing;
            if (installing) {
              installing.onstatechange = () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  markUpdateAvailable(true);
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('Service worker registration note:', err);
        });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
    }
  }

  // Check server build version immediately and whenever phone PWA resumes focus/visibility
  checkForServerAppUpdate().catch(() => {});
  window.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      checkForServerAppUpdate().catch(() => {});
    }
  });
  window.addEventListener('focus', () => {
    checkForServerAppUpdate().catch(() => {});
  });
  window.addEventListener('online', () => {
    checkForServerAppUpdate().catch(() => {});
  });
}

/**
 * Check if an update is flagged or available
 */
export function isUpdateAvailable(): boolean {
  try {
    return localStorage.getItem(UPDATE_AVAILABLE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Set update available flag
 */
export function markUpdateAvailable(available: boolean): void {
  try {
    if (available) {
      localStorage.setItem(UPDATE_AVAILABLE_KEY, 'true');
    } else {
      localStorage.removeItem(UPDATE_AVAILABLE_KEY);
    }
    window.dispatchEvent(new CustomEvent('lra_version_update_change'));
  } catch (e) {
    console.warn('Failed to set update flag', e);
  }
}

/**
 * Execute Chrome PWA app update with Zero Data Loss (preserves localStorage & IndexedDB)
 */
export async function executeChromeAppUpdate(): Promise<void> {
  try {
    // 1. Fetch latest server version fingerprint first
    try {
      const res = await fetch(`/api/app/version?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.buildId) localStorage.setItem(BUILD_ID_STORAGE_KEY, String(data.buildId));
        if (data?.version) localStorage.setItem(VERSION_STORAGE_KEY, String(data.version));
      }
    } catch {
      localStorage.setItem(VERSION_STORAGE_KEY, CURRENT_APP_VERSION.version);
    }

    // 2. Ask any Service Worker to clear old asset caches and activate waiting worker
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        if (reg.active) {
          reg.active.postMessage({ type: 'CLEAR_CACHES' });
        }
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        await reg.update().catch(() => {});
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    }

    // 3. Clear only CacheStorage (HTTP asset cache), NEVER touching localStorage or IndexedDB
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    // 4. Clear update flag
    localStorage.removeItem(UPDATE_AVAILABLE_KEY);
    window.dispatchEvent(new CustomEvent('lra_version_update_change'));

    // 5. Force cache-bypassing navigation so installed phone loads newest HTML & JS bundle
    setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set('_pwa_u', String(Date.now()));
      window.location.replace(url.toString());
    }, 450);
  } catch (err) {
    console.error('Update reload note:', err);
    window.location.reload();
  }
}
