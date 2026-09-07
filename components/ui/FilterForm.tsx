"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

/** Mejora progresiva: el formulario GET y su botón también existen sin JavaScript. */
export function FilterForm({ action, label, debounceMs = 300, className, children }: {
  action: string; label: string; debounceMs?: number; className?: string; children: ReactNode;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const [enhanced, setEnhanced] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ownQuery = useRef<string | null>(null);
  const composing = useRef(false);

  const cancelTimer = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => {
    setEnhanced(true);
    return cancelTimer;
  }, []);
  // Al volver atrás o quitar un Chip, los controles reflejan la URL de nuevo.
  // En una búsqueda propia no se reinician: se conserva el cursor y lo recién escrito.
  useEffect(() => {
    if (!pending && timer.current === null && search.toString() !== ownQuery.current) {
      formRef.current?.reset();
    }
  }, [search, pending]);

  const navigate = (form: HTMLFormElement, replace: boolean) => {
    cancelTimer();
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      if (typeof value === "string" && value.trim() && key !== "page") params.append(key, value.trim());
    }
    ownQuery.current = params.toString();
    const url = params.size ? `${action}?${params}` : action;
    startTransition(() => {
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    });
  };
  const schedule = (form: HTMLFormElement) => {
    cancelTimer();
    timer.current = setTimeout(() => navigate(form, true), debounceMs);
  };

  return (
    <form ref={formRef} method="get" action={action} aria-label={label}
      aria-busy={pending} data-enhanced={enhanced ? "true" : undefined}
      className={cn("group/filters", className)}
      onSubmit={(event) => { event.preventDefault(); navigate(event.currentTarget, false); }}
      onChange={(event) => {
        const target = event.target;
        if (target instanceof HTMLSelectElement ||
          (target instanceof HTMLInputElement && ["checkbox", "radio", "date", "month"].includes(target.type))) {
          navigate(event.currentTarget, false);
        }
      }}
      onInput={(event) => {
        const target = event.target;
        if (!composing.current && target instanceof HTMLInputElement &&
          ["text", "search", "email", "number"].includes(target.type)) schedule(event.currentTarget);
      }}
      onCompositionStart={() => { composing.current = true; cancelTimer(); }}
      onCompositionEnd={(event) => { composing.current = false; schedule(event.currentTarget); }}
    >
      {children}
      <Button type="submit" size="lg" className="mt-4 w-full group-data-[enhanced=true]/filters:hidden sm:w-auto">
        Aplicar filtros
      </Button>
      <p role="status" className="sr-only">{pending ? "Actualizando resultados…" : ""}</p>
    </form>
  );
}
