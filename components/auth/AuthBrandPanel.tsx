import Image from "next/image";
import Link from "next/link";

import { AuthBreadcrumb } from "@/components/auth/AuthBreadcrumb";

import {
  CLIENT_AUTH_BACKGROUND,
  CLIENT_LOGOS,
  CLIENT_NAME,
  CLIENT_TAGLINE,
} from "@/lib/brand/client";

/*
  Panel de marca de las pantallas de acceso: a la izquierda en escritorio, y en
  el teléfono una franja corta sobre la que se monta la tarjeta del formulario.

  Lleva la clase `dark` aunque la aplicación esté en tema claro: el panel es
  siempre oscuro, y así sus tokens —fondo, texto y el dorado de `--brand`—
  toman los valores de la paleta oscura sin escribir un color a mano.

  Arriba a la izquierda van las migas de pan para volver a la portada
  (`AuthBreadcrumb`); en el teléfono, encima del logo, que va centrado.

  El logo es el original blanco sobre negro (`logo-blanco-original.png`), sin
  retocar: el recorte lo hace el contenedor, que oculta el margen negro que trae
  el archivo para que el trazo se vea grande, y `mix-blend-screen` funde ese
  negro con la foto de fondo.
*/
export function AuthBrandPanel() {
  return (
    <section className="dark relative isolate flex flex-col items-center gap-2 overflow-hidden bg-background px-5 pb-12 pt-3 text-foreground sm:pb-14 lg:items-center lg:justify-center lg:px-14 lg:py-10 lg:text-center">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-cover bg-center opacity-50 lg:opacity-75"
        style={{ backgroundImage: `url(${CLIENT_AUTH_BACKGROUND})` }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--background)_55%,transparent)_0%,color-mix(in_srgb,var(--background)_92%,transparent)_75%)]"
      />

      <AuthBreadcrumb className="self-start lg:absolute lg:left-10 lg:top-6" />

      <Link
        href="/"
        className="block w-44 rounded-lg sm:w-48 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring lg:w-full lg:max-w-[25rem]"
      >
        <span className="block aspect-[100/44] overflow-hidden">
          <Image
            src={CLIENT_LOGOS.white}
            alt={`${CLIENT_NAME}. ${CLIENT_TAGLINE}`}
            width={1280}
            height={853}
            priority
            sizes="(min-width: 1024px) 500px, 240px"
            className="-ml-[12.8%] -mt-[16.5%] w-[125.5%] max-w-none mix-blend-screen"
          />
        </span>
      </Link>

      <div className="hidden lg:block">
        <span
          aria-hidden="true"
          className="mx-auto mt-7 block h-[3px] w-12 rounded-full bg-brand"
        />
        <p className="mx-auto mt-6 max-w-[34ch] text-lg leading-8 text-muted-foreground">
          Tu rutina, tu recuperación y las personas que te acompañan, en un
          mismo lugar.
        </p>
      </div>
      <p className="absolute inset-x-0 bottom-8 hidden text-xs font-semibold uppercase tracking-[0.08em] text-brand lg:block">
        Entrenamiento y fisioterapia
      </p>
    </section>
  );
}
