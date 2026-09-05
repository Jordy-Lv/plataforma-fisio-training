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
          Aún no tienes una rutina disponible. Tu profesional te indicará cómo
          comenzar cuando esté asignada.
        </p>
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
