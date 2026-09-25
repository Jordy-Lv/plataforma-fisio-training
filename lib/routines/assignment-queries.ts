import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { TemplateKind } from "@/lib/catalog/vocabulary";

/**
 * La ficha breve del paciente junto a las plantillas: lo que el profesional
 * mira para elegir (ADR-0009). `null` si el paciente no tiene perfil.
 */
export async function assignmentPatient(patientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patient_details")
    .select("goal, level, environment, onboarding_step")
    .eq("profile_id", patientId)
    .maybeSingle();
  if (error)
    throw new Error(`No se pudo consultar el perfil del paciente: ${error.message}`);
  return data;
}

/**
 * Qué tipos de rutina puede preparar el actor para este paciente (ADR-0010).
 * Es la misma regla que `private.can_assign_routine_kind`: la interfaz solo
 * evita ofrecer lo que la base rechazaría, la autorización sigue allí.
 */
export async function assignableKinds(
  actor: { id: string; role: string },
  patientId: string,
): Promise<{ own: TemplateKind | null; allowed: TemplateKind[] }> {
  if (actor.role === "admin") return { own: null, allowed: ["training", "physio"] };
  const supabase = await createClient();
  const [profile, assignments] = await Promise.all([
    supabase.from("profiles").select("specialty").eq("id", actor.id).maybeSingle(),
    supabase
      .from("care_assignments")
      .select("kind")
      .eq("professional_id", actor.id)
      .eq("patient_id", patientId)
      .is("ended_at", null),
  ]);
  if (profile.error)
    throw new Error(`No se pudo consultar tu especialidad: ${profile.error.message}`);
  if (assignments.error)
    throw new Error(`No se pudo consultar tu asignación: ${assignments.error.message}`);
  const own = profile.data?.specialty ?? null;
  const allowed =
    own && (assignments.data ?? []).some((assignment) => assignment.kind === own)
      ? [own]
      : [];
  return { own, allowed };
}

/** Las rutinas del paciente sin su contenido: para decidir el paso y el historial. */
export async function patientRoutineSummaries(patientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routines")
    .select("id, name, kind, status, starts_on, ends_on, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error)
    throw new Error(`No se pudieron consultar las rutinas: ${error.message}`);
  return data ?? [];
}

export type RoutineSummary = Awaited<ReturnType<typeof patientRoutineSummaries>>[number];

/**
 * Las plantillas activas del tipo con sus días y las contraindicaciones de sus
 * ejercicios, en **una** consulta: con eso cada tarjeta dice cuántos ejercicios
 * se quitarían a este paciente sin consultar plantilla por plantilla. Los
 * filtros se aplican en la página: son pocas plantillas, y así los chips solo
 * ofrecen valores que existen.
 */
export async function assignableTemplates(kind: TemplateKind, conditions: string[]) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routine_templates")
    .select(
      `id, name, goal, level, environment, days_per_week,
        template_days(day_number,
          template_items(exercises(name, contraindications)))`,
    )
    .eq("kind", kind)
    .eq("is_active", true)
    .order("name");
  if (error)
    throw new Error(`No se pudieron consultar las plantillas: ${error.message}`);

  return (data ?? []).map(({ template_days, ...template }) => {
    const exercises = template_days.flatMap((day) =>
      day.template_items.flatMap((item) => (item.exercises ? [item.exercises] : [])),
    );
    const excluded = exercises.filter((exercise) =>
      exercise.contraindications.some((part) => conditions.includes(part)),
    );
    return {
      ...template,
      dayCount: template_days.length,
      exerciseCount: exercises.length,
      excludedNames: [...new Set(excluded.map((exercise) => exercise.name))],
      excludedFor: [
        ...new Set(
          excluded.flatMap((exercise) =>
            exercise.contraindications.filter((part) => conditions.includes(part)),
          ),
        ),
      ],
    };
  });
}

export type AssignableTemplate = Awaited<ReturnType<typeof assignableTemplates>>[number];
