import { SessionQuickView } from "@/components/routines/SessionQuickView";
import { EmptyState } from "@/components/ui/EmptyState";
import type {
  PatientSession,
  SessionDetails,
} from "@/lib/routines/session-queries";

/**
 * El historial de sesiones de un paciente.
 *
 * Con `reports` —los informes de las sesiones de esta página, traídos de una
 * sola consulta con `sessionReports`— cada tarjeta abre lo que se registró sin
 * cambiar de pantalla (15.4). Sin ellos, cada tarjeta es solo su enlace.
 */
export function SessionHistory({
  sessions,
  staff = false,
  reports,
}: {
  sessions: PatientSession[];
  staff?: boolean;
  reports?: Map<string, SessionDetails>;
}) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xl font-semibold">Sesiones recientes</h2>

      {sessions.length === 0 ? (
        <EmptyState title="Aún no hay sesiones registradas">
          Aparecerán aquí en cuanto {staff ? "el paciente inicie" : "inicies"} un
          día de la rutina.
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {sessions.map((session) => (
            <SessionQuickView
              key={session.id}
              session={session}
              report={reports?.get(session.id)}
              staff={staff}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
