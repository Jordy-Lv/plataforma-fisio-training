"use client";

import { useState, useTransition, type ReactElement, type ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogHeader,
  AlertDialogPanel,
  AlertDialogTrigger,
} from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/Dialog";

/*
  Confirmación de una acción que no se deshace. Sustituye a los `confirm()` del
  navegador, que no se pueden traducir, no respetan el tema y en móvil aparecen
  pegados al borde superior.

  El error de la acción se pinta dentro del diálogo y el diálogo NO se cierra:
  si se cerrara, el usuario perdería el mensaje y creería que la operación salió
  bien. Solo se cierra cuando la acción termina sin lanzar.
*/

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirmar",
  pendingLabel = "Procesando…",
  cancelLabel = "Cancelar",
  tone = "default",
  onConfirm,
}: {
  /** Botón que abre el diálogo. Se le añaden los manejadores de apertura. */
  trigger: ReactElement;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  /** Server action o cualquier promesa. Si lanza, el mensaje se muestra aquí. */
  onConfirm: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      try {
        await onConfirm();
        setOpen(false);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudo completar la acción. Inténtalo de nuevo.",
        );
      }
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // Mientras la acción está en curso el diálogo no se puede abandonar:
        // cerrarlo dejaría al usuario sin saber si terminó.
        if (isPending) return;
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <AlertDialogTrigger render={trigger} />
      <AlertDialogPanel>
        <AlertDialogHeader title={title} description={description} />
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-danger bg-danger-soft p-3 text-sm text-danger"
          >
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            size="lg"
            className="min-h-11 w-full sm:w-auto"
            disabled={isPending}
            onClick={() => setOpen(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "destructive" : "default"}
            size="lg"
            className="min-h-11 w-full sm:w-auto"
            disabled={isPending}
            onClick={confirm}
          >
            {isPending ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </AlertDialogPanel>
    </AlertDialog>
  );
}
