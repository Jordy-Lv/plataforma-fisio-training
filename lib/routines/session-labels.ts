/**
 * Etiquetas de una sesión y de cada ejercicio registrado. Viven aparte de las
 * consultas porque las usan tanto el servidor como los componentes de cliente,
 * y `session-queries.ts` es `server-only`.
 */
export const statusLabels = {
  completed: "Completada",
  in_progress: "En curso",
  abandoned: "Abandonada",
};

export const logLabels = {
  done: "Hecho",
  skipped: "Saltado",
  modified: "Modificado",
};
