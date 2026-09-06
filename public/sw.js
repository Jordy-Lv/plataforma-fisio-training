// Service worker mínimo de la PWA.
//
// Su único propósito es cumplir el criterio de instalabilidad de Chrome, que
// exige un service worker registrado. NO implementa caché offline: no está en
// el alcance de la Etapa 1 y una caché mal ajustada rompería la navegación de
// Next.js. Cada petición sigue su curso normal por la red.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Manejador de "fetch" vacío a propósito: algunas versiones de Chrome solo
// consideran instalable la aplicación si el service worker escucha "fetch".
// Al no llamar a `event.respondWith`, la petición la resuelve la red igual que
// sin service worker.
self.addEventListener("fetch", () => {});
