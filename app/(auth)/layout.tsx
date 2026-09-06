import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-svh max-w-6xl flex-col px-6 py-6 sm:px-10">
      <Link
        href="/"
        className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-brand"
      >
        Entrenamiento y fisioterapia
      </Link>
      <div className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-2 lg:gap-24">
        <section className="hidden lg:block">
          <p className="max-w-md text-6xl font-semibold leading-tight tracking-tight">
            Cada sesión cuenta.
          </p>
          <p className="mt-7 max-w-sm text-lg leading-8 text-muted-foreground">
            Tu rutina, tu recuperación y las personas que te acompañan, en un
            mismo lugar.
          </p>
        </section>
        <section className="mx-auto w-full max-w-md">{children}</section>
      </div>
    </main>
  );
}
