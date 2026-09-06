"use client";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";

export default function PlansError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-10 sm:px-8">
      <Card role="alert" padding="lg" className="grid gap-4">
        <CardTitle className="text-2xl">No pudimos cargar los planes y servicios</CardTitle>
        <CardDescription className="text-base leading-7">
          Revisa tu conexión e inténtalo de nuevo. Si el problema continúa,
          avisa al administrador.
        </CardDescription>
        <Button size="lg" className="justify-self-start" onClick={reset}>
          Intentar de nuevo
        </Button>
      </Card>
    </div>
  );
}
