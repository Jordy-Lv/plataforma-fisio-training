/**
 * Siembra el catálogo de ejercicios desde free-exercise-db (licencia MIT) y
 * copia las imágenes al bucket `exercise-media`.
 *
 * Por qué se copian las imágenes en lugar de enlazarlas: durante la
 * demostración no puede haber una dependencia externa que falle, y el día que
 * llegue el material propio del negocio basta con reemplazar el archivo.
 * Ver docs/adr/0005-biblioteca-de-ejercicios.md.
 *
 * Es idempotente: identifica cada ejercicio por `external_id`, así que
 * ejecutarlo dos veces actualiza en lugar de duplicar, y nunca pisa el
 * etiquetado clínico (`contraindications`) que el equipo haya añadido.
 *
 * Uso:  npm run seed:exercises
 *
 * Este archivo y el job de pg_cron son los dos únicos lugares del proyecto que
 * pueden usar la clave de servicio.
 */
import { createClient } from "@supabase/supabase-js";
import { entornoLocal } from "./helpers/supabase-admin.ts";
import type { Equipment } from "../lib/catalog/equipment.ts";
import type { Database } from "@/lib/db/types";

const FUENTE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main";
const BUCKET = "exercise-media";
/** Descargas y subidas en paralelo. Más no acelera: el cuello es la red. */
const CONCURRENCIA = 8;
/** Filas por sentencia de upsert. */
const LOTE = 200;

type EjercicioFuente = {
  id: string;
  name: string;
  level: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
};

type FilaEjercicio = Database["public"]["Tables"]["exercises"]["Insert"];
type Dificultad = Database["public"]["Enums"]["fitness_level"];

/**
 * El vocabulario de origen es más fino que el que usa el paciente en su
 * registro: aquí se traduce a los valores con los que el motor de reglas cruza
 * `exercises.equipment` con `patient_details.equipment`. Si el vocabulario del
 * registro cambia, este mapa es el único lugar que hay que tocar.
 */
const EQUIPAMIENTO: Record<string, Equipment> = {
  "body only": "none",
  bands: "bands",
  dumbbell: "dumbbells",
  barbell: "barbell",
  "e-z curl bar": "barbell",
  machine: "machines",
  cable: "machines",
  kettlebells: "kettlebells",
  "medicine ball": "ball",
  "exercise ball": "ball",
  "foam roll": "other",
  other: "other",
};

/** Lo que se puede tener en casa. Todo lo demás exige gimnasio. */
const EQUIPAMIENTO_DE_CASA = new Set(["none", "bands", "dumbbells", "kettlebells", "ball", "other"]);

const DIFICULTAD: Record<string, Dificultad> = {
  beginner: "beginner",
  intermediate: "intermediate",
  expert: "advanced",
};

async function descargar(url: string): Promise<Response> {
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`No se pudo descargar ${url}: ${respuesta.status}`);
  return respuesta;
}

/** Ejecuta `tarea` sobre cada elemento con un límite de trabajos simultáneos. */
async function enParalelo<T>(elementos: T[], tarea: (elemento: T) => Promise<void>) {
  let siguiente = 0;
  const trabajadores = Array.from({ length: Math.min(CONCURRENCIA, elementos.length) }, async () => {
    while (siguiente < elementos.length) {
      const indice = siguiente++;
      await tarea(elementos[indice]);
    }
  });
  await Promise.all(trabajadores);
}

function aFila(ejercicio: EjercicioFuente, mediaUrl: string): FilaEjercicio {
  const equipamiento = ejercicio.equipment ? (EQUIPAMIENTO[ejercicio.equipment] ?? "other") : "none";
  const musculos = [...new Set([...ejercicio.primaryMuscles, ...ejercicio.secondaryMuscles])];

  return {
    external_id: ejercicio.id,
    name: ejercicio.name,
    description: ejercicio.instructions.join("\n\n"),
    media_url: mediaUrl,
    muscle_groups: musculos,
    equipment: [equipamiento],
    difficulty: ejercicio.level ? (DIFICULTAD[ejercicio.level] ?? null) : null,
    // El gimnasio lo tiene todo; en casa solo entra lo que no necesita máquina.
    environments: EQUIPAMIENTO_DE_CASA.has(equipamiento) ? ["home", "gym"] : ["gym"],
    is_custom: false,
    // `contraindications` se deja fuera a propósito: es trabajo del equipo
    // profesional sobre los ejercicios que realmente use, y un upsert que la
    // incluyera borraría ese etiquetado en cada reejecución.
  };
}

async function main() {
  const { url, clave } = entornoLocal();
  const supabase = createClient<Database>(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Descargando el catálogo de free-exercise-db…");
  const catalogo = (await (await descargar(`${FUENTE}/dist/exercises.json`)).json()) as EjercicioFuente[];

  // Un ejercicio sin imagen o sin indicaciones no sirve al paciente, que lo
  // consulta entre series: se deja fuera en lugar de entrar a medias.
  const importables = catalogo.filter((e) => e.images?.length > 0 && e.instructions?.length > 0);
  const omitidos = catalogo.length - importables.length;
  console.log(`${catalogo.length} ejercicios en la fuente; ${omitidos} sin imagen o sin indicaciones se omiten.`);

  // Las imágenes ya subidas no se vuelven a descargar: reejecutar el script
  // tras un fallo a media siembra cuesta lo que falte, no los 800 de nuevo.
  const yaSubidas = new Set<string>();
  for (let pagina = 0; ; pagina += 1000) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list("", { limit: 1000, offset: pagina });
    if (error) throw new Error(`No se pudo listar el bucket ${BUCKET}: ${error.message}`);
    for (const objeto of data) yaSubidas.add(objeto.name);
    if (data.length < 1000) break;
  }

  const filas: FilaEjercicio[] = [];
  let subidas = 0;
  let fallos = 0;

  await enParalelo(importables, async (ejercicio) => {
    const nombreArchivo = `${ejercicio.id}.jpg`;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(nombreArchivo);

    if (!yaSubidas.has(nombreArchivo)) {
      try {
        const imagen = await descargar(`${FUENTE}/exercises/${ejercicio.images[0]}`);
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(nombreArchivo, await imagen.arrayBuffer(), { contentType: "image/jpeg", upsert: true });
        if (error) throw new Error(error.message);
        subidas += 1;
        if (subidas % 100 === 0) console.log(`  ${subidas} imágenes subidas…`);
      } catch (error) {
        // Un ejercicio sin imagen no entra al catálogo, pero el resto sí: el
        // script es reejecutable y recupera lo que falte.
        fallos += 1;
        console.warn(`  ✗ ${ejercicio.id}: ${(error as Error).message}`);
        return;
      }
    }

    filas.push(aFila(ejercicio, data.publicUrl));
  });

  console.log(`${subidas} imágenes nuevas en el bucket; ${yaSubidas.size} ya estaban.`);

  const { count: antes } = await supabase
    .from("exercises")
    .select("id", { count: "exact", head: true })
    .eq("is_custom", false);

  for (let inicio = 0; inicio < filas.length; inicio += LOTE) {
    const { error } = await supabase
      .from("exercises")
      .upsert(filas.slice(inicio, inicio + LOTE), { onConflict: "external_id" });
    if (error) throw new Error(`No se pudo sembrar el catálogo: ${error.message}`);
  }

  const { count: despues } = await supabase
    .from("exercises")
    .select("id", { count: "exact", head: true })
    .eq("is_custom", false);

  const nuevos = (despues ?? 0) - (antes ?? 0);
  console.log(`Catálogo sembrado: ${nuevos} ejercicios nuevos, ${filas.length - nuevos} actualizados.`);
  if (fallos > 0) console.log(`${fallos} quedaron fuera por un fallo de descarga: vuelve a ejecutar el script.`);
}

await main();
