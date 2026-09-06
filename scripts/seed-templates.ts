/**
 * Siembra cuatro plantillas de rutina de ejemplo —dos de entrenamiento y dos
 * de rehabilitación— con sus días y sus ejercicios en orden.
 *
 * Sirven para dos cosas: que el panel no se vea vacío en la demostración y que
 * las reglas de asignación tengan a dónde apuntar desde el primer día. El
 * equipo profesional las revisa y las ajusta; son un punto de partida, no una
 * prescripción cerrada.
 *
 * Requiere el catálogo sembrado (`npm run seed:exercises`): los ejercicios se
 * referencian por su `external_id` de free-exercise-db.
 *
 * Es idempotente por el nombre de la plantilla, y **no pisa** una plantilla que
 * ya exista: si el equipo la editó, se respeta lo que hizo. Para regenerar una,
 * bórrala desde el panel y vuelve a ejecutar el script.
 *
 * Uso:  npm run seed:templates
 *
 * Este archivo, la siembra del catálogo y el job de pg_cron son los únicos
 * lugares del proyecto que pueden usar la clave de servicio.
 */
import { createClient } from "@supabase/supabase-js";
import { entornoLocal } from "./helpers/supabase-admin.ts";
import type { Database } from "@/lib/db/types";

type Plantilla = Database["public"]["Tables"]["routine_templates"]["Insert"];

type ItemEjemplo = {
  /** `external_id` del catálogo importado. */
  externalId: string;
  sets?: number;
  reps?: number;
  restSeconds?: number;
  notes?: string;
};

type DiaEjemplo = { title: string; items: ItemEjemplo[] };

type PlantillaEjemplo = Omit<Plantilla, "id" | "created_at" | "is_active"> & {
  days: DiaEjemplo[];
};

/** Lo que se repite en los estiramientos: sostener, no repetir. */
const sostener = (segundos: number) => ({
  sets: 2,
  notes: `Sostén ${segundos} segundos por lado, sin rebotes.`,
});

const PLANTILLAS: PlantillaEjemplo[] = [
  {
    name: "Fuerza en casa · principiante",
    kind: "training",
    goal: "gain_muscle",
    level: "beginner",
    environment: "home",
    days_per_week: 3,
    days: [
      {
        title: "Tren inferior",
        items: [
          { externalId: "Bodyweight_Squat", sets: 3, reps: 12, restSeconds: 60 },
          { externalId: "Bodyweight_Walking_Lunge", sets: 3, reps: 10, restSeconds: 60 },
          { externalId: "Butt_Lift_Bridge", sets: 3, reps: 15, restSeconds: 45 },
          {
            externalId: "Plank",
            sets: 3,
            restSeconds: 45,
            notes: "Aguanta 30 segundos con la cadera alineada.",
          },
        ],
      },
      {
        title: "Tren superior",
        items: [
          { externalId: "Incline_Push-Up", sets: 3, reps: 12, restSeconds: 60 },
          { externalId: "Pushups", sets: 3, reps: 8, restSeconds: 60 },
          {
            externalId: "Push-Ups_-_Close_Triceps_Position",
            sets: 3,
            reps: 8,
            restSeconds: 60,
          },
          { externalId: "Single_Leg_Glute_Bridge", sets: 3, reps: 10, restSeconds: 45 },
        ],
      },
      {
        title: "Core y movilidad",
        items: [
          { externalId: "Dead_Bug", sets: 3, reps: 10, restSeconds: 45 },
          { externalId: "Crunches", sets: 3, reps: 15, restSeconds: 45 },
          { externalId: "Reverse_Crunch", sets: 3, reps: 12, restSeconds: 45 },
          { externalId: "Cat_Stretch", ...sostener(20) },
        ],
      },
    ],
  },
  {
    name: "Hipertrofia en gimnasio · intermedio",
    kind: "training",
    goal: "gain_muscle",
    level: "intermediate",
    environment: "gym",
    days_per_week: 4,
    days: [
      {
        title: "Empuje",
        items: [
          { externalId: "Dumbbell_Bench_Press", sets: 4, reps: 10, restSeconds: 90 },
          { externalId: "Triceps_Pushdown", sets: 3, reps: 12, restSeconds: 60 },
          { externalId: "Face_Pull", sets: 3, reps: 15, restSeconds: 60 },
        ],
      },
      {
        title: "Tracción",
        items: [
          { externalId: "Wide-Grip_Lat_Pulldown", sets: 4, reps: 10, restSeconds: 90 },
          { externalId: "Seated_Cable_Rows", sets: 4, reps: 10, restSeconds: 90 },
          { externalId: "Dumbbell_Bicep_Curl", sets: 3, reps: 12, restSeconds: 60 },
        ],
      },
      {
        title: "Pierna",
        items: [
          { externalId: "Barbell_Squat", sets: 4, reps: 8, restSeconds: 120 },
          { externalId: "Leg_Press", sets: 3, reps: 12, restSeconds: 90 },
          { externalId: "Lying_Leg_Curls", sets: 3, reps: 12, restSeconds: 60 },
          { externalId: "Standing_Calf_Raises", sets: 3, reps: 15, restSeconds: 45 },
        ],
      },
      {
        title: "Cadena posterior y espalda",
        items: [
          { externalId: "Romanian_Deadlift", sets: 4, reps: 8, restSeconds: 120 },
          {
            externalId: "Barbell_Deadlift",
            sets: 3,
            reps: 5,
            restSeconds: 150,
            notes: "Sube la carga solo si mantienes la espalda neutra.",
          },
          { externalId: "Pullups", sets: 3, reps: 6, restSeconds: 90 },
        ],
      },
    ],
  },
  {
    name: "Rehabilitación de rodilla · fase inicial",
    kind: "physio",
    goal: "rehab",
    level: "beginner",
    environment: "home",
    days_per_week: 3,
    days: [
      {
        title: "Activación sin carga",
        items: [
          { externalId: "Butt_Lift_Bridge", sets: 3, reps: 12, restSeconds: 45 },
          { externalId: "Knee_Circles", sets: 2, reps: 10, notes: "Movimiento lento, sin forzar el final del recorrido." },
          { externalId: "Quad_Stretch", ...sostener(30) },
          { externalId: "Seated_Hamstring_and_Calf_Stretch", ...sostener(30) },
        ],
      },
      {
        title: "Control de la rodilla",
        items: [
          { externalId: "Single_Leg_Glute_Bridge", sets: 3, reps: 8, restSeconds: 60 },
          {
            externalId: "Bodyweight_Squat",
            sets: 3,
            reps: 10,
            restSeconds: 60,
            notes: "Baja solo hasta donde no aparezca dolor. Si duele, detente y avísale a tu profesional.",
          },
          { externalId: "Standing_Gastrocnemius_Calf_Stretch", ...sostener(30) },
        ],
      },
      {
        title: "Movilidad y descarga",
        items: [
          { externalId: "All_Fours_Quad_Stretch", ...sostener(30) },
          { externalId: "Side_Lying_Groin_Stretch", ...sostener(30) },
          { externalId: "Knee_Circles", sets: 2, reps: 10 },
          { externalId: "Childs_Pose", ...sostener(40) },
        ],
      },
    ],
  },
  {
    name: "Rehabilitación lumbar · fase inicial",
    kind: "physio",
    goal: "rehab",
    level: "beginner",
    environment: "home",
    days_per_week: 3,
    days: [
      {
        title: "Descarga de la zona",
        items: [
          { externalId: "Hug_Knees_To_Chest", ...sostener(30) },
          { externalId: "One_Knee_To_Chest", ...sostener(30) },
          { externalId: "Pelvic_Tilt_Into_Bridge", sets: 3, reps: 10, restSeconds: 45 },
          { externalId: "Cat_Stretch", sets: 2, reps: 10, notes: "Alterna redondear y arquear sin llegar al dolor." },
        ],
      },
      {
        title: "Estabilidad del core",
        items: [
          { externalId: "Dead_Bug", sets: 3, reps: 8, restSeconds: 60 },
          {
            externalId: "Plank",
            sets: 3,
            restSeconds: 60,
            notes: "Empieza por 20 segundos. Si la zona lumbar se hunde, para.",
          },
          { externalId: "Butt_Lift_Bridge", sets: 3, reps: 12, restSeconds: 45 },
        ],
      },
      {
        title: "Movilidad",
        items: [
          { externalId: "Knee_Across_The_Body", ...sostener(30) },
          { externalId: "Piriformis-SMR", ...sostener(30) },
          { externalId: "Chair_Lower_Back_Stretch", ...sostener(30) },
          { externalId: "Childs_Pose", ...sostener(40) },
        ],
      },
    ],
  },
];

async function main() {
  const { url, clave } = entornoLocal();
  const supabase = createClient<Database>(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Todos los ejercicios se resuelven antes de escribir nada: una plantilla a
  // medias es peor que ninguna.
  const externalIds = [
    ...new Set(
      PLANTILLAS.flatMap((plantilla) =>
        plantilla.days.flatMap((dia) => dia.items.map((item) => item.externalId)),
      ),
    ),
  ];
  const { data: ejercicios, error: catalogoError } = await supabase
    .from("exercises")
    .select("id, external_id")
    .in("external_id", externalIds);
  if (catalogoError)
    throw new Error(`No se pudo leer el catálogo: ${catalogoError.message}`);

  const porExternalId = new Map(
    (ejercicios ?? []).map((ejercicio) => [ejercicio.external_id, ejercicio.id]),
  );
  const faltantes = externalIds.filter((id) => !porExternalId.has(id));
  if (faltantes.length > 0) {
    throw new Error(
      `Faltan ${faltantes.length} ejercicios en el catálogo (${faltantes.slice(0, 3).join(", ")}…). ` +
        "Ejecuta antes npm run seed:exercises.",
    );
  }

  const { data: existentes, error: existentesError } = await supabase
    .from("routine_templates")
    .select("name")
    .in(
      "name",
      PLANTILLAS.map((plantilla) => plantilla.name),
    );
  if (existentesError)
    throw new Error(`No se pudieron leer las plantillas: ${existentesError.message}`);
  const yaEstan = new Set((existentes ?? []).map((plantilla) => plantilla.name));

  let creadas = 0;

  for (const { days, ...plantilla } of PLANTILLAS) {
    if (yaEstan.has(plantilla.name)) {
      console.log(`· ${plantilla.name}: ya existe, se deja como está.`);
      continue;
    }

    // Se crea activa porque nace completa: días con ejercicios en orden.
    const { data: creada, error } = await supabase
      .from("routine_templates")
      .insert({ ...plantilla, is_active: true })
      .select("id")
      .single();
    if (error || !creada)
      throw new Error(
        `No se pudo crear la plantilla ${plantilla.name}: ${error?.message ?? "sin datos"}`,
      );

    const { data: diasCreados, error: diasError } = await supabase
      .from("template_days")
      .insert(
        days.map((dia, indice) => ({
          template_id: creada.id,
          day_number: indice + 1,
          title: dia.title,
        })),
      )
      .select("id, day_number");
    if (diasError || !diasCreados)
      throw new Error(
        `No se pudieron crear los días de ${plantilla.name}: ${diasError?.message ?? "sin datos"}`,
      );

    const porNumero = new Map(diasCreados.map((dia) => [dia.day_number, dia.id]));
    const items = days.flatMap((dia, indice) =>
      dia.items.map((item, posicion) => ({
        template_day_id: porNumero.get(indice + 1)!,
        exercise_id: porExternalId.get(item.externalId)!,
        // La posición es el orden de ejecución y se copia tal cual al asignar.
        position: posicion + 1,
        sets: item.sets ?? null,
        reps: item.reps ?? null,
        rest_seconds: item.restSeconds ?? null,
        notes: item.notes ?? null,
      })),
    );

    const { error: itemsError } = await supabase.from("template_items").insert(items);
    if (itemsError)
      throw new Error(
        `No se pudieron crear los ejercicios de ${plantilla.name}: ${itemsError.message}`,
      );

    creadas += 1;
    console.log(`✓ ${plantilla.name}: ${days.length} días, ${items.length} ejercicios.`);
  }

  console.log(
    `Plantillas de ejemplo: ${creadas} creadas, ${PLANTILLAS.length - creadas} ya estaban.`,
  );
}

await main();
