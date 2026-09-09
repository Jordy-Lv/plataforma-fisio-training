import { ClientLogo } from "@/components/brand/ClientLogo";
import { CLIENT_TAGLINE } from "@/lib/brand/client";
import { cn } from "cn";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { cardVariants } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const areas = [
  {
    title: "Tu rutina de hoy",
    description:
      "Consulta cada ejercicio, registra lo que hiciste y retoma sin perder avances.",
  },
  {
    title: "Dolor que sí se atiende",
    description:
      "Reporta dónde duele y cuánto. El profesional recibe el contexto para actuar.",
  },
  {
    title: "Progreso visible",
    description:
      "Reúne asistencia, tamizajes y evolución para entender qué está funcionando.",
  },
];

/*
  Portada pública. Es la única pantalla sin sesión además de las de acceso, así
  que trae su propio conmutador de tema: el resto de la aplicación lo recibe del
  shell.

  El panel de la derecha es una `<section>` con `cardVariants` en vez de un
  `<Card>`: la tarjeta es un `<div>` y aquí hace falta la etiqueta semántica con
  su `aria-label`.
*/
export default function Home() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl justify-end px-5 pt-6 sm:px-12">
        <ThemeToggle />
      </div>
      <section className="mx-auto grid w-full max-w-7xl items-center gap-14 px-5 py-12 sm:px-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="max-w-2xl">
          <ClientLogo priority className="mb-8 w-full max-w-sm" />

          <h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-7xl">
            {CLIENT_TAGLINE}.
          </h1>

          <p className="mt-8 max-w-xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
            Tu rutina, tus reportes de dolor y tu progreso viven en el mismo
            lugar, para que cada sesión tenga contexto.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <ButtonLink
              href="/login"
              variant="default"
              size="lg"
              className="rounded-full px-6"
            >
              Iniciar sesión
            </ButtonLink>
            <span className="text-sm leading-6 text-muted-foreground">
              Entrenamiento y fisioterapia
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:mx-0 lg:justify-self-end">
          <div
            aria-hidden="true"
            className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-brand-soft"
          />

          <section
            aria-label="Lo que podrás hacer en la plataforma"
            className={cn(
              cardVariants({ padding: "none" }),
              "overflow-hidden rounded-[2rem] shadow-panel",
            )}
          >
            <header className="border-b border-border px-6 py-6 sm:px-8">
              <p className="text-sm font-medium text-muted-foreground">
                Tu semana
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.035em]">
                Todo lo importante, a la vista
              </p>
            </header>

            <div className="divide-y divide-border">
              {areas.map((area, index) => (
                <article
                  className="grid grid-cols-[3rem_1fr] gap-4 px-6 py-6 sm:px-8"
                  key={area.title}
                >
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-sm font-bold text-brand-soft-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <h2 className="text-base font-semibold">{area.title}</h2>
                    <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                      {area.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
