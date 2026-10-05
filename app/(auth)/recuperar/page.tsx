import { AuthForm } from "@/components/auth/AuthForm";
import { AuthHeading } from "@/components/auth/AuthHeading";
import { Notice } from "@/components/ui/Notice";

export default async function RecoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <>
      <AuthHeading eyebrow="¿Olvidaste tu contraseña?" title="Recupera tu acceso">
        Te enviaremos un enlace para elegir una contraseña nueva.
      </AuthHeading>
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
