import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { BRIGHT_BRAND_STYLE } from "@/components/brand/bright-brand";
import { Card } from "@/components/ui/Card";
import { ThemeSwitch } from "@/components/ui/ThemeSwitch";

/*
  Las pantallas de acceso son las únicas sin sesión, así que no tienen el shell
  de la fase 2 —ni su barra de navegación ni su conmutador de tema—. El
  conmutador se repite aquí porque quien abre la app de noche todavía no ha
  entrado: sin él, la primera pantalla sería la única que no puede cambiar de
  modo. Arriba a la derecha: un solo botón sol/luna (`ThemeSwitch`) en escritorio
  y teléfono.

  La tarjeta va en alto relief (`shadow-high`) y en el teléfono sube sobre la
  franja oscura (`-mt-9`), así que el formulario queda arriba sin desplazarse.
  En el teléfono los rellenos y espacios son algo más cortos (desde `sm` vuelven
  los de siempre) para que el inicio de sesión quepa entero, sin un desplazamiento
  de pocos píxeles.

  En estas pantallas el dorado es el amarillo luminoso del logo también en tema
  claro (`BRIGHT_BRAND_STYLE`, compartido con la portada).
*/

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      style={BRIGHT_BRAND_STYLE}
      className="relative grid min-h-svh grid-rows-[auto_1fr] lg:grid-cols-2 lg:grid-rows-none"
    >
      <AuthBrandPanel />
      {/* Botón de tema único sol/luna */}
      <ThemeSwitch className="absolute right-4 top-3 z-10 lg:right-14 lg:top-7" />
      <div className="relative -mt-9 flex flex-col px-4 pb-6 sm:pb-10 lg:mt-0 lg:px-14 lg:pb-7 lg:pt-24">
        <div className="flex flex-1 justify-center lg:items-center">
          <Card
            padding="none"
            className="h-fit w-full max-w-md p-5 shadow-high sm:p-10"
          >
            {children}
          </Card>
        </div>
      </div>
    </main>
  );
}
