import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { RuleForm } from "@/components/catalog/RuleForm";
import { requireAdmin } from "@/lib/catalog/access";
import { listTemplateOptions } from "@/lib/catalog/rule-queries";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Nueva regla de asignación",
};

export default async function Page() {
  const profile = await requireAdmin();
  const templates = await listTemplateOptions();

  return (
    <Workspace
      title="Nueva regla de asignación"
      name={profile.fullName}
      description="La regla nace inactiva. Pruébala en el simulador con un perfil de ejemplo y actívala cuando haga lo que esperas."
      actions={
        <ButtonLink variant="ghost" href="/rules">
          Volver a las reglas
        </ButtonLink>
      }
    >
      {templates.length === 0 ? (
        <EmptyState
          title="Primero hace falta una plantilla"
          action={
            <ButtonLink variant="default" href="/templates/new">
              Crear una plantilla
            </ButtonLink>
          }
        >
          Una regla decide qué plantilla se asigna, así que no puede crearse sin
          ninguna. Crea la plantilla y vuelve aquí.
        </EmptyState>
      ) : (
        <div className="max-w-2xl">
          <RuleForm templates={templates} />
        </div>
      )}
    </Workspace>
  );
}
