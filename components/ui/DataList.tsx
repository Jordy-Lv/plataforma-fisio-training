import type { ReactNode } from "react";
import { cn } from "cn";

export function DataList({ items, className }: {
  items: { term: string; value: ReactNode }[]; className?: string;
}) {
  return <dl className={cn("grid gap-3 text-sm sm:grid-cols-2", className)}>
    {items.map(({ term, value }) => <div key={term} className="min-w-0">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="mt-1 break-words font-medium">{value ?? "—"}</dd>
    </div>)}
  </dl>;
}
