"use client";

import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { useMemo, type ReactNode } from "react";

/*
  Avisos efímeros. Sirven para confirmar que algo se guardó; nunca para
  comunicar un error que el usuario tenga que leer con calma —eso va en el
  formulario o en el diálogo, donde no desaparece a los cinco segundos—.

  El aviso de error se anuncia con prioridad alta y dura más, pero sigue siendo
  un acuse de recibo: si la acción falló, la vista tiene además que mostrar el
  motivo en su sitio.

  Posición: en móvil abajo, al alcance del pulgar; en escritorio arriba a la
  derecha. La franja inferior se puede desplazar con `--toast-inset-bottom` si
  el shell monta una barra de navegación fija, sin tocar este archivo.
*/

const viewportClass = [
  "fixed bottom-[calc(1rem+var(--toast-inset-bottom,0px))] left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2",
  "sm:top-4 sm:right-4 sm:bottom-auto sm:left-auto sm:translate-x-0",
].join(" ");

const rootClass = [
  "flex items-start gap-3 rounded-xl border bg-surface p-4 text-sm shadow-panel",
  "transition-all duration-200 ease-out motion-reduce:transition-none",
  "data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0",
  "data-[ending-style]:translate-y-2 data-[ending-style]:opacity-0",
  "data-[limited]:opacity-0",
  // El borde y la marca lateral llevan el color del tipo de aviso; el texto se
  // queda en `foreground` para no perder contraste sobre la superficie.
  "border-border data-[type=success]:border-success data-[type=error]:border-danger data-[type=warning]:border-warning data-[type=info]:border-info",
].join(" ");

/** Punto de color a la izquierda: distingue el tipo sin depender solo del borde. */
function ToastMark() {
  return (
    <span
      aria-hidden="true"
      className="mt-1.5 size-2 shrink-0 rounded-full bg-muted-foreground group-data-[type=error]/toast:bg-danger group-data-[type=info]/toast:bg-info group-data-[type=success]/toast:bg-success group-data-[type=warning]/toast:bg-warning"
    />
  );
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();

  return toasts.map((toast) => (
    <ToastPrimitive.Root
      key={toast.id}
      toast={toast}
      className={`group/toast ${rootClass}`}
    >
      <ToastMark />
      <ToastPrimitive.Content className="grid flex-1 gap-1">
        <ToastPrimitive.Title className="font-medium text-foreground" />
        <ToastPrimitive.Description className="text-muted-foreground" />
        {toast.actionProps ? (
          <ToastPrimitive.Action className="mt-1 justify-self-start rounded-lg px-2 py-1 text-sm font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
        ) : null}
      </ToastPrimitive.Content>
      <ToastPrimitive.Close
        aria-label="Descartar el aviso"
        className="-my-1 -mr-1 flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          className="size-4"
        >
          <path d="M5 5l10 10M15 5L5 15" />
        </svg>
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  ));
}

/**
 * Envuelve el árbol que puede emitir avisos. Va lo más arriba posible del
 * layout que lo necesite; solo los componentes de cliente por debajo pueden
 * llamar a `useToast`.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <ToastPrimitive.Provider>
      {children}
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport className={viewportClass}>
          <ToastList />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  );
}

type ToastOptions = {
  description?: ReactNode;
  timeout?: number;
  actionProps?: React.ComponentPropsWithoutRef<"button">;
};

/**
 * Emisor de avisos. `error` dura el doble y se anuncia con prioridad alta
 * porque interrumpe una tarea; el resto son acuses de recibo.
 */
export function useToast() {
  const manager = ToastPrimitive.useToastManager();

  return useMemo(
    () => ({
      success: (title: string, options?: ToastOptions) =>
        manager.add({ title, type: "success", ...options }),
      error: (title: string, options?: ToastOptions) =>
        manager.add({
          title,
          type: "error",
          priority: "high" as const,
          timeout: 10000,
          ...options,
        }),
      warning: (title: string, options?: ToastOptions) =>
        manager.add({ title, type: "warning", ...options }),
      info: (title: string, options?: ToastOptions) =>
        manager.add({ title, type: "info", ...options }),
      close: manager.close,
      /** Encadena cargando → resultado sobre una promesa. */
      promise: manager.promise,
    }),
    [manager],
  );
}
