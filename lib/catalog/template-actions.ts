"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  getTemplate,
  listRulesUsingTemplate,
} from "@/lib/catalog/template-queries";
import { templateIssues } from "@/lib/catalog/template-status";
import {
  addDayFormValues,
  addDaySchema,
  addItemFormValues,
  addItemSchema,
  createTemplateSchema,
  dayFormValues,
  dayIdSchema,
  idFormValues,
  itemIdSchema,
  moveItemFormValues,
  moveItemSchema,
  setActiveFormValues,
  setActiveSchema,
  templateFormValues,
  templateIdSchema,
  updateDaySchema,
  updateItemFormValues,
  updateItemSchema,
  updateTemplateSchema,
  type TemplateState,
} from "@/lib/catalog/template-schemas";

const sinPermiso =
  "Solo el administrador puede editar las plantillas de rutina.";

/** Los siete días de la semana; una plantilla no puede tener más. */
const weekDays = [1, 2, 3, 4, 5, 6, 7];

/**
 * Las plantillas las escribe únicamente `admin`. RLS es la autorización real,
 * pero una server action es una URL pública: se comprueba aquí también para
 * responder algo legible en vez de un error de base de datos.
 */
async function isAdmin() {
  const profile = await getActiveProfile();
  return profile?.role === "admin";
}

/**
 * Rutas que hay que refrescar tras escribir. El identificador viaja en el
 * formulario porque solo decide qué caché se invalida: la autorización la
 * hace RLS sobre la fila que se toca, no este valor.
 */
function revalidateTemplate(form: FormData) {
  revalidatePath("/templates");
  const id = z.string().uuid().safeParse(form.get("templateId"));
  if (id.success) revalidatePath(`/templates/${id.data}`);
}

export async function createTemplate(
  _previous: TemplateState,
  form: FormData,
): Promise<TemplateState> {
  const parsed = createTemplateSchema.safeParse(templateFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const values = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routine_templates")
    .insert({
      name: values.name,
      kind: values.kind,
      goal: values.goal,
      level: values.level,
      environment: values.environment,
      days_per_week: values.daysPerWeek,
      // Nace como borrador: una plantilla sin días no debe poder asignarse.
      is_active: false,
    })
    .select("id")
    .maybeSingle();

  if (error)
    return { error: `No se pudo crear la plantilla: ${error.message}` };
  if (!data) return { error: sinPermiso };

  // El primer día, si se pidió (KAN-8). Va aquí y no en una segunda pantalla
  // para ahorrar una de las dos fases obligatorias del alta. Sin título no se
  // crea nada: el flujo se queda como estaba.
  //
  // Es el día 1 por construcción —la plantilla acaba de nacer y no tiene
  // ninguno—, así que no hace falta releer `template_days` como en
  // `addTemplateDay`.
  let conDia = false;
  if (values.firstDayTitle) {
    const { error: diaError } = await supabase
      .from("template_days")
      .insert({
        template_id: data.id,
        day_number: 1,
        title: values.firstDayTitle,
      });
    // La plantilla ya existe: no se puede volver atrás desde aquí sin dejar al
    // administrador sin ella. El fallo viaja en la URL y la ficha lo cuenta,
    // que es preferible a tragárselo (CLAUDE.md §10).
    if (diaError) {
      revalidatePath("/templates");
      redirect(`/templates/${data.id}?nueva=sindia`);
    }
    conDia = true;
  }

  revalidatePath("/templates");
  redirect(`/templates/${data.id}?nueva=${conDia ? "dia" : "1"}`);
}

export async function updateTemplate(
  _previous: TemplateState,
  form: FormData,
): Promise<TemplateState> {
  const parsed = updateTemplateSchema.safeParse(templateFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const values = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routine_templates")
    .update({
      name: values.name,
      kind: values.kind,
      goal: values.goal,
      level: values.level,
      environment: values.environment,
      days_per_week: values.daysPerWeek,
    })
    .eq("id", values.id)
    .select("id")
    .maybeSingle();

  if (error)
    return { error: `No se pudo guardar la plantilla: ${error.message}` };
  // Sin fila devuelta el `update` no encontró nada que le dejaran tocar: RLS
  // no lanza error, simplemente no afecta a ninguna fila.
  if (!data) return { error: sinPermiso };

  revalidatePath("/templates");
  revalidatePath(`/templates/${values.id}`);
  return { success: "Plantilla actualizada." };
}

export async function deleteTemplate(
  _previous: TemplateState,
  form: FormData,
): Promise<TemplateState> {
  const parsed = templateIdSchema.safeParse(idFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routine_templates")
    .delete()
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();

  // 23503: una regla de asignación la referencia. Borrarla dejaría la regla
  // sin destino, así que la salida es desactivarla, no eliminarla.
  if (error?.code === "23503")
    return {
      error:
        "No se puede eliminar: hay reglas de asignación que usan esta plantilla. Desactívala en lugar de eliminarla.",
    };
  if (error)
    return { error: `No se pudo eliminar la plantilla: ${error.message}` };
  if (!data) return { error: sinPermiso };

  revalidatePath("/templates");
  redirect("/templates?eliminada=1");
}

export async function addTemplateDay(
  _previous: TemplateState,
  form: FormData,
): Promise<TemplateState> {
  const parsed = addDaySchema.safeParse(addDayFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const { templateId, title } = parsed.data;
  const supabase = await createClient();
  const { data: existentes, error: lecturaError } = await supabase
    .from("template_days")
    .select("day_number")
    .eq("template_id", templateId);
  if (lecturaError)
    return { error: `No se pudieron leer los días: ${lecturaError.message}` };

  // El día ocupa el primer número libre de la semana; el orden dentro del día
  // lo lleva `position` en cada ejercicio.
  const ocupados = new Set((existentes ?? []).map((dia) => dia.day_number));
  const dayNumber = weekDays.find((numero) => !ocupados.has(numero));
  if (!dayNumber)
    return {
      error: "La plantilla ya tiene los siete días de la semana.",
    };

  const { data, error } = await supabase
    .from("template_days")
    .insert({ template_id: templateId, day_number: dayNumber, title })
    .select("id")
    .maybeSingle();
  if (error) return { error: `No se pudo añadir el día: ${error.message}` };
  if (!data) return { error: sinPermiso };

  revalidateTemplate(form);
  return { success: `Día ${dayNumber} añadido.` };
}

export async function updateTemplateDay(
  _previous: TemplateState,
  form: FormData,
): Promise<TemplateState> {
  const parsed = updateDaySchema.safeParse(dayFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("template_days")
    .update({ title: parsed.data.title })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();
  if (error) return { error: `No se pudo guardar el día: ${error.message}` };
  if (!data) return { error: sinPermiso };

  revalidateTemplate(form);
  return { success: "Título del día guardado." };
}

export async function deleteTemplateDay(
  _previous: TemplateState,
  form: FormData,
): Promise<TemplateState> {
  const parsed = dayIdSchema.safeParse(idFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("template_days")
    .delete()
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();
  if (error) return { error: `No se pudo eliminar el día: ${error.message}` };
  if (!data) return { error: sinPermiso };

  revalidateTemplate(form);
  return { success: "Día eliminado con sus ejercicios." };
}

export async function addTemplateItem(
  _previous: TemplateState,
  form: FormData,
): Promise<TemplateState> {
  const parsed = addItemSchema.safeParse(addItemFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const values = parsed.data;
  const supabase = await createClient();

  // El nuevo ejercicio se coloca al final del día. Las posiciones solo fijan
  // el orden relativo: al quitar un ejercicio no se renumeran las demás.
  const { data: ultima, error: lecturaError } = await supabase
    .from("template_items")
    .select("position")
    .eq("template_day_id", values.dayId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lecturaError)
    return {
      error: `No se pudieron leer los ejercicios del día: ${lecturaError.message}`,
    };

  const { data, error } = await supabase
    .from("template_items")
    .insert({
      template_day_id: values.dayId,
      exercise_id: values.exerciseId,
      position: (ultima?.position ?? 0) + 1,
      sets: values.sets,
      reps: values.reps,
      target_weight: values.targetWeight,
      rest_seconds: values.restSeconds,
      notes: values.notes,
    })
    .select("id")
    .maybeSingle();

  // 23505: otra persona añadió un ejercicio en la misma posición mientras
  // tanto. Reintentarlo lo coloca detrás del suyo.
  if (error?.code === "23505")
    return {
      error:
        "Alguien añadió un ejercicio a este día al mismo tiempo. Vuelve a intentarlo.",
    };
  if (error)
    return { error: `No se pudo añadir el ejercicio: ${error.message}` };
  if (!data) return { error: sinPermiso };

  revalidateTemplate(form);
  return { success: "Ejercicio añadido al día." };
}

export async function updateTemplateItem(
  _previous: TemplateState,
  form: FormData,
): Promise<TemplateState> {
  const parsed = updateItemSchema.safeParse(updateItemFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const values = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("template_items")
    .update({
      sets: values.sets,
      reps: values.reps,
      target_weight: values.targetWeight,
      rest_seconds: values.restSeconds,
      notes: values.notes,
    })
    .eq("id", values.id)
    .select("id")
    .maybeSingle();
  if (error)
    return { error: `No se pudo guardar el ejercicio: ${error.message}` };
  if (!data) return { error: sinPermiso };

  revalidateTemplate(form);
  return { success: "Ejercicio actualizado." };
}

export async function deleteTemplateItem(
  _previous: TemplateState,
  form: FormData,
): Promise<TemplateState> {
  const parsed = itemIdSchema.safeParse(idFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("template_items")
    .delete()
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();
  if (error)
    return { error: `No se pudo quitar el ejercicio: ${error.message}` };
  if (!data) return { error: sinPermiso };

  revalidateTemplate(form);
  return { success: "Ejercicio quitado del día." };
}

/**
 * Intercambia un ejercicio con su vecino. Se hace en tres pasos porque
 * `unique (template_day_id, position)` no admite dos filas con la misma
 * posición ni siquiera un instante: el ejercicio que se mueve pasa por una
 * posición imposible mientras el otro ocupa la suya.
 */
export async function moveTemplateItem(
  _previous: TemplateState,
  form: FormData,
): Promise<TemplateState> {
  const parsed = moveItemSchema.safeParse(moveItemFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const { id, direction } = parsed.data;
  const supabase = await createClient();

  const setPosition = async (itemId: string, position: number) => {
    const { data, error } = await supabase
      .from("template_items")
      .update({ position })
      .eq("id", itemId)
      .select("id")
      .maybeSingle();
    if (error) return error.message;
    return data ? null : sinPermiso;
  };

  const { data: item, error: itemError } = await supabase
    .from("template_items")
    .select("id, position, template_day_id")
    .eq("id", id)
    .maybeSingle();
  if (itemError)
    return { error: `No se pudo leer el ejercicio: ${itemError.message}` };
  if (!item) return { error: "Ese ejercicio ya no está en la plantilla." };

  const vecinos = supabase
    .from("template_items")
    .select("id, position")
    .eq("template_day_id", item.template_day_id);
  const { data: vecino, error: vecinoError } =
    direction === "up"
      ? await vecinos
          .lt("position", item.position)
          .order("position", { ascending: false })
          .limit(1)
          .maybeSingle()
      : await vecinos
          .gt("position", item.position)
          .order("position", { ascending: true })
          .limit(1)
          .maybeSingle();
  if (vecinoError)
    return { error: `No se pudo reordenar el día: ${vecinoError.message}` };
  // Ya está en el extremo: no hay nada que hacer y tampoco es un error.
  if (!vecino) return {};

  const aparcado = -1;
  const salida = await setPosition(item.id, aparcado);
  if (salida) return { error: `No se pudo reordenar el día: ${salida}` };

  const entrada = await setPosition(vecino.id, item.position);
  if (entrada) {
    await setPosition(item.id, item.position);
    return { error: `No se pudo reordenar el día: ${entrada}` };
  }

  const llegada = await setPosition(item.id, vecino.position);
  if (llegada) {
    // Deshacer en orden inverso: el vecino libera la posición de origen y el
    // ejercicio movido vuelve a ella, en lugar de quedarse aparcado.
    await setPosition(vecino.id, vecino.position);
    await setPosition(item.id, item.position);
    return { error: `No se pudo reordenar el día: ${llegada}` };
  }

  revalidateTemplate(form);
  return { success: direction === "up" ? "Ejercicio subido." : "Ejercicio bajado." };
}

/**
 * Activa o desactiva una plantilla.
 *
 * Activar exige que esté completa: la comprobación se repite aquí aunque la
 * pantalla ya la haya hecho, porque entre pintarla y pulsar el botón alguien
 * pudo vaciar un día. Desactivar no valida nada —siempre debe poder frenarse
 * una plantilla— pero sí dice qué reglas quedan sin destino.
 */
export async function setTemplateActive(
  _previous: TemplateState,
  form: FormData,
): Promise<TemplateState> {
  const parsed = setActiveSchema.safeParse(setActiveFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const { id, intent } = parsed.data;
  const activar = intent === "activate";

  const template = await getTemplate(id);
  if (!template) return { error: "Esa plantilla ya no está disponible." };

  if (activar) {
    const problemas = templateIssues(template);
    if (problemas.length > 0)
      return {
        error: `No se puede activar una plantilla incompleta. ${problemas.join(" ")}`,
      };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routine_templates")
    .update({ is_active: activar })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error)
    return { error: `No se pudo cambiar el estado: ${error.message}` };
  if (!data) return { error: sinPermiso };

  revalidatePath("/templates");
  revalidatePath(`/templates/${id}`);

  if (activar)
    return {
      success: "Plantilla activada. El motor de reglas ya puede asignarla.",
    };

  // Las rutinas ya asignadas son copias y no se tocan; lo que sí queda a media
  // asta son las reglas que apuntaban aquí.
  const huérfanas = (await listRulesUsingTemplate(id)).filter(
    (regla) => regla.is_active,
  );
  return {
    success:
      huérfanas.length === 0
        ? "Plantilla desactivada. Ninguna regla dependía de ella y las rutinas ya asignadas siguen igual."
        : `Plantilla desactivada. Estas reglas se quedan sin plantilla activa y no asignarán nada hasta que se les indique otra: ${huérfanas
            .map((regla) => `«${regla.name}»`)
            .join(", ")}. Las rutinas ya asignadas siguen igual.`,
  };
}
