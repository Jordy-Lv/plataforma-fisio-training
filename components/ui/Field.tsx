import type { ComponentProps, ReactNode } from "react";
import { cn } from "cn";

/**
 * Campos de formulario. Los formularios del proyecto son HTML nativo enviado a
 * server actions —no hay librería de formularios— así que estos componentes no
 * aportan comportamiento: solo centralizan el aspecto y el objetivo táctil.
 *
 * 48 px de alto: por encima del mínimo de 44, porque un campo se acierta peor
 * que un botón cuando además hay que colocar el cursor dentro.
 */
export const inputClass =
  "min-h-12 w-full rounded-lg border border-input bg-surface px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60 aria-invalid:border-destructive";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea className={cn(inputClass, "min-h-24 leading-6", className)} {...props} />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(inputClass, "pr-8", className)} {...props} />;
}

/**
 * Etiqueta y control. Es un `<label>` que envuelve al campo, así que no hace
 * falta emparejar `htmlFor` con `id`: el control queda asociado por anidamiento
 * y no hay forma de que se desincronicen.
 *
 * `hint` va debajo del control y es texto de apoyo, no un error; los errores de
 * validación los pinta `FormMessage` con `role="alert"`.
 */
export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-2 text-sm font-medium", className)}>
      {label}
      {children}
      {hint && (
        <span className="text-xs font-normal leading-5 text-muted-foreground">
          {hint}
        </span>
      )}
    </label>
  );
}
