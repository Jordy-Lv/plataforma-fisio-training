import Link from "next/link";
import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { rolePaths } from "@/lib/auth/session";
import { requireStaff } from "@/lib/progress/access";
import { listPatientsWithMonthAttendance } from "@/lib/progress/attendance-queries";
import {
  formatDate,
  formatMonth,
  formatTimes,
  monthStart,
} from "@/lib/progress/vocabulary";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";

export const metadata: Metadata = {
  title: "Asistencia",
};

export default async function Page() {
  const profile = await requireStaff();
  const patients = await listPatientsWithMonthAttendance();

  return (
    <Workspace title="Asistencia" name={profile.fullName}>
      <p className="-mt-4 max-w-2xl leading-7 text-muted-foreground">
        Quién vino y cuándo. El resumen es del mes en curso —
        {formatMonth(monthStart())}—; el historial completo está en la ficha de
        cada paciente.
      </p>

      <div className="mb-6 mt-4 flex flex-wrap gap-3">
        <ButtonLink href={rolePaths[profile.role]}>
          Volver a mi panel
        </ButtonLink>
        <ButtonLink href="/screenings">
          Seguimiento físico
        </ButtonLink>
      </div>

      {patients.length === 0 ? (
        <EmptyState title="Aún no tienes pacientes que seguir">
          {profile.role === "admin"
            ? "Cuando se registre el primer paciente aparecerá aquí para llevarle la asistencia."
            : "Aquí verás a los pacientes que tengas asignados. Pídele al administrador que te asigne alguno."}
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {patients.map((patient) => (
            <li key={patient.id} className="flex">
              <article className="relative flex w-full flex-col gap-3 rounded-2xl border border-border bg-surface p-5 focus-within:border-brand hover:border-brand">
                <h2 className="text-base font-semibold leading-6">
                  <Link
                    href={`/attendance/${patient.id}`}
                    className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {patient.full_name ?? "Paciente sin nombre"}
                  </Link>
                </h2>

                {patient.last === null ? (
                  <p className="text-sm leading-6 text-muted-foreground">
                    Sin asistencias este mes. Regístrale la próxima cuando
                    llegue.
                  </p>
                ) : (
                  <>
                    <Badge variant="success">
                      Asistió {formatTimes(patient.days)} este mes
                    </Badge>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Última vez: {formatDate(patient.last)}
                    </p>
                  </>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </Workspace>
  );
}
