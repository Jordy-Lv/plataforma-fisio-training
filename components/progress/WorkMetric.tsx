import Link from "next/link";
import { cn } from "cn";

import { cardVariants } from "@/components/ui/Card";

const cardClass = cn(cardVariants({ interactive: true }), "grid gap-1");

/**
 * Una cifra de trabajo con su título, su frase y un enlace que cubre toda la
 * tarjeta: se toca en cualquier punto y lleva a la pantalla donde se resuelve.
 */
export function WorkMetric({
  title,
  value,
  href,
  children,
}: {
  title: string;
  value: number;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <article className={cardClass}>
      <h3 className="text-sm font-medium text-muted-foreground">
        <Link
          href={href}
          className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {title}
        </Link>
      </h3>
      <p className="text-3xl font-semibold tracking-tight">{value}</p>
      <p className="text-sm leading-6 text-muted-foreground">{children}</p>
    </article>
  );
}
