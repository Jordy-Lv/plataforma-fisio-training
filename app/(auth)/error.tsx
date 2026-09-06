"use client";

import { Button } from "@/components/ui/button";

/*
  Se pinta dentro de la tarjeta del layout de acceso, así que no trae superficie
  propia: solo el mensaje y la salida.
*/
export default function AuthError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="grid gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        No pudimos cargar tu acceso
      </h1>
      <p className="leading-7 text-muted-foreground">
        Revisa tu conexión e inténtalo de nuevo. Si continúa, contacta al
        administrador.
      </p>
      <Button size="lg" className="justify-self-start" onClick={reset}>
        Intentar de nuevo
      </Button>
    </div>
  );
}
