import type { Metadata } from "next";
import { PeoplePanel } from "@/components/auth/PeoplePanel";
import { BusinessOverview } from "@/components/progress/BusinessOverview";
import { requireAdmin } from "@/lib/progress/access";
import { getBusinessOverview } from "@/lib/progress/overview-queries";

export const metadata: Metadata = {
  title: "Panel de administración",
};

/**
 * El panorama abre el panel y la lista de personas lo cierra: los dos van
 * dentro del mismo shell, así que `PeoplePanel` recibe el panorama en vez de
 * montarse detrás de él.
 */
export default async function Page() {
  await requireAdmin();
  const overview = await getBusinessOverview();

  return (
    <PeoplePanel role="admin" overview={<BusinessOverview overview={overview} />} />
  );
}
