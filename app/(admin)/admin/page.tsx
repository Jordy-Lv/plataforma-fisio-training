import type { Metadata } from "next";
import { PeoplePanel } from "@/components/auth/PeoplePanel";
import { BusinessOverview } from "@/components/progress/BusinessOverview";
import { requireAdmin } from "@/lib/progress/access";
import { getBusinessOverview } from "@/lib/progress/overview-queries";

export const metadata: Metadata = {
  title: "Panel de administración",
};

/**
 * El panorama abre el panel y `PeoplePanel` —que trae su propio encabezado—
 * lo cierra. El contenedor repite el ancho y el margen de `Workspace` para que
 * las dos partes se lean como una sola página.
 */
export default async function Page() {
  await requireAdmin();
  const overview = await getBusinessOverview();

  return (
    <>
      <div className="mx-auto max-w-6xl px-5 pt-5 sm:px-10 sm:pt-8">
        <BusinessOverview overview={overview} />
      </div>
      <PeoplePanel role="admin" />
    </>
  );
}
