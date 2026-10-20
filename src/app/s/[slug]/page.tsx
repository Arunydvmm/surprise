import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { canManage, getSettingsFor, getSurpriseBySlug } from "@/lib/surprises";
import { hasUnlock } from "@/lib/unlock";
import { getOccasion, pickTheme } from "@/lib/catalog";
import { themeVars } from "@/lib/themes";
import SurpriseExperience from "@/components/SurpriseExperience";
import UnlockForm from "@/components/UnlockForm";

export const dynamic = "force-dynamic";
// The tab title never reveals anything about the surprise before it is unlocked.
export const metadata: Metadata = { title: "A little something for you 💗", robots: { index: false, follow: false } };

export default async function SurprisePage({ params }: { params: { slug: string } }) {
  const s = await getSurpriseBySlug(params.slug.toLowerCase());
  if (!s) notFound();
  const user = await getSessionUser();
  const manager = canManage(user, s);
  if (!s.is_published && !manager) return <main className="heart-field grid min-h-screen place-items-center p-6 text-center"><div className="max-w-sm"><p className="text-5xl">🎁</p><h1 className="mt-4 text-2xl font-black">Not ready yet</h1><p className="mt-2 text-sm text-roseink/65">This surprise has not been opened for viewing. Check back with the person who sent you the link.</p></div></main>;

  const settings = await getSettingsFor(s.id);
  const theme = await pickTheme(settings.theme);
  const unlocked = manager || await hasUnlock(s);
  const occasion = s.occasion_id ? await getOccasion(s.occasion_id) : null;
  const style = { ...themeVars(theme), background: theme.bg, fontFamily: theme.font, color: "rgb(var(--roseink))", minHeight: "100vh" } as React.CSSProperties;

  return <div style={style}>
    {manager && !s.is_published && <div className="bg-roseink px-4 py-2 text-center text-xs font-semibold text-white">Preview: this surprise is not published yet. <Link className="underline" href={`/dashboard/s/${s.id}/share`}>Publish it</Link></div>}
    {unlocked ? <SurpriseExperience slug={s.slug} canLock={!manager} /> : <UnlockForm slug={s.slug} emoji={occasion?.emoji || "🎁"} />}
  </div>;
}
