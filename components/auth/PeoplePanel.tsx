import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { Workspace } from "@/components/auth/Workspace";
import {
  CreatePersonForm,
  AssignmentForm,
  CloseAssignmentForm,
  DeactivateForm,
} from "@/components/auth/PeopleForms";
import { PeopleFilter } from "@/components/auth/PeopleFilter";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cardVariants } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { SheetModal } from "@/components/ui/SheetModal";
import { careTeamSummary, toCareTeam } from "@/lib/auth/care-team";
import { listPeopleDirectory } from "@/lib/auth/people-queries";
import { specialtyLabels } from "@/lib/auth/people-schemas";

/**
 * El directorio de personas y el alta, resumidos en tarjetas: cada una abre un
 * modal con su lista y su buscador. Vive en `/people`; el panel de inicio
 * (`/admin`, `/pro`) es solo el panorama del negocio.
 *
 * Los modales no usan portal (`SheetModal`), así que las listas y los
 * formularios de baja siguen en el HTML del servidor: `verify-people-onboarding`
 * los encuentra igual. El orden de las tarjetas —registrar, pacientes, equipo,
 * asignar— deja los formularios de baja antes que el de asignación, para que la
 * suite no confunda un `<option value="<uuid>">` con el marcador de la baja.
 */
export async function PeoplePanel({
  role,
}: {
  role: "admin" | "professional";
}) {
  const profile = await requireRole(role);
  const supabase = await createClient();
  const [directory, assignmentsResult] = await Promise.all([
    // La consulta del directorio vivía aquí duplicada; ahora es la misma que
    // usan `/pro/sessions` y `/pro/alerts` (KAN-14).
    listPeopleDirectory(role === "admin" ? "everyone" : "patients"),
    supabase
      .from("care_assignments")
      .select("id, patient_id, professional_id, kind")
      .is("ended_at", null),
  ]);
  if (assignmentsResult.error)
    throw new Error(
      "No se pudo cargar la lista de personas. Inténtalo de nuevo.",
    );
  const people = directory.people;
  const assignments = assignmentsResult.data;
  /**
   * Cuánta gente quedó fuera del techo de PostgREST. Antes el listado se
   * truncaba en silencio y quien no cupiera desaparecía sin rastro, también
   * del buscador; ahora la pantalla lo dice.
   */
  const fuera = directory.total - people.length;
  /**
   * El aviso del techo. Dice la verdad y nada más: a quien no se cargó **no se
   * llega desde aquí**, tampoco buscándolo, porque el buscador de esta pantalla
   * filtra en el cliente sobre lo ya pintado. Llevarlo al servidor exige
   * filtros en la URL, y eso es la deuda 3.3 de `docs/15`, congelada mientras
   * `/people` sean cuatro `SheetModal`. Prometer una búsqueda que no existe
   * sería peor que el silencio de antes.
   */
  const avisoDeTecho =
    fuera > 0 ? (
      <Notice tone="warning">
        Se han cargado {people.length} personas por orden alfabético y quedan{" "}
        {fuera} sin mostrar. A esas no se llega todavía desde esta lista:
        ábrelas por su ficha si tienes el enlace.
      </Notice>
    ) : null;
  const patients = people.filter((person) => person.role === "patient");
  const team = people.filter((person) => person.role === "professional");
  const isAdmin = role === "admin";
  /**
   * Los nombres por id, que es lo que la lista no trae: `care_assignments`
   * guarda uuids. Solo están los perfiles que el actor puede leer, y eso lo
   * decide la RLS: al profesional le oculta tanto la asignación del otro
   * profesional como su perfil, así que el mapa completo es del administrador.
   */
  const nombres = new Map(people.map((person) => [person.id, person.full_name]));
  /** El nombre de una persona por su id, para los acompañamientos vigentes. */
  const nombre = (id: string) => nombres.get(id) || "Sin nombre";
  /**
   * Quién acompaña a un paciente (KAN-6), resuelto sobre las filas ya cargadas:
   * pedir el equipo tarjeta a tarjeta sería una consulta por paciente.
   */
  const equipoDe = (patientId: string) =>
    toCareTeam(
      assignments.filter((a) => a.patient_id === patientId),
      nombres,
    );

  return (
    <Workspace
      title={isAdmin ? "Personas y equipo" : "Mis pacientes"}
      name={profile.fullName}
      role={isAdmin ? "admin" : "professional"}
      description={
        isAdmin
          ? "Cada tarjeta abre su lista con buscador. Las bajas conservan el historial."
          : "Busca a quien acompañas y abre su ficha. El alta de un paciente está en la primera tarjeta."
      }
    >
      {patients.length === 0 && team.length === 0 ? (
        <EmptyState
          className="mt-8"
          title={
            isAdmin
              ? "Todavía no hay personas registradas"
              : "Aún no tienes pacientes asignados"
          }
        >
          Registra al primero con la tarjeta «
          {isAdmin ? "Registrar persona" : "Registrar paciente"}».
        </EmptyState>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <SheetModal
          title={isAdmin ? "Registrar persona" : "Registrar paciente"}
          description={
            isAdmin
              ? "Crea un paciente o un profesional y comparte sus credenciales."
              : "Crea un paciente y comparte sus credenciales de acceso."
          }
          action="Abrir el formulario"
        >
          <CreatePersonForm isAdmin={isAdmin} />
        </SheetModal>

        <SheetModal
          title="Pacientes"
          count={patients.length}
          description="Búscalos por nombre y abre su ficha e historial."
          action="Buscar un paciente"
        >
          <PeopleFilter searchPlaceholder="Buscar un paciente por su nombre">
            {avisoDeTecho}
            {patients.length === 0 ? (
              <EmptyState title="Aún no hay pacientes registrados">
                Regístralos desde la tarjeta «
                {isAdmin ? "Registrar persona" : "Registrar paciente"}».
              </EmptyState>
            ) : (
              <ul className="grid gap-3">
                {patients.map((person) => (
                  <li
                    key={person.id}
                    data-name={(person.full_name ?? "").toLowerCase()}
                    className={cardVariants({ padding: "sm" })}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold">
                          {person.full_name || "Sin nombre"}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {careTeamSummary(equipoDe(person.id))}
                          {person.phone ? ` · ${person.phone}` : ""}
                        </p>
                      </div>
                      <Badge
                        variant={person.is_active ? "success" : "neutral"}
                      >
                        {person.is_active ? "Activo" : "De baja"}
                      </Badge>
                    </div>
                    <ButtonLink
                      variant="ghost"
                      className="mt-2"
                      href={`/people/${person.id}`}
                    >
                      Ver ficha e historial de condiciones
                    </ButtonLink>
                    {isAdmin && person.is_active && (
                      <DeactivateForm
                        personId={person.id}
                        name={person.full_name || "esta persona"}
                        assignments={
                          assignments.filter(
                            (a) => a.professional_id === person.id,
                          ).length
                        }
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </PeopleFilter>
        </SheetModal>

        {isAdmin && (
          <SheetModal
            title="Equipo"
            count={team.length}
            description="Entrenadores y fisioterapeutas. Filtra por especialidad."
            action="Ver el equipo"
          >
            <PeopleFilter
              searchPlaceholder="Buscar por nombre"
              specialties={[
                { value: "training", label: "Entrenadores" },
                { value: "physio", label: "Fisioterapeutas" },
              ]}
            >
              {avisoDeTecho}
              {team.length === 0 ? (
                <EmptyState title="Aún no hay profesionales">
                  Regístralos desde la tarjeta «Registrar persona».
                </EmptyState>
              ) : (
                <ul className="grid gap-3">
                  {team.map((person) => (
                    <li
                      key={person.id}
                      data-name={(person.full_name ?? "").toLowerCase()}
                      data-specialty={person.specialty ?? ""}
                      className={cardVariants({ padding: "sm" })}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold">
                            {person.full_name || "Sin nombre"}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {person.specialty
                              ? specialtyLabels[person.specialty]
                              : "Profesional"}
                            {person.phone ? ` · ${person.phone}` : ""}
                          </p>
                        </div>
                        <Badge
                          variant={person.is_active ? "success" : "neutral"}
                        >
                          {person.is_active ? "Activo" : "De baja"}
                        </Badge>
                      </div>
                      {person.is_active && (
                        <DeactivateForm
                          personId={person.id}
                          name={person.full_name || "esta persona"}
                          assignments={
                            assignments.filter(
                              (a) => a.professional_id === person.id,
                            ).length
                          }
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </PeopleFilter>
          </SheetModal>
        )}

        {isAdmin && (
          <SheetModal
            title="Asignar acompañamiento"
            description="Vincula un paciente con su entrenador o su fisioterapeuta."
            action="Abrir la asignación"
          >
            <AssignmentForm
              patients={patients.filter((person) => person.is_active)}
              professionals={team.filter((person) => person.is_active)}
            />

            {/*
              Los acompañamientos vigentes van **después** del formulario de
              asignar: sus `value="<uuid>"` no pueden adelantarse a los de las
              bajas, que es el marcador con el que las suites localizan aquel
              formulario (`docs/11-contratos-de-las-suites-http.md`).
            */}
            <section className="mt-8 grid gap-3">
              <div>
                <h2 className="text-xl font-semibold">
                  Acompañamientos vigentes
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Para cambiar al profesional de un paciente, cierra primero el
                  acompañamiento que tiene. La fila no se borra: queda el
                  historial.
                </p>
              </div>
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todavía no hay ningún acompañamiento asignado.
                </p>
              ) : (
                <ul className="grid gap-2">
                  {assignments.map((assignment) => (
                    <li key={assignment.id}>
                      <CloseAssignmentForm
                        assignmentId={assignment.id}
                        patientName={nombre(assignment.patient_id)}
                        professionalName={nombre(assignment.professional_id)}
                        kindLabel={specialtyLabels[assignment.kind]}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </SheetModal>
        )}
      </div>
    </Workspace>
  );
}
