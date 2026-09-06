import Link from "next/link";
import type { Metadata } from "next";
import { cn } from "cn";
import { Workspace } from "@/components/auth/Workspace";
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
import { cardVariants } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Asistencia",
};

export default async function Page() {
  const profile = await requireStaff();
  const patients = await listPatientsWithMonthAttendance();

  return (
    <Workspace
      title="Asistencia"
      name={profile.fullName}
      description={`Quién vino y cuándo. El resumen es del mes en curso —${formatMonth(monthStart())}—; el historial completo está en la ficha de cada paciente.`}
    >
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
              <article
                className={cn(
                  cardVariants({ interactive: true }),
                  "flex w-full flex-col gap-3",
                )}
              >
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
