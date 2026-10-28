
/* ROYAL FITS BOUTIQUE254 — Service Worker */

self.addEventListener("push", function (event) {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = {
      title: "ROYAL FITS Boutique254",
      body: event.data
        ? event.data.text()
        : "You have a new update."
    };
  }

  const options = {
    body: data.body || "You have a new shop update.",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    data: {
      url: data.url || "./"
    }
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || "ROYAL FITS Boutique254",
      options
    )
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const target = new URL(
    event.notification.data.url || "./",
    self.location.origin
  );

  if (target.origin !== self.location.origin) return;

  event.waitUntil(clients.openWindow(target.href));
});
