"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  contraindicationsFormValues,
  contraindicationsSchema,
  createExerciseSchema,
  exerciseFormValues,
  mediaExtensions,
  updateExerciseSchema,
  type CatalogState,
} from "@/lib/catalog/exercise-schemas";

const bucket = "exercise-media";

/** Los ejercicios propios viven aparte de los importados por la siembra. */
const customPrefix = "custom/";

const sinPermiso =
  "No tienes permiso para editar el catálogo. Pídeselo al administrador.";

/**
 * El catálogo lo escribe el equipo. La pantalla ya lo impide y RLS es la
 * autorización real, pero una server action es una URL pública: se comprueba
 * aquí también para responder algo legible en vez de un error de base de datos.
 */
async function requireStaffProfile() {
  const profile = await getActiveProfile();
  if (!profile || profile.role === "patient") return null;
  return profile;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

type UploadedMedia = { path: string; url: string } | { error: string };

/**
 * El bucket solo comprueba el `Content-Type` que declara el cliente, así que
 * unos bytes cualesquiera pasarían como `image/png`. Se leen los primeros bytes
 * y se exige que la firma real del archivo coincida con el tipo declarado.
 */
function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
    return "image/png";
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  )
    return "image/gif";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return "image/webp";
  return null;
}

async function uploadMedia(
  supabase: Supabase,
  media: File,
): Promise<UploadedMedia> {
  if (media.size === 0) return { error: "El archivo de imagen está vacío." };
  const header = new Uint8Array(await media.slice(0, 12).arrayBuffer());
  if (sniffImageType(header) !== media.type) {
    return {
      error: "El archivo no es una imagen válida del tipo indicado.",
    };
  }
  const extension = mediaExtensions[media.type as keyof typeof mediaExtensions];
  const path = `${customPrefix}${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, media, { contentType: media.type });
  if (error) return { error: `No se pudo subir la imagen: ${error.message}` };
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

/** Retira una imagen que quedó sin dueño. Que falle no cambia el resultado. */
async function discardMedia(supabase: Supabase, path: string) {
  await supabase.storage.from(bucket).remove([path]);
}

export async function createExercise(
  _previous: CatalogState,
  form: FormData,
): Promise<CatalogState> {
  const parsed = createExerciseSchema.safeParse(exerciseFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await requireStaffProfile()))
    return { error: "No tienes permiso para crear ejercicios." };

  const values = parsed.data;
  const supabase = await createClient();
  const media = await uploadMedia(supabase, values.media);
  if ("error" in media) return { error: media.error };

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      name: values.name,
      description: values.description,
      media_url: media.url,
      muscle_groups: values.muscleGroups,
      equipment: values.equipment,
      environments: values.environments,
      difficulty: values.difficulty,
      contraindications: values.contraindications,
      is_custom: true,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    await discardMedia(supabase, media.path);
    return {
      error: error
        ? `No se pudo guardar el ejercicio: ${error.message}`
        : "No tienes permiso para crear ejercicios.",
    };
  }

  revalidatePath("/exercises");
  redirect(`/exercises/${data.id}?nuevo=1`);
}

export async function updateExercise(
  _previous: CatalogState,
  form: FormData,
): Promise<CatalogState> {
  const parsed = updateExerciseSchema.safeParse(exerciseFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const profile = await requireStaffProfile();
  if (!profile) return { error: sinPermiso };

  const values = parsed.data;
  const supabase = await createClient();

  // La ficha anterior sirve para dos cosas: saber si la imagen se reemplaza y
  // distinguir "no existe" de "no me deja".
  const { data: previo, error: lecturaError } = await supabase
    .from("exercises")
    .select("id, media_url")
    .eq("id", values.id)
    .maybeSingle();
  if (lecturaError)
    return { error: `No se pudo leer el ejercicio: ${lecturaError.message}` };
  if (!previo) return { error: "Ese ejercicio ya no está en el catálogo." };

  const media = values.media
    ? await uploadMedia(supabase, values.media)
    : undefined;
  if (media && "error" in media) return { error: media.error };

  const { data, error } = await supabase
    .from("exercises")
    .update({
      name: values.name,
      description: values.description,
      muscle_groups: values.muscleGroups,
      equipment: values.equipment,
      environments: values.environments,
      difficulty: values.difficulty,
      ...(media ? { media_url: media.url } : {}),
    })
    .eq("id", values.id)
    .select("id")
    .maybeSingle();

  // Sin fila devuelta el `update` no encontró nada que le dejaran tocar: RLS
  // no lanza error, simplemente no afecta a ninguna fila.
  if (error || !data) {
    if (media) await discardMedia(supabase, media.path);
    return {
      error: error
        ? `No se pudo guardar el ejercicio: ${error.message}`
        : sinPermiso,
    };
  }

  // La imagen reemplazada ya no la referencia nadie: cada subida usa un nombre
  // propio. Solo se retiran las del negocio; las de la siembra se comparten
  // con el catálogo importado y las borra únicamente el administrador.
  if (media && previo.media_url?.includes(`/${bucket}/${customPrefix}`)) {
    const anterior = previo.media_url.split(`/${bucket}/`)[1];
    if (anterior) await discardMedia(supabase, anterior);
  }

  revalidatePath("/exercises");
  revalidatePath(`/exercises/${values.id}`);
  return { success: "Ejercicio actualizado." };
}

/**
 * Etiquetado clínico. Se guarda por separado del resto de la ficha porque es
 * lo único que el equipo cambia sobre los ejercicios importados, y hacerlo
 * desde la ficha completa obligaría a reenviar su imagen.
 */
export async function updateContraindications(
  _previous: CatalogState,
  form: FormData,
): Promise<CatalogState> {
  const parsed = contraindicationsSchema.safeParse(
    contraindicationsFormValues(form),
  );
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await requireStaffProfile())) return { error: sinPermiso };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .update({ contraindications: parsed.data.contraindications })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();
  if (error)
    return { error: `No se pudo guardar el etiquetado: ${error.message}` };
  if (!data) return { error: sinPermiso };

  revalidatePath("/exercises");
  revalidatePath(`/exercises/${parsed.data.id}`);
  return {
    success:
      parsed.data.contraindications.length > 0
        ? "Etiquetado clínico guardado. El motor de reglas excluirá este ejercicio para esas zonas."
        : "Etiquetado clínico guardado. Este ejercicio ya no tiene contraindicaciones.",
  };
}
