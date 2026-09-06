"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";

export default function AuthError({ reset }: { reset: () => void }) {
  const hasRetried = useRef(false);
  useEffect(() => {
    if (hasRetried.current) return;
    hasRetried.current = true;
    reset();
  }, [reset]);

  return (
    <div className="mx-auto max-w-xl px-5 py-10 sm:px-8">
      <Card role="alert" padding="lg" className="grid gap-4">
        <CardTitle className="text-2xl">No pudimos cargar tu acceso</CardTitle>
        <CardDescription className="text-base leading-7">
          Las respuestas que guardaste al continuar no se han perdido. Revisa tu
          conexión e inténtalo de nuevo. Si continúa, contacta al administrador.
        </CardDescription>
        <Button size="lg" className="justify-self-start" onClick={reset}>
          Intentar de nuevo
        </Button>
      </Card>
    </div>
  );
}
