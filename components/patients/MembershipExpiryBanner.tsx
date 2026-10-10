"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TriangleAlert, X } from "lucide-react";

/*
  Aviso flotante, abajo, cuando la membresía del paciente está por vencer
  (`expiring_soon`). Ámbar y no rojo: todavía no venció. «Saber más» lleva a
  su membresía.

  Se puede cerrar —en el teléfono tapa parte del contenido y el paciente tiene
  que poder seguir—, y queda cerrado durante la sesión del navegador para esa
  misma fecha de vencimiento: si la membresía cambia, vuelve a salir.
  `sessionStorage` puede fallar (ventana privada, almacenamiento bloqueado), así
  que cada acceso va en `try`; si falla, el aviso simplemente vuelve a salir.

  Va fijo sobre la barra inferior del teléfono y, en escritorio, a la derecha
  sin tapar el menú lateral. Ni el cierre ni el enlace son formularios:
  `/patient` no puede ganar ninguno (`docs/11`).
*/
export function MembershipExpiryBanner({
  planName,
  expiresOn,
  expiresLabel,
  daysLeft,
}: {
  planName: string;
  expiresOn: string;
  /** La fecha ya escrita para leer: «6 de octubre de 2026». */
  expiresLabel: string;
  daysLeft: number;
}) {
  const storageKey = `membership-expiry-dismissed:${expiresOn}`;
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey) === "1") setIsDismissed(true);
    } catch {
      // Sin almacenamiento disponible el aviso se queda visible.
    }
  }, [storageKey]);

  if (isDismissed) return null;

  const when =
    daysLeft <= 0
      ? "hoy"
      : daysLeft === 1
        ? "mañana"
        : `en ${daysLeft} días`;

  function dismiss() {
    setIsDismissed(true);
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // Se cierra igual; solo no se recordará al recargar.
    }
  }

  return (
    <aside
      role="status"
      className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-warning/35 bg-warning-soft p-4 shadow-high lg:inset-x-auto lg:bottom-6 lg:right-8 lg:w-[min(56rem,calc(100vw-22rem))] lg:grid-cols-[auto_1fr_auto_auto] lg:gap-5 lg:px-6 lg:py-5"
    >
      <TriangleAlert
        aria-hidden="true"
        className="size-7 text-warning lg:size-10"
      />
      <div>
        <h2 className="text-base font-extrabold lg:text-lg">
          Tu plan vence {when}
        </h2>
        <p className="mt-1 text-[13px] leading-5 lg:text-sm">
          Tu plan {planName} vence el {expiresLabel}. Renuévalo con tu equipo
          para seguir entrenando sin interrupciones.
        </p>
      </div>
      <Link
        href="/memberships/me"
        prefetch={false}
        className="col-span-3 row-start-2 flex min-h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-extrabold uppercase tracking-[0.06em] text-background hover:bg-foreground/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:col-span-1 lg:row-start-auto lg:min-h-12"
      >
        Saber más
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar aviso"
        className="col-start-3 row-start-1 grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:col-start-4"
      >
        <X aria-hidden="true" className="size-5" />
      </button>
    </aside>
  );
}
