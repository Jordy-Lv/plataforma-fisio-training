import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActiveProfile } from "@/lib/auth/session";
import { Workspace } from "@/components/auth/Workspace";
import { SessionReport } from "@/components/routines/SessionHistory";
import { sessionDetails } from "@/lib/routines/session-queries";
import { closeSessionSchema } from "@/lib/routines/schemas";
export default async function Page({ params }: { params: Promise<{ sessionId: string }> }) {
  const actor = await getActiveProfile();
  if (!actor) redirect("/login");
  if (actor.role === "patient") redirect("/routine");
  const parsed = closeSessionSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const session = await sessionDetails(parsed.data.sessionId);
  if (!session) notFound();
  return <Workspace title={session.routines?.name ?? "Registro de sesión"} name={actor.fullName}>
    <Link href={`/pro/routines/${session.patient_id}`} className="mb-4 inline-flex min-h-11 items-center text-brand">Volver a las rutinas del paciente</Link>
    <SessionReport session={session} />
  </Workspace>;
}
