import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { db, RowDataPacket } from "@/lib/db";
import { getLimits, getPlatformSettings } from "@/lib/catalog";
import { ownerStorageUsed } from "@/lib/surprises";
import AppHeader from "@/components/AppHeader";
import DashboardClient, { SurpriseCard } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My surprises", robots: { index: false } };

export default async function Dashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");
  const settings = await getPlatformSettings();
  const limits = getLimits(settings);
  const pool = await db();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.id, s.slug, s.title, s.is_published, o.name AS occasion_name, o.emoji AS occasion_emoji
     FROM surprises s LEFT JOIN occasions o ON o.id = s.occasion_id WHERE s.owner_id = ? ORDER BY s.created_at DESC`, [user.id]);
  const cards: SurpriseCard[] = rows.map(r => ({ id: r.id, slug: r.slug, title: r.title, published: !!r.is_published, occasion: r.occasion_name || "Surprise", emoji: r.occasion_emoji || "🎁" }));
  const used = await ownerStorageUsed(user.id);
  const unlimited = user.role === "admin";
  const atLimit = !unlimited && cards.length >= limits.maxSurprises;

  return <div className="min-h-screen bg-[#fffaf7]">
    <AppHeader user={user} brand={settings.brand_name} />
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">My surprises</h1>
          <p className="mt-1 text-sm text-roseink/60">{unlimited ? `${cards.length} surprises` : `${cards.length} of ${limits.maxSurprises} surprises`} · {(used / 1048576).toFixed(1)} MB{unlimited ? "" : ` of ${Math.round(limits.maxStorageBytes / 1048576)} MB`} used</p>
        </div>
        {atLimit ? <span className="rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-berry">Surprise limit reached</span>
          : <Link href="/dashboard/new" className="inline-flex items-center gap-2 rounded-full bg-roseink px-5 py-3 font-bold text-white hover:bg-berry"><Plus size={16} /> New surprise</Link>}
      </div>
      <DashboardClient cards={cards} canCreate={!atLimit} />
    </main>
  </div>;
}
