"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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

const nouns: Record<Kind, string> = { plan: "el plan", service: "el servicio" };

/**
 * Los controles de un plan o un servicio en el panel: activar o desactivar, y
 * eliminar. La eliminación se ofrece porque durante el montaje se crean filas
 * de prueba; si hay membresías de por medio la acción responde que se
 * desactive.
 *
 * Eliminar pide confirmación en un `ConfirmDialog`: es la única acción de esta
 * pantalla que no se deshace. Ninguna suite de `scripts/` envía este
 * formulario por HTTP —las de planes escriben por la API— así que puede vivir
 * dentro del diálogo sin chocar con el ADR-0008.
 */
export function OfferControls({
  kind,
  id,
  isActive,
  name,
}: {
  kind: Kind;
  id: string;
  isActive: boolean;
  name: string;
}) {
  const [activeState, activeAction, activePending] = useActionState(
    setActiveFor[kind],
    {},
  );
  async function remove() {
    const form = new FormData();
    form.set("id", id);
    const result = await deleteFor[kind]({}, form);
    // La acción devuelve el motivo en vez de lanzar. Al relanzarlo, el diálogo
    // se queda abierto y lo muestra: cerrarlo haría creer que se borró.
    if (result.error) throw new Error(result.error);
  }

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
          <Button type="submit" variant="outline" disabled={activePending}>
            {isActive ? "Desactivar" : "Activar"}
          </Button>
        </form>

        <ConfirmDialog
          trigger={
            <Button type="button" variant="destructive">
              Eliminar
            </Button>
          }
          title={`¿Eliminar «${name}»?`}
          description={`Se borra ${nouns[kind]} de la oferta y no se puede deshacer. Si solo quieres sacarlo de la vitrina, desactívalo.`}
          confirmLabel="Eliminar"
          pendingLabel="Eliminando…"
          tone="danger"
          onConfirm={remove}
        />
      </div>

      <FormMessage state={activeState} />
    </div>
  );
}
