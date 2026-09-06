import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { Workspace } from "@/components/auth/Workspace";
import { SessionItemForm } from "@/components/routines/SessionItemForm";
import { SessionControls } from "@/components/routines/SessionControls";
import { SessionReport } from "@/components/routines/SessionHistory";
import { sessionDetails, executionExercises, replacementExercises } from "@/lib/routines/session-queries";
import { closeSessionSchema } from "@/lib/routines/schemas";

export default async function Page({ params }: { params: Promise<{ sessionId: string }> }) {
  const actor = await requireRole("patient");
  const parsed = closeSessionSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const session = await sessionDetails(parsed.data.sessionId);
  if (!session) notFound();
  const [items, catalog] = session.status === "in_progress" ? await Promise.all([
    executionExercises(session.routine_day_id), replacementExercises(),
  ]) : [[], []];
  const logs = new Map(session.session_logs.map((log) => [log.routine_item_id, log]));
  return <Workspace title={session.routines?.name ?? "Mi sesión"} name={actor.fullName}>
    <Link href="/routine" className="mb-4 inline-flex min-h-11 items-center text-brand">Volver a mis rutinas</Link>
    <p className="mb-4">Día {session.routine_days?.day_number} · {session.routine_days?.title} · {session.performed_on}</p>
    {session.status === "in_progress" ? <>
      <p className="mb-5 text-muted-foreground">{session.session_logs.length} de {items.length} ejercicios registrados. Cada registro se guarda al confirmarlo.</p>
      <div className="grid gap-5">{items.map((item) => <SessionItemForm key={`${item.id}-${JSON.stringify(logs.get(item.id) ?? null)}`} sessionId={session.id} item={item} log={logs.get(item.id)} catalog={catalog} />)}</div>
      <SessionControls sessionId={session.id} />
    </> : <SessionReport session={session} />}
  </Workspace>;
}
