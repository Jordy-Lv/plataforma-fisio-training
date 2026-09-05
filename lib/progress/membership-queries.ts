import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db/types";
import type { MembershipStatus } from "@/lib/progress/membership-vocabulary";

type MembershipRow = Database["public"]["Tables"]["memberships"]["Row"];

export type Membership = Pick<
  MembershipRow,
  "id" | "started_on" | "expires_on" | "status" | "amount" | "notes"
> & { plan_name: string | null };

/** Una membresía junto al paciente al que pertenece, para los listados. */
export type MembershipWithPatient = Membership & {
  patient_id: string;
  patient_name: string | null;
};

/** El estado de la membresía de un paciente asignado, para el profesional. */
export type PatientMembershipSummary = {
  id: string;
  full_name: string | null;
  status: MembershipStatus | null;
  expires_on: string | null;
  plan_name: string | null;
};

const columns = "id, started_on, expires_on, status, amount, notes";
const withPlan = `${columns}, plan:plans!memberships_plan_id_fkey (name)`;

/** Aplana el plan embebido a `plan_name`. */
type RawMembership = Omit<Membership, "plan_name"> & {
  plan: { name: string } | { name: string }[] | null;
};

function flatten(row: RawMembership): Membership {
  const plan = Array.isArray(row.plan) ? row.plan[0] : row.plan;
  const { plan: _drop, ...rest } = row;
  void _drop;
  return { ...rest, plan_name: plan?.name ?? null };
}

/**
 * La membresía vigente de un paciente: la de vencimiento más reciente. El
 * identificador sale de la sesión, nunca de la URL, y se filtra igual aunque
 * RLS ya lo haga. Devuelve `null` si el paciente no tiene ninguna.
 */
export async function getPatientMembership(
  patientId: string,
): Promise<Membership | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select(withPlan)
    .eq("patient_id", patientId)
    .order("expires_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error)
    throw new Error(`No se pudo consultar la membresía: ${error.message}`);
  return data ? flatten(data as RawMembership) : null;
}

/**
 * Todas las membresías con el paciente al que pertenecen, de la que vence
 * antes a la que vence después. RLS decide el alcance: el administrador las ve
 * todas. El panel las separa en próximas a vencer, vencidas y el resto.
 */
export async function listMembershipsWithPatient(): Promise<
  MembershipWithPatient[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select(
      `${withPlan}, patient:profiles!memberships_patient_id_fkey (id, full_name)`,
    )
    .order("expires_on", { ascending: true });
  if (error)
    throw new Error(`No se pudieron consultar las membresías: ${error.message}`);

  return (data ?? []).map((row) => {
    const raw = row as RawMembership & {
      patient: { id: string; full_name: string | null } | null;
    };
    const { patient, ...membership } = raw;
    return {
      ...flatten(membership),
      patient_id: patient?.id ?? "",
      patient_name: patient?.full_name ?? null,
    };
  });
}

/** Los pacientes activos, para el desplegable del formulario de membresía. */
export async function listPatients(): Promise<
  { id: string; full_name: string | null }[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "patient")
    .eq("is_active", true)
    .order("full_name");
  if (error)
    throw new Error(`No se pudieron consultar los pacientes: ${error.message}`);
  return data ?? [];
}

/**
 * Los pacientes que el actor puede seguir, con el estado de su membresía
 * vigente. Para el profesional, RLS lo acota a los que tiene asignados.
 */
export async function listPatientsWithMembership(): Promise<
  PatientMembershipSummary[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `id, full_name, memberships!memberships_patient_id_fkey (status, expires_on, plan:plans!memberships_plan_id_fkey (name))`,
    )
    .eq("role", "patient")
    .eq("is_active", true)
    .order("full_name")
    .order("expires_on", {
      referencedTable: "memberships",
      ascending: false,
    });
  if (error)
    throw new Error(`No se pudo consultar la membresía: ${error.message}`);

  return (data ?? []).map((patient) => {
    const latest = patient.memberships[0];
    const plan = Array.isArray(latest?.plan) ? latest?.plan[0] : latest?.plan;
    return {
      id: patient.id,
      full_name: patient.full_name,
      status: (latest?.status as MembershipStatus | undefined) ?? null,
      expires_on: latest?.expires_on ?? null,
      plan_name: plan?.name ?? null,
    };
  });
}
