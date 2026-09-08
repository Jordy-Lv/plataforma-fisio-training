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
import { AttendanceHistory } from "@/components/progress/AttendanceHistory";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PatientTabs } from "@/components/patients/PatientTabs";
import { cardVariants } from "@/components/ui/Card";

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
  // `attended_on` ya viene ordenada de más reciente a más antigua, así que los
  // meses salen en ese mismo orden sin volver a ordenarlos.
  const months = [...new Set(attendance.map((r) => r.attended_on.slice(0, 7)))];

  return (
    <Workspace
      title={patient.full_name ?? "Paciente sin nombre"}
      name={profile.fullName}
      actions={
        <ButtonLink variant="ghost" href="/attendance">
          Volver a la asistencia
        </ButtonLink>
      }
    >
      <PatientTabs patientId={patient.id} active="attendance" />

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
            <AttendanceHistory months={months}>
              <ul className="grid gap-3">
                {attendance.map((record) => {
                  const hora = formatTime(record.check_in_at);
                  return (
                    <li
                      key={record.id}
                      data-month={record.attended_on.slice(0, 7)}
                      className={cardVariants()}
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
            </AttendanceHistory>
          )}
        </section>

        <section
          aria-labelledby="nueva"
          className={cardVariants()}
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
