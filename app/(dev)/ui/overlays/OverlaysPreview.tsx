"use client";

import { useState } from "react";

import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { inputClass } from "@/components/auth/FormParts";

/*
  Catálogo de las capas de la fase 3. No es una pantalla del producto: sirve
  para revisar en el navegador, en claro y en oscuro y a 375 px, cómo se
  comportan diálogo, confirmación y avisos antes de llevarlos a las pantallas
  reales. La ruta no existe en producción.
*/

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3 rounded-xl border border-border bg-surface p-5 shadow-low">
      <div className="grid gap-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

function ToastSamples() {
  const toast = useToast();
  return (
    <>
      <Button
        size="lg"
        className="min-h-11"
        onClick={() =>
          toast.success("Rutina guardada", {
            description: "El paciente ya la ve en su inicio.",
          })
        }
      >
        Éxito
      </Button>
      <Button
        variant="outline"
        size="lg"
        className="min-h-11"
        onClick={() =>
          toast.error("No se pudo guardar la rutina", {
            description: "Revisa la conexión e inténtalo de nuevo.",
          })
        }
      >
        Error
      </Button>
      <Button
        variant="outline"
        size="lg"
        className="min-h-11"
        onClick={() =>
          toast.warning("El ejercicio tiene una contraindicación", {
            description: "Se añadió igualmente: la decisión es clínica.",
          })
        }
      >
        Aviso
      </Button>
      <Button
        variant="outline"
        size="lg"
        className="min-h-11"
        onClick={() => toast.info("La membresía vence en 5 días")}
      >
        Informativo
      </Button>
    </>
  );
}

function FormDialogSample() {
  const [saved, setSaved] = useState<string | null>(null);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="lg" className="min-h-11">
            Con formulario
          </Button>
        }
      />
      <DialogPanel>
        <DialogHeader
          title="Registrar el dolor"
          description="Del 0 al 10, cómo se siente hoy la zona tratada."
        />
        <form
          id="pain-sample-form"
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get("painLevel");
            setSaved(String(value ?? ""));
          }}
        >
          <DialogBody>
            <label className="grid gap-2 text-sm font-medium">
              Nivel de dolor
              <input
                className={inputClass}
                name="painLevel"
                type="number"
                min={0}
                max={10}
                defaultValue={3}
                required
              />
            </label>
          </DialogBody>
        </form>
        <DialogFooter>
          <DialogClose
            render={
              <Button
                variant="outline"
                size="lg"
                className="min-h-11 w-full sm:w-auto"
              >
                Cancelar
              </Button>
            }
          />
          <Button
            type="submit"
            form="pain-sample-form"
            size="lg"
            className="min-h-11 w-full sm:w-auto"
          >
            Guardar
          </Button>
        </DialogFooter>
        {saved ? (
          <p className="text-sm text-muted-foreground">
            Último valor enviado: {saved}
          </p>
        ) : null}
      </DialogPanel>
    </Dialog>
  );
}

export function OverlaysPreview() {
  return (
    <ToastProvider>
      <div className="mx-auto grid max-w-3xl gap-4 p-4 sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <h1 className="text-2xl font-semibold text-foreground">
              Capas: diálogos, confirmaciones y avisos
            </h1>
            <p className="text-sm text-muted-foreground">
              Fase 3 del rediseño. Revísalo en claro y en oscuro, y a 375 px de
              ancho.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <Section
          title="Diálogo"
          hint="Cierra al pulsar fuera, con Escape o con la equis. En móvil sube desde abajo."
        >
          <Dialog>
            <DialogTrigger
              render={
                <Button size="lg" className="min-h-11">
                  Simple
                </Button>
              }
            />
            <DialogPanel>
              <DialogHeader
                title="Sustituir el ejercicio"
                description="Se conserva la posición y la prescripción; el historial de sesiones no cambia."
              />
              <DialogBody>
                <p className="text-sm text-muted-foreground">
                  Contenido de ejemplo para ver el desplazamiento y el alto
                  máximo del panel.
                </p>
              </DialogBody>
              <DialogFooter>
                <DialogClose
                  render={
                    <Button
                      variant="outline"
                      size="lg"
                      className="min-h-11 w-full sm:w-auto"
                    >
                      Cerrar
                    </Button>
                  }
                />
              </DialogFooter>
            </DialogPanel>
          </Dialog>
          <FormDialogSample />
        </Section>

        <Section
          title="Confirmación"
          hint="No cierra al pulsar fuera. Muestra el error de la acción sin cerrarse y bloquea la salida mientras trabaja."
        >
          <ConfirmDialog
            trigger={
              <Button variant="destructive" size="lg" className="min-h-11">
                Quitar (correcto)
              </Button>
            }
            title="¿Quitar el ejercicio de la rutina?"
            description="El paciente dejará de verlo en su próxima sesión."
            confirmLabel="Quitar"
            tone="danger"
            onConfirm={() =>
              new Promise((resolve) => setTimeout(resolve, 1200))
            }
          />
          <ConfirmDialog
            trigger={
              <Button variant="outline" size="lg" className="min-h-11">
                Quitar (falla)
              </Button>
            }
            title="¿Quitar el ejercicio de la rutina?"
            description="Este ejemplo lanza un error para ver cómo se muestra."
            confirmLabel="Quitar"
            tone="danger"
            onConfirm={() =>
              new Promise((_, reject) =>
                setTimeout(
                  () =>
                    reject(
                      new Error(
                        "El paciente ya ejecutó este ejercicio. Sustitúyelo para conservar su historial.",
                      ),
                    ),
                  1200,
                ),
              )
            }
          />
        </Section>

        <Section
          title="Avisos"
          hint="Se apilan, se descartan con la equis o deslizándolos, y el de error dura el doble."
        >
          <ToastSamples />
        </Section>
      </div>
    </ToastProvider>
  );
}
