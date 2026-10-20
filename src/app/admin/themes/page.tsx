import ThemeManager from "@/components/admin/ThemeManager";
export const dynamic = "force-dynamic";
export default function AdminThemes() {
  return <div className="space-y-5"><div><h1 className="text-3xl font-black tracking-tight">Themes</h1><p className="mt-1 text-sm text-roseink/60">Colours and fonts. Creators pick a theme for each surprise.</p></div><ThemeManager /></div>;
}
