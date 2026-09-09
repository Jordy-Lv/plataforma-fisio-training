import { SessionControls } from "@/components/routines/SessionControls";
import { Progress } from "@/components/ui/Progress";

/**
 * La banda de la sesión en curso: cuántos ejercicios llevas registrados, un
 * acceso directo a cada uno y el cierre de la sesión.
 *
 * Va fija bajo la cabecera del shell porque es la única parte de la pantalla
 * que se necesita **todo el rato**: entre serie y serie el paciente mira el
 * teléfono un segundo, y hasta ahora tenía que recorrer los ejercicios uno a
 * uno para encontrar el siguiente y bajar hasta el final para cerrar.
 *
 * Los accesos son anclas —`#ejercicio-<id>`—, no un componente de cliente: sin
 * JavaScript funcionan igual y no cuestan nada en el teléfono.
 *
 * **El cierre sigue siendo el mismo `<form>` con su server action.** Solo
 * cambia de sitio: el rótulo «Terminar sesión» tiene que seguir en el HTML del
 * servidor y ningún otro texto de la pantalla puede repetirlo (`docs/11`, §4).
 */
export function SessionProgress({
  sessionId,
  items,
}: {
  sessionId: string;
  /** Los ejercicios del día, en orden, con su marca de registrado. */
  items: { id: string; name: string; done: boolean }[];
}) {
  const done = items.filter((item) => item.done).length;
  const pending = items.length - done;

  return (
    <div className="sticky top-16 z-30 -mx-4 mb-6 grid gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm font-medium" aria-live="polite">
          {done} de {items.length} ejercicios registrados
        </p>
        <SessionControls
          sessionId={sessionId}
          size="sm"
          className="grid justify-items-end gap-1"
        />
      </div>

      <Progress
        value={done}
        max={items.length}
        label={`${done} de ${items.length} ejercicios registrados`}
      />

      {pending > 0 && (
        /*
          El aviso vive fuera del `<form>` de cierre a propósito: dentro
          desordenaba la fila del botón. Dice lo que de verdad ocurre —la base
          rechaza cerrar una sesión con ejercicios sin marcar—, para que nadie
          descubra la regla al chocar con ella. **No puede contener la cadena
          «Terminar sesión»** (`docs/11`, §4).
        */
        <p className="text-sm text-muted-foreground">
          {pending === 1
            ? "Queda 1 ejercicio por marcar —hecho, saltado o modificado— antes de poder cerrar."
            : `Quedan ${pending} ejercicios por marcar —hechos, saltados o modificados— antes de poder cerrar.`}
        </p>
      )}

      {/*
        Una fila que se desplaza en horizontal, no una rejilla: con doce
        ejercicios en 375 px la rejilla ocuparía media pantalla y esta banda
        está fija.
      */}
      <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item, index) => (
          <li key={item.id}>
            <a
              href={`#ejercicio-${item.id}`}
              aria-label={`Ir a ${item.name}${item.done ? ", registrado" : ", pendiente"}`}
              className={
                item.done
                  ? "flex size-11 items-center justify-center rounded-lg border border-brand bg-brand-soft text-sm font-medium text-brand-soft-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  : "flex size-11 items-center justify-center rounded-lg border border-input bg-surface text-sm font-medium text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              }
            >
              {item.done ? "✓" : index + 1}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
