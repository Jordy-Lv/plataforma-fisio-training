import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "cn";
import { bodyPartLabels } from "@/lib/catalog/body-parts";
import { catalogHref } from "@/lib/catalog/embedded-catalog";
import { labelFor } from "@/lib/catalog/vocabulary";
import type {
  EditableRoutine,
  EditableRoutineItem,
} from "@/lib/routines/item-queries";
import {
  RemoveRoutineItemButton,
  RoutineItemForm,
} from "@/components/routines/RoutineItems";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cardVariants } from "@/components/ui/Card";

/** Las condiciones del paciente que este ejercicio agrava. */
const clashes = (item: EditableRoutineItem, conditions: string[]) =>
  conditions.filter((condition) =>
    (item.exercises?.contraindications ?? []).includes(condition),
  );

/** La prescripción en una línea, para leer el día sin abrir cada ejercicio. */
function summary(item: EditableRoutineItem) {
  return (
    [
      item.sets != null && item.reps != null
        ? `${item.sets} × ${item.reps}`
        : item.sets != null
          ? `${item.sets} series`
          : item.reps != null
            ? `${item.reps} repeticiones`
            : null,
      item.target_weight != null ? `${item.target_weight} kg` : null,
      item.rest_seconds != null ? `${item.rest_seconds} s de descanso` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Sin prescripción todavía"
  );
}

/**
 * La rutina que el profesional ajusta: el borrador (paso ②) o la activa
 * (paso ③). Un solo nivel de tarjeta: los días son secciones separadas por un
 * borde y cada ejercicio es una fila.
 *
 * Contratos que conserva (`docs/11` §3):
 * - En cada ejercicio, el formulario de **quitar va antes** que el de la
 *   prescripción: `test:routines:items` toma el primero del ítem y comprueba
 *   que no arrastra `sets`.
 * - Los enlaces «Añadir ejercicios a este día» (`?dia=`) y «Sustituir por otro
 *   ejercicio» (`?item=`) abren el buscador, que la página pinta en `catalog`
 *   solo cuando uno de los dos está en la URL.
 */
export function RoutineEditor({
  routine,
  patientId,
  conditions,
  base,
  calendarParams,
  diaAbierto,
  itemAbierto,
  catalog,
  footer,
}: {
  routine: EditableRoutine;
  patientId: string;
  conditions: string[];
  base: string;
  calendarParams: Record<string, string>;
  diaAbierto: string | null;
  itemAbierto: string | null;
  /** El buscador del catálogo, solo con `?dia=` o `?item=`. */
  catalog?: ReactNode;
  /** Acciones al pie de la rutina, como «Cambiar de plantilla». */
  footer?: ReactNode;
}) {
  const isDraft = routine.status === "pending_review";

  return (
    <article className={cn(cardVariants({ padding: "lg" }), "min-w-0")}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="brand">
          {routine.kind === "training" ? "Entrenamiento" : "Rehabilitación"}
        </Badge>
        <Badge variant={isDraft ? "warning" : "success"}>
          {isDraft ? "Borrador" : "Activa"}
        </Badge>
      </div>
      <h2 className="mt-3 break-words text-2xl font-semibold">{routine.name}</h2>
      <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">
        {isDraft
          ? "El paciente no ve este borrador hasta que lo confirmes. "
          : ""}
        Lo que ajustes aquí afecta solo a esta persona: la plantilla de origen y
        las rutinas de los demás pacientes no cambian.
      </p>

      {routine.notes && (
        <details className="mt-4">
          <summary className="min-h-11 cursor-pointer py-3 font-medium">
            Qué se excluyó
          </summary>
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
            {routine.notes}
          </p>
        </details>
      )}

      {catalog && <div className="mt-6">{catalog}</div>}

      <div className="mt-6 divide-y divide-border border-t border-border">
        {routine.routine_days.map((day) => (
          <section
            key={day.id}
            id={`routine-day-${day.id}`}
            className="scroll-mt-24 py-5"
          >
            <h3 className="text-lg font-semibold">
              Día {day.day_number}
              {day.title ? ` · ${day.title}` : ""}
            </h3>

            {!day.routine_items.length ? (
              <p className="mt-3 leading-7 text-warning">
                Este día se quedó sin ejercicios. Añádele al menos uno: sin
                ejercicios no se puede confirmar la rutina.
              </p>
            ) : (
              <ol className="mt-3 divide-y divide-border">
                {day.routine_items.map((item, indice) => {
                  const choques = clashes(item, conditions);
                  return (
                    <li key={item.id} className="py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="grid min-w-0 gap-1">
                          <p className="break-words font-semibold">
                            {/* El número es el orden de ejecución. */}
                            <span className="text-muted-foreground">{`${indice + 1}.`}</span>{" "}
                            {item.exercises ? (
                              <Link
                                href={`/exercises/${item.exercises.id}`}
                                prefetch={false}
                                className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                              >
                                {item.exercises.name}
                              </Link>
                            ) : (
                              "Ejercicio"
                            )}
                            {item.was_modified && (
                              <Badge variant="brand" className="ml-2">
                                Ajustado
                              </Badge>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">{summary(item)}</p>
                          {choques.length > 0 && (
                            // Una sola cadena: con varias expresiones JSX, React
                            // separa el texto con comentarios y la frase contrato
                            // «contraindicado para Rodilla» deja de leerse seguida.
                            <p className="text-xs text-destructive">
                              {`Contraindicado para ${choques.map((zona) => labelFor(bodyPartLabels, zona)).join(" y ")}, una condición activa de este paciente. Sustitúyelo por otro si puedes.`}
                            </p>
                          )}
                        </div>
                        {/* Quitar va antes que la prescripción (contrato). */}
                        <RemoveRoutineItemButton patientId={patientId} item={item} />
                      </div>

                      <details
                        className="mt-2"
                        open={itemAbierto === item.id || undefined}
                      >
                        <summary className="flex min-h-11 cursor-pointer items-center font-medium text-brand">
                          Ajustar la prescripción o sustituir
                        </summary>
                        <div className="grid gap-4 pb-2 pt-2">
                          <RoutineItemForm patientId={patientId} item={item} />
                          <ButtonLink
                            className="justify-self-start"
                            href={`${catalogHref(base, { ...calendarParams, item: item.id }, {})}#catalogo-buscador`}
                            prefetch={false}
                            variant={itemAbierto === item.id ? "outline" : "default"}
                          >
                            {itemAbierto === item.id
                              ? "Buscando un recambio arriba"
                              : "Sustituir por otro ejercicio"}
                          </ButtonLink>
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ol>
            )}

            <ButtonLink
              className="mt-3"
              href={`${catalogHref(base, { ...calendarParams, dia: day.id }, {})}#catalogo-buscador`}
              prefetch={false}
              variant={diaAbierto === day.id ? "outline" : "default"}
            >
              {diaAbierto === day.id ? "Buscando para este día" : "Añadir ejercicios a este día"}
            </ButtonLink>
          </section>
        ))}
      </div>

      {footer && <div className="mt-2 border-t border-border pt-5">{footer}</div>}
    </article>
  );
}
