
/* ROYAL FITS BOUTIQUE254 — Push subscriptions */

(() => {
  const button = document.getElementById("enablePushNotifications");
  const status = document.getElementById("pushNotificationStatus");

  if (!button || !status) return;

  const SUPABASE_URL =
    "https://rutpxicmpjdqvrfoicnv.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_iUUvMivOvVBbk4XvCCDWtQ_iOWSra5g";

  // Replace this placeholder with your generated PUBLIC VAPID key.
  const VAPID_PUBLIC_KEY = "PASTE_PUBLIC_VAPID_KEY_HERE";

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
    return Uint8Array.from(raw, char => char.charCodeAt(0));
  }

  button.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = "Setting up notifications...";

    try {
      if (!window.isSecureContext) {
        throw new Error("Please open the website using HTTPS.");
      }

      if (
        !("serviceWorker" in navigator) ||
        !("Notification" in window) ||
        !("PushManager" in window)
      ) {
        throw new Error(
          "This browser does not support web push notifications."
        );
      }

      if (
        !VAPID_PUBLIC_KEY ||
        VAPID_PUBLIC_KEY === "BFLLHBvj-6nkfVjadjzsp3YnIrrq9fyx42O1YnsA_KYnZXbzgqXWRTG-rbO6k3ZxfTSCjBRONToC08S_0icmeTc"
      ) {
        throw new Error(
          "Add your generated PUBLIC VAPID key to push.js first."
        );
      }

      const { data: userData, error: userError } =
        await db.auth.getUser();

      if (userError || !userData.user) {
        throw new Error(
          "Please sign in to your ROYAL FITS account first."
        );
      }

      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      if (permission !== "granted") {
        throw new Error(
          "Notifications are blocked. Allow them in browser settings."
        );
      }

      const registration =
        await navigator.serviceWorker.register("./sw.js");

      await navigator.serviceWorker.ready;

      let subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(VAPID_PUBLIC_KEY)
        });
      }

      const subscriptionData = subscription.toJSON();

      const { data: existing, error: lookupError } = await db
        .from("push_subscriptions")
        .select("id")
        .eq("endpoint", subscriptionData.endpoint)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (!existing) {
        const { error: saveError } = await db
          .from("push_subscriptions")
          .insert({
            user_id: userData.user.id,
            endpoint: subscriptionData.endpoint,
            p256dh: subscriptionData.keys.p256dh,
            auth_key: subscriptionData.keys.auth
          });

        if (saveError) throw saveError;
      }

      status.textContent =
        "This browser is subscribed to ROYAL FITS notifications.";

      button.textContent = "✓ Notifications Enabled";

    } catch (error) {
      console.error("Push subscription error:", error);
      status.textContent = error.message || "Setup failed.";
      button.disabled = false;
    }
  });
})();

 
