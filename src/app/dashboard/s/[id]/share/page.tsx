import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { canManage, getSurpriseById } from "@/lib/surprises";
import { getPlatformSettings } from "@/lib/catalog";
import AppHeader from "@/components/AppHeader";
import SharePanel from "@/components/SharePanel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Link and password", robots: { index: false } };

export default async function Share({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/dashboard/s/${params.id}/share`);
  const s = await getSurpriseById(params.id);
  if (!s || !canManage(user, s)) notFound();
  const settings = await getPlatformSettings();
  return <div className="min-h-screen bg-[#fffaf7]">
    <AppHeader user={user} brand={settings.brand_name} />
    <main className="mx-auto max-w-2xl px-5 py-10">
      <SharePanel id={s.id} title={s.title} slug={s.slug} published={s.is_published} hasPassword={!!s.password_hash} />
    </main>
  </div>;
}
