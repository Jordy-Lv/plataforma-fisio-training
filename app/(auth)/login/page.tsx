import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthHeading } from "@/components/auth/AuthHeading";
import { Notice } from "@/components/ui/Notice";
import { getActiveProfile, rolePaths } from "@/lib/auth/session";

export const metadata = { title: "Iniciar sesión" };

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
      <AuthHeading eyebrow="Qué bueno verte" title="Inicia sesión">
        Entra con el correo que registraste con tu equipo.
      </AuthHeading>
      {updated === "1" && (
        <Notice tone="success" className="mb-6">
          Tu contraseña se actualizó. Ya puedes iniciar sesión.
        </Notice>
      )}
      {error === "inactive" && (
        <Notice tone="danger" className="mb-6">
          Tu acceso no está disponible. Contacta al administrador.
        </Notice>
      )}
      <AuthForm mode="login" />
      <div className="mt-5 rounded-lg bg-muted px-4 py-3 text-center sm:mt-7 sm:py-4 text-sm leading-6 text-muted-foreground">
        <p className="font-semibold text-foreground">¿Aún no tienes acceso?</p>
        <p>Pídele a tu profesional que registre tus datos.</p>
      </div>
    </>
  );
}
