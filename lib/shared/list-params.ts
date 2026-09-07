import { z } from "zod";

export const pageParam = z.coerce.number().int().min(1).max(500).catch(1);
export const searchParam = (max = 80) =>
  z.string().trim().max(max).optional().catch(undefined)
    .transform((value) => value || undefined);
export const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values).optional().catch(undefined);
export const optionalId = z.string().uuid().optional().catch(undefined);

/** Estado compartible de lectura. Los esquemas de escritura siguen siendo estrictos. */
export function createListParams<S extends z.ZodObject<z.ZodRawShape>>({
  path, schema, pageSize, notFilters = [],
}: {
  path: string;
  schema: S;
  pageSize: number;
  /**
   * Claves que viajan en la URL pero **no** son un filtro: no cuentan para
   * `hasActiveFilters` ni deben aparecer en la fila de píldoras. `page` siempre
   * lo es; `vista` del catálogo es la otra. Sin esto, elegir la vista de lista
   * hacía que la pantalla se creyera filtrada y ofreciera «Quitar filtros».
   */
  notFilters?: readonly string[];
}) {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error("El tamaño de página debe ser un entero positivo.");
  }
  const ignored = new Set(["page", ...notFilters]);
  const empty = schema.parse({}) as z.infer<S>;
  const parse = (search: Record<string, string | string[] | undefined>) =>
    schema.parse(Object.fromEntries(Object.entries(search).map(([key, value]) =>
      [key, Array.isArray(value) ? value[0] : value],
    ))) as z.infer<S>;
  const href = (filters: z.infer<S>, overrides: Partial<z.infer<S>> = {}) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...filters, ...overrides })) {
      if (value === undefined || value === null || value === "" || value === false) continue;
      // Un valor idéntico al de partida no aporta nada a la URL: `page=1` y
      // `vista=tarjetas` se omiten para que el enlace de un listado sin tocar
      // siga siendo `/exercises` a secas.
      if (value === empty[key]) continue;
      params.set(key, value === true ? "1" : String(value));
    }
    const query = params.toString();
    return query ? `${path}?${query}` : path;
  };
  const hasActiveFilters = (filters: z.infer<S>) => Object.entries(filters).some(
    ([key, value]) => !ignored.has(key) && value !== empty[key] &&
      value !== undefined && value !== null && value !== "" && value !== false,
  );
  const range = (filters: z.infer<S>) => {
    const from = (pageParam.parse(filters.page) - 1) * pageSize;
    return { from, to: from + pageSize - 1 };
  };
  const pages = (total: number) => Math.max(1, Math.ceil(total / pageSize));
  return { schema, pageSize, parse, href, hasActiveFilters, empty, range, pages };
}
