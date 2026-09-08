"use client";

import { useState, type ReactNode } from "react";
import { cn } from "cn";
import { cardVariants } from "@/components/ui/Card";
import { DetailPanel } from "@/components/ui/DetailDialog";

/**
 * Una tarjeta que abre un modal con su contenido. El panel —sin portal, así que
 * lo que hay dentro sigue en el HTML del servidor y las suites HTTP lo
 * encuentran— es `DetailPanel`; aquí solo vive el disparador con forma de
 * tarjeta.
 *
 * Es para resumir una pantalla larga en unas pocas tarjetas: «Pacientes»,
 * «Equipo», «Registrar persona». El contenido pesado espera detrás del clic.
 * A diferencia de `DetailDialog`, aquí **sí** puede haber formularios: por eso
 * el contenido se emite siempre (`keepMounted`), que es lo que recorre
 * `verify-people-onboarding`.
 */
export function SheetModal({
  title,
  count,
  description,
  action,
  closeLabel = "Cerrar",
  children,
}: {
  title: string;
  /** El recuento de la colección, junto al título. */
  count?: number;
  description?: ReactNode;
  /** La frase de la tarjeta que invita a abrir: «Buscar y abrir perfiles». */
  action?: ReactNode;
  closeLabel?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          cardVariants({ padding: "lg" }),
          "flex h-full w-full flex-col items-start gap-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )}
      >
        <span className="flex items-baseline gap-2">
          <span className="text-lg font-semibold">{title}</span>
          {count !== undefined && (
            <span className="text-sm font-normal text-muted-foreground">
              {count}
            </span>
          )}
        </span>
        {description && (
          <span className="text-sm leading-6 text-muted-foreground">
            {description}
          </span>
        )}
        {action && (
          <span className="mt-1 text-sm font-medium text-brand">{action}</span>
        )}
      </button>

      <DetailPanel
        title={title}
        open={open}
        onClose={() => setOpen(false)}
        closeLabel={closeLabel}
      >
        {children}
      </DetailPanel>
    </>
  );
}
