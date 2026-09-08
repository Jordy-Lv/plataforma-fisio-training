import Link from "next/link";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Chip({ href, children, removeLabel }: {
  href?: string; children: ReactNode; removeLabel?: string;
}) {
  const className = "inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-border bg-brand-soft px-3 py-2 text-sm text-brand-soft-foreground";
  return href ? (
    <Link href={href} scroll={false} aria-label={removeLabel}
      className={`${className} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}>
      <span className="break-words">{children}</span><X className="size-4 shrink-0" aria-hidden="true" />
    </Link>
  ) : <span className={className}>{children}</span>;
}
