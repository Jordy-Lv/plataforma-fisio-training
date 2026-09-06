"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, inputClass } from "@/components/auth/FormParts";
import { useFormValidation } from "@/lib/auth/use-form-validation";
import { createService, updateService } from "@/lib/progress/plan-actions";
import {
  createServiceSchema,
  serviceFormValues,
  updateServiceSchema,
} from "@/lib/progress/plan-schemas";
import type { Service } from "@/lib/progress/plan-queries";
import {
  serviceCategories,
  serviceCategoryLabels,
} from "@/lib/progress/plan-vocabulary";

/**
 * Alta y edición de un servicio adicional. Con `service` edita esa fila, sin él
 * crea una nueva.
 */
export function ServiceForm({ service }: { service?: Service }) {
  const editing = Boolean(service);
  const [state, action, pending] = useActionState(
    editing ? updateService : createService,
    {},
  );
  const validation = useFormValidation(
    editing ? updateServiceSchema : createServiceSchema,
    serviceFormValues,
  );

  return (
    <form onSubmit={validation.onSubmit} action={action} className="grid gap-6">
      {service && <input type="hidden" name="id" value={service.id} />}

      <Field label="Nombre del servicio">
        <input
          className={inputClass}
          name="name"
          type="text"
          maxLength={120}
          defaultValue={service?.name ?? ""}
          required
        />
      </Field>

      <Field label="Categoría">
        <select
          className={inputClass}
          name="category"
          defaultValue={service?.category ?? ""}
          required
        >
          <option value="" disabled>
            Elige una categoría
          </option>
          {serviceCategories.map((category) => (
            <option key={category} value={category}>
              {serviceCategoryLabels[category]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Descripción · opcional">
        <textarea
          className={`${inputClass} min-h-20`}
          name="description"
          maxLength={1000}
          defaultValue={service?.description ?? ""}
        />
      </Field>

      <FormMessage
        state={validation.error ? { error: validation.error } : state}
      />

      <Button
        type="submit"
        className="min-h-12 justify-self-start text-base"
        disabled={pending}
      >
        {pending
          ? "Guardando…"
          : editing
            ? "Guardar cambios"
            : "Crear servicio"}
      </Button>
    </form>
  );
}
