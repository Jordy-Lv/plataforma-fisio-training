import { notFound, redirect } from "next/navigation";
import { getActiveProfile } from "@/lib/auth/session";
import { Workspace } from "@/components/auth/Workspace";
import { SessionReport } from "@/components/routines/SessionHistory";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { sessionDetails } from "@/lib/routines/session-queries";
import { closeSessionSchema } from "@/lib/routines/schemas";

export default async function Page({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const actor = await getActiveProfile();
  if (!actor) redirect("/login");
  if (actor.role === "patient") redirect("/routine");

  const parsed = closeSessionSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const session = await sessionDetails(parsed.data.sessionId);
  if (!session) notFound();

  return (
    <Workspace
      title={session.routines?.name ?? "Registro de sesión"}
      name={actor.fullName}
      actions={
        <ButtonLink
          variant="ghost"
          href={`/pro/routines/${session.patient_id}`}
        >
          Volver a las rutinas del paciente
        </ButtonLink>
      }
    >
      <SessionReport session={session} />
    </Workspace>
  );
}
