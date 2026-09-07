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
