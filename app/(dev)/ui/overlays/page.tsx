import { notFound } from "next/navigation";

import { OverlaysPreview } from "./OverlaysPreview";

export const metadata = { title: "Capas del sistema de diseño" };

/*
  Catálogo interno de la fase 3. Existe solo en desarrollo: no forma parte del
  alcance de la demo y no debe aparecer en el despliegue.
*/
export default function OverlaysCatalogPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <OverlaysPreview />;
}
