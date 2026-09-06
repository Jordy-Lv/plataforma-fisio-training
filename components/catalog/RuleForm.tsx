"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Choices, Field, FormMessage, inputClass } from "@/components/auth/FormParts";
import { bodyPartLabels } from "@/lib/catalog/body-parts";
import { equipmentLabels } from "@/lib/catalog/equipment";
import { createRule, deleteRule, updateRule } from "@/lib/catalog/rule-actions";
import {
  createRuleSchema,
  ruleFormValues,
  updateRuleSchema,
} from "@/lib/catalog/rule-schemas";
import { useFormValidation } from "@/lib/auth/use-form-validation";
import {
  difficultyLabels,
  environmentLabels,
  goalLabels,
} from "@/lib/catalog/vocabulary";
import type { RuleListItem, TemplateOption } from "@/lib/catalog/rule-queries";

/**
 * Alta y edición de una regla de asignación, criterio a criterio.
 *
 * No hay editor de JSON a propósito: el `jsonb` es cómo se guarda el criterio,
 * no cómo se escribe. Cada grupo de casillas es un criterio; dejarlo sin marcar
 * significa «no me importa» y no restringe a nadie. El mismo esquema de Zod
 * valida aquí y en la server action.
 */
export function RuleForm({
  rule,
  templates,
}: {
  rule?: RuleListItem;
  templates: TemplateOption[];
}) {
  const editing = Boolean(rule);
  const [state, action, pending] = useActionState(
    editing ? updateRule : createRule,
    {},
  );
  const validation = useFormValidation(
    editing ? updateRuleSchema : createRuleSchema,
    ruleFormValues,
  );

  const conditions = rule?.conditions ?? undefined;
  const equipment =
    conditions?.equipment_all_of ?? conditions?.equipment_any_of ?? [];
  const equipmentMode = conditions?.equipment_all_of ? "all" : "any";

  return (
    <form onSubmit={validation.onSubmit} action={action} className="grid gap-8">
      {rule && <input type="hidden" name="id" value={rule.id} />}

      <div className="grid gap-6">
        <Field label="Nombre de la regla">
          <input
            className={inputClass}
            name="name"
            defaultValue={rule?.name ?? ""}
            required
            minLength={3}
            maxLength={120}
            placeholder="Principiante en casa sin equipo"
          />
        </Field>

        <Field label="Prioridad">
          <input
            className={inputClass}
            name="priority"
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            defaultValue={rule?.priority ?? 50}
            required
          />
        </Field>
        <p className="-mt-4 text-sm leading-7 text-muted-foreground">
          Menor número, antes se evalúa. Las reglas de rehabilitación van
          primero: una condición clínica manda sobre cualquier objetivo.
        </p>

        <Field label="Plantilla que se asigna">
          <select
            className={inputClass}
            name="templateId"
            defaultValue={rule?.template_id ?? ""}
            required
          >
            <option value="" disabled>
              Selecciona una plantilla
            </option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
                {template.is_active ? "" : " (borrador)"}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-8 border-t border-border pt-8">
        <div>
          <h3 className="text-lg font-semibold">Cuándo se aplica</h3>
          <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">
            Un criterio sin nada marcado no restringe. Dentro de un criterio
            basta con que el paciente coincida en uno de los valores; entre
            criterios distintos deben cumplirse todos.
          </p>
        </div>

        <Choices
          name="goal"
          title="Objetivo del paciente"
          labels={goalLabels}
          selected={conditions?.goal ?? []}
          multiple
        />
        <Choices
          name="level"
          title="Nivel"
          labels={difficultyLabels}
          selected={conditions?.level ?? []}
          multiple
        />
        <Choices
          name="environment"
          title="Entorno"
          labels={environmentLabels}
          selected={conditions?.environment ?? []}
          multiple
        />
        <Choices
          name="equipment"
          title="Equipamiento"
          labels={equipmentLabels}
          selected={equipment}
          multiple
        />
        <Choices
          name="equipmentMode"
          title="Cómo se exige ese equipamiento"
          labels={{
            any: "Le basta con tener uno",
            all: "Tiene que tenerlos todos",
          }}
          selected={equipmentMode}
        />
        <Choices
          name="excludesConditions"
          title="No aplicar si tiene una condición activa en"
          labels={bodyPartLabels}
          selected={conditions?.excludes_conditions ?? []}
          multiple
        />

        <fieldset className="grid gap-3">
          <legend className="mb-3 font-semibold">Edad</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Desde (años)">
              <input
                className={inputClass}
                name="ageMin"
                type="number"
                inputMode="numeric"
                min={0}
                max={120}
                defaultValue={conditions?.age_range?.min ?? ""}
                placeholder="Sin mínimo"
              />
            </Field>
            <Field label="Hasta (años)">
              <input
                className={inputClass}
                name="ageMax"
                type="number"
                inputMode="numeric"
                min={0}
                max={120}
                defaultValue={conditions?.age_range?.max ?? ""}
                placeholder="Sin máximo"
              />
            </Field>
          </div>
          <p className="text-sm leading-7 text-muted-foreground">
            Si indicas una edad, la regla no se aplicará a quien no tenga fecha
            de nacimiento registrada.
          </p>
        </fieldset>
      </div>

      <FormMessage
        state={validation.error ? { error: validation.error } : state}
      />

      <Button type="submit" className="min-h-12 text-base" disabled={pending}>
        {pending ? "Guardando…" : editing ? "Guardar cambios" : "Crear regla"}
      </Button>
    </form>
  );
}

/**
 * Eliminar una regla. Nada depende de ella —las rutinas ya asignadas son
 * copias— así que no hay más que confirmar el gesto.
 */
export function DeleteRuleForm({ ruleId }: { ruleId: string }) {
  const [state, action, pending] = useActionState(deleteRule, {});

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="id" value={ruleId} />
      <FormMessage state={state} />
      <Button
        type="submit"
        variant="destructive"
        className="min-h-12 justify-self-start text-base"
        disabled={pending}
      >
        {pending ? "Eliminando…" : "Eliminar regla"}
      </Button>
    </form>
  );
}
