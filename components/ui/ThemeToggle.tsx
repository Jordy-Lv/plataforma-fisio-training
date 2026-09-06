"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { THEME_LABELS, type Theme } from "@/lib/theme/constants";
import { useTheme } from "@/lib/theme/use-theme";
import { cn } from "cn";

const OPTIONS: { value: Theme; icon: typeof Sun }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
];

/**
 * Conmutador de tema de tres estados. Se pinta como un grupo de radio porque
 * las tres opciones son excluyentes y así el lector de pantalla anuncia cuál
 * está activa; un botón que cicla no diría nunca cuáles son las otras dos.
 *
 * Hasta que `isReady` es cierto no se marca ninguna opción: el valor real vive
 * en `localStorage` y leerlo durante el render del servidor daría un HTML
 * distinto al del cliente.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, isReady } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Tema de la aplicación"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5",
        className,
      )}
    >
      {OPTIONS.map(({ value, icon: Icon }) => {
        const isSelected = isReady && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={THEME_LABELS[value]}
            title={THEME_LABELS[value]}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex size-11 items-center justify-center rounded-md transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              isSelected
                ? "bg-brand-soft text-brand-soft-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon aria-hidden="true" className="size-5" />
          </button>
        );
      })}
    </div>
  );
}
