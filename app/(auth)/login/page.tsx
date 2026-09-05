import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { getActiveProfile, rolePaths } from "@/lib/auth/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const profile = await getActiveProfile();
  if (profile) redirect(rolePaths[profile.role]);
  const { updated, error } = await searchParams;
  return (
    <>
      <h1 className="text-4xl font-semibold tracking-tight">Qué bueno verte</h1>
      <p className="mb-8 mt-3 leading-7 text-muted-foreground">
        Entra con el correo que registraste con tu equipo.
      </p>
      {updated === "1" && (
        <p role="status" className="mb-6 rounded-lg bg-brand-soft p-4 text-sm">
          Tu contraseña se actualizó. Ya puedes iniciar sesión.
        </p>
      )}
      {error === "inactive" && (
        <p role="alert" className="mb-6 text-sm leading-6 text-destructive">
          Tu acceso no está disponible. Contacta al administrador.
        </p>
      )}
      <AuthForm mode="login" />
      <p className="mt-8 border-t border-border pt-6 text-sm leading-6 text-muted-foreground">
        ¿Aún no tienes acceso? Pídele a tu profesional que registre tus datos.
      </p>
    </>
  );
}
