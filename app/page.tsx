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

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl items-center gap-14 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:px-12">
        <div className="max-w-2xl">
          <p className="mb-8 inline-flex min-h-11 items-center rounded-full border border-border bg-surface px-4 text-sm font-semibold text-muted-foreground">
            Entrenamiento y fisioterapia, conectados
          </p>

          <h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-7xl">
            Una ruta clara para moverte mejor.
          </h1>

          <p className="mt-8 max-w-xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
            Tu rutina, tus reportes de dolor y tu progreso viven en el mismo
            lugar, para que cada sesión tenga contexto.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <span className="inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground">
              Demo en construcción
            </span>
            <span className="text-sm leading-6 text-muted-foreground">
              Primera etapa · Aplicación web instalable
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
            className="overflow-hidden rounded-[2rem] border border-border bg-surface shadow-panel"
          >
            <header className="border-b border-border px-6 py-6 sm:px-8">
              <p className="text-sm font-medium text-muted-foreground">Tu semana</p>
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
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-sm font-bold text-brand">
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
