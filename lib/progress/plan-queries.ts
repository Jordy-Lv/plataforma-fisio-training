import { offerList, type OfferFilters } from "@/lib/progress/offer-list";
import { readPage } from "@/lib/shared/read-pages";

/** Sin paginar se piden todas las filas; es el tope de PostgREST, no un tamaño de página. */
const maxRows = 999;
import { type ShowcaseFilters } from "@/lib/progress/showcase-list";
import { sanitizeSearch } from "@/lib/shared/search";
import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db/types";
import {
  serviceCategories,
  type ServiceCategory,
} from "@/lib/progress/plan-vocabulary";

type PlanRow = Database["public"]["Tables"]["plans"]["Row"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

export type Plan = Pick<
  PlanRow,
  | "id"
  | "name"
  | "description"
  | "price"
  | "billing_period"
  | "features"
  | "is_active"
>;

export type Service = Pick<
  ServiceRow,
  "id" | "name" | "description" | "price" | "category" | "is_active"
>;

/** Los servicios de una categoría, para pintar la vitrina por secciones. */
export type ServiceGroup = { category: ServiceCategory; services: Service[] };

const planColumns =
  "id, name, description, price, billing_period, features, is_active";
const serviceColumns = "id, name, description, price, category, is_active";

/**
 * Los planes de la vitrina: solo los activos, del más barato al más caro. RLS
 * deja leer los planes a cualquiera con sesión; el filtro por `is_active` es
 * lo que separa la vitrina del panel de administración.
 */
export async function listActivePlans(filters?: ShowcaseFilters): Promise<Plan[]> {
  // Con una categoría de servicio elegida, la vitrina habla de servicios: los
  // planes no pertenecen a ninguna categoría y no se pueden filtrar por ella.
  if (filters?.category) return [];
  const supabase = await createClient();
  let query = supabase
    .from("plans")
    .select(planColumns)
    .eq("is_active", true)
    .order("price", { ascending: true });
  const term = sanitizeSearch(filters?.q ?? "");
  if (term) query = query.ilike("name", `%${term}%`);
  const { data, error } = await query;
  if (error)
    throw new Error(`No se pudieron consultar los planes: ${error.message}`);
  return data ?? [];
}

/**
 * Todos los planes, activos o no, para el panel de administración.
 *
 * Pagina en la base, no en memoria: aquí no hay ningún recorte que dependa de
 * una fila embebida, así que el `count` de PostgREST es el total de verdad.
 * `paginate: false` lo pide `/memberships`, que necesita **todos** los planes
 * para llenar el `<select>` del alta.
 */
export async function listAllPlans(
  filters?: OfferFilters,
  options: { paginate?: boolean } = {},
): Promise<{ plans: Plan[]; total: number; pages: number }> {
  const supabase = await createClient();
  const query = () => {
    let request = supabase
      .from("plans")
      .select(planColumns, { count: "exact" })
      .order("is_active", { ascending: false })
      .order("price", { ascending: true });
    const term = sanitizeSearch(filters?.q ?? "");
    if (term) request = request.ilike("name", `%${term}%`);
    if (filters?.status)
      request = request.eq("is_active", filters.status === "active");
    return request;
  };
  const { rows, total } = await readPage(
    (from, to) => query().range(from, to),
    options.paginate !== false && filters
      ? offerList.range(filters)
      : { from: 0, to: maxRows },
    "No se pudieron consultar los planes",
  );
  return { plans: rows, total, pages: offerList.pages(total) };
}

/** Un plan por su identificador, o `null` si no existe. */
export async function getPlan(id: string): Promise<Plan | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select(planColumns)
    .eq("id", id)
    .maybeSingle();
  if (error)
    throw new Error(`No se pudo consultar el plan: ${error.message}`);
  return data;
}

/**
 * Los servicios activos agrupados por categoría, en el orden en que se
 * enumeran en el vocabulario. Las categorías sin servicios no aparecen.
 */
export async function listActiveServiceGroups(filters?: ShowcaseFilters): Promise<ServiceGroup[]> {
  const supabase = await createClient();
  let query = supabase
    .from("services")
    .select(serviceColumns)
    .eq("is_active", true)
    .order("name", { ascending: true });
  const term = sanitizeSearch(filters?.q ?? "");
  if (term) query = query.ilike("name", `%${term}%`);
  if (filters?.category) query = query.eq("category", filters.category);
  const { data, error } = await query;
  if (error)
    throw new Error(`No se pudieron consultar los servicios: ${error.message}`);

  const services = data ?? [];
  return serviceCategories
    .map((category) => ({
      category,
      services: services.filter((service) => service.category === category),
    }))
    .filter((group) => group.services.length > 0);
}

/**
 * Todos los servicios, para el panel de administración. Paginan por `spage`,
 * su propia clave: comparten pantalla con los planes y cada lista se mueve
 * sola.
 */
export async function listAllServices(
  filters?: OfferFilters,
): Promise<{ services: Service[]; total: number; pages: number }> {
  const supabase = await createClient();
  const query = () => {
    let request = supabase
      .from("services")
      .select(serviceColumns, { count: "exact" })
      .order("is_active", { ascending: false })
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    const term = sanitizeSearch(filters?.q ?? "");
    if (term) request = request.ilike("name", `%${term}%`);
    if (filters?.status)
      request = request.eq("is_active", filters.status === "active");
    return request;
  };
  const { rows, total } = await readPage(
    (from, to) => query().range(from, to),
    filters ? offerList.range(filters, "spage") : { from: 0, to: maxRows },
    "No se pudieron consultar los servicios",
  );
  return { services: rows, total, pages: offerList.pages(total) };
}
