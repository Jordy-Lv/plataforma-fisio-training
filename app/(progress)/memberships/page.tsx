import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { MembershipForm } from "@/components/progress/MembershipForm";
import { MembershipNoticeDaysForm } from "@/components/progress/MembershipNoticeDaysForm";
import { MembershipReviewButton } from "@/components/progress/MembershipReviewButton";
import { requireStaff } from "@/lib/progress/access";
import {
  listMembershipsWithPatient,
  listPatients,
  listPatientsWithMembership,
  type MembershipWithPatient,
} from "@/lib/progress/membership-queries";
import {
  formatDueIn,
  membershipStatusLabels,
} from "@/lib/progress/membership-vocabulary";
import { getMembershipNoticeDays } from "@/lib/progress/membership-review-actions";
import { listAllPlans } from "@/lib/progress/plan-queries";
import {
  billingPeriodLabels,
  formatCurrency,
} from "@/lib/progress/plan-vocabulary";
import { formatDate } from "@/lib/progress/vocabulary";
import { membershipList, type MembershipFilters } from "@/lib/progress/membership-list";
import { ListFilters } from "@/components/ui/ListFilters";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge, membershipBadgeVariant } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cn } from "cn";
import { cardVariants } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Membresías",
};

const cardClass = cn(cardVariants(), "grid gap-3");

type Option = { id: string; label: string };

function AdminCard({
  membership,
  patients,
  plans,
}: {
  membership: MembershipWithPatient;
  patients: Option[];
  plans: Option[];
}) {
  return (
    <article className={cardClass}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-6">
          {membership.patient_name ?? "Paciente sin nombre"}
        </h3>
        <Badge variant={membershipBadgeVariant(membership.status)}>
          {membershipStatusLabels[membership.status]}
        </Badge>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Plan</dt>
        <dd>{membership.plan_name ?? "—"}</dd>
        <dt className="text-muted-foreground">Ingreso</dt>
        <dd>{formatDate(membership.started_on)}</dd>
        <dt className="text-muted-foreground">Vencimiento</dt>
        <dd>
          {formatDate(membership.expires_on)}{" "}
          <span className="text-muted-foreground">
            ({formatDueIn(membership.expires_on)})
          </span>
        </dd>
        <dt className="text-muted-foreground">Monto</dt>
        <dd>{formatCurrency(membership.amount)}</dd>
      </dl>
      <details className="text-sm">
        <summary className="cursor-pointer font-medium">Editar</summary>
        <div className="mt-4">
          <MembershipForm
            patients={patients}
            plans={plans}
            membership={membership}
          />
        </div>
      </details>
    </article>
  );
}

async function AdminView({ name, filters }: { name?: string | null; filters: MembershipFilters }) {
  const [matches, patients, oferta, noticeDays] = await Promise.all([
    listMembershipsWithPatient(filters),
    listPatients(),
    // El `<select>` del alta necesita todos los planes, no la primera página
    // de `/plans`.
    listAllPlans(undefined, { paginate: false }),
    getMembershipNoticeDays(),
  ]);
  const plans = oferta.plans;
  // Las tres secciones se conservan siempre —son contrato de `test:memberships`—
  // y agrupan lo que hay en esta página, no todo el histórico.
  const { from, to } = membershipList.range(filters);
  const memberships = matches.slice(from, to + 1);
  const pages = membershipList.pages(matches.length);

  const patientOptions: Option[] = patients.map((patient) => ({
    id: patient.id,
    label: patient.full_name ?? "Paciente sin nombre",
  }));
  const planOptions: Option[] = plans.map((plan) => ({
    id: plan.id,
    label: `${plan.name} · ${billingPeriodLabels[plan.billing_period]}${
      plan.is_active ? "" : " (inactivo)"
    }`,
  }));

  const chips = [
    filters.q ? { key: "q", label: filters.q, removeLabel: "Quitar la búsqueda" } : null,
    filters.status
      ? { key: "status", label: membershipStatusLabels[filters.status], removeLabel: "Quitar el estado" }
      : null,
    filters.plan
      ? {
          key: "plan",
          label: plans.find((plan) => plan.id === filters.plan)?.name ?? "Plan",
          removeLabel: "Quitar el plan",
        }
      : null,
  ].flatMap((chip) =>
    chip
      ? [{ label: chip.label, removeLabel: chip.removeLabel,
           href: membershipList.href(filters, { [chip.key]: undefined, page: 1 }) }]
      : [],
  );
  const choices = [
    { name: "status", label: "Estado", options: membershipStatusLabels },
    { name: "plan", label: "Plan", options: Object.fromEntries(plans.map((plan) => [plan.id, plan.name])) },
  ];

  const expiringSoon = memberships.filter((m) => m.status === "expiring_soon");
  const expired = memberships.filter((m) => m.status === "expired");
  const rest = memberships.filter(
    (m) => m.status !== "expiring_soon" && m.status !== "expired",
  );

  const Group = ({
    title,
    rows,
    empty,
  }: {
    title: string;
    rows: MembershipWithPatient[];
    empty: string;
  }) => (
    <section className="grid gap-4">
      <h2 className="text-xl font-semibold">
        {title}
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          {rows.length}
        </span>
      </h2>
      {rows.length === 0 ? (
        <p className="leading-7 text-muted-foreground">{empty}</p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {rows.map((membership) => (
            <li key={membership.id}>
              <AdminCard
                membership={membership}
                patients={patientOptions}
                plans={planOptions}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <Workspace
      title="Membresías"
      name={name}
      description="El control administrativo de mensualidades: fecha de ingreso, fecha de vencimiento, monto y estado. No procesa pagos."
    >
      <section className={cn(cardVariants(), "mb-10 grid gap-4")}>
        <h2 className="text-base font-semibold">Revisión de vencimientos</h2>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Cada día, un proceso automático marca las membresías próximas a vencer
          y las vencidas, avisa al equipo y envía el correo al paciente. Ahora
          mismo se avisa con {noticeDays} días de antelación. Puedes lanzar la
          revisión a mano para la demostración.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <MembershipReviewButton />
          <MembershipNoticeDaysForm current={noticeDays} />
        </div>
      </section>

      <ListFilters action="/memberships" label="Filtros de membresías" values={filters}
        choices={choices} chips={chips}
        search={{ label: "Buscar paciente", placeholder: "Escribe un nombre…" }} />
      <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
        {matches.length === 1 ? "1 membresía encontrada" : `${matches.length} membresías encontradas`}
      </p>

      {memberships.length === 0 && membershipList.hasActiveFilters(filters) ? (
        <EmptyState title="Ninguna membresía coincide con estos filtros"
          action={<ButtonLink href="/memberships">Ver todas las membresías</ButtonLink>}>
          Prueba con menos filtros o vuelve a la primera página.
        </EmptyState>
      ) : memberships.length === 0 ? (
        <EmptyState title="Todavía no hay membresías registradas">
          Ábrelo con «Registrar una membresía», al final de la pantalla.
          Necesitas un plan y un paciente dado de alta.
        </EmptyState>
      ) : (
        <div className="grid gap-10">
          <Group
            title="Próximas a vencer"
            rows={expiringSoon}
            empty="Ninguna membresía está marcada como próxima a vencer."
          />
          <Group
            title="Vencidas"
            rows={expired}
            empty="Ninguna membresía está vencida."
          />
          {rest.length > 0 && (
            <Group title="Resto" rows={rest} empty="" />
          )}
        </div>
      )}

      <Pagination page={filters.page} pages={pages}
        hrefFor={(page) => membershipList.href(filters, { page })}
        label="Páginas de membresías" />

      <section className="mt-12 grid gap-4">
        {plans.length === 0 ? (
          <>
            <h2 className="text-xl font-semibold">Registrar una membresía</h2>
            <p className="leading-7 text-muted-foreground">
              Antes de registrar una membresía necesitas al menos un plan.{" "}
              <ButtonLink variant="ghost" href="/plans">
                Crea uno aquí
              </ButtonLink>
              .
            </p>
          </>
        ) : (
          /*
            El alta se abre a demanda: quien entra a esta pantalla viene casi
            siempre a revisar vencimientos, no a dar de alta. Ninguna suite
            recorre este formulario por HTTP, y un `<details>` cerrado lo emite
            igual en el HTML del servidor.
          */
          <details className={cardClass}>
            <summary className="flex min-h-11 cursor-pointer items-center text-xl font-semibold text-brand">
              Registrar una membresía
            </summary>
            <MembershipForm patients={patientOptions} plans={planOptions} />
          </details>
        )}
      </section>
    </Workspace>
  );
}

async function ProfessionalView({ name, filters }: { name?: string | null; filters: MembershipFilters }) {
  const patients = await listPatientsWithMembership(filters);
  const choices = [{ name: "status", label: "Estado", options: membershipStatusLabels }];
  const chips = Object.entries(filters)
    .filter(([key, value]) => key !== "page" && key !== "plan" && value)
    .map(([key, value]) => ({
      label: key === "status" ? membershipStatusLabels[value as keyof typeof membershipStatusLabels] : String(value),
      href: membershipList.href(filters, { [key]: undefined, page: 1 }),
      removeLabel: key === "status" ? "Quitar el estado" : "Quitar la búsqueda",
    }));

  return (
    <Workspace
      title="Membresías de mis pacientes"
      name={name}
      description="El estado de la mensualidad de cada paciente que tienes a cargo. El control administrativo —altas, fechas y montos— lo lleva el administrador."
    >
      <ListFilters action="/memberships" label="Filtros de membresías" values={filters}
        choices={choices} chips={chips}
        search={{ label: "Buscar paciente", placeholder: "Escribe un nombre…" }} />

      {patients.length === 0 && membershipList.hasActiveFilters(filters) ? (
        <EmptyState title="Ningún paciente coincide con estos filtros"
          action={<ButtonLink href="/memberships">Ver todos tus pacientes</ButtonLink>}>
          Prueba con menos filtros.
        </EmptyState>
      ) : patients.length === 0 ? (
        <EmptyState title="Aún no tienes pacientes que seguir">
          Aquí verás a los pacientes que tengas asignados. Pídele al
          administrador que te asigne alguno.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {patients.map((patient) => (
            <li key={patient.id} className={cardClass}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold leading-6">
                  {patient.full_name ?? "Paciente sin nombre"}
                </h2>
                <Badge
                  variant={
                    patient.status
                      ? membershipBadgeVariant(patient.status)
                      : "neutral"
                  }
                >
                  {patient.status
                    ? membershipStatusLabels[patient.status]
                    : "Sin membresía"}
                </Badge>
              </div>
              {patient.status ? (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Plan</dt>
                  <dd>{patient.plan_name ?? "—"}</dd>
                  <dt className="text-muted-foreground">Vencimiento</dt>
                  <dd>
                    {patient.expires_on ? (
                      <>
                        {formatDate(patient.expires_on)}{" "}
                        <span className="text-muted-foreground">
                          ({formatDueIn(patient.expires_on)})
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </dd>
                </dl>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  Este paciente todavía no tiene una membresía registrada.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Workspace>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireStaff();
  const filters = membershipList.parse(await searchParams);
  return profile.role === "admin" ? (
    <AdminView name={profile.fullName} filters={filters} />
  ) : (
    <ProfessionalView name={profile.fullName} filters={filters} />
  );
}
