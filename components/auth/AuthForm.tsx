"use client";

import { useActionState, useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
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

  En el inicio de sesión, «¿La olvidaste?» va junto a la etiqueta de la
  contraseña, que es donde se busca cuando no se recuerda; las otras dos
  pantallas conservan abajo el enlace de vuelta.
*/
export function AuthForm({ mode }: { mode: Mode }) {
  const config = modes[mode];
  const [state, action, pending] = useActionState<AuthState, FormData>(
    config.action,
    {},
  );
  const [validationError, setValidationError] = useState<string>();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const togglePassword = () => setIsPasswordVisible((visible) => !visible);
  const error = validationError ?? state.error;
  return (
    <form
      action={action}
      noValidate
      className="space-y-4 sm:space-y-5"
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
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className="block text-sm font-semibold">
              {mode === "password" ? "Nueva contraseña" : "Contraseña"}
            </label>
            {mode === "login" && (
              <Link
                href="/recuperar"
                className="-my-3 inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-brand hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                ¿La olvidaste?
              </Link>
            )}
          </div>
          <PasswordInput
            isVisible={isPasswordVisible}
            onToggle={togglePassword}
            id="password"
            name="password"
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
          <PasswordInput
            isVisible={isPasswordVisible}
            onToggle={togglePassword}
            id="confirmPassword"
            name="confirmPassword"
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
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="w-full bg-brand-bright font-semibold text-brand-bright-foreground hover:bg-brand-bright/90"
      >
        {pending ? "Espera un momento…" : config.label}
      </Button>
      {mode !== "login" && (
        <div className="grid gap-1">
          <Link
            className="flex min-h-11 items-center justify-center rounded-lg text-sm font-medium text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            href="/login"
          >
            Volver al inicio de sesión
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
      )}
    </form>
  );
}

/*
  Campo de contraseña con un ojo dentro para mostrarla u ocultarla. El botón es
  `type="button"` y no lleva `name`, así que no viaja con el formulario. Mide
  44 × 44 px dentro del campo de 48; el relleno derecho del campo le deja sitio
  para que el texto no pase por debajo. Como solo lleva icono, el
  `aria-label` dice qué hace, y `aria-pressed` si la contraseña está a la vista.
*/
function PasswordInput({
  isVisible,
  onToggle,
  id,
  disabled,
  ...props
}: Omit<ComponentProps<"input">, "type"> & {
  id: string;
  isVisible: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={isVisible ? "text" : "password"}
        disabled={disabled}
        className="pr-12"
        {...props}
      />
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-controls={id}
        aria-pressed={isVisible}
        aria-label={isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
        title={isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute inset-y-0.5 right-0.5 grid min-h-11 w-11 place-items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
      >
        {isVisible ? (
          <EyeOff aria-hidden="true" className="size-5" />
        ) : (
          <Eye aria-hidden="true" className="size-5" />
        )}
      </button>
    </div>
  );
}
