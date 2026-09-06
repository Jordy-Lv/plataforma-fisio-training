import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { getActiveProfile } from "@/lib/auth/session";

export default async function PasswordPage() {
  if (!(await getActiveProfile())) redirect("/recuperar?error=session");
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">
        Elige tu contraseña
      </h1>
      <p className="mb-6 mt-3 leading-7 text-muted-foreground">
        Guárdala en un lugar seguro. La usarás la próxima vez que entres.
      </p>
      <AuthForm mode="password" />
    </>
  );
}
