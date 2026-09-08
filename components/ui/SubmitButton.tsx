"use client";

import { useFormStatus } from "react-dom";
import { type ComponentProps } from "react";

import { Button } from "@/components/ui/button";

/*
  Botón de envío que se deshabilita y cambia de rótulo mientras el formulario
  que lo contiene tiene un envío en curso. Lee ese estado con `useFormStatus`,
  no con `useActionState`, así que un `<form>` no necesita convertirse en
  componente de cliente solo para saber si está esperando: basta con montar
  este botón dentro de él.

  Va SIEMPRE dentro de un `<form action={…}>`. Fuera de un formulario
  `pending` es siempre `false` y el botón se comporta como un `<Button>`
  normal. `type="submit"` por defecto porque el `<Button>` de `@base-ui/react`
  emite `type="button"` y sin esto el `<form action>` nunca se enviaría.
*/
export function SubmitButton({
  children,
  pendingLabel,
  disabled,
  type,
  ...props
}: ComponentProps<typeof Button> & {
  /** Rótulo mientras el envío está en curso. Sin él, se conserva `children`. */
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type={type ?? "submit"}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
