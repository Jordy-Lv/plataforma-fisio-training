"use client";

import { useState } from "react";
import { ExerciseCard } from "@/components/catalog/ExerciseCard";
import { ExerciseRow } from "@/components/catalog/ExerciseRow";
import { ExerciseSummary } from "@/components/catalog/ExerciseSummary";
import { DetailPanel } from "@/components/ui/DetailDialog";
import type { ExerciseView } from "@/lib/catalog/schemas";
import type { ExerciseListItem } from "@/lib/catalog/queries";

/**
 * Un ejercicio del listado: su fila o su tarjeta y, detrás, la ficha en diálogo
 * (15.2).
 *
 * **El enlace no cambia.** El nombre sigue siendo un `<a href="/exercises/[id]">`
 * en el HTML del servidor —es la ruta para compartir, la que abre quien no tiene
 * JavaScript, y el marcado que `verify-catalog-list` lee por expresión regular—.
 * Lo que hace este envoltorio es interceptar el clic *antes* de que navegue.
 * Intercepta por delegación en vez de recibir un disparador propio: así ni
 * `ExerciseRow` ni `ExerciseCard` tienen que saber que existe el diálogo.
 *
 * **Recibe el ejercicio, no la fila ya pintada.** Un componente de cliente
 * serializa sus props en el documento, y el árbol de React de una tarjeta pesa
 * unas veinte veces más que los datos con los que se construye: pasarle
 * `children` desde el servidor llevó `/exercises` de 64 kB a 320. Con el dato
 * plano —y la fila y la ficha construidas aquí— el documento no crece.
 *
 * Se respeta el clic con modificador —`Cmd`/`Ctrl`, `Shift`, botón central—:
 * quien quiera la ficha en otra pestaña la sigue teniendo.
 */
export function ExerciseQuickView({
  exercise,
  vista,
}: {
  exercise: ExerciseListItem;
  vista: ExerciseView;
}) {
  const [open, setOpen] = useState(false);

  return (
    <li
      className={vista === "lista" ? undefined : "flex"}
      onClickCapture={(event) => {
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        )
          return;
        const link = (event.target as HTMLElement).closest("a[href]");
        if (!link?.getAttribute("href")?.startsWith("/exercises/")) return;
        /*
          `stopPropagation` además de `preventDefault`: `next/link` navega
          desde su propio `onClick` y no mira si alguien ya frenó el evento,
          así que hay que cortarle el paso antes de que le llegue.
        */
        event.preventDefault();
        event.stopPropagation();
        setOpen(true);
      }}
    >
      {vista === "lista" ? (
        <ExerciseRow exercise={exercise} />
      ) : (
        <ExerciseCard exercise={exercise} />
      )}
      {/*
        La ficha se monta al abrir: una página de lista trae sesenta ejercicios
        y aquí no hay nada que ninguna suite lea por HTTP.
      */}
      <DetailPanel
        title={exercise.name}
        open={open}
        onClose={() => setOpen(false)}
        keepMounted={false}
      >
        <ExerciseSummary exercise={exercise} />
      </DetailPanel>
    </li>
  );
}
