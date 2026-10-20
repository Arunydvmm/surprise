import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getPlatformSettings } from "@/lib/catalog";
import AppHeader from "@/components/AppHeader";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false } };

const NAV = [["/admin", "Overview"], ["/admin/users", "Users"], ["/admin/surprises", "Surprises"], ["/admin/occasions", "Occasions"], ["/admin/themes", "Themes"], ["/admin/settings", "Settings"]];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") notFound();
  const settings = await getPlatformSettings();
  return <div className="min-h-screen bg-[#fffaf7]">
    <AppHeader user={user} brand={settings.brand_name} />
    <div className="mx-auto max-w-6xl px-5 py-8">
      <nav className="mb-8 flex flex-wrap gap-2 text-sm font-bold">{NAV.map(([href, label]) => <Link key={href} href={href} className="rounded-full bg-white px-4 py-2 ring-1 ring-rose-100 hover:ring-berry">{label}</Link>)}</nav>
      {children}
    </div>
  </div>;
}
