
/* ROYAL FITS BOUTIQUE254 — Push setup */

(() => {
  const button = document.getElementById("enablePushNotifications");
  const status = document.getElementById("pushNotificationStatus");

  if (!button || !status) return;

  button.addEventListener("click", async () => {
    button.disabled = true;

    try {
      if (!("serviceWorker" in navigator) ||
          !("Notification" in window) ||
          !("PushManager" in window)) {
        throw new Error(
          "Your browser does not support push notifications."
        );
      }

      const registration = await navigator.serviceWorker.register("./sw.js");

      let permission = Notification.permission;

      if (permission === "default") {
        permission = await Notification.requestPermission();
      }

      if (permission !== "granted") {
        throw new Error(
          "Please allow notifications in your browser settings."
        );
      }

      status.textContent =
        "Permission granted. Push subscription setup is still required.";

      button.textContent = "✓ Permission Granted";

      console.log("Service worker ready:", registration);

    } catch (error) {
      console.error("Push notification setup failed:", error);
      status.textContent = error.message;
      button.disabled = false;
    }
  });
})();
