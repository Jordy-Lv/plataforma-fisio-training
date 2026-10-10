"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailPanel } from "@/components/ui/DetailDialog";
import { useToast } from "@/components/ui/Toast";
import { MembershipForm } from "@/components/progress/MembershipForm";

type Option = { id: string; label: string };

/**
 * El alta de una membresía en un modal, abierto desde la cabecera de
 * `/memberships`. `DetailPanel` no usa portal: el formulario sigue en el HTML
 * del servidor (ADR-0008), solo oculto hasta que se abre.
 *
 * Al registrar, el modal se cierra, avisa con un toast y el formulario vuelve
 * a nacer vacío (`key`) para la siguiente alta.
 */
export function NewMembershipDialog({ patients, plans }: { patients: Option[]; plans: Option[] }) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const toast = useToast();

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
        aria-expanded={open} className="min-h-11">
        <Plus aria-hidden className="size-4" />
        Registrar una membresía
      </Button>
      <DetailPanel title="Registrar una membresía"
        description="Solo lleva el control de la mensualidad; no procesa pagos."
        open={open} onClose={() => setOpen(false)}>
        <MembershipForm key={formKey} patients={patients} plans={plans}
          onSuccess={(message) => {
            setOpen(false);
            setFormKey((key) => key + 1);
            toast.success(message);
          }} />
      </DetailPanel>
    </>
  );
}
