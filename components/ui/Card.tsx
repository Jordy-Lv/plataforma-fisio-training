import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

/**
 * Tarjeta: la superficie sobre la que se apoya casi todo el contenido de la
 * aplicación. Antes de la fase 2 el mismo juego de clases estaba copiado en 28
 * sitios, así que cualquier ajuste de radio o de sombra había que repetirlo a
 * mano.
 *
 * `interactive` es para la tarjeta cuyo título envuelve un enlace que cubre
 * toda la superficie (`after:absolute after:inset-0`): resalta el borde tanto
 * al pasar el ratón como cuando el enlace recibe el foco de teclado, para que
 * quien navega con tabulador vea lo mismo que quien usa ratón.
 */
const cardVariants = cva(
  "rounded-2xl border border-border bg-surface text-foreground shadow-low",
  {
    variants: {
      interactive: {
        true: "relative transition-colors focus-within:border-brand hover:border-brand",
        false: "",
      },
      padding: {
        none: "",
        sm: "p-4",
        default: "p-5",
        lg: "p-5 sm:p-6",
      },
    },
    defaultVariants: { interactive: false, padding: "default" },
  },
);

function Card({
  className,
  interactive,
  padding,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ interactive, padding, className }))}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("mb-3 grid gap-1", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      data-slot="card-title"
      className={cn("text-base font-semibold leading-6", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm leading-6 text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("grid gap-3", className)} {...props} />
  );
}

function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("mt-4 flex flex-wrap items-center gap-3", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
};
