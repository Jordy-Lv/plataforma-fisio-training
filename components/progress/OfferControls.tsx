"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/auth/FormParts";
import {
  deletePlan,
  deleteService,
  setPlanActive,
  setServiceActive,
} from "@/lib/progress/plan-actions";
import type { PlanState } from "@/lib/progress/plan-schemas";

type Kind = "plan" | "service";

const setActiveFor: Record<
  Kind,
  (previous: PlanState, form: FormData) => Promise<PlanState>
> = {
  plan: setPlanActive,
  service: setServiceActive,
};

const deleteFor: Record<
  Kind,
  (previous: PlanState, form: FormData) => Promise<PlanState>
> = {
  plan: deletePlan,
  service: deleteService,
};

/**
 * Los controles de un plan o un servicio en el panel: activar o desactivar, y
 * eliminar. La eliminación se ofrece porque durante el montaje se crean filas
 * de prueba; si hay membresías de por medio la acción responde que se
 * desactive.
 */
export function OfferControls({
  kind,
  id,
  isActive,
}: {
  kind: Kind;
  id: string;
  isActive: boolean;
}) {
  const [activeState, activeAction, activePending] = useActionState(
    setActiveFor[kind],
    {},
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteFor[kind],
    {},
  );

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-3">
        <form action={activeAction}>
          <input type="hidden" name="id" value={id} />
          <input
            type="hidden"
            name="intent"
            value={isActive ? "deactivate" : "activate"}
          />
          <Button
            type="submit"
            variant="outline"
            className="min-h-11"
            disabled={activePending}
          >
            {isActive ? "Desactivar" : "Activar"}
          </Button>
        </form>

        <form action={deleteAction}>
          <input type="hidden" name="id" value={id} />
          <Button
            type="submit"
            variant="outline"
            className="min-h-11"
            disabled={deletePending}
          >
            Eliminar
          </Button>
        </form>
      </div>

      <FormMessage state={activeState} />
      <FormMessage state={deleteState} />
    </div>
  );
}
