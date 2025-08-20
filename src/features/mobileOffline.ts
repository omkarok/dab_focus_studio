// Placeholder functions for mobile and offline improvements.
// TODO: implement service worker registration and PWA support.

export function registerServiceWorker() {
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service worker registration failed", err);
    });
  }
}
