import { z } from "zod";

const email = z
  .string({ error: "Escribe un correo válido." })
  .trim()
  .email("Escribe un correo válido.")
  .max(254, "El correo es demasiado largo.");
export const loginSchema = z.object({
  email,
  password: z
    .string({ error: "Escribe tu contraseña." })
    .min(1, "Escribe tu contraseña.")
    .max(256, "La contraseña es demasiado larga."),
});
export const recoverySchema = z.object({ email });
export const passwordSchema = z
  .object({
    password: z
      .string({ error: "Escribe una contraseña de al menos 8 caracteres." })
      .min(8, "Usa al menos 8 caracteres.")
      .max(256, "Usa como máximo 256 caracteres."),
    confirmPassword: z.string({ error: "Repite la contraseña." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas deben coincidir.",
    path: ["confirmPassword"],
  });
export const roleSchema = z.enum(["admin", "professional", "patient"]);
export type UserRole = z.infer<typeof roleSchema>;
// `email` se devuelve tras un fallo de acceso para volver a pintarlo en el
// formulario: reescribir el correo en cada reintento es una fricción inútil.
export type AuthState = { error?: string; success?: string; email?: string };
