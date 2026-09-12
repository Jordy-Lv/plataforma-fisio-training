"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/Field";
import {
  searchPatients,
  type PatientSuggestion,
} from "@/lib/auth/patient-search";

const minChars = 2;
const debounceMs = 250;

/**
 * Buscador de paciente en la cabecera. Es un `<form method="get">` hacia
 * `/people` —sin JavaScript, escribir y enviar deja en el directorio de
 * siempre—; con JavaScript, tras dos caracteres aparecen sugerencias que
 * saltan directo a la ficha del paciente, sin pasar por ningún listado.
 */
export function PatientSearch() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Último término que disparó una búsqueda: una respuesta que llega tarde
  // (fuera de orden) se descarta si ya no coincide con este valor.
  const latestTerm = useRef("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<PatientSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);

  const schedule = (term: string) => {
    if (timer.current !== null) clearTimeout(timer.current);
    const trimmed = term.trim();
    if (trimmed.length < minChars) {
      latestTerm.current = "";
      setSuggestions([]);
      setError(null);
      return;
    }
    timer.current = setTimeout(() => {
      latestTerm.current = trimmed;
      startTransition(async () => {
        try {
          const result = await searchPatients(trimmed);
          if (latestTerm.current !== trimmed) return; // llegó fuera de orden
          setSuggestions(result);
          setError(null);
        } catch (cause) {
          if (latestTerm.current !== trimmed) return; // llegó fuera de orden
          setSuggestions([]);
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudo buscar pacientes. Inténtalo de nuevo.",
          );
        }
      });
    }, debounceMs);
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-sm">
      <form
        method="get"
        action="/people"
        role="search"
        aria-label="Buscar paciente"
        className="flex items-center gap-2"
      >
        <input
          type="search"
          name="q"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            schedule(event.target.value);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar paciente…"
          aria-label="Buscar paciente"
          role="combobox"
          aria-expanded={open && query.trim().length >= minChars}
          aria-controls="patient-search-suggestions"
          aria-autocomplete="list"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className={cn(inputClass, "min-h-9 py-1")}
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          aria-label="Buscar"
        >
          <Search aria-hidden="true" />
        </Button>
      </form>

      {open && query.trim().length >= minChars && (
        <ul
          id="patient-search-suggestions"
          role="listbox"
          aria-label="Pacientes sugeridos"
          className="absolute top-full z-50 mt-1 w-full min-w-[16rem] rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-md"
        >
          {error ? (
            <li role="alert" className="px-3 py-2 text-sm text-danger">
              {error}
            </li>
          ) : (
            <>
              {pending && suggestions.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  Buscando…
                </li>
              )}
              {suggestions.map((patient) => (
                <li key={patient.id} role="option" aria-selected={false}>
                  <Link
                    href={`/people/${patient.id}`}
                    onClick={() => setOpen(false)}
                    className="block px-3 py-2 text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    {patient.fullName ?? "Sin nombre"}
                  </Link>
                </li>
              ))}
              {!pending && suggestions.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  Nadie coincide con «{query.trim()}».
                </li>
              )}
            </>
          )}
        </ul>
      )}
    </div>
  );
}
