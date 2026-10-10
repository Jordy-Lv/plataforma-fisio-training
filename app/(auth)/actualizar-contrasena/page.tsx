import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthHeading } from "@/components/auth/AuthHeading";
import { getActiveProfile } from "@/lib/auth/session";

export default async function PasswordPage() {
  if (!(await getActiveProfile())) redirect("/recuperar?error=session");
  return (
    <>
      <AuthHeading eyebrow="Último paso" title="Elige tu contraseña">
        Guárdala en un lugar seguro. La usarás la próxima vez que entres.
      </AuthHeading>
      <AuthForm mode="password" />
    </>
  );
}
