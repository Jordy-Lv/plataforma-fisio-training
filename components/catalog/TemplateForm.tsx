"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, inputClass } from "@/components/auth/FormParts";
import {
  createTemplate,
  deleteTemplate,
  updateTemplate,
} from "@/lib/catalog/template-actions";
import {
  createTemplateSchema,
  templateFormValues,
  updateTemplateSchema,
} from "@/lib/catalog/template-schemas";
import { useFormValidation } from "@/lib/auth/use-form-validation";
import {
  difficultyLabels,
  environmentLabels,
  environments,
  goalLabels,
  goals,
  levels,
  templateKindLabels,
  templateKinds,
} from "@/lib/catalog/vocabulary";
import type { TemplateDetail } from "@/lib/catalog/template-queries";

/** «Cualquiera» es el valor nulo: el criterio no restringe la asignación. */
const cualquiera = "Cualquiera";

/**
 * Alta y edición de la cabecera de una plantilla. Es el mismo formulario: al
 * crear, la plantilla nace como borrador y sus días se añaden después.
 */
export function TemplateForm({ template }: { template?: TemplateDetail }) {
  const editing = Boolean(template);
  const [state, action, pending] = useActionState(
    editing ? updateTemplate : createTemplate,
    {},
  );
  const validation = useFormValidation(
    editing ? updateTemplateSchema : createTemplateSchema,
    templateFormValues,
  );

  return (
    <form onSubmit={validation.onSubmit} action={action} className="grid gap-6">
      {template && <input type="hidden" name="id" value={template.id} />}

      <Field label="Nombre de la plantilla">
        <input
          className={inputClass}
          name="name"
          defaultValue={template?.name ?? ""}
          required
          minLength={3}
          maxLength={120}
          placeholder="Fuerza en casa · principiante"
        />
      </Field>

      <Field label="Tipo de trabajo">
        <select
          className={inputClass}
          name="kind"
          defaultValue={template?.kind ?? "training"}
          required
        >
          {templateKinds.map((value) => (
            <option key={value} value={value}>
              {templateKindLabels[value]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Objetivo del paciente">
        <select
          className={inputClass}
          name="goal"
          defaultValue={template?.goal ?? ""}
        >
          <option value="">{cualquiera}</option>
          {goals.map((value) => (
            <option key={value} value={value}>
              {goalLabels[value]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Nivel">
        <select
          className={inputClass}
          name="level"
          defaultValue={template?.level ?? ""}
        >
          <option value="">{cualquiera}</option>
          {levels.map((value) => (
            <option key={value} value={value}>
              {difficultyLabels[value]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Entorno">
        <select
          className={inputClass}
          name="environment"
          defaultValue={template?.environment ?? ""}
        >
          <option value="">{cualquiera}</option>
          {environments.map((value) => (
            <option key={value} value={value}>
              {environmentLabels[value]}
            </option>
          ))}
        </select>
      </Field>
      <p className="-mt-4 text-sm text-muted-foreground">
        Objetivo, nivel y entorno sin marcar significan «cualquiera»: la regla
        de asignación podrá usar esta plantilla para cualquier perfil.
      </p>

      <Field label="Días por semana">
        <input
          className={inputClass}
          name="daysPerWeek"
          type="number"
          inputMode="numeric"
          min={1}
          max={7}
          defaultValue={template?.days_per_week ?? 3}
          required
        />
      </Field>

      <FormMessage
        state={validation.error ? { error: validation.error } : state}
      />

      <Button type="submit" className="min-h-12 text-base" disabled={pending}>
        {pending
          ? "Guardando…"
          : editing
            ? "Guardar cambios"
            : "Crear plantilla"}
      </Button>
    </form>
  );
}

/**
 * Eliminar una plantilla solo es posible mientras ninguna regla la use. Si
 * alguna la referencia, la server action lo explica y la salida es
 * desactivarla.
 */
export function DeleteTemplateForm({ templateId }: { templateId: string }) {
  const [state, action, pending] = useActionState(deleteTemplate, {});

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="id" value={templateId} />
      <FormMessage state={state} />
      <Button
        type="submit"
        variant="destructive"
        className="min-h-12 justify-self-start text-base"
        disabled={pending}
      >
        {pending ? "Eliminando…" : "Eliminar plantilla"}
      </Button>
    </form>
  );
}
