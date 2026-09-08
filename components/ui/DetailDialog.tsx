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

/**
 * Diálogo de **solo lectura**: abre un detalle sin cambiar de pantalla.
 *
 * Como `SheetModal` —y a diferencia de `Dialog`, que va en un portal y no emite
 * nada en el HTML del servidor (ADR-0008)—, **no usa portal**: el contenido se
 * renderiza en su sitio y solo se muestra u oculta. Por eso lo que hay dentro
 * sigue en el HTML del servidor y las suites que leen texto ahí —la evidencia
 * de una alerta, por ejemplo— lo siguen encontrando.
 *
 * **Aquí no entra ningún formulario.** El ADR-0008 lo prohíbe para los portales;
 * la razón práctica de mantenerlo también aquí es que un formulario dentro de un
 * modal es una edición, y la edición se pliega con `<details>`, no se esconde
 * tras un clic que hay que descubrir.
 *
 * Mecánica compartida: `DetailPanel` es el panel en sí —cierre por `Esc`, por
 * clic fuera y por su botón, foco atrapado dentro mientras está abierto y
 * devuelto al disparador al cerrar— y `DetailDialog` lo envuelve con un
 * disparador propio. Quien necesite otro disparador —un enlace que sin
 * JavaScript navega a la ruta completa— usa `DetailPanel` directamente.
 */
export function DetailPanel({
  title,
  description,
  open,
  onClose,
  closeLabel = "Cerrar",
  keepMounted = true,
  className,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  open: boolean;
  onClose: () => void;
  closeLabel?: string;
  /**
   * Con `true` (por defecto) el contenido se emite siempre y solo se oculta:
   * es lo que necesita cualquier texto que lea una suite por HTTP. Con `false`
   * se monta al abrir, para listados largos donde repetir el detalle en cada
   * fila engordaría el documento sin que nadie lo lea.
   */
  keepMounted?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const labelId = useId();

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

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

  if (!keepMounted && !open) return null;

  return (
    <div hidden={!open} className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={closeLabel}
        tabIndex={-1}
        onClick={onClose}
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
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4">
          <div className="grid min-w-0 gap-1">
            <h2
              id={labelId}
              className="min-w-0 break-words text-lg font-semibold text-foreground"
            >
              {title}
            </h2>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
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
  );
}

/**
 * El panel con su disparador: un botón que lleva `trigger` dentro. Para el
 * disparador que ya es un enlace —el nombre de un ejercicio, que sin JavaScript
 * tiene que seguir navegando a su ruta— se usa `DetailPanel` a mano.
 */
export function DetailDialog({
  title,
  description,
  trigger,
  triggerClassName,
  closeLabel,
  keepMounted,
  className,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Contenido del botón que abre el detalle. */
  trigger: ReactNode;
  triggerClassName?: string;
  closeLabel?: string;
  keepMounted?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-medium text-brand transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          triggerClassName,
        )}
      >
        {trigger}
      </button>
      <DetailPanel
        title={title}
        description={description}
        open={open}
        onClose={() => setOpen(false)}
        closeLabel={closeLabel}
        keepMounted={keepMounted}
        className={className}
      >
        {children}
      </DetailPanel>
    </>
  );
}
