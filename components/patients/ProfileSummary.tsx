import {
  environmentLabels,
  goalLabels,
  levelLabels,
} from "@/lib/auth/onboarding-schemas";
import { equipmentLabels, type Equipment } from "@/lib/catalog/equipment";
import type { Database } from "@/lib/db/types";

type Details = Database["public"]["Tables"]["patient_details"]["Row"];

/*
  El perfil de entrenamiento, leído.

  Antes esta tarjeta abría directamente con los cuatro grupos de opciones del
  formulario —dieciocho controles— aunque el paciente solo entrara a comprobar
  cuál era su objetivo. Medido: 2.131 px y 3,19 pantallas de teléfono para leer
  cuatro datos (`docs/12-medicion-de-densidad.md`).

  Ahora se lee en pares etiqueta/valor y el formulario vive detrás de un
  `<details>`. Es la decisión de la pantalla de cuenta de Smart Fit, descrita en
  `docs/13-referencia-smart-fit.md`: un perfil se lee, y editarlo es un gesto
  aparte.

  `<details>`, no un diálogo: un portal no emite nada en el HTML del servidor y
  `verify-people-onboarding` localiza el formulario de `name="goal"` con una
  expresión regular sobre ese HTML (ADR-0008). Plegado sigue estando ahí.
*/
const guion = "Sin registrar";

export function ProfileSummary({ details }: { details: Details }) {
  const filas: { etiqueta: string; valor: string }[] = [
    { etiqueta: "Objetivo", valor: details.goal ? goalLabels[details.goal] : guion },
    { etiqueta: "Nivel", valor: details.level ? levelLabels[details.level] : guion },
    {
      etiqueta: "Dónde entrena",
      valor: details.environment ? environmentLabels[details.environment] : guion,
    },
    {
      etiqueta: "Equipamiento",
      valor:
        details.equipment.length > 0
          ? details.equipment
              .map((value) => equipmentLabels[value as Equipment] ?? value)
              .join(" · ")
          : guion,
    },
  ];

  return (
    <dl className="grid gap-4">
      {filas.map(({ etiqueta, valor }) => (
        <div key={etiqueta} className="grid gap-0.5">
          <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
          <dd className="text-base leading-6">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}
