import { z } from "zod";
import { bodyParts } from "@/lib/catalog/body-parts";
import { patientProfileSchema } from "@/lib/auth/onboarding-schemas";

/**
 * El perfil ficticio del simulador.
 *
 * Reutiliza el esquema del registro del paciente —objetivo, nivel, entorno y
 * equipamiento— y le añade lo que el motor necesita y el registro guarda
 * aparte: las condiciones activas y la edad. Si el simulador aceptara perfiles
 * que el registro no puede producir, dejaría de demostrar nada.
 */
export const simulationProfileSchema = patientProfileSchema.extend({
  conditions: z
    .array(
      z.enum(bodyParts, {
        error: "Selecciona una zona del cuerpo de la lista.",
      }),
    )
    .max(12, "Selecciona como máximo 12 condiciones.")
    .default([]),
  age: z.coerce
    .number({ error: "La edad debe ser un número." })
    .int("La edad debe ser un número entero de años.")
    .min(0, "La edad no puede ser negativa.")
    .max(120, "La edad debe ser menor que 120.")
    .nullable()
    .default(null),
});

export type SimulationProfile = z.infer<typeof simulationProfileSchema>;

/**
 * El perfil viaja en la URL: la simulación es una consulta, no una escritura, y
 * así el enlace de un caso se puede compartir con el equipo tal cual.
 */
export function simulationValuesFromParams(params: URLSearchParams) {
  const age = params.get("age");
  return {
    goal: params.get("goal") ?? undefined,
    level: params.get("level") ?? undefined,
    environment: params.get("environment") ?? undefined,
    equipment: params.getAll("equipment").filter(Boolean),
    conditions: params.getAll("conditions").filter(Boolean),
    age: age === null || age === "" ? null : age,
  };
}

/** Los parámetros de una pantalla de Next, como `URLSearchParams`. */
export function toSearchParams(
  query: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) for (const item of value) params.append(key, item);
    else if (value !== undefined) params.append(key, value);
  }
  return params;
}
