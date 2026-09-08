import { CLIENT_NAME, CLIENT_TAGLINE } from "@/lib/brand/client";
import { ClientLogo } from "@/components/brand/ClientLogo";
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/*
  Las pantallas de acceso son las únicas sin sesión, así que no tienen el shell
  de la fase 2 —ni su barra de navegación ni su conmutador de tema—. El
  conmutador se repite aquí porque quien abre la app de noche todavía no ha
  entrado: sin él, la primera pantalla sería la única que no puede cambiar de
  modo.
*/
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-svh max-w-6xl flex-col px-5 py-6 sm:px-10">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex min-h-11 w-fit items-center rounded-lg text-sm font-semibold text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {CLIENT_NAME}
        </Link>
        <ThemeToggle />
      </div>
      <div className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-2 lg:gap-24">
        <section className="hidden lg:block">
          <p className="max-w-md text-balance text-6xl font-semibold leading-tight tracking-tight">
            {CLIENT_TAGLINE}.
          </p>
          <p className="mt-7 max-w-sm text-lg leading-8 text-muted-foreground">
            Tu rutina, tu recuperación y las personas que te acompañan, en un
            mismo lugar.
          </p>
        </section>
        <Card
          padding="lg"
          className="mx-auto w-full max-w-md sm:p-8 sm:shadow-panel"
        >
          <ClientLogo priority className="mx-auto mb-6 w-full max-w-xs" />
          {children}
        </Card>
      </div>
    </main>
  );
}
