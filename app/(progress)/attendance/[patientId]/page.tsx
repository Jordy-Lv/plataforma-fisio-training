import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { AttendanceForm } from "@/components/progress/AttendanceForm";
import { requireStaff } from "@/lib/progress/access";
import {
  daysThisMonth,
  getPatientAttendance,
} from "@/lib/progress/attendance-queries";
import {
  formatDate,
  formatMonth,
  formatTime,
  formatTimes,
  monthStart,
} from "@/lib/progress/vocabulary";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/ButtonLink";

export const metadata: Metadata = {
  title: "Asistencia del paciente",
};

export default async function Page({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const profile = await requireStaff();
  const { patientId } = await params;
  const registro = await getPatientAttendance(patientId);

  // RLS devuelve vacío tanto si el paciente no existe como si el profesional
  // no lo tiene asignado: en ambos casos, para quien mira, no está.
  if (!registro) notFound();

  const { patient, attendance } = registro;
  const delMes = daysThisMonth(attendance);

  return (
    <Workspace
      title={patient.full_name ?? "Paciente sin nombre"}
      name={profile.fullName}
    >
      <div className="mb-8 -mt-4 flex flex-wrap gap-3">
        <ButtonLink href="/attendance">
          Volver a la asistencia
        </ButtonLink>
        <ButtonLink href={`/screenings/${patient.id}`}>
          Ver su seguimiento físico
        </ButtonLink>
        <ButtonLink href={`/evolution/${patient.id}`}>
          Ver su evolución
        </ButtonLink>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
        <section aria-labelledby="historial">
          <h2 id="historial" className="mb-1 text-xl font-semibold">
            Historial de asistencia
          </h2>
          <p className="mb-4 leading-7 text-muted-foreground">
            {delMes === 0
              ? `En ${formatMonth(monthStart())} todavía no ha asistido.`
              : `En ${formatMonth(monthStart())} asistió ${formatTimes(delMes)}.`}
          </p>

          {attendance.length === 0 ? (
            <EmptyState title="Este paciente no tiene asistencias registradas">
              Registra la primera con el formulario de esta página, el día que
              venga.
            </EmptyState>
          ) : (
            <ul className="grid gap-3">
              {attendance.map((record) => {
                const hora = formatTime(record.check_in_at);
                return (
                  <li
                    key={record.id}
                    className="rounded-2xl border border-border bg-surface p-5"
                  >
                    <h3 className="font-semibold">
                      {formatDate(record.attended_on)}
                    </h3>
                    {hora && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Entrada a las {hora}
                      </p>
                    )}
                    {record.notes && (
                      <p className="mt-2 leading-7 text-muted-foreground">
                        {record.notes}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="nueva"
          className="rounded-2xl border border-border bg-surface p-5"
        >
          <h2 id="nueva" className="mb-1 text-xl font-semibold">
            Registrar asistencia
          </h2>
          <p className="mb-6 text-sm leading-6 text-muted-foreground">
            Un paciente solo puede tener una asistencia por día.
          </p>
          <AttendanceForm patientId={patient.id} />
        </section>
      </div>
    </Workspace>
  );
}
