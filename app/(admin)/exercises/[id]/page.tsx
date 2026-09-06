import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { ContraindicationsForm } from "@/components/catalog/ContraindicationsForm";
import { ExerciseForm } from "@/components/catalog/ExerciseForm";
import { bodyPartLabels } from "@/lib/catalog/body-parts";
import { requireStaff } from "@/lib/catalog/access";
import { getExercise } from "@/lib/catalog/queries";
import {
  difficultyLabels,
  environmentLabels,
  equipmentLabels,
  labelFor,
  muscleGroupLabels,
} from "@/lib/catalog/vocabulary";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "cn";
import { cardVariants } from "@/components/ui/Card";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sectionClass = cn(cardVariants({ padding: "lg" }), "mt-10");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!uuid.test(id)) return { title: "Ejercicio" };
  const exercise = await getExercise(id);
  return { title: exercise?.name ?? "Ejercicio" };
}

function Etiquetas({
  titulo,
  valores,
  labels,
  vacio,
}: {
  titulo: string;
  valores: string[];
  labels: Record<string, string>;
  vacio: string;
}) {
  return (
    <div>
      <dt className="text-sm font-semibold text-muted-foreground">{titulo}</dt>
      <dd className="mt-2 flex flex-wrap gap-1.5">
        {valores.length === 0 ? (
          <span className="text-sm text-muted-foreground">{vacio}</span>
        ) : (
          valores.map((valor) => (
            <Badge key={valor}>{labelFor(labels, valor)}</Badge>
          ))
        )}
      </dd>
    </div>
  );
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireStaff();
  const { id } = await params;
  if (!uuid.test(id)) notFound();

  const exercise = await getExercise(id);
  if (!exercise) notFound();

  const recienCreado = (await searchParams).nuevo === "1";
  const puedeEditar = profile.role === "admin";

  return (
    <Workspace
      title={exercise.name}
      name={profile.fullName}
      actions={
        <ButtonLink variant="ghost" href="/exercises">
          Volver al catálogo
        </ButtonLink>
      }
    >
      {recienCreado && (
        <p
          role="status"
          className="mb-6 rounded-lg bg-brand-soft p-3 text-sm text-brand-soft-foreground"
        >
          Ejercicio creado. Ya se puede usar en las plantillas de rutina.
        </p>
      )}

      <article className="grid gap-6 md:grid-cols-[minmax(0,20rem)_1fr]">
        <div
          className={cn(
            cardVariants({ padding: "none" }),
            "aspect-[4/3] overflow-hidden bg-muted",
          )}
        >
          {exercise.media_url ? (
            // Sin `next/image`: el origen es el bucket de Supabase, cuyo
            // dominio cambia entre local y producción.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={exercise.media_url}
              alt={`Ejecución de ${exercise.name}`}
              className="size-full object-cover"
            />
          ) : (
            <p className="flex size-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
              Sin imagen todavía
            </p>
          )}
        </div>

        <div className="grid gap-5">
          <Badge variant={exercise.is_custom ? "brand" : "neutral"}>
            {exercise.is_custom
              ? "Ejercicio propio del negocio"
              : "Ejercicio importado de la biblioteca"}
          </Badge>

          <dl className="grid gap-5">
            <Etiquetas
              titulo="Grupos musculares"
              valores={exercise.muscle_groups}
              labels={muscleGroupLabels}
              vacio="Sin registrar"
            />
            <Etiquetas
              titulo="Equipamiento"
              valores={exercise.equipment}
              labels={equipmentLabels}
              vacio="Sin registrar"
            />
            <Etiquetas
              titulo="Entorno"
              valores={exercise.environments}
              labels={environmentLabels}
              vacio="Sin registrar"
            />
            <div>
              <dt className="text-sm font-semibold text-muted-foreground">
                Nivel
              </dt>
              <dd className="mt-1 text-sm">
                {exercise.difficulty
                  ? labelFor(difficultyLabels, exercise.difficulty)
                  : "Sin registrar"}
              </dd>
            </div>
            <Etiquetas
              titulo="Contraindicado para"
              valores={exercise.contraindications}
              labels={bodyPartLabels}
              vacio="Sin contraindicaciones registradas todavía"
            />
          </dl>
        </div>
      </article>

      <section className={sectionClass}>
        <h2 className="text-xl font-semibold">Cómo se ejecuta</h2>
        <p className="mt-3 whitespace-pre-line leading-7 text-muted-foreground">
          {exercise.description ?? "Este ejercicio aún no tiene indicaciones."}
        </p>
      </section>

      {puedeEditar ? (
        <>
          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">Etiquetado clínico</h2>
            <p className="mb-6 mt-2 max-w-2xl leading-7 text-muted-foreground">
              Las zonas que marques aquí excluyen este ejercicio de las rutinas
              de quien tenga una condición activa en esa zona. Sin este
              etiquetado, el filtro no protege a nadie.
            </p>
            <div className="max-w-2xl">
              <ContraindicationsForm
                exerciseId={exercise.id}
                contraindications={exercise.contraindications}
              />
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">Editar la ficha</h2>
            <p className="mb-6 mt-2 max-w-2xl leading-7 text-muted-foreground">
              Cambia el nombre, las indicaciones, el etiquetado de asignación o
              la imagen. El etiquetado clínico se guarda arriba, por separado.
            </p>
            <div className="max-w-2xl">
              <ExerciseForm exercise={exercise} />
            </div>
          </section>
        </>
      ) : (
        <EmptyState className="mt-10" title="Esta ficha es de solo lectura">
          Puedes crear ejercicios propios, pero editar el catálogo —incluido el
          etiquetado clínico— es cosa del administrador. Pídeselo si algo de
          esta ficha está mal.
        </EmptyState>
      )}
    </Workspace>
  );
}
