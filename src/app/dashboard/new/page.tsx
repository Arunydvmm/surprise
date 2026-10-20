import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getPlatformSettings, listOccasions } from "@/lib/catalog";
import AppHeader from "@/components/AppHeader";
import NewSurpriseForm from "@/components/NewSurpriseForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New surprise", robots: { index: false } };

export default async function NewSurprise({ searchParams }: { searchParams: { occasion?: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard/new");
  const [settings, occasions] = await Promise.all([getPlatformSettings(), listOccasions(true)]);
  return <div className="min-h-screen bg-[#fffaf7]">
    <AppHeader user={user} brand={settings.brand_name} />
    <main className="mx-auto max-w-4xl px-5 py-10">
      <NewSurpriseForm occasions={occasions.map(o => ({ id: o.id, slug: o.slug, name: o.name, emoji: o.emoji, description: o.description }))} preselect={searchParams.occasion || ""} />
    </main>
  </div>;
}
