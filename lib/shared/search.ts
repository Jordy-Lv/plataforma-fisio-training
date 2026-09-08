/** Los metacaracteres de PostgREST no forman parte de una búsqueda literal. */
export const sanitizeSearch = (term: string) =>
  term.replace(/[%_,()."\\*]/g, " ").replace(/\s+/g, " ").trim();
