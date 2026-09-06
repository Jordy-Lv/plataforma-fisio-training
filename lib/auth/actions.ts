"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  recoverySchema,
  passwordSchema,
  roleSchema,
  type AuthState,
} from "@/lib/auth/schemas";
import { rolePaths } from "@/lib/auth/session";

const invalidCredentials =
  "No pudimos iniciar sesión. Revisa tu correo y contraseña.";

export async function signIn(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return {
      error: parsed.error.issues[0].message,
      email: String(formData.get("email") ?? ""),
    };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Un 4xx es "credenciales incorrectas"; un 5xx, un 429 o un fallo de red
    // es que el servicio no responde —Supabase Free se suspende tras un rato
    // sin uso— y no hay que hacer creer al usuario que se equivocó.
    const badCredentials =
      typeof error.status === "number" &&
      error.status >= 400 &&
      error.status < 500 &&
      error.status !== 429;
    return {
      error: badCredentials
        ? invalidCredentials
        : "No pudimos conectar con el servicio. Espera un momento e inténtalo de nuevo.",
      email: parsed.data.email,
    };
  }
  if (!data.user) return { error: invalidCredentials, email: parsed.data.email };
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .maybeSingle();
  const role = roleSchema.safeParse(profile?.role);
  if (profileError || !profile?.is_active || !role.success) {
    const { error: signOutError } = await supabase.auth.signOut({
      scope: "local",
    });
    if (signOutError)
      throw new Error("No se pudo cerrar la sesión. Inténtalo de nuevo.");
    return {
      error: profileError
        ? "No se pudo consultar tu perfil. Inténtalo de nuevo."
        : invalidCredentials,
      email: parsed.data.email,
    };
  }
  revalidatePath("/", "layout");
  redirect(rolePaths[role.data]);
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error)
    throw new Error("No se pudo cerrar la sesión. Inténtalo de nuevo.");
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function requestPasswordReset(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = recoverySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl)
    return {
      error: "La recuperación no está disponible. Contacta al administrador.",
    };
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: new URL("/auth/callback", siteUrl).toString(),
    },
  );
  if (error)
    return {
      error:
        "No se pudo solicitar el enlace. Espera un minuto e inténtalo de nuevo.",
    };
  return {
    success:
      "Si el correo está registrado, recibirás un enlace para cambiar tu contraseña. Ábrelo en este mismo navegador.",
  };
}

export async function updatePassword(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user)
    return { error: "El enlace ya no es válido. Solicita uno nuevo." };
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile?.is_active)
    return {
      error: "No se pudo actualizar la contraseña. Contacta al administrador.",
    };
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error)
    return {
      error:
        "No se pudo guardar. Usa una contraseña diferente de la anterior o solicita un enlace nuevo.",
    };
  const { error: signOutError } = await supabase.auth.signOut({
    scope: "global",
  });
  if (signOutError)
    throw new Error(
      "La contraseña cambió, pero no se pudieron cerrar las sesiones. Inténtalo de nuevo.",
    );
  revalidatePath("/", "layout");
  redirect("/login?updated=1");
}
