import Image from "next/image";
import { cn } from "cn";
import { CLIENT_LOGOS, CLIENT_NAME, CLIENT_TAGLINE } from "@/lib/brand/client";

/** Original completo: sin recortes, filtros de color ni reconstrucción del símbolo. */
export function ClientLogo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return <div className={cn("overflow-hidden rounded-xl", className)}>
    <Image src={CLIENT_LOGOS.gold} alt={`${CLIENT_NAME}. ${CLIENT_TAGLINE}`}
      width={1280} height={853} priority={priority} className="h-auto w-full dark:hidden" />
    <Image src={CLIENT_LOGOS.white} alt={`${CLIENT_NAME}. ${CLIENT_TAGLINE}`}
      width={1280} height={853} priority={priority} className="hidden h-auto w-full dark:block" />
  </div>;
}
