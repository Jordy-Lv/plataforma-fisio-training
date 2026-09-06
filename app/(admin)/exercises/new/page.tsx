import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { ExerciseForm } from "@/components/catalog/ExerciseForm";
import { requireStaff } from "@/lib/catalog/access";
import { ButtonLink } from "@/components/ui/ButtonLink";

export const metadata: Metadata = {
  title: "Nuevo ejercicio propio",
};

export default async function Page() {
  const profile = await requireStaff();

  return (
    <Workspace title="Nuevo ejercicio propio" name={profile.fullName}>
      <p className="-mt-4 max-w-2xl leading-7 text-muted-foreground">
        Un ejercicio propio del negocio queda marcado como tal y se usa en las
        plantillas igual que cualquiera de los importados.
      </p>
      <ButtonLink href="/exercises" className="mb-8 mt-4">
        Volver al catálogo
      </ButtonLink>

      <div className="max-w-2xl">
        <ExerciseForm />
      </div>
    </Workspace>
  );
}
