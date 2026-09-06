import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { TemplateForm } from "@/components/catalog/TemplateForm";
import { requireAdmin } from "@/lib/catalog/access";
import { ButtonLink } from "@/components/ui/ButtonLink";

export const metadata: Metadata = {
  title: "Nueva plantilla de rutina",
};

export default async function Page() {
  const profile = await requireAdmin();

  return (
    <Workspace title="Nueva plantilla de rutina" name={profile.fullName}>
      <p className="-mt-4 max-w-2xl leading-7 text-muted-foreground">
        Primero el perfil al que se dirige la plantilla; los días y sus
        ejercicios se añaden a continuación. Hasta entonces queda como
        borrador.
      </p>
      <ButtonLink href="/templates" className="mb-8 mt-4">
        Volver a las plantillas
      </ButtonLink>

      <div className="max-w-2xl">
        <TemplateForm />
      </div>
    </Workspace>
  );
}
