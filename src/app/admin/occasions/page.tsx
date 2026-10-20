import { listThemes } from "@/lib/catalog";
import OccasionManager from "@/components/admin/OccasionManager";
export const dynamic = "force-dynamic";
export default async function AdminOccasions() {
  const themes = await listThemes();
  return <div className="space-y-5"><div><h1 className="text-3xl font-black tracking-tight">Occasions</h1><p className="mt-1 text-sm text-roseink/60">Templates users pick from when they make a surprise. Add, edit, hide or remove them. Existing surprises are never changed.</p></div>
    <OccasionManager themes={themes.map(t => ({ id: t.id, name: t.name }))} /></div>;
}
