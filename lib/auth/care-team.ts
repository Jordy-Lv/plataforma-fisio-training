import "server-only";

import { createClient } from "@/lib/supabase/server";
import { specialtyLabels } from "@/lib/auth/people-schemas";

/**
 * Quién acompaña a un paciente (KAN-6). El esquema ya lo soportaba —
 * `care_assignments` tiene `kind` y un índice parcial `(patient_id, kind)
 * where ended_at is null`, así que un paciente puede tener fisioterapeuta y
 * entrenador a la vez—, pero el dato no se mostraba en ninguna pantalla.
 *
 * **El mapa completo lo ve solo el administrador, y eso lo decide la RLS, no
 * este archivo.** «Lectura de las asignaciones propias» deja al profesional ver
 * únicamente las filas en las que él es el profesional, y «lectura de perfiles
 * propios, asignados o admin» no le deja leer el perfil del otro profesional.
 * Por eso `professionalName` es opcional: cuando la RLS esconde el perfil se
 * pinta el rótulo de la especialidad sin nombre, en vez de inventar un acceso
 * con una función `security definer` (CLAUDE.md §1: por el lado restrictivo).
 */
export type CareTeamMember = {
  assignmentId: string;
  kind: keyof typeof specialtyLabels;
  professionalId: string;
  /** `null` cuando la RLS no deja al actor leer ese perfil. */
  professionalName: string | null;
};

/** Columnas de la asignación. Nunca `select("*")`. */
const assignmentColumns = "id, patient_id, professional_id, kind";

/**
 * El acompañamiento vigente de un paciente, con el nombre de cada profesional.
 *
 * Dos consultas, no una por fila: los perfiles se piden con un solo `in`.
 */
export async function getCareTeam(patientId: string): Promise<CareTeamMember[]> {
  const supabase = await createClient();
  const { data: assignments, error } = await supabase
    .from("care_assignments")
    .select(assignmentColumns)
    .eq("patient_id", patientId)
    .is("ended_at", null);
  if (error)
    throw new Error(
      `No se pudo consultar quién acompaña al paciente: ${error.message}`,
    );
  if (!assignments || assignments.length === 0) return [];

  const { data: professionals, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in(
      "id",
      assignments.map((assignment) => assignment.professional_id),
    );
  if (profilesError)
    throw new Error(
      `No se pudo consultar al equipo del paciente: ${profilesError.message}`,
    );

  return toCareTeam(
    assignments,
    new Map(
      (professionals ?? []).map((person) => [person.id, person.full_name]),
    ),
  );
}

/**
 * Arma el equipo a partir de filas ya cargadas. `/people` trae de una vez los
 * acompañamientos de todos los pacientes, así que pedirlos aquí de nuevo sería
 * una consulta por tarjeta.
 *
 * `names` solo tiene a quien el actor puede leer: lo que falte sale sin nombre.
 */
export function toCareTeam(
  assignments: {
    id: string;
    professional_id: string;
    kind: string;
  }[],
  names: Map<string, string | null>,
): CareTeamMember[] {
  return assignments
    .map((assignment) => ({
      assignmentId: assignment.id,
      kind: assignment.kind as CareTeamMember["kind"],
      professionalId: assignment.professional_id,
      professionalName: names.get(assignment.professional_id) ?? null,
    }))
    .sort((a, b) => specialtyLabels[a.kind].localeCompare(specialtyLabels[b.kind]));
}

/**
 * El equipo en una línea: «Fisioterapia: Ana Ruiz · Entrenamiento: Luis Gómez».
 * Sin nombre legible queda la especialidad sola, que es lo que ve el
 * profesional cuando el otro profesional no está a su alcance.
 */
export function careTeamSummary(team: CareTeamMember[]): string {
  if (team.length === 0) return "Sin profesional asignado";
  return team
    .map((member) =>
      member.professionalName
        ? `${specialtyLabels[member.kind]}: ${member.professionalName}`
        : specialtyLabels[member.kind],
    )
    .join(" · ");
}
