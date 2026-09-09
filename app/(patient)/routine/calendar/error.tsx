"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";

export default function CalendarError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <Card role="alert" className="grid gap-4">
        <h2 className="text-xl font-semibold">
          No pudimos cargar el calendario
        </h2>
        <p className="text-muted-foreground">
          Tus registros están guardados. Revisa tu conexión e inténtalo de
          nuevo.
        </p>
        <Button onClick={reset}>Intentar de nuevo</Button>
      </Card>
    </div>
  );
}
