/// Service Worker for Sudoku PWA
/// Handles push notifications and basic offline caching

const CACHE_NAME = "sudoku-v1";

// Install: cache shell
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Push notification received (from server)
self.addEventListener("push", (event) => {
  let data = { title: "Sudoku", body: "Twój ruch!" };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "sudoku-notif",
    renotify: true,
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/play",
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Click on notification -> open/focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/play";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // If app is already open, focus it
      for (const client of clients) {
        if (client.url.includes("/play") && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      return self.clients.openWindow(url);
    })
  );
});
