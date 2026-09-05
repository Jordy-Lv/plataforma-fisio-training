import Link from "next/link";
import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { MembershipForm } from "@/components/progress/MembershipForm";
import { MembershipNoticeDaysForm } from "@/components/progress/MembershipNoticeDaysForm";
import { MembershipReviewButton } from "@/components/progress/MembershipReviewButton";
import { rolePaths } from "@/lib/auth/session";
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

export const metadata: Metadata = {
  title: "Membresías",
};

const linkClass =
  "inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring";

const tagClass =
  "inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground";

const cardClass = "grid gap-3 rounded-2xl border border-border bg-surface p-5";

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
        <span className={tagClass}>
          {membershipStatusLabels[membership.status]}
        </span>
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

async function AdminView({ name }: { name?: string | null }) {
  const [memberships, patients, plans, noticeDays] = await Promise.all([
    listMembershipsWithPatient(),
    listPatients(),
    listAllPlans(),
    getMembershipNoticeDays(),
  ]);

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
    <Workspace title="Membresías" name={name}>
      <p className="-mt-4 max-w-2xl leading-7 text-muted-foreground">
        El control administrativo de mensualidades: fecha de ingreso, fecha de
        vencimiento, monto y estado. No procesa pagos.
      </p>

      <div className="mb-8 mt-4 flex flex-wrap gap-3">
        <Link href="/admin" className={linkClass}>
          Volver a mi panel
        </Link>
        <Link href="/plans" className={linkClass}>
          Planes y servicios
        </Link>
      </div>

      <section className="mb-10 grid gap-4 rounded-2xl border border-border bg-surface p-5">
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

      {memberships.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="font-semibold">Todavía no hay membresías registradas</p>
          <p className="mx-auto mt-2 max-w-md leading-7 text-muted-foreground">
            Registra la primera con el formulario de abajo. Necesitas un plan y
            un paciente dado de alta.
          </p>
        </div>
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

      <section className="mt-12 grid gap-4">
        <h2 className="text-xl font-semibold">Registrar una membresía</h2>
        {plans.length === 0 ? (
          <p className="leading-7 text-muted-foreground">
            Antes de registrar una membresía necesitas al menos un plan.{" "}
            <Link href="/plans" className="font-medium underline">
              Crea uno aquí
            </Link>
            .
          </p>
        ) : (
          <article className={cardClass}>
            <MembershipForm patients={patientOptions} plans={planOptions} />
          </article>
        )}
      </section>
    </Workspace>
  );
}

async function ProfessionalView({ name }: { name?: string | null }) {
  const patients = await listPatientsWithMembership();

  return (
    <Workspace title="Membresías de mis pacientes" name={name}>
      <p className="-mt-4 max-w-2xl leading-7 text-muted-foreground">
        El estado de la mensualidad de cada paciente que tienes a cargo. El
        control administrativo —altas, fechas y montos— lo lleva el
        administrador.
      </p>

      <div className="mb-6 mt-4 flex flex-wrap gap-3">
        <Link href={rolePaths.professional} className={linkClass}>
          Volver a mi panel
        </Link>
      </div>

      {patients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="font-semibold">Aún no tienes pacientes que seguir</p>
          <p className="mx-auto mt-2 max-w-md leading-7 text-muted-foreground">
            Aquí verás a los pacientes que tengas asignados. Pídele al
            administrador que te asigne alguno.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {patients.map((patient) => (
            <li key={patient.id} className={cardClass}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold leading-6">
                  {patient.full_name ?? "Paciente sin nombre"}
                </h2>
                <span className={tagClass}>
                  {patient.status
                    ? membershipStatusLabels[patient.status]
                    : "Sin membresía"}
                </span>
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

export default async function Page() {
  const profile = await requireStaff();
  return profile.role === "admin" ? (
    <AdminView name={profile.fullName} />
  ) : (
    <ProfessionalView name={profile.fullName} />
  );
}
