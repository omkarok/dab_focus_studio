// Placeholder functions for mobile and offline improvements.
// TODO: implement service worker registration and PWA support.

export function registerServiceWorker() {
  // No service worker ships with the app yet. Attempting to register a
  // non-existent "/sw.js" throws a 404 + SecurityError in the console on
  // every page load, so this is intentionally a no-op until a real service
  // worker is added. When implementing PWA support, register the worker here
  // and ship the corresponding sw.js in the build output.
}
