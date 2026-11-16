// Little Roses Academy Service Worker - Lock-Screen Web Push, Background Sync & Safe Offline Cache
const CACHE_NAME = 'lra-pwa-v6.0.0';
const NOTIF_META_CACHE = 'lra-notif-sync-meta-v1';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/images/lra_crest.jpg',
  '/images/learner_computer.jpg',
  '/images/school_compound.jpg',
  '/images/elsie_chat_bg.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((asset) =>
          cache.add(new Request(asset, { cache: 'reload' })).catch(() => {})
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== NOTIF_META_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }

  // 1. Never intercept cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // 2. Never intercept API calls, Vite dev modules, HMR, or explicit no-store requests
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src') ||
    url.pathname.startsWith('/node_modules') ||
    event.request.cache === 'no-store'
  ) {
    return;
  }

  // 3. HTML Navigations: pass navigate request to network; cache production HTML for offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            const clone = networkResponse.clone();
            clone
              .text()
              .then((html) => {
                if (!html.includes('/@vite/client') && !html.includes('/src/main.tsx')) {
                  caches.open(CACHE_NAME).then((cache) =>
                    cache.put(
                      '/index.html',
                      new Response(html, {
                        status: networkResponse.status,
                        statusText: networkResponse.statusText,
                        headers: networkResponse.headers,
                      })
                    )
                  );
                }
              })
              .catch(() => {});
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match('/index.html');
          if (cached) return cached;
          return new Response(
            '<!doctype html><html><body style="background:#070F1E;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center"><div><h2>Little Roses Academy</h2><p>Connection interrupted. Please check your network and reload.</p><button onclick="location.reload()" style="padding:10px 20px;border-radius:10px;border:0;background:#F5B301;color:#0A192F;font-weight:bold;cursor:pointer">Retry</button></div></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // 4. Production compiled bundles (/assets/) & manifest.json: Network-first with offline cache fallback
  if (url.pathname.startsWith('/assets/') || url.pathname === '/manifest.json') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 5. Images & icons: Cache-first with background refresh
  if (
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/icon-') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.png')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
                const clone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        });
      })
    );
  }
});

async function getLastNotifCheckTs() {
  try {
    const cache = await caches.open(NOTIF_META_CACHE);
    const res = await cache.match('/_last_notif_ts');
    if (res) {
      const txt = await res.text();
      const num = parseInt(txt, 10);
      if (!Number.isNaN(num)) return num;
    }
  } catch {
    // ignore
  }
  return Date.now() - 10 * 60 * 1000;
}

async function setLastNotifCheckTs(ts) {
  try {
    const cache = await caches.open(NOTIF_META_CACHE);
    await cache.put('/_last_notif_ts', new Response(String(ts)));
  } catch {
    // ignore
  }
}

async function showHighPriorityNotification(payload) {
  const title = payload.title || 'Little Roses Academy';
  const body = payload.body || 'New Assessment Book or school update is ready.';
  const notifTag = payload.tag || `lra-${payload.id || Date.now()}`;

  await self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: notifTag,
    renotify: true,
    vibrate: [280, 120, 280, 120, 240],
    requireInteraction: true,
    timestamp: payload.createdAt || Date.now(),
    actions: [{ action: 'open', title: 'Open Portal' }],
    data: {
      url: payload.url || '/?portal=parents',
      targetPortal: payload.targetPortal || 'parents',
      targetTab: payload.targetTab || 'home',
      learnerId: payload.learnerId || '',
      id: payload.id || notifTag,
      category: payload.category || 'notice',
      title,
      body,
      createdAt: payload.createdAt || Date.now(),
    },
  });

  // Notify any open client windows so the WhatsApp-style Notification Inbox updates live
  try {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      client.postMessage({
        type: 'LRA_PUSH_RECEIVED',
        notification: {
          id: payload.id || notifTag,
          category: payload.category || 'notice',
          title,
          body,
          targetPortal: payload.targetPortal || 'parents',
          targetTab: payload.targetTab || 'home',
          learnerId: payload.learnerId || '',
          url: payload.url || '/?portal=parents',
          createdAt: payload.createdAt || Date.now(),
        },
      });
    }
  } catch {
    // ignore
  }
}

async function syncMissedNotificationsFromServer() {
  try {
    const since = await getLastNotifCheckTs();
    const res = await fetch(`/api/notifications/feed?since=${since}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    const events = Array.isArray(data?.events) ? data.events : [];
    for (const evt of events.slice(0, 4)) {
      await showHighPriorityNotification(evt);
    }
    if (data?.serverTime) {
      await setLastNotifCheckTs(data.serverTime);
    } else {
      await setLastNotifCheckTs(Date.now());
    }
  } catch {
    // ignore network failure while offline
  }
}

// Handle Real Server VAPID Push Events (triggers even when app is closed or phone screen is locked!)
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Little Roses Academy',
    body: 'New Assessment Book or school update is ready.',
    url: '/?portal=parents',
    category: 'notice',
    targetPortal: 'parents',
    createdAt: Date.now(),
  };
  try {
    if (event.data) {
      const text = event.data.text();
      try {
        const data = JSON.parse(text);
        payload = { ...payload, ...data };
      } catch {
        if (text) payload.body = text;
      }
    }
  } catch {
    // fallback
  }
  event.waitUntil(
    Promise.all([
      showHighPriorityNotification(payload),
      setLastNotifCheckTs(payload.createdAt || Date.now()),
    ])
  );
});

// Background Sync & Periodic Background Sync for waking locked phones when Push falls back or reconnecting
self.addEventListener('sync', (event) => {
  if (event.tag === 'lra-sync-notifications' || event.tag === 'lra-flush-outbox') {
    event.waitUntil(syncMissedNotificationsFromServer());
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'lra-periodic-alerts') {
    event.waitUntil(syncMissedNotificationsFromServer());
  }
});

// Focus or open target portal when user taps any lock-screen or pop-up notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = data.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'LRA_NOTIF_CLICK',
            ...data,
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
  if (event.data.type === 'CHECK_MISSED_ALERTS') {
    event.waitUntil(syncMissedNotificationsFromServer());
  }
});
