"use client";

import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { cn } from "cn";
import type { ComponentProps, ReactNode } from "react";

import { backdropClass, popupClass } from "@/components/ui/Dialog";

/*
  Igual que `Dialog`, pero para decisiones que no se pueden descartar sin
  querer: no cierra al pulsar fuera. Se reserva para acciones que destruyen o
  publican algo —quitar un ejercicio ya ejecutado, cancelar una membresía—;
  para todo lo demás va `Dialog`, que sí deja escapar con un clic fuera.

  Aquí no hay botón de cerrar en la cabecera a propósito: la salida es el botón
  «Cancelar» del pie, que es explícito y grande.
*/

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogClose = AlertDialogPrimitive.Close;

function AlertDialogPanel({
  children,
  className,
  keepMounted = true,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Popup> & {
  keepMounted?: boolean;
}) {
  return (
    <AlertDialogPrimitive.Portal keepMounted={keepMounted}>
      <AlertDialogPrimitive.Backdrop className={backdropClass} />
      <AlertDialogPrimitive.Popup
        className={cn(popupClass, "sm:max-w-md", className)}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Popup>
    </AlertDialogPrimitive.Portal>
  );
}

function AlertDialogHeader({
  title,
  description,
}: {
  title: ReactNode;
  description?: ReactNode;
}) {
  return (
    <header className="grid gap-1">
      <AlertDialogPrimitive.Title className="text-lg font-semibold text-foreground">
        {title}
      </AlertDialogPrimitive.Title>
      {description ? (
        <AlertDialogPrimitive.Description className="text-sm text-muted-foreground">
          {description}
        </AlertDialogPrimitive.Description>
      ) : null}
    </header>
  );
}

export {
  AlertDialog,
  AlertDialogClose,
  AlertDialogHeader,
  AlertDialogPanel,
  AlertDialogTrigger,
};
