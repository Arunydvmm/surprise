import { getPlatformSettings, listThemes } from "@/lib/catalog";
import SettingsForm from "@/components/admin/SettingsForm";
export const dynamic = "force-dynamic";
export default async function AdminSettings() {
  const [settings, themes] = await Promise.all([getPlatformSettings(), listThemes()]);
  return <div className="space-y-5"><h1 className="text-3xl font-black tracking-tight">Settings</h1><SettingsForm initial={settings} themes={themes.map(t => ({ id: t.id, name: t.name }))} /></div>;
}
