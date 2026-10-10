import Image from "next/image";
import Link from "next/link";
import { Montserrat } from "next/font/google";
import { cn } from "cn";

import { CLIENT_NAME, CLIENT_SYMBOL_WHITE } from "@/lib/brand/client";

/*
  Tipografía de la marca. Se carga aquí y no en el layout raíz: solo la usa la
  barra del paciente. `--font-wordmark` (globals.css) apunta a su variable.
*/
const montserrat = Montserrat({
  weight: ["300", "500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
});

/*
  «AMADORTRAINER» con el símbolo del logo haciendo de «A»: todo en el color
  del texto (blanco en la barra oscura): «MADOR» en peso medio y «TRAINER» en
  fino, en Montserrat espaciada como el logo.
  Está pensada para la barra oscura del paciente, donde el texto sale blanco.

  El símbolo es un poco más alto que las mayúsculas para leerse como inicial, y
  se apoya en la misma línea de base. Para el lector de pantalla todo el bloque
  es un solo enlace con el nombre del cliente.
*/
export function ClientWordmark({
  href,
  className,
}: {
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      aria-label={`${CLIENT_NAME}, inicio`}
      className={cn(
        montserrat.variable,
        "inline-flex min-h-11 items-center whitespace-nowrap rounded-lg font-wordmark text-[15px] font-light uppercase tracking-[0.1em] text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:text-[19px] sm:tracking-[0.22em]",
        className,
      )}
    >
      <span className="flex items-baseline">
        <Image
          src={CLIENT_SYMBOL_WHITE}
          alt=""
          width={174}
          height={145}
          priority
          className="mr-[0.12em] h-[19px] w-auto translate-y-[2px] self-baseline sm:h-6"
        />
        <span aria-hidden="true">
          <span className="font-medium">mador</span>
          <span>trainer</span>
        </span>
      </span>
    </Link>
  );
}
