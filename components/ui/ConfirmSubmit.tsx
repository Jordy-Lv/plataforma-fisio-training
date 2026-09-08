"use client";

import { useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import {
  AlertDialog,
  AlertDialogHeader,
  AlertDialogPanel,
} from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/Dialog";

/*
  Botón de envío que pide confirmación antes de dejar pasar el envío.

  A diferencia de `ConfirmDialog`, este NO llama a una función ni envuelve la
  server action: deja el `<form action={serverAction}>` intacto —con su
  `$ACTION_ID` y con el rótulo del botón en el HTML del servidor, que es lo que
  leen las suites de `scripts/`— y confirma con `form.requestSubmit()`, el
  envío nativo que React intercepta con normalidad. Sin JavaScript no hay
  manejador y el botón envía directo, igual que un botón de envío normal
  (ver `docs/adr/0008-formularios-dentro-de-dialogos.md` y
  `docs/11-contratos-de-las-suites-http.md` §5).

  Se usa para las acciones que destruyen algo —quitar un ejercicio, eliminar un
  día, una plantilla o una regla— y para asignar una rutina que reemplaza a la
  activa. Para acciones que devuelven un error legible sin recargar y no envían
  un `<form>`, `ConfirmDialog`.

  Va SIEMPRE dentro de un `<form action={…}>`: como `SubmitButton`, lee el
  estado de espera con `useFormStatus`, así que el formulario no necesita
  convertirse en componente de cliente solo por el botón.
*/
export function ConfirmSubmit({
  children,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  pendingLabel,
  tone = "danger",
  disabled,
  type,
  onClick,
  ...props
}: ComponentProps<typeof Button> & {
  /** Pregunta del diálogo de confirmación. */
  title: ReactNode;
  /** Qué implica la acción y qué no se puede deshacer. */
  description?: ReactNode;
  /** Rótulo del botón que confirma. El del `<form>` no cambia. */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Rótulo del botón del `<form>` mientras el envío está en curso. */
  pendingLabel?: string;
  /** `danger` para lo que destruye; `default` para lo que solo reemplaza. */
  tone?: "default" | "danger";
}) {
  const { pending } = useFormStatus();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  // Cuando el envío ya viene confirmado desde el diálogo no se vuelve a
  // interceptar. `requestSubmit()` dispara un evento `submit`, no un `click`,
  // así que en la práctica este manejador no se reejecuta; la bandera es la
  // red de seguridad que describe el patrón de `docs/11` §5.
  const confirmed = useRef(false);

  const intercept: NonNullable<ComponentProps<typeof Button>["onClick"]> = (
    event,
  ) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (confirmed.current) {
      confirmed.current = false;
      return;
    }
    event.preventDefault();
    formRef.current = event.currentTarget.form;
    setOpen(true);
  };

  return (
    <>
      <Button
        type={type ?? "submit"}
        disabled={disabled || pending}
        aria-busy={pending || undefined}
        onClick={intercept}
        {...props}
      >
        {pending && pendingLabel ? pendingLabel : children}
      </Button>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          // Mientras el envío está en curso el diálogo ya está cerrado; no se
          // reabre por un evento de foco tardío.
          if (pending) return;
          setOpen(next);
        }}
      >
        <AlertDialogPanel>
          <AlertDialogHeader title={title} description={description} />
          <DialogFooter>
            <Button
              variant="outline"
              size="lg"
              className="min-h-11 w-full sm:w-auto"
              onClick={() => setOpen(false)}
            >
              {cancelLabel}
            </Button>
            <Button
              variant={tone === "danger" ? "destructive" : "default"}
              size="lg"
              className="min-h-11 w-full sm:w-auto"
              onClick={() => {
                setOpen(false);
                confirmed.current = true;
                formRef.current?.requestSubmit();
                confirmed.current = false;
              }}
            >
              {confirmLabel}
            </Button>
          </DialogFooter>
        </AlertDialogPanel>
      </AlertDialog>
    </>
  );
}
