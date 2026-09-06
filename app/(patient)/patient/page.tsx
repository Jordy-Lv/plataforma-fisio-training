import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { Workspace } from "@/components/auth/Workspace";
export default async function Page() {
  const profile = await requireRole("patient");
  return (
    <Workspace title="Mi espacio" name={profile.fullName}>
      <section className="max-w-xl">
        <h2 className="text-xl font-semibold">Tu perfil está listo</h2>
        <p className="mt-3 leading-7 text-muted-foreground">
          Consulta tu rutina, tu asistencia y tu membresía desde aquí.
        </p>
        <nav aria-label="Mi seguimiento" className="mt-6 grid gap-3">
          {[
            ["/routine", "Mi rutina"],
            ["/attendance/me", "Mi asistencia"],
            ["/memberships/me", "Mi membresía"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="inline-flex min-h-12 items-center rounded-lg border border-border bg-surface px-5 font-medium text-brand"
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link
          href="/patient/profile"
          className="mt-6 inline-flex min-h-12 items-center rounded-lg bg-brand px-5 font-medium text-brand-foreground"
        >
          Ver y editar mi perfil
        </Link>
      </section>
    </Workspace>
  );
}
