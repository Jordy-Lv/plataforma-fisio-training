/** Recorre candidatos por lotes cuando el filtro depende de datos derivados.
 * Evita truncar silenciosamente en el máximo de filas de PostgREST.
 */
export async function readPages<T>(read: (from: number, to: number) => PromiseLike<{
  data: T[] | null; error: { message: string } | null;
}>, message: string): Promise<T[]> {
  const rows: T[] = [];
  const size = 500;
  for (let from = 0; ; from += size) {
    const { data, error } = await read(from, from + size - 1);
    if (error) throw new Error(`${message}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < size) return rows;
  }
}

/**
 * Lee **una** página de una consulta que pagina en la base de datos.
 *
 * Existe por un fallo que se repetía en seis listados: cuando la página pedida
 * empieza más allá de la última fila, PostgREST no devuelve una lista vacía
 * sino un **416 `PGRST103`**, la consulta lanzaba y la pantalla entera se caía.
 * Basta con escribir `?page=99` a mano, o quedarse en la página 4 y borrar un
 * filtro, para dejar la pantalla en blanco.
 *
 * Una página vacía no es un error: es una página vacía. Cuando llega ese
 * código se relee el rango `0-0` —que PostgREST sí acepta incluso sin ninguna
 * fila— solo para saber el total, y la pantalla puede ofrecer «vuelve a la
 * primera página».
 */
export async function readPage<T>(
  read: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string; code?: string } | null;
    count: number | null;
  }>,
  { from, to }: { from: number; to: number },
  message: string,
): Promise<{ rows: T[]; total: number }> {
  const { data, error, count } = await read(from, to);
  if (!error) return { rows: data ?? [], total: count ?? data?.length ?? 0 };
  if (error.code !== "PGRST103") throw new Error(`${message}: ${error.message}`);

  const vacia = await read(0, 0);
  if (vacia.error) throw new Error(`${message}: ${vacia.error.message}`);
  return { rows: [], total: vacia.count ?? 0 };
}
