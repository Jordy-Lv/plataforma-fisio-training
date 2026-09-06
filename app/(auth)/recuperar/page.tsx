import { AuthForm } from "@/components/auth/AuthForm";
import { Notice } from "@/components/ui/Notice";

export default async function RecoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">
        Recupera tu acceso
      </h1>
      <p className="mb-6 mt-3 leading-7 text-muted-foreground">
        Te enviaremos un enlace para elegir una contraseña nueva.
      </p>
      {error && (
        <Notice tone="danger" className="mb-6">
          El enlace venció o no se pudo verificar. Solicita uno nuevo y ábrelo
          en este mismo navegador.
        </Notice>
      )}
      <AuthForm mode="recovery" />
    </>
  );
}
