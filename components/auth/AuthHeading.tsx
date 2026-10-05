import type { ReactNode } from "react";

/*
  Encabezado de las pantallas de acceso: una línea de saludo en dorado, el
  título y una frase que dice qué hacer. Lo comparten el inicio de sesión, la
  recuperación y la contraseña nueva, para que las tres se lean igual.
*/
export function AuthHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-5 sm:mb-7">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand">
        {eyebrow}
      </p>
      <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight sm:mt-2 sm:text-3xl">{title}</h1>
      <p className="mt-1.5 text-[15px] leading-6 text-muted-foreground sm:mt-2 sm:text-base sm:leading-7">{children}</p>
    </div>
  );
}
