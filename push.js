
/* ROYAL FITS BOUTIQUE254 — Push subscriptions */

(() => {
  "use strict";

  const button = document.getElementById("enablePushNotifications");
  const status = document.getElementById("pushNotificationStatus");

  if (!button || !status) return;

  const SUPABASE_URL =
    "https://rutpxicmpjdqvrfoicnv.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_iUUvMivOvVBbk4XvCCDWtQ_iOWSra5g";

  // Your generated PUBLIC VAPID key.
  // Never put your private VAPID key in this file.
  const VAPID_PUBLIC_KEY =
    "BLGAAyhmAZnSDZ8GIuE8KXP6cg1MidBQSfURaIW1JSUE0BBDQbqCdfe6W3JZbUqWkPXGkXvv8TmAPFJU0wZjrJQ";

  if (!window.supabase) {
    status.textContent = "Supabase could not load. Reload the website.";
    return;
  }

  const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  function decodeVapidKey(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);

    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const raw = window.atob(base64);

    return Uint8Array.from(
      raw,
      character => character.charCodeAt(0)
    );
  }

  function validateVapidKey(key) {
    if (
      typeof key !== "string" ||
      !/^[A-Za-z0-9_-]+$/.test(key)
    ) {
      throw new Error(
        "The public VAPID key contains invalid characters."
      );
    }

    const decoded = decodeVapidKey(key);

    // An uncompressed P-256 public key must be 65 bytes
    // and start with 0x04.
    if (decoded.length !== 65 || decoded[0] !== 4) {
      throw new Error(
        "The public VAPID key is invalid. Check the full key from your generator."
      );
    }

    return decoded;
  }

  button.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = "Setting up notifications...";

    try {
      if (!window.isSecureContext) {
        throw new Error(
          "Please open ROYAL FITS using its HTTPS website."
        );
      }

      if (
        !("serviceWorker" in navigator) ||
        !("Notification" in window) ||
        !("PushManager" in window)
      ) {
        throw new Error(
          "Your browser does not support push notifications."
        );
      }

      const applicationServerKey =
        validateVapidKey(VAPID_PUBLIC_KEY);

      const { data: userData, error: userError } =
        await db.auth.getUser();

      if (userError || !userData.user) {
        throw new Error(
          "Please sign in to your ROYAL FITS account first."
        );
      }

      let permission = Notification.permission;

      if (permission === "default") {
        permission = await Notification.requestPermission();
      }

      if (permission !== "granted") {
        throw new Error(
          "Notifications are blocked. Allow them in your browser settings."
        );
      }

      const registration =
        await navigator.serviceWorker.register("./sw.js");

      await navigator.serviceWorker.ready;

      let subscription =
        await registration.pushManager.getSubscription();

      if (subscription) {
        const existingKey =
          subscription.options.applicationServerKey;

        if (existingKey) {
          const existingBytes = new Uint8Array(existingKey);
          const currentBytes = applicationServerKey;

          const keysMatch =
            existingBytes.length === currentBytes.length &&
            existingBytes.every(
              (byte, index) => byte === currentBytes[index]
            );

          if (!keysMatch) {
            await subscription.unsubscribe();
            subscription = null;
          }
        } else {
          await subscription.unsubscribe();
          subscription = null;
        }
      }

      if (!subscription) {
        subscription =
          await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey
          });
      }

      const subscriptionData = subscription.toJSON();

      if (
        !subscriptionData.endpoint ||
        !subscriptionData.keys ||
        !subscriptionData.keys.p256dh ||
        !subscriptionData.keys.auth
      ) {
        throw new Error(
          "The browser returned an incomplete push subscription."
        );
      }

      const row = {
        user_id: userData.user.id,
        endpoint: subscriptionData.endpoint,
        p256dh: subscriptionData.keys.p256dh,
        auth_key: subscriptionData.keys.auth
      };

      // Upsert also handles a subscription already stored
      // for this browser endpoint.
      const { error: saveError } = await db
        .from("push_subscriptions")
        .upsert(row, { onConflict: "endpoint" });

      if (saveError) {
        throw saveError;
      }

      status.textContent =
        "Notifications enabled for this signed-in account.";

      button.textContent = "✓ Notifications Enabled";

    } catch (error) {
      console.error("ROYAL FITS push setup error:", error);

      status.textContent =
        error?.message || "Could not enable notifications.";

      button.disabled = false;
    }
  });
})();
