import Link from "next/link";
import type { Metadata } from "next";
import { cn } from "cn";
import { Workspace } from "@/components/auth/Workspace";
import { requireStaff } from "@/lib/progress/access";
import { listPatientsWithMonthAttendance } from "@/lib/progress/attendance-queries";
import { attendanceList, attendanceOrderLabels, shiftMonth } from "@/lib/progress/attendance-list";
import { formatDate, formatMonth, formatTimes } from "@/lib/progress/vocabulary";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cardVariants } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { ListFilters } from "@/components/ui/ListFilters";
import { Pagination } from "@/components/ui/Pagination";

export const metadata: Metadata = {
  title: "Asistencia",
};

const attendedLabels = { some: "Vinieron este mes", none: "Sin asistencias" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireStaff();
  const filters = attendanceList.parse(await searchParams);
  const { patients, total, pages, month } =
    await listPatientsWithMonthAttendance(filters);

  const choices = [
    { name: "attended", label: "Asistencia", options: attendedLabels },
    { name: "orden", label: "Orden", options: attendanceOrderLabels, required: true },
  ];
  const chips = [
    filters.month
      ? {
          label: formatMonth(`${month}-01`),
          href: attendanceList.href(filters, { month: undefined, page: 1 }),
          removeLabel: "Volver al mes en curso",
        }
      : null,
    filters.q
      ? {
          label: filters.q,
          href: attendanceList.href(filters, { q: undefined, page: 1 }),
          removeLabel: "Quitar la búsqueda",
        }
      : null,
    filters.attended
      ? {
          label: attendedLabels[filters.attended],
          href: attendanceList.href(filters, { attended: undefined, page: 1 }),
          removeLabel: "Quitar el filtro de asistencia",
        }
      : null,
  ].flatMap((chip) => (chip ? [chip] : []));

  return (
    <Workspace
      title="Asistencia"
      name={profile.fullName}
      description="Quién vino y cuándo. El resumen es del mes que elijas; el historial completo está en la ficha de cada paciente."
    >
      <ListFilters action="/attendance" label="Filtros de asistencia" values={filters}
        choices={choices} chips={chips}
        search={{ label: "Buscar paciente", placeholder: "Escribe un nombre…" }}
        extra={
          <div className="mt-4 grid gap-2">
            <Field label="Mes">
              <Input type="month" name="month" defaultValue={month} />
            </Field>
          </div>
        } />

      {/*
        A 375 px el mes va arriba y los dos saltos comparten la fila de abajo;
        en escritorio, el mes queda centrado entre los dos botones.
      */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <ButtonLink variant="outline" rel="prev" className="order-2 flex-1 sm:order-1 sm:flex-none"
          href={attendanceList.href(filters, { month: shiftMonth(month, -1), page: 1 })}>
          Mes anterior
        </ButtonLink>
        <p className="order-1 w-full text-center text-sm font-medium sm:order-2 sm:w-auto sm:flex-1"
          aria-live="polite">
          {formatMonth(`${month}-01`)}
        </p>
        <ButtonLink variant="outline" rel="next" className="order-3 flex-1 sm:flex-none"
          href={attendanceList.href(filters, { month: shiftMonth(month, 1), page: 1 })}>
          Mes siguiente
        </ButtonLink>
      </div>

      <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
        {total === 1 ? "1 paciente encontrado" : `${total} pacientes encontrados`}
      </p>

      {patients.length === 0 && (attendanceList.hasActiveFilters(filters) || filters.page > 1) ? (
        <EmptyState title="Ningún paciente coincide con estos filtros"
          action={<ButtonLink href="/attendance">Ver todos los pacientes</ButtonLink>}>
          Prueba con otro mes, con menos filtros o vuelve a la primera página.
        </EmptyState>
      ) : patients.length === 0 ? (
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
                    Sin asistencias en este mes. Regístrale la próxima cuando
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

                {/*
                  `relative` para quedar por encima del `after:inset-0` que hace
                  clicable toda la tarjeta; sin eso, el enlace de la ficha es
                  inalcanzable.
                */}
                <ButtonLink
                  variant="ghost"
                  href={`/people/${patient.id}`}
                  className="relative mt-auto justify-self-start"
                >
                  Ver ficha
                </ButtonLink>
              </article>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={filters.page} pages={pages}
        hrefFor={(page) => attendanceList.href(filters, { page })}
        label="Páginas de pacientes" />
    </Workspace>
  );
}
