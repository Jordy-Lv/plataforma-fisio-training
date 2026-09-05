import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { patientRoutines } from "@/lib/routines/queries";
import { Workspace } from "@/components/auth/Workspace";
import { RoutineSummary } from "@/components/routines/RoutineSummary";

export default async function Page() {
  const actor = await requireRole("patient");
  const routines = await patientRoutines(actor.id, true);
  return <Workspace title="Mis rutinas" name={actor.fullName}>
    <Link href="/patient" className="mb-6 inline-flex min-h-11 items-center text-brand">Volver a mi espacio</Link>
    {!routines.length && <section className="rounded-2xl border border-dashed border-border p-6">
      <h2 className="text-xl font-semibold">Tu profesional está preparando tu rutina</h2>
      <p className="mt-3 leading-7 text-muted-foreground">Cuando esté lista podrás consultar aquí los ejercicios y sus indicaciones.</p>
    </section>}
    <div className="grid gap-6">{routines.map((routine) => <RoutineSummary key={routine.id} routine={routine} />)}</div>
  </Workspace>;
}
