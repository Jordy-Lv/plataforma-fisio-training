import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { specialtyLabels } from "@/lib/auth/people-schemas";
import type { CareTeamMember } from "@/lib/auth/care-team";

/**
 * Quién acompaña al paciente, en su ficha (KAN-6). Hasta ahora la ficha no
 * consultaba `care_assignments` en absoluto: para saber quién llevaba a un
 * paciente había que salir a `/people` y cruzarlo a ojo.
 *
 * Es solo lectura, como `PatientHeader` y `PatientTabs`: **no lleva ningún
 * `<form>` ni ningún `value="<uuid>"`**. Asignar y cerrar siguen viviendo en
 * `/people`, y un `<form>` aquí se colaría delante del de `name="goal"`, que es
 * como `verify-people-onboarding` localiza el perfil
 * (`docs/11-contratos-de-las-suites-http.md`). El enlace a `/people` es un
 * `<a>`, que no cuenta.
 *
 * Lo que se ve depende de la RLS, no de este componente: el administrador ve el
 * mapa completo y el profesional solo su propia asignación, sin el nombre del
 * otro profesional.
 */
export function CareTeamCard({
  team,
  canAssign,
}: {
  team: CareTeamMember[];
  /** El administrador es el único que asigna; ver `docs/04-roles-y-permisos.md`. */
  canAssign: boolean;
}) {
  return (
    <Card padding="lg" className="mb-6 grid gap-4">
      <div className="grid gap-1">
        <CardTitle className="text-xl">Quién le acompaña</CardTitle>
        <CardDescription>
          {canAssign
            ? "El acompañamiento vigente decide qué profesional ve al paciente y a quién le llegan sus alertas."
            : "Solo se muestra tu propio acompañamiento. El mapa completo del equipo lo consulta el administrador."}
        </CardDescription>
      </div>

      {team.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {canAssign
            ? "Todavía no tiene profesional asignado. Asígnale uno desde «Personas» para que empiece a recibir seguimiento."
            : "Todavía no tiene profesional asignado. El administrador se lo asignará."}
        </p>
      ) : (
        <dl className="grid gap-3 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
          {team.map((member) => (
            <div key={member.assignmentId} className="contents">
              <dt className="text-muted-foreground">
                {specialtyLabels[member.kind]}
              </dt>
              <dd>
                {member.professionalName || (
                  <span className="text-muted-foreground">
                    Asignado, fuera de tu alcance
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {canAssign && (
        <ButtonLink variant="ghost" className="justify-self-start" href="/people">
          Asignar o cerrar un acompañamiento
        </ButtonLink>
      )}
    </Card>
  );
}
