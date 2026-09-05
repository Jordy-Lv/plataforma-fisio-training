"use client";

import { Button } from "@/components/ui/button";

export default function RulesError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto min-h-svh max-w-6xl px-5 py-5 sm:px-10 sm:py-8">
      <div role="alert" className="space-y-5 py-8">
        <h1 className="text-2xl font-semibold">
          No pudimos cargar las reglas de asignación
        </h1>
        <p className="leading-7 text-muted-foreground">
          Revisa tu conexión e inténtalo de nuevo. Si el problema continúa,
          avisa al administrador.
        </p>
        <Button className="min-h-11" onClick={reset}>
          Intentar de nuevo
        </Button>
      </div>
    </main>
  );
}
