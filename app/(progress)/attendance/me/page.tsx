import Link from "next/link";
import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
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
    <Workspace title="Mi asistencia" name={profile.fullName}>
      <section className="max-w-xl">
        <Link
          href="/patient"
          className="mb-8 inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring"
        >
          Volver a mi espacio
        </Link>

        {attendance.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="font-semibold">Todavía no tienes asistencias</p>
            <p className="mt-2 leading-7 text-muted-foreground">
              Tu profesional registra cada visita cuando llegas. Aquí las verás
              todas, con la fecha y la hora de entrada.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-6 text-lg leading-7">
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

            <ul className="grid gap-3">
              {attendance.map((record) => {
                const hora = formatTime(record.check_in_at);
                return (
                  <li
                    key={record.id}
                    className="rounded-2xl border border-border bg-surface p-5"
                  >
                    <p className="font-semibold">
                      {formatDate(record.attended_on)}
                    </p>
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
          </>
        )}
      </section>
    </Workspace>
  );
}
