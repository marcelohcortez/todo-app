// Minimal service worker. It makes the app installable and does not cache anything:
// every request goes to the network, so task data and sign-in always come from the server.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
