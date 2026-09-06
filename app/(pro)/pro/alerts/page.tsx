import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveProfile } from "@/lib/auth/session";
import { clinicalAlerts } from "@/lib/routines/alert-queries";
import { Workspace } from "@/components/auth/Workspace";
import { ReadAlertForm } from "@/components/routines/ReadAlertForm";
import { bodyPartLabels, bodyParts } from "@/lib/catalog/body-parts";
const titles = { pain: "Dolor persistente", skipped: "Ejercicio saltado repetidamente", membership_expiring: "Mensualidad próxima a vencer", low_attendance: "Asistencia baja", routine_assignment: "Asignación de rutina" };
const severities = { critical: "Prioridad alta", warning: "Requiere revisión", info: "Información" };
export default async function Page() {
  const actor = await getActiveProfile();
  if (!actor) redirect("/login");
  if (actor.role === "patient") redirect("/patient");
  const alerts = await clinicalAlerts();
  return <Workspace title={actor.role === "admin" ? "Todas las alertas" : "Mis alertas"} name={actor.fullName}>
    <Link href={actor.role === "admin" ? "/admin" : "/pro"} className="mb-4 inline-flex min-h-11 items-center text-brand">Volver al panel</Link>
    <Link href="/pro/sessions" className="mb-4 ml-4 inline-flex min-h-11 items-center text-brand">Consultar sesiones de pacientes</Link>
    <p className="mb-6 text-muted-foreground">{alerts.filter((alert) => alert.recipient_id === actor.id && !alert.read_at).length} sin leer para ti entre las últimas 200 alertas.</p>
    {!alerts.length && <p className="rounded-xl border border-dashed border-border p-6">No hay alertas disponibles. Aquí aparecerán los avisos generados al cerrar las sesiones de tus pacientes.</p>}
    <div className="grid gap-5">{alerts.map((alert) => <article key={alert.id} className="min-w-0 rounded-2xl border border-border bg-surface p-5">
      <p className="text-sm font-semibold text-brand">{severities[alert.severity]} · {alert.read_at ? "Leída" : "Sin leer"}</p>
      <h2 className="mt-2 text-xl font-semibold">{titles[alert.type]}</h2>
      <p className="mt-2">{alert.patient?.full_name ?? "Paciente"}{alert.exerciseName ? ` · ${alert.exerciseName}` : ""}{alert.zone ? ` · ${bodyPartLabels[alert.zone as typeof bodyParts[number]] ?? alert.zone}` : ""}</p>
      <p className="mt-1 text-sm text-muted-foreground">{new Date(alert.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" })}{actor.role === "admin" ? ` · Para: ${alert.recipient?.full_name ?? "Profesional"}` : ""}</p>
      {alert.message && <p className="mt-3 whitespace-pre-wrap break-words">{alert.message}</p>}
      <ul className="mt-3 grid gap-2">{alert.evidence.map((evidence, index) => <li key={`${evidence.session_id}-${index}`} className="rounded-lg bg-background p-3">
        <Link className="inline-flex min-h-11 items-center text-brand" href={`/pro/sessions/${evidence.session_id}`}>Ver sesión del {evidence.performed_on}</Link>
        <p>Dolor: {evidence.pain_level ?? "—"}/10{evidence.pain_location ? ` · ${bodyPartLabels[evidence.pain_location as typeof bodyParts[number]] ?? evidence.pain_location}` : ""}</p>
        {evidence.notes && <p className="whitespace-pre-wrap break-words">{evidence.notes}</p>}
      </li>)}</ul>
      <Link href={`/pro/routines/${alert.patient_id}`} className="mt-2 inline-flex min-h-11 items-center text-brand">Ver rutinas del paciente</Link>
      {!alert.read_at && alert.recipient_id === actor.id && <ReadAlertForm alertId={alert.id} />}
    </article>)}</div>
  </Workspace>;
}
