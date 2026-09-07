"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
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

/*
  Los campos conservan `label` y `id` explícitos en vez de usar el `Field` que
  envuelve al control: aquí cada campo apunta con `aria-describedby` al error o
  a la ayuda, y eso exige ids propios. Del sistema de diseño salen el campo
  (`Input`), el botón y los avisos.
*/
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
          {/*
            React 19 resetea el formulario al terminar la acción. `defaultValue`
            con el correo que devuelve el estado hace que el reset lo vuelva a
            escribir en vez de dejar el campo vacío tras un fallo de acceso.
          */}
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={254}
            required
            defaultValue={state.email}
            disabled={pending}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "auth-error" : undefined}
          />
        </div>
      )}
      {mode !== "recovery" && (
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-semibold">
            {mode === "password" ? "Nueva contraseña" : "Contraseña"}
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={
              mode === "password" ? "new-password" : "current-password"
            }
            maxLength={256}
            required
            disabled={pending}
            aria-invalid={error ? true : undefined}
            aria-describedby={
              error
                ? "auth-error"
                : mode === "password"
                  ? "password-help"
                  : undefined
            }
          />
          {mode === "password" && (
            <p id="password-help" className="text-sm leading-6 text-muted-foreground">
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
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            maxLength={256}
            required
            disabled={pending}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "auth-error" : undefined}
          />
        </div>
      )}
      {error && (
        <Notice id="auth-error" tone="danger" role="alert">
          {error}
        </Notice>
      )}
      {state.success && !validationError && (
        <Notice tone="success">{state.success}</Notice>
      )}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Espera un momento…" : config.label}
      </Button>
      <div className="grid gap-1">
        <Link
          className="flex min-h-11 items-center justify-center rounded-lg text-sm font-medium text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          href={mode === "login" ? "/recuperar" : "/login"}
        >
          {mode === "login"
            ? "Olvidé mi contraseña"
            : "Volver al inicio de sesión"}
        </Link>
        {mode === "password" && (
          <Link
            className="flex min-h-11 items-center justify-center rounded-lg text-sm text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            href="/recuperar"
          >
            Solicitar otro enlace
          </Link>
        )}
      </div>
    </form>
  );
}
