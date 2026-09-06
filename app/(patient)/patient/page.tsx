import Link from "next/link";
import type { Metadata } from "next";
import { CalendarCheck, CreditCard, HeartPulse, User } from "lucide-react";

import { Workspace } from "@/components/auth/Workspace";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Mi espacio",
};

/*
  Los mismos destinos que la barra inferior, pero con una frase que dice qué hay
  detrás de cada uno. La barra solo tiene sitio para una etiqueta de dos
  palabras; esta portada es donde el paciente entiende qué es «Tamizaje» o qué
  encontrará en «Mi membresía» sin tener que entrar a mirar.
*/
const sections = [
  {
    href: "/routine",
    label: "Mi rutina",
    icon: HeartPulse,
    description:
      "Los ejercicios de cada día, con sus series, sus pesos y cómo se hacen.",
  },
  {
    href: "/attendance/me",
    label: "Mi asistencia",
    icon: CalendarCheck,
    description: "Las visitas que tu profesional registró y las de este mes.",
  },
  {
    href: "/memberships/me",
    label: "Mi membresía",
    icon: CreditCard,
    description: "Tu plan, su estado y la fecha en la que vence.",
  },
  {
    href: "/patient/profile",
    label: "Mi perfil",
    icon: User,
    description:
      "Tu objetivo, tu equipamiento y las condiciones que tenemos en cuenta.",
  },
];

export default async function Page() {
  const profile = await requireRole("patient");

  return (
    <Workspace
      title="Mi espacio"
      name={profile.fullName}
      role="patient"
      description="Tu perfil está listo. Desde aquí llegas a tu rutina, a tu asistencia y a tu membresía."
    >
      <nav aria-label="Mi seguimiento" className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.href} interactive padding="lg">
            <CardTitle className="flex items-center gap-3 text-lg">
              <section.icon
                aria-hidden="true"
                className="size-5 shrink-0 text-brand"
              />
              {/*
                El enlace se estira sobre toda la tarjeta con `after:inset-0`,
                así que el objetivo táctil es la tarjeta entera y no solo el
                texto del título.
              */}
              <Link
                href={section.href}
                className="rounded-lg after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {section.label}
              </Link>
            </CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </Card>
        ))}
      </nav>
    </Workspace>
  );
}
