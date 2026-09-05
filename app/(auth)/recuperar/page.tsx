import { AuthForm } from "@/components/auth/AuthForm";

export default async function RecoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <>
      <h1 className="text-4xl font-semibold tracking-tight">
        Recupera tu acceso
      </h1>
      <p className="mb-8 mt-3 leading-7 text-muted-foreground">
        Te enviaremos un enlace para elegir una contraseña nueva.
      </p>
      {error && (
        <p role="alert" className="mb-6 text-sm leading-6 text-destructive">
          El enlace venció o no se pudo verificar. Solicita uno nuevo y ábrelo
          en este mismo navegador.
        </p>
      )}
      <AuthForm mode="recovery" />
    </>
  );
}
