import type { ComponentProps } from "react";
import { cn } from "cn";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} aria-hidden="true" className={cn("animate-pulse rounded-lg bg-muted motion-reduce:animate-none", className)} />;
}
export function SkeletonCard({ className, ...props }: ComponentProps<"div">) {
  return <Skeleton {...props} className={cn("rounded-2xl border border-border bg-muted/60", className)} />;
}
