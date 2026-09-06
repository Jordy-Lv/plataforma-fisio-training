"use client";

import { useEffect } from "react";

/**
 * Registra el service worker mínimo (`public/sw.js`). Es lo único que Chrome
 * necesita para ofrecer «Instalar aplicación»; no añade caché offline.
 *
 * Se monta como un componente cliente diminuto que no pinta nada, para no
 * marcar toda la página como `"use client"`.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("No se pudo registrar el service worker", error);
      });
    };

    // Esperar a `load` para no competir con la carga inicial de la página.
    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
