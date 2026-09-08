import { redirect } from "next/navigation";
import { getActiveProfile } from "@/lib/auth/session";
import { listPeople } from "@/lib/auth/people-queries";
import { Workspace } from "@/components/auth/Workspace";
import { SessionHistory } from "@/components/routines/SessionHistory";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cardVariants } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Field";
import { FilterForm } from "@/components/ui/FilterForm";
import { Pagination } from "@/components/ui/Pagination";
import { sessionList } from "@/lib/routines/session-list";
import { patientSessions } from "@/lib/routines/session-queries";

const statusLabels = {
  in_progress: "En curso",
  completed: "Completadas",
  abandoned: "Abandonadas",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await getActiveProfile();
  if (!actor) redirect("/login");
  if (actor.role === "patient") redirect("/routine");

  const patients = await listPeople("patients");
  const filters = sessionList.parse(await searchParams);
  const patient = patients.find((person) => person.id === filters.patient);
  const { sessions, total, pages } = patient
    ? await patientSessions(patient.id, filters)
    : { sessions: [], total: 0, pages: 1 };

  const chips = [
    filters.status ? { key: "status", label: statusLabels[filters.status], removeLabel: "Quitar el estado" } : null,
    filters.from ? { key: "from", label: `Desde ${filters.from}`, removeLabel: "Quitar la fecha inicial" } : null,
    filters.to ? { key: "to", label: `Hasta ${filters.to}`, removeLabel: "Quitar la fecha final" } : null,
  ].flatMap((chip) => (chip ? [chip] : []));

  return (
    <Workspace
      title="Sesiones de pacientes"
      name={actor.fullName}
      description="Elige a un paciente para ver las sesiones que ha registrado al entrenar."
    >
      {patients.length === 0 ? (
        <EmptyState title="Aún no tienes pacientes asignados">
          El administrador puede vincular pacientes a tu atención. Sus sesiones
          aparecerán aquí en cuanto empiecen a entrenar.
        </EmptyState>
      ) : (
        <>
          {/*
            Formulario `GET` sin JavaScript: el paciente elegido y los filtros
            van en la URL, así que la consulta se puede compartir y el botón de
            retroceso funciona.
          */}
          <FilterForm action="/pro/sessions" label="Filtros de sesiones"
            className={cardVariants({ padding: "sm" })}>
            <Field label="Paciente">
              <Select name="patient" defaultValue={patient?.id ?? ""}>
                <option value="">Selecciona un paciente</option>
                {patients.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.full_name ?? "Paciente"}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Estado">
                <Select name="status" defaultValue={filters.status ?? ""}>
                  <option value="">Todos</option>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Desde">
                <Input type="date" name="from" defaultValue={filters.from ?? ""} />
              </Field>
              <Field label="Hasta">
                <Input type="date" name="to" defaultValue={filters.to ?? ""} />
              </Field>
            </div>
          </FilterForm>

          {chips.length > 0 && (
            <div className="mb-6 mt-3 flex flex-wrap items-center gap-2" aria-label="Filtros activos">
              {chips.map((chip) => (
                <Chip key={chip.key} removeLabel={chip.removeLabel}
                  href={sessionList.href(filters, { [chip.key]: undefined, page: 1 })}>
                  {chip.label}
                </Chip>
              ))}
              <ButtonLink variant="ghost" href={sessionList.href(sessionList.empty, { patient: filters.patient })}>
                Quitar filtros
              </ButtonLink>
            </div>
          )}

          {patient ? (
            <>
              <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
                {total === 1 ? "1 sesión encontrada" : `${total} sesiones encontradas`}
              </p>
              {sessions.length === 0 && (sessionList.hasActiveFilters(filters) || filters.page > 1) ? (
                <EmptyState title="No hay sesiones en esta página"
                  action={<ButtonLink href={sessionList.href(sessionList.empty, { patient: patient.id })}>
                    Ver todas sus sesiones
                  </ButtonLink>}>
                  Prueba con otro rango de fechas o vuelve a la primera página.
                </EmptyState>
              ) : (
                <SessionHistory sessions={sessions} staff />
              )}
              <Pagination page={filters.page} pages={pages}
                hrefFor={(page) => sessionList.href(filters, { page })}
                label="Páginas de sesiones" />
            </>
          ) : (
            <EmptyState className="mt-8" title="Ningún paciente seleccionado">
              Elige a alguien de la lista para ver su historial de sesiones.
            </EmptyState>
          )}
        </>
      )}
    </Workspace>
  );
}
