"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/auth/FormParts";
import { moveRule, setRuleActive } from "@/lib/catalog/rule-actions";

/**
 * Subir o bajar una regla en el orden de evaluación. Cada botón es su propio
 * formulario para que la lista funcione sin JavaScript: el orden de las reglas
 * es lo que decide qué recibe un paciente y no puede depender de que cargue un
 * script.
 */
export function MoveRuleForm({
  ruleId,
  direction,
  disabled,
}: {
  ruleId: string;
  direction: "up" | "down";
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(moveRule, {});
  const subir = direction === "up";

  return (
    <form action={action} className="contents">
      <input type="hidden" name="id" value={ruleId} />
      <input type="hidden" name="direction" value={direction} />
      <Button
        type="submit"
        variant="outline"
        className="min-h-11 px-3"
        disabled={disabled || pending}
        aria-label={subir ? "Subir la regla" : "Bajar la regla"}
      >
        {subir ? "↑" : "↓"}
      </Button>
      {state.error && <div className="col-span-2"><FormMessage state={state} /></div>}
    </form>
  );
}

/**
 * Activar o desactivar una regla. Una regla inactiva no participa en la
 * evaluación aunque tenga la prioridad más alta, y es la forma de frenar un
 * criterio sin perder lo que se escribió.
 */
export function RuleStatusForm({
  ruleId,
  active,
  blocked,
  describedBy,
}: {
  ruleId: string;
  active: boolean;
  blocked: boolean;
  describedBy?: string;
}) {
  const [state, action, pending] = useActionState(setRuleActive, {});

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="id" value={ruleId} />
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
            ? "Desactivar regla"
            : "Activar regla"}
      </Button>
    </form>
  );
}
