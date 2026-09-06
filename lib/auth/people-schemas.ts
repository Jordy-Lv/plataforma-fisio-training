import { z } from "zod";
import { loginSchema } from "@/lib/auth/schemas";

export const specialtyLabels = {
  training: "Entrenamiento",
  physio: "Fisioterapia",
};
export const createPersonSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Escribe el nombre completo.")
      .max(120, "Usa como máximo 120 caracteres."),
    email: loginSchema.shape.email,
    phone: z.string().trim().max(30, "El teléfono es demasiado largo."),
    password: z
      .string()
      .min(8, "Usa al menos 8 caracteres en la contraseña inicial.")
      .max(72, "Usa como máximo 72 caracteres."),
    role: z.enum(["patient", "professional"], {
      error: "Selecciona el tipo de persona.",
    }),
    specialty: z.enum(["training", "physio"]).nullable(),
  })
  .refine(
    (d) =>
      d.role === "professional" ? d.specialty !== null : d.specialty === null,
    {
      message: "Selecciona la especialidad solo para un profesional.",
      path: ["specialty"],
    },
  );
export const assignmentSchema = z.object({
  patientId: z.string().uuid("Selecciona un paciente válido."),
  professionalId: z.string().uuid("Selecciona un profesional."),
  kind: z.enum(["training", "physio"], {
    error: "Selecciona la especialidad.",
  }),
});
export const deactivateSchema = z.object({
  personId: z.string().uuid("Selecciona una persona válida."),
  expectedAssignments: z.coerce.number().int().min(0),
  confirmation: z.literal("yes", { error: "Confirma la baja para continuar." }),
});
