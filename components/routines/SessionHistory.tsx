import Link from "next/link";
import type { patientSessions, SessionDetails } from "@/lib/routines/session-queries";
import { bodyPartLabels, bodyParts } from "@/lib/catalog/body-parts";
const statusLabels = { completed: "Completada", in_progress: "En curso", abandoned: "Abandonada" };
export function SessionHistory({ sessions, staff = false }: { sessions: Awaited<ReturnType<typeof patientSessions>>; staff?: boolean }) {
  return <section className="mt-8"><h2 className="text-xl font-semibold">Sesiones recientes</h2>
    {!sessions.length && <p className="mt-3 text-muted-foreground">Aún no hay sesiones registradas. Aparecerán aquí al iniciar un día de rutina.</p>}
    <ul className="mt-3 grid gap-3">{sessions.map((session) => <li key={session.id}>
      <Link className="flex min-h-11 flex-wrap gap-2 rounded-xl border border-border p-4 text-brand" href={`${staff ? "/pro" : "/routine"}/sessions/${session.id}`}>
        {session.performed_on} · {session.routines?.name} · Día {session.routine_days?.day_number} · {statusLabels[session.status]}
      </Link>
    </li>)}</ul>
  </section>;
}
export function SessionReport({ session }: { session: SessionDetails }) {
  return <section className="grid gap-4">
    <p>{session.performed_on} · {statusLabels[session.status]}{session.completed_at ? ` · Cierre: ${new Date(session.completed_at).toLocaleString("es-CO", { timeZone: "America/Bogota" })}` : ""}</p>
    {!session.session_logs.length && <p>Aún no se ha marcado ningún ejercicio de esta sesión.</p>}
    {session.session_logs.map((log) => <article key={log.id} className="rounded-xl border border-border p-4">
      <h2 className="font-semibold">{log.exercises?.name} · {{ done: "Hecho", skipped: "Saltado", modified: "Modificado" }[log.status]}</h2>
      <p className="mt-2 text-sm text-muted-foreground">Prescrito: {log.prescribed_sets ?? "—"} × {log.prescribed_reps ?? "—"} · {log.prescribed_weight ?? "—"} kg</p>
      <p>Real: {log.actual_sets ?? "—"} × {log.actual_reps ?? "—"} · {log.actual_weight ?? "—"} kg</p>
      <p>Esfuerzo: {log.perceived_effort ?? "—"}/10 · Dolor: {log.pain_level ?? "—"}/10{log.pain_location ? ` · ${bodyPartLabels[log.pain_location as typeof bodyParts[number]] ?? log.pain_location}` : ""}</p>
      {log.replacement && <p>Sustitución: {log.replacement.name}</p>}
      {log.notes && <p className="mt-2 whitespace-pre-wrap break-words">{log.notes}</p>}
    </article>)}
  </section>;
}
