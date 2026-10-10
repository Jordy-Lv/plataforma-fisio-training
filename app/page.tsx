import type { CSSProperties } from "react";
import { Russo_One } from "next/font/google";

import { BRIGHT_BRAND_STYLE } from "@/components/brand/bright-brand";
import { ClientLogoCropped } from "@/components/brand/ClientLogoCropped";
import { HomeArt } from "@/components/home/HomeArt";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ThemeSwitch } from "@/components/ui/ThemeSwitch";

/*
  Tipografía del titular. Se carga aquí y no en el layout raíz para que solo la
  descargue la portada; el token `--font-display` de `globals.css` apunta a su
  variable.
*/
const russoOne = Russo_One({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-russo-one",
});

/*
  Un corte fino a media altura de las mayúsculas de cada línea del titular, al
  estilo de las tipografías deportivas. Es una máscara en `em`, así que escala
  con el tamaño de letra: con un interlineado de 1,05em, la mitad de la altura
  de mayúscula de Russo One cae a 0,5em de la parte de arriba de cada línea.
  El titular siempre ocupa dos líneas (`<br>` y `whitespace-nowrap`), por eso
  hay dos cortes.
*/
const headlineCuts =
  "linear-gradient(180deg, black 0 0.48em, transparent 0.48em 0.525em, black 0.525em 1.53em, transparent 1.53em 1.575em, black 1.575em)";
const headlineStyle = {
  maskImage: headlineCuts,
  WebkitMaskImage: headlineCuts,
} satisfies CSSProperties;

const areas = [
  {
    title: "Tu rutina de hoy",
    description: "Cada ejercicio, lo que hiciste y dónde lo dejaste.",
  },
  {
    title: "Tu dolor, atendido",
    description: "Reporta dónde duele y cuánto; tu profesional lo ve.",
  },
  {
    title: "Progreso visible",
    description: "Asistencia, tamizajes y evolución, todo en un mismo lugar.",
  },
];

/*
  Portada pública. Es la única pantalla sin sesión además de las de acceso, así
  que trae su propio conmutador de tema arriba a la derecha: el grupo de tres
  opciones en escritorio y un solo botón sol/luna en el teléfono. `test:smoke`
  no abre la portada, así que aquí el grupo puede no verse en el teléfono.

  Dos mitades sobre el mismo fondo, sin corte entre ellas: a la izquierda el
  mensaje (saludo, titular, texto, las tres áreas y el botón) y a la derecha el
  logo sobre el fondo vectorial de `HomeArt`. En el teléfono el logo pasa a una
  franja arriba, centrado, con un solo botón de tema sol/luna a su derecha
  (`ThemeSwitch`), y el resto va debajo, en el mismo orden; el saludo
  «Entrenamiento y fisioterapia» va centrado.

  En el teléfono (2026-10-03) las tres áreas son **pasos** y no cajas: el número
  en dorado, el título y el texto, unidos por una línea vertical. Titular,
  pasos y botón se reparten el alto que deja el logo (`justify-evenly`), sin
  huecos, y bajo el botón se le dice a quien no tiene cuenta cómo conseguirla.

  El dorado es el amarillo luminoso del logo también en claro
  (`BRIGHT_BRAND_STYLE`), como en las pantallas de acceso.
*/
export default function Home() {
  return (
    <main
      style={BRIGHT_BRAND_STYLE}
      className={`${russoOne.variable} relative flex h-svh max-h-svh flex-col justify-between overflow-hidden bg-background text-foreground lg:grid lg:h-auto lg:max-h-none lg:min-h-svh lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:overflow-visible`}
    >
      {/* Conmutador de tema: botón único sol/luna en escritorio y teléfono */}
      <ThemeSwitch className="absolute right-3.5 top-3.5 z-10 lg:right-7 lg:top-7" />

      <section className="flex flex-1 flex-col justify-evenly px-5 pb-5 pt-1 sm:px-6 sm:pb-6 lg:justify-center lg:px-20 lg:py-14">
        {/* En el teléfono este bloque se deshace (`contents`) para que titular y
            pasos se repartan el alto por separado; en escritorio es la columna. */}
        <div className="contents lg:my-0 lg:flex lg:w-full lg:flex-col lg:items-start">
          <div className="mx-auto w-full max-w-sm text-center sm:max-w-md lg:mx-0 lg:max-w-none lg:text-left">
            <p className="hidden text-xs font-bold uppercase tracking-[0.12em] text-brand sm:text-[13px] lg:block lg:text-left">
              Entrenamiento y fisioterapia
            </p>
            <h1
              style={headlineStyle}
              className="mt-1 origin-center -skew-x-6 whitespace-nowrap font-display text-[33px] uppercase leading-[1.04] tracking-[0.01em] text-center sm:text-[36px] lg:mt-5 lg:origin-bottom-left lg:text-left lg:text-[58px]"
            >
              Entrena tu
              <br />
              mejor versión.
            </h1>
          </div>

          <ul className="mx-auto grid w-full max-w-sm sm:max-w-md lg:mx-0 lg:mt-9 lg:max-w-none lg:grid-cols-3 lg:grid-rows-[auto_auto] lg:-mr-14 lg:gap-3.5">
            {areas.map((area, index) => (
              <li
                key={area.title}
                className="relative pb-[18px] pl-11 last:pb-0 lg:grid lg:gap-2 lg:rounded-2xl lg:border-[1.5px] lg:border-brand lg:bg-surface/50 lg:px-3.5 lg:pb-4 lg:pt-3.5 lg:row-span-2 lg:grid-rows-subgrid"
              >
                {/* La línea que une un paso con el siguiente; solo en el teléfono. */}
                {index < areas.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0.5 left-3.5 top-8 w-0.5 rounded-full bg-linear-to-b from-brand to-brand/25 lg:hidden"
                  />
                )}
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-0 grid size-7.5 shrink-0 place-items-center rounded-[9px] bg-brand text-sm font-extrabold text-brand-foreground lg:static lg:size-6 lg:rounded-md lg:text-xs lg:font-bold"
                  >
                    {index + 1}
                  </span>
                  <h2 className="text-base font-bold leading-7.5 lg:text-[15px] lg:leading-tight">
                    {area.title}
                  </h2>
                </div>
                <p className="text-sm leading-snug text-muted-foreground lg:mt-0.5 lg:text-[14.5px] lg:leading-6">
                  {area.description}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full max-w-sm sm:max-w-md mx-auto lg:mx-0 lg:max-w-none">
          <ButtonLink
            href="/login"
            variant="default"
            size="lg"
            className="w-full shrink-0 bg-brand font-semibold text-brand-foreground hover:bg-brand/90 lg:mt-9 lg:w-fit lg:px-7"
          >
            Comenzar ahora
          </ButtonLink>
          <p className="mt-2.5 text-center text-[13px] text-muted-foreground lg:hidden">
            ¿Aún no tienes acceso?{" "}
            <b className="font-bold text-foreground">Pídeselo a tu profesional.</b>
          </p>
        </div>
      </section>

      <section
        aria-label="AmadorTrainer"
        className="relative isolate order-first flex w-full shrink-0 flex-col items-center justify-center overflow-hidden bg-background px-4 pb-1 pt-14 lg:order-none lg:p-10"
      >
        <HomeArt />
        <ClientLogoCropped
          priority
          sizes="(min-width: 1024px) 420px, 250px"
          className="mx-auto w-[200px] sm:w-[230px] lg:w-[420px]"
        />
        <p className="mt-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-brand sm:text-[13px] lg:hidden">
          Entrenamiento y fisioterapia
        </p>
        <span
          aria-hidden="true"
          className="mt-7 hidden h-[3px] w-12 rounded-full bg-brand lg:block"
        />
      </section>
    </main>
  );
}
