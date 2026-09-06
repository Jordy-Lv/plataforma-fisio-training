import type { ReactNode } from "react";
import type { AuthState } from "@/lib/auth/schemas";

export const inputClass =
  "min-h-12 w-full rounded-lg border border-input bg-surface px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
export function FormMessage({ state }: { state: AuthState }) {
  return (
    <div aria-live="polite">
      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive p-3 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
      {state.success && (
        <p
          role="status"
          className="rounded-lg bg-brand-soft p-3 text-sm text-foreground"
        >
          {state.success}
        </p>
      )}
    </div>
  );
}
export function Choices({
  name,
  title,
  labels,
  selected,
  multiple = false,
}: {
  name: string;
  title: string;
  labels: Record<string, string>;
  selected?: string | string[] | null;
  multiple?: boolean;
}) {
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-3 font-semibold">{title}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {Object.entries(labels).map(([value, label]) => (
          <label
            key={value}
            className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-input bg-surface px-4 py-3 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring"
          >
            <input
              className="size-5 shrink-0 accent-brand"
              type={multiple ? "checkbox" : "radio"}
              name={name}
              value={value}
              defaultChecked={
                Array.isArray(selected)
                  ? selected.includes(value)
                  : selected === value
              }
              required={!multiple}
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
