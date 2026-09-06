import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

import type { Database } from "@/lib/db/types";

/**
 * Etiqueta de estado. Sustituye al `tagClass` que estaba copiado en nueve
 * pantallas y que pintaba todos los estados del mismo gris: una membresía
 * vencida y una activa se leían igual.
 *
 * Cada variante usa el par `--x-soft` (fondo) + `--x` (texto) de la paleta, que
 * la fase 1 dejó con al menos 5,4:1 en claro y en oscuro. El punto de color
 * (`Badge` con `dot`) existe porque el color por sí solo no es un medio válido
 * para transmitir información (WCAG 1.4.1): el texto siempre nombra el estado.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        brand: "bg-brand-soft text-brand-soft-foreground",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-danger",
        info: "bg-info-soft text-info",
        outline: "border border-border text-muted-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

function Badge({
  className,
  variant,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  );
}

type MembershipStatus = Database["public"]["Enums"]["membership_status"];
type AlertSeverity = Database["public"]["Enums"]["alert_severity"];
type SessionStatus = Database["public"]["Enums"]["session_status"];

/**
 * Los estados de negocio no eligen color aquí: se traducen a un semántico, que
 * es quien lo decide. Cambiar `--warning` mueve a la vez la membresía próxima a
 * vencer y la alerta que requiere revisión, sin retocar este archivo.
 */
const membershipVariants: Record<MembershipStatus, BadgeVariant> = {
  active: "success",
  expiring_soon: "warning",
  expired: "danger",
  cancelled: "neutral",
};

const alertVariants: Record<AlertSeverity, BadgeVariant> = {
  info: "info",
  warning: "warning",
  critical: "danger",
};

const sessionVariants: Record<SessionStatus, BadgeVariant> = {
  in_progress: "info",
  completed: "success",
  abandoned: "neutral",
};

export function membershipBadgeVariant(status: MembershipStatus): BadgeVariant {
  return membershipVariants[status];
}

export function alertBadgeVariant(severity: AlertSeverity): BadgeVariant {
  return alertVariants[severity];
}

export function sessionBadgeVariant(status: SessionStatus): BadgeVariant {
  return sessionVariants[status];
}

/**
 * Escala de dolor 0-10 en cinco escalones, la decisión que Yordy aprobó en la
 * fase 1. No usa los semánticos porque el dolor no es un estado de error: un 4
 * es un dato clínico normal, no una advertencia del sistema.
 */
const painSteps = [
  { max: 0, token: "none", label: "Sin dolor" },
  { max: 2, token: "low", label: "Dolor leve" },
  { max: 5, token: "mid", label: "Dolor moderado" },
  { max: 7, token: "high", label: "Dolor alto" },
  { max: 10, token: "severe", label: "Dolor severo" },
] as const;

const painClasses: Record<(typeof painSteps)[number]["token"], string> = {
  none: "bg-pain-none-soft text-pain-none",
  low: "bg-pain-low-soft text-pain-low",
  mid: "bg-pain-mid-soft text-pain-mid",
  high: "bg-pain-high-soft text-pain-high",
  severe: "bg-pain-severe-soft text-pain-severe",
};

export function painStep(level: number) {
  const clamped = Math.min(10, Math.max(0, Math.round(level)));
  return painSteps.find((step) => clamped <= step.max) ?? painSteps.at(-1)!;
}

/**
 * Nivel de dolor con su escalón de color. Cuando no hay dato se pinta neutro y
 * dice «Sin registrar»: un guion suelto no se entiende con lector de pantalla.
 */
export function PainBadge({
  level,
  className,
}: {
  level: number | null | undefined;
  className?: string;
}) {
  if (level === null || level === undefined) {
    return (
      <Badge variant="neutral" className={className}>
        Dolor sin registrar
      </Badge>
    );
  }
  const step = painStep(level);
  return (
    <span
      data-slot="badge"
      title={step.label}
      className={cn(badgeVariants({ variant: "neutral" }), painClasses[step.token], className)}
    >
      {step.label} · {Math.min(10, Math.max(0, Math.round(level)))}/10
    </span>
  );
}

export { Badge, badgeVariants };
export type { BadgeVariant };
