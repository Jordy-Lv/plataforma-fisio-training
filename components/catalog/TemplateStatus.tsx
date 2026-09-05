"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/auth/FormParts";
import { setTemplateActive } from "@/lib/catalog/template-actions";

/**
 * Activar o desactivar la plantilla. Cuando le falta contenido, el botón queda
 * inhabilitado y la pantalla explica arriba qué falta: el motivo se lee antes
 * de intentarlo, no después.
 */
export function TemplateStatusForm({
  templateId,
  active,
  blocked,
  describedBy,
}: {
  templateId: string;
  active: boolean;
  blocked: boolean;
  describedBy?: string;
}) {
  const [state, action, pending] = useActionState(setTemplateActive, {});

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="id" value={templateId} />
      <input
        type="hidden"
        name="intent"
        value={active ? "deactivate" : "activate"}
      />

      <FormMessage state={state} />

      <Button
        type="submit"
        variant={active ? "outline" : "default"}
        className="min-h-12 justify-self-start text-base"
        aria-describedby={!active && blocked ? describedBy : undefined}
        disabled={pending || (!active && blocked)}
      >
        {pending
          ? active
            ? "Desactivando…"
            : "Activando…"
          : active
            ? "Desactivar plantilla"
            : "Activar plantilla"}
      </Button>
    </form>
  );
}
