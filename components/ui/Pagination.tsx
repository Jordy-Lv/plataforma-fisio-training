import { ButtonLink } from "@/components/ui/ButtonLink";

export function Pagination({ page, pages, hrefFor, label }: {
  page: number; pages: number; hrefFor: (page: number) => string; label: string;
}) {
  if (pages <= 1) return null;
  return (
    <nav aria-label={label} className="mt-8 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        {pages >= 5 && page > 2 && <ButtonLink href={hrefFor(1)} aria-label="Primera página">1</ButtonLink>}
        {page > 1 && <ButtonLink href={hrefFor(Math.min(page - 1, pages))} rel="prev">Anterior</ButtonLink>}
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">Página {page} de {pages}</p>
      <div className="flex flex-wrap gap-2">
        {page < pages && <ButtonLink href={hrefFor(page + 1)} rel="next">Siguiente</ButtonLink>}
        {pages >= 5 && page < pages - 1 && <ButtonLink href={hrefFor(pages)} aria-label="Última página">{pages}</ButtonLink>}
      </div>
    </nav>
  );
}
