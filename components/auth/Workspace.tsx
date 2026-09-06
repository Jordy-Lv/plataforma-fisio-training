import Link from "next/link";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function Workspace({
  title,
  name,
  children,
}: {
  title: string;
  name?: string | null;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto min-h-svh max-w-6xl px-5 py-5 sm:px-10 sm:py-8">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
        <Link
          href="/"
          className="flex min-h-11 items-center text-sm font-semibold text-brand"
        >
          Entrenamiento y fisioterapia
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <form action={signOut}>
            <Button className="min-h-11" variant="outline" type="submit">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </header>
      {name && (
        <p className="mb-2 text-sm text-muted-foreground">Hola, {name}</p>
      )}
      <h1 className="mb-8 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      {children}
    </main>
  );
}
