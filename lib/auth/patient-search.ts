"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/shared/search";

const schema = z.object({
  term: z.string().min(2).max(80),
  limit: z.number().int().min(1).max(20).default(8),
});

export type PatientSuggestion = {
  id: string;
  fullName: string | null;
};

/**
 * Sugerencias del buscador de la cabecera. RLS acota el resultado —el
 * profesional solo ve a quien tiene asignado, el admin a todos—; esta función
 * no repite esa regla, solo pide `patient` y deja pasar el resto.
 */
export async function searchPatients(
  term: string,
  limit = 8,
): Promise<PatientSuggestion[]> {
  const parsed = schema.safeParse({ term, limit });
  if (!parsed.success) return [];
  const cleaned = sanitizeSearch(parsed.data.term);
  if (!cleaned) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "patient")
    .ilike("full_name", `%${cleaned}%`)
    .order("full_name")
    .limit(parsed.data.limit);
  if (error)
    throw new Error(`No se pudo buscar pacientes: ${error.message}`);

  return (data ?? []).map((row) => ({ id: row.id, fullName: row.full_name }));
}
