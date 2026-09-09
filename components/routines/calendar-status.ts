import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  type LucideIcon,
} from "lucide-react";
import type { BadgeVariant } from "@/components/ui/Badge";
import type { CalendarStatus } from "@/lib/routines/calendar";

export const calendarStatuses: Record<
  CalendarStatus,
  {
    label: string;
    variant: BadgeVariant;
    className: string;
    Icon: LucideIcon;
  }
> = {
  scheduled: {
    label: "Programada",
    variant: "info",
    className: "bg-info-soft text-info",
    Icon: CalendarDays,
  },
  pending: {
    label: "Pendiente",
    variant: "warning",
    className: "bg-warning-soft text-warning",
    Icon: Circle,
  },
  in_progress: {
    label: "En curso",
    variant: "brand",
    className: "bg-brand-soft text-brand-soft-foreground",
    Icon: Clock3,
  },
  completed: {
    label: "Completada",
    variant: "success",
    className: "bg-success-soft text-success",
    Icon: CheckCircle2,
  },
  abandoned: {
    label: "Abandonada",
    variant: "neutral",
    className: "bg-muted text-muted-foreground",
    Icon: Circle,
  },
};
