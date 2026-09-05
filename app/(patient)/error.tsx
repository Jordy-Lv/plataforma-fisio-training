"use client";

import { Button } from "@/components/ui/button";

export default function AuthError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="space-y-5">
      <h1 className="text-2xl font-semibold">No pudimos cargar tu acceso</h1>
      <p className="leading-7 text-muted-foreground">
        Revisa tu conexión e inténtalo de nuevo. Si continúa, contacta al
        administrador.
      </p>
      <Button className="min-h-11" onClick={reset}>
        Intentar de nuevo
      </Button>
    </div>
  );
}
