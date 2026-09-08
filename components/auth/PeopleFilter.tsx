"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "cn";
import { inputClass } from "@/components/auth/FormParts";

type Specialty = { value: string; label: string };

/**
 * Filtra en el cliente una lista ya renderizada en el servidor. Cada elemento
 * de la lista lleva `data-name` (el nombre en minúsculas) y, si aplica,
 * `data-specialty`. Sin JavaScript la lista se ve entera: el filtro solo
 * estrecha, nunca es la única forma de llegar a alguien.
 *
 * Se usa dentro de `SheetModal`, donde el contenido pesado —la lista y sus
 * formularios de baja— vive plegado pero presente en el HTML del servidor.
 */
export function PeopleFilter({
  searchPlaceholder,
  specialties,
  emptyLabel = "Nadie coincide con la búsqueda.",
  children,
}: {
  searchPlaceholder: string;
  /** Si se pasa, añade una fila de botones para filtrar por especialidad. */
  specialties?: Specialty[];
  emptyLabel?: string;
  children: ReactNode;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [visible, setVisible] = useState<number | null>(null);

  useEffect(() => {
    const items =
      wrapperRef.current?.querySelectorAll<HTMLElement>("[data-name]");
    if (!items) return;
    const needle = query.trim().toLowerCase();
    let shown = 0;
    for (const item of items) {
      const matchesName =
        !needle || (item.dataset.name ?? "").includes(needle);
      const matchesSpecialty =
        !specialty || (item.dataset.specialty ?? "") === specialty;
      const show = matchesName && matchesSpecialty;
      item.hidden = !show;
      if (show) shown += 1;
    }
    setVisible(shown);
  }, [query, specialty]);

  return (
    <div ref={wrapperRef} className="grid gap-4">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={searchPlaceholder}
        autoCapitalize="none"
        spellCheck={false}
        className={inputClass}
        aria-label={searchPlaceholder}
      />

      {specialties && (
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={specialty === null}
            onClick={() => setSpecialty(null)}
          >
            Todos
          </FilterChip>
          {specialties.map((option) => (
            <FilterChip
              key={option.value}
              active={specialty === option.value}
              onClick={() => setSpecialty(option.value)}
            >
              {option.label}
            </FilterChip>
          ))}
        </div>
      )}

      {children}

      {visible === 0 && (
        <p className="text-sm leading-6 text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-9 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
