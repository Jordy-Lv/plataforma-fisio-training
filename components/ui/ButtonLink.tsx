import Link from "next/link";
import type { ComponentProps } from "react";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";

import { buttonVariants } from "@/components/ui/button";

/**
 * Enlace con aspecto de botón. Existe porque catorce pantallas repetían su
 * propio `linkClass` o `backLinkClass`, cada una con un juego de clases algo
 * distinto: unas tenían anillo de foco y otras no.
 *
 * Es un `<Link>`, no un `<Button>`: navegar es un enlace y tiene que abrirse en
 * otra pestaña con el clic central, cosa que un `<button>` no hace.
 */
export function ButtonLink({
  className,
  variant = "outline",
  size,
  ...props
}: ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>) {
  return (
    <Link
      data-slot="button-link"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
