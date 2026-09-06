import Link from "next/link";
import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { TemplateForm } from "@/components/catalog/TemplateForm";
import { requireAdmin } from "@/lib/catalog/access";

export const metadata: Metadata = {
  title: "Nueva plantilla de rutina",
};

const backLinkClass =
  "inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring";

export default async function Page() {
  const profile = await requireAdmin();

  return (
    <Workspace title="Nueva plantilla de rutina" name={profile.fullName}>
      <p className="-mt-4 max-w-2xl leading-7 text-muted-foreground">
        Primero el perfil al que se dirige la plantilla; los días y sus
        ejercicios se añaden a continuación. Hasta entonces queda como
        borrador.
      </p>
      <Link href="/templates" className={`mb-8 mt-4 ${backLinkClass}`}>
        Volver a las plantillas
      </Link>

      <div className="max-w-2xl">
        <TemplateForm />
      </div>
    </Workspace>
  );
}
