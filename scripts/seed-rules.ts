/**
 * Siembra seis reglas de asignación de ejemplo, una por cada perfil frecuente,
 * apuntando a las plantillas que crea `npm run seed:templates`.
 *
 * Son un punto de partida para que el motor tenga algo que decidir desde el
 * primer día y para que el simulador demuestre algo: el criterio final lo
 * define el equipo profesional desde el panel. En particular, las dos reglas de
 * rehabilitación se encadenan —la de rodilla excluye a quien tiene una
 * condición lumbar activa, así que ese paciente cae en la siguiente—; conviene
 * revisarlas con el equipo antes de la demostración.
 *
 * Requiere las plantillas sembradas (`npm run seed:templates`): las reglas se
 * refieren a ellas por su nombre.
 *
 * Es idempotente por el nombre de la regla y **no pisa** una que ya exista: si
 * el equipo la editó, se respeta lo que hizo.
 *
 * Uso:  npm run seed:rules
 *
 * Este archivo, las otras siembras y el job de pg_cron son los únicos lugares
 * del proyecto que pueden usar la clave de servicio.
 */
import { createClient } from "@supabase/supabase-js";
import { entornoLocal } from "./helpers/supabase-admin.ts";
import type { Database, Json } from "@/lib/db/types";
import type { RuleConditions } from "@/lib/catalog/rules-schema";

type Regla = {
  name: string;
  priority: number;
  /** Nombre de la plantilla que asigna; se resuelve a su identificador. */
  template: string;
  conditions: RuleConditions;
};

const REGLAS: Regla[] = [
  {
    name: "Rehabilitación de rodilla",
    priority: 10,
    template: "Rehabilitación de rodilla · fase inicial",
    // Quien viene a recuperarse y no arrastra una lumbalgia entra al protocolo
    // de rodilla; el resto cae en la regla siguiente.
    conditions: { goal: ["rehab"], excludes_conditions: ["lower_back"] },
  },
  {
    name: "Rehabilitación lumbar",
    priority: 20,
    template: "Rehabilitación lumbar · fase inicial",
    conditions: { goal: ["rehab"] },
  },
  {
    name: "Principiante en casa sin equipo",
    priority: 30,
    template: "Fuerza en casa · principiante",
    conditions: {
      level: ["beginner"],
      environment: ["home"],
      equipment_any_of: ["none", "bands"],
      excludes_conditions: ["knee", "lower_back"],
    },
  },
  {
    name: "Ganar músculo en gimnasio",
    priority: 40,
    template: "Hipertrofia en gimnasio · intermedio",
    conditions: {
      goal: ["gain_muscle"],
      level: ["intermediate", "advanced"],
      environment: ["gym"],
    },
  },
  {
    name: "Entrenamiento en casa",
    priority: 50,
    template: "Fuerza en casa · principiante",
    conditions: {
      environment: ["home"],
      excludes_conditions: ["knee", "lower_back"],
    },
  },
  {
    name: "Acondicionamiento general",
    priority: 99,
    template: "Fuerza en casa · principiante",
    // Sin criterios: la red de seguridad. El equipo decide si la quiere activa
    // o prefiere que un perfil sin coincidencia quede para revisión manual.
    conditions: {},
  },
];

async function main() {
  const { url, clave } = entornoLocal();
  const supabase = createClient<Database>(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Las plantillas se resuelven todas antes de escribir nada: una regla que
  // apunta a la nada es peor que no tener la regla.
  const nombres = [...new Set(REGLAS.map((regla) => regla.template))];
  const { data: plantillas, error: plantillasError } = await supabase
    .from("routine_templates")
    .select("id, name")
    .in("name", nombres);
  if (plantillasError)
    throw new Error(
      `No se pudieron leer las plantillas: ${plantillasError.message}`,
    );

  const porNombre = new Map(
    (plantillas ?? []).map((plantilla) => [plantilla.name, plantilla.id]),
  );
  const faltantes = nombres.filter((nombre) => !porNombre.has(nombre));
  if (faltantes.length > 0)
    throw new Error(
      `Faltan plantillas (${faltantes.join(", ")}). Ejecuta antes npm run seed:templates.`,
    );

  const { data: existentes, error: existentesError } = await supabase
    .from("assignment_rules")
    .select("name")
    .in(
      "name",
      REGLAS.map((regla) => regla.name),
    );
  if (existentesError)
    throw new Error(`No se pudieron leer las reglas: ${existentesError.message}`);
  const yaEstan = new Set((existentes ?? []).map((regla) => regla.name));

  let creadas = 0;

  for (const regla of REGLAS) {
    if (yaEstan.has(regla.name)) {
      console.log(`· ${regla.name}: ya existe, se deja como está.`);
      continue;
    }

    const { error } = await supabase.from("assignment_rules").insert({
      name: regla.name,
      priority: regla.priority,
      template_id: porNombre.get(regla.template)!,
      // El esquema de Zod ya valida esta forma en el panel; aquí el tipo la
      // fija en tiempo de compilación y el `jsonb` la acepta tal cual.
      conditions: regla.conditions as Json,
      // Se crean activas: son el criterio de partida de la demostración y el
      // panel permite desactivar cualquiera en un clic.
      is_active: true,
    });
    if (error)
      throw new Error(`No se pudo crear la regla ${regla.name}: ${error.message}`);

    creadas += 1;
    console.log(`✓ ${regla.name} (prioridad ${regla.priority})`);
  }

  console.log(
    `\nListo: ${creadas} reglas creadas, ${REGLAS.length - creadas} ya estaban.`,
  );
}

await main();
