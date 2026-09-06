"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "cn";
import type { ComponentProps, ReactNode } from "react";

/*
  Capas del rediseño (fase 3). El diálogo se apoya en `@base-ui/react`, que ya
  estaba instalado: no añade dependencias.

  Dos decisiones que conviene no deshacer:

  1. `keepMounted` va activado por defecto en el portal. Con él, el contenido
     del diálogo —incluidos sus formularios— sigue en el DOM mientras está
     cerrado, que es lo que espera cualquier prueba que trabaje sobre la página
     ya hidratada. Ojo: el portal no emite nada en el HTML del servidor, así que
     un formulario que hoy recorra una prueba por HTTP no puede mudarse dentro
     de un diálogo sin adaptar antes esa prueba.
  2. En móvil el diálogo es una hoja que sube desde abajo y ocupa todo el ancho;
     a partir de `sm` se centra. La vista del paciente se diseña a 375 px y una
     tarjeta centrada deja las acciones fuera del alcance del pulgar.
*/

// Compartidas con `AlertDialog.tsx` para que las dos capas se muevan igual.
/*
  El velo oscurece en los dos modos: en claro tiñe con `foreground`, que es casi
  negro; en oscuro eso lo aclararía, así que tiñe con `background`. Sin literales
  de color: los dos son tokens.
*/
export const backdropClass =
  "fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[2px] transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none dark:bg-background/80";

export const popupClass = cn(
  "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] w-full flex-col gap-4 rounded-t-2xl border border-border bg-surface p-5 text-foreground shadow-high outline-none",
  "sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6",
  "transition-all duration-200 ease-out motion-reduce:transition-none",
  "data-[starting-style]:translate-y-full data-[starting-style]:opacity-0",
  "data-[ending-style]:translate-y-full data-[ending-style]:opacity-0",
  "sm:data-[starting-style]:translate-y-[calc(-50%+0.5rem)] sm:data-[starting-style]:scale-[0.98]",
  "sm:data-[ending-style]:translate-y-[calc(-50%+0.5rem)] sm:data-[ending-style]:scale-[0.98]",
);

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

/**
 * Portal, fondo y contenedor en una sola pieza. Es lo que se usa casi siempre,
 * en vez de las partes sueltas.
 */
function DialogPanel({
  children,
  className,
  keepMounted = true,
  ...props
}: ComponentProps<typeof DialogPrimitive.Popup> & {
  keepMounted?: boolean;
}) {
  return (
    <DialogPrimitive.Portal keepMounted={keepMounted}>
      <DialogPrimitive.Backdrop className={backdropClass} />
      <DialogPrimitive.Popup className={cn(popupClass, className)} {...props}>
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

/**
 * Título, descripción y botón de cerrar. El botón va dentro del diálogo, no
 * solo en el fondo: con `modal` activo es la única salida que anuncian los
 * lectores de pantalla táctiles.
 */
function DialogHeader({
  title,
  description,
  closeLabel = "Cerrar",
}: {
  title: ReactNode;
  description?: ReactNode;
  closeLabel?: string;
}) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="grid gap-1">
        <DialogPrimitive.Title className="text-lg font-semibold text-foreground">
          {title}
        </DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className="text-sm text-muted-foreground">
            {description}
          </DialogPrimitive.Description>
        ) : null}
      </div>
      <DialogPrimitive.Close
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
      </DialogPrimitive.Close>
    </header>
  );
}

/** Cuerpo desplazable: el diálogo nunca crece más allá de la pantalla. */
function DialogBody({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("-mx-1 grid gap-4 overflow-y-auto px-1 py-1", className)}
      {...props}
    />
  );
}

/**
 * Acciones. En móvil se apilan a ancho completo —el pulgar no acierta botones
 * puestos en fila en 375 px— y en escritorio van alineadas a la derecha.
 */
function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTrigger,
};
