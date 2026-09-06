import type { Metadata } from "next";

import { Workspace } from "@/components/auth/Workspace";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireRole } from "@/lib/auth/session";
import {
  daysThisMonth,
  listOwnAttendance,
} from "@/lib/progress/attendance-queries";
import {
  formatDate,
  formatMonth,
  formatTime,
  formatTimes,
  monthStart,
} from "@/lib/progress/vocabulary";

export const metadata: Metadata = {
  title: "Mi asistencia",
};

export default async function Page() {
  const profile = await requireRole("patient");
  const attendance = await listOwnAttendance(profile.id);
  const delMes = daysThisMonth(attendance);

  return (
    <Workspace
      title="Mi asistencia"
      name={profile.fullName}
      role="patient"
      description="Tu profesional registra cada visita cuando llegas."
    >
      <div className="max-w-xl">
        {attendance.length === 0 ? (
          <EmptyState title="Todavía no tienes asistencias">
            Tu profesional registra cada visita cuando llegas. Aquí las verás
            todas, con la fecha y la hora de entrada.
          </EmptyState>
        ) : (
          <>
            {/*
              El dato que el paciente viene a buscar es cuántas veces ha venido
              este mes, así que va primero y en grande, no escondido sobre la
              lista.
            */}
            <Card padding="lg" className="mb-6 bg-brand-soft">
              <p className="text-lg leading-7 text-brand-soft-foreground">
                {delMes === 0 ? (
                  `En ${formatMonth(monthStart())} todavía no has venido.`
                ) : (
                  <>
                    En {formatMonth(monthStart())} has venido{" "}
                    <strong className="font-semibold">
                      {formatTimes(delMes)}
                    </strong>
                    .
                  </>
                )}
              </p>
            </Card>

            <ul className="grid gap-3">
              {attendance.map((record) => {
                const hora = formatTime(record.check_in_at);
                return (
                  <li key={record.id}>
                    <Card className="grid gap-1">
                      <p className="font-semibold">
                        {formatDate(record.attended_on)}
                      </p>
                      {hora && (
                        <p className="text-sm text-muted-foreground">
                          Entrada a las {hora}
                        </p>
                      )}
                      {record.notes && (
                        <p className="leading-7 text-muted-foreground">
                          {record.notes}
                        </p>
                      )}
                    </Card>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </Workspace>
  );
}
