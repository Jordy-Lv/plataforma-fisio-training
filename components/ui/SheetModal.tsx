"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "cn";
import { cardVariants } from "@/components/ui/Card";

/**
 * Una tarjeta que abre un modal con su contenido. A diferencia de `Dialog`
 * —que va en un portal y no emite nada en el HTML del servidor (ADR-0008)—,
 * este modal **no usa portal**: el contenido se renderiza en su sitio y solo se
 * muestra u oculta. Así los formularios y las listas que hay dentro siguen en
 * el HTML del servidor, que es lo que recorren las suites HTTP.
 *
 * Es para resumir una pantalla larga en unas pocas tarjetas: «Pacientes»,
 * «Equipo», «Registrar persona». El contenido pesado espera detrás del clic.
 */
export function SheetModal({
  title,
  count,
  description,
  action,
  closeLabel = "Cerrar",
  children,
}: {
  title: string;
  /** El recuento de la colección, junto al título. */
  count?: number;
  description?: ReactNode;
  /** La frase de la tarjeta que invita a abrir: «Buscar y abrir perfiles». */
  action?: ReactNode;
  closeLabel?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const labelId = useId();

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      (previouslyFocused ?? trigger)?.focus();
    };
  }, [open]);

  /** El foco no se escapa del panel mientras el modal está abierto. */
  function trapFocus(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          cardVariants({ padding: "lg" }),
          "flex h-full w-full flex-col items-start gap-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )}
      >
        <span className="flex items-baseline gap-2">
          <span className="text-lg font-semibold">{title}</span>
          {count !== undefined && (
            <span className="text-sm font-normal text-muted-foreground">
              {count}
            </span>
          )}
        </span>
        {description && (
          <span className="text-sm leading-6 text-muted-foreground">
            {description}
          </span>
        )}
        {action && (
          <span className="mt-1 text-sm font-medium text-brand">{action}</span>
        )}
      </button>

      {/*
        Siempre montado. El contenido tiene que estar en el HTML del servidor
        aunque el modal esté cerrado: `hidden` lo oculta sin desmontarlo.
      */}
      <div hidden={!open} className="fixed inset-0 z-50">
        <button
          type="button"
          aria-label={closeLabel}
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="absolute inset-0 h-full w-full cursor-default bg-foreground/40 backdrop-blur-[2px] dark:bg-background/80"
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelId}
          tabIndex={-1}
          onKeyDown={trapFocus}
          className={cn(
            "absolute inset-x-0 bottom-0 mx-auto flex max-h-[90dvh] w-full flex-col gap-4 rounded-t-2xl border border-border bg-surface p-5 text-foreground shadow-high outline-none",
            "sm:inset-x-auto sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6",
          )}
        >
          <header className="flex items-start justify-between gap-4">
            <h2 id={labelId} className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={closeLabel}
              className="-mt-1 -mr-1 flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                className="size-5"
              >
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </header>
          <div className="-mx-1 grid gap-4 overflow-y-auto px-1 py-1">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
