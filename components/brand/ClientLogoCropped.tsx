import Image from "next/image";
import { cn } from "cn";

import { CLIENT_LOGOS, CLIENT_NAME, CLIENT_TAGLINE } from "@/lib/brand/client";

/*
  El logo del cliente sin el margen que traen sus originales, para que el trazo
  se vea grande. Los archivos no se tocan: el recorte lo hace el contenedor
  (`overflow-hidden` y una relación de aspecto que abraza el trazo), y cada
  original se desplaza dentro con márgenes en porcentaje, que escalan con el
  ancho que se le dé.

  Sigue el tema: el dorado (sobre blanco) en claro, con `mix-blend-multiply`
  para que su fondo blanco se funda con el de la página, y el blanco (sobre
  negro) en oscuro, con `mix-blend-screen` por la misma razón.

  La fusión necesita un fondo debajo dentro de la misma capa: si un ancestro
  aísla la capa (`isolate`), ese ancestro tiene que pintar el fondo.

  `ClientLogo` sigue siendo el que presenta el original completo.
*/
export function ClientLogoCropped({
  className,
  priority = false,
  sizes,
}: {
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const alt = `${CLIENT_NAME}. ${CLIENT_TAGLINE}`;
  return (
    <span
      className={cn("block aspect-[100/45.4] overflow-hidden", className)}
    >
      <Image
        src={CLIENT_LOGOS.gold}
        alt={alt}
        width={1280}
        height={853}
        priority={priority}
        sizes={sizes}
        className="-ml-[15.3%] -mt-[14.8%] w-[130.6%] max-w-none mix-blend-multiply dark:hidden"
      />
      <Image
        src={CLIENT_LOGOS.white}
        alt={alt}
        width={1280}
        height={853}
        priority={priority}
        sizes={sizes}
        className="-ml-[12.8%] -mt-[15.5%] hidden w-[125.5%] max-w-none mix-blend-screen dark:block"
      />
    </span>
  );
}
