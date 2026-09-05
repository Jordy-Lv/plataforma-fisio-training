import Link from "next/link";
import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { ExerciseForm } from "@/components/catalog/ExerciseForm";
import { requireStaff } from "@/lib/catalog/access";

export const metadata: Metadata = {
  title: "Nuevo ejercicio propio",
};

const backLinkClass =
  "inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring";

export default async function Page() {
  const profile = await requireStaff();

  return (
    <Workspace title="Nuevo ejercicio propio" name={profile.fullName}>
      <p className="-mt-4 max-w-2xl leading-7 text-muted-foreground">
        Un ejercicio propio del negocio queda marcado como tal y se usa en las
        plantillas igual que cualquiera de los importados.
      </p>
      <Link href="/exercises" className={`mb-8 mt-4 ${backLinkClass}`}>
        Volver al catálogo
      </Link>

      <div className="max-w-2xl">
        <ExerciseForm />
      </div>
    </Workspace>
  );
}
