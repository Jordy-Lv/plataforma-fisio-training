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
export async function listActivePlans(): Promise<Plan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select(planColumns)
    .eq("is_active", true)
    .order("price", { ascending: true });
  if (error)
    throw new Error(`No se pudieron consultar los planes: ${error.message}`);
  return data ?? [];
}

/** Todos los planes, activos o no, para el panel de administración. */
export async function listAllPlans(): Promise<Plan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select(planColumns)
    .order("is_active", { ascending: false })
    .order("price", { ascending: true });
  if (error)
    throw new Error(`No se pudieron consultar los planes: ${error.message}`);
  return data ?? [];
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
export async function listActiveServiceGroups(): Promise<ServiceGroup[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select(serviceColumns)
    .eq("is_active", true)
    .order("name", { ascending: true });
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

/** Todos los servicios, para el panel de administración. */
export async function listAllServices(): Promise<Service[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select(serviceColumns)
    .order("is_active", { ascending: false })
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (error)
    throw new Error(`No se pudieron consultar los servicios: ${error.message}`);
  return data ?? [];
}
