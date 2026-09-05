"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  signIn,
  requestPasswordReset,
  updatePassword,
} from "@/lib/auth/actions";
import {
  loginSchema,
  recoverySchema,
  passwordSchema,
  type AuthState,
} from "@/lib/auth/schemas";

type Mode = "login" | "recovery" | "password";
const modes = {
  login: { action: signIn, schema: loginSchema, label: "Iniciar sesión" },
  recovery: {
    action: requestPasswordReset,
    schema: recoverySchema,
    label: "Enviar enlace",
  },
  password: {
    action: updatePassword,
    schema: passwordSchema,
    label: "Guardar contraseña",
  },
};
const inputClass =
  "min-h-12 w-full rounded-lg border border-input bg-surface px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

export function AuthForm({ mode }: { mode: Mode }) {
  const config = modes[mode];
  const [state, action, pending] = useActionState<AuthState, FormData>(
    config.action,
    {},
  );
  const [validationError, setValidationError] = useState<string>();
  const error = validationError ?? state.error;
  return (
    <form
      action={action}
      noValidate
      className="space-y-5"
      onSubmit={(event) => {
        const parsed = config.schema.safeParse(
          Object.fromEntries(new FormData(event.currentTarget)),
        );
        if (!parsed.success) {
          event.preventDefault();
          setValidationError(parsed.error.issues[0].message);
        } else setValidationError(undefined);
      }}
    >
      {mode !== "password" && (
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-semibold">
            Correo electrónico
          </label>
          <input
            className={inputClass}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={254}
            required
            disabled={pending}
            aria-describedby={error ? "auth-error" : undefined}
          />
        </div>
      )}
      {mode !== "recovery" && (
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-semibold">
            {mode === "password" ? "Nueva contraseña" : "Contraseña"}
          </label>
          <input
            className={inputClass}
            id="password"
            name="password"
            type="password"
            autoComplete={
              mode === "password" ? "new-password" : "current-password"
            }
            maxLength={256}
            required
            disabled={pending}
            aria-describedby={
              error
                ? "auth-error"
                : mode === "password"
                  ? "password-help"
                  : undefined
            }
          />
          {mode === "password" && (
            <p id="password-help" className="text-sm text-muted-foreground">
              Usa al menos 8 caracteres.
            </p>
          )}
        </div>
      )}
      {mode === "password" && (
        <div className="space-y-2">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-semibold"
          >
            Repite la contraseña
          </label>
          <input
            className={inputClass}
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            maxLength={256}
            required
            disabled={pending}
            aria-describedby={error ? "auth-error" : undefined}
          />
        </div>
      )}
      {error && (
        <p
          id="auth-error"
          role="alert"
          className="text-sm leading-6 text-destructive"
        >
          {error}
        </p>
      )}
      {state.success && !validationError && (
        <p
          role="status"
          className="rounded-lg bg-brand-soft p-4 text-sm leading-6"
        >
          {state.success}
        </p>
      )}
      <Button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full text-base"
      >
        {pending ? "Espera un momento…" : config.label}
      </Button>
      <Link
        className="flex min-h-11 items-center justify-center text-sm font-medium text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
        href={mode === "login" ? "/recuperar" : "/login"}
      >
        {mode === "login"
          ? "Olvidé mi contraseña"
          : "Volver al inicio de sesión"}
      </Link>
      {mode === "password" && (
        <Link
          className="flex min-h-11 items-center justify-center text-sm text-brand underline underline-offset-4"
          href="/recuperar"
        >
          Solicitar otro enlace
        </Link>
      )}
    </form>
  );
}
