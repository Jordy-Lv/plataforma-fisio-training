import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { RuleForm } from "@/components/catalog/RuleForm";
import { requireAdmin } from "@/lib/catalog/access";
import { listTemplateOptions } from "@/lib/catalog/rule-queries";
import { ButtonLink } from "@/components/ui/ButtonLink";

export const metadata: Metadata = {
  title: "Nueva regla de asignación",
};

export default async function Page() {
  const profile = await requireAdmin();
  const templates = await listTemplateOptions();

  return (
    <Workspace title="Nueva regla de asignación" name={profile.fullName}>
      <p className="-mt-4 max-w-2xl leading-7 text-muted-foreground">
        La regla nace inactiva. Pruébala en el simulador con un perfil de
        ejemplo y actívala cuando haga lo que esperas.
      </p>
      <ButtonLink href="/rules" className="mb-8 mt-4">
        Volver a las reglas
      </ButtonLink>

      {templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8">
          <p className="font-semibold">Primero hace falta una plantilla</p>
          <p className="mt-2 max-w-xl leading-7 text-muted-foreground">
            Una regla decide qué plantilla se asigna, así que no puede crearse
            sin ninguna. Crea la plantilla y vuelve aquí.
          </p>
          <ButtonLink href="/templates/new" className="mt-5">
            Crear una plantilla
          </ButtonLink>
        </div>
      ) : (
        <div className="max-w-2xl">
          <RuleForm templates={templates} />
        </div>
      )}
    </Workspace>
  );
}
