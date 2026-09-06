import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { requireRole } from "@/lib/auth/session";
import type { UserRole } from "@/lib/auth/schemas";

const panels = {
  admin: {
    title: "Administración",
    message:
      "Aquí podrás gestionar las personas de tu equipo. La gestión de personal estará disponible en una próxima entrega.",
  },
  professional: {
    title: "Mi consulta",
    message:
      "Aquí podrás consultar tus pacientes y acompañar su avance. La lista de pacientes estará disponible en una próxima entrega.",
  },
  patient: {
    title: "Mi espacio",
    message:
      "Aquí encontrarás tu rutina y tu progreso. Tu profesional te indicará cómo comenzar cuando estén disponibles.",
  },
};

export async function RolePanel({ role }: { role: UserRole }) {
  const profile = await requireRole(role);
  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">
        {profile.fullName
          ? `Hola, ${profile.fullName}`
          : "Bienvenido a tu espacio"}
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">
        {panels[role].title}
      </h1>
      <p className="mb-8 mt-5 leading-7 text-muted-foreground">
        {panels[role].message}
      </p>
      <form action={signOut}>
        <Button type="submit" variant="outline" className="min-h-11">
          Cerrar sesión
        </Button>
      </form>
    </>
  );
}
