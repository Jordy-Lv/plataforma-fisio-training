import type { TemplateDetail } from "@/lib/catalog/template-queries";

/**
 * Qué le falta a una plantilla para poder activarse.
 *
 * Es una función pura y se usa en los dos sitios: la pantalla la muestra antes
 * de ofrecer el botón, y la server action la vuelve a aplicar porque una
 * plantilla puede vaciarse entre que se pinta la pantalla y se pulsa.
 *
 * Un día sin ejercicios cuenta como plantilla incompleta: al asignarla
 * produciría una rutina con un día vacío, que es justo lo que el motor de
 * reglas no debe entregar nunca.
 */
export function templateIssues(template: TemplateDetail): string[] {
  const issues: string[] = [];

  if (template.days.length === 0) {
    issues.push("La plantilla no tiene ningún día definido.");
    return issues;
  }

  const vacios = template.days.filter((day) => day.items.length === 0);
  if (vacios.length > 0)
    issues.push(
      vacios.length === 1
        ? `El día ${vacios[0].day_number} no tiene ejercicios.`
        : `Estos días no tienen ejercicios: ${vacios
            .map((day) => day.day_number)
            .join(", ")}.`,
    );

  return issues;
}

/**
 * La plantilla promete unos días por semana que no coinciden con los que tiene
 * definidos. Es una advertencia, no un impedimento: puede ser deliberado
 * mientras se termina de armar.
 */
export function daysMismatch(template: TemplateDetail) {
  return template.days.length !== template.days_per_week;
}
