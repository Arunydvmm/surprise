"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Pencil, Plus, Share2, Trash2 } from "lucide-react";
import Toast, { ToastState } from "@/components/Toast";

export type SurpriseCard = { id: string; slug: string; title: string; published: boolean; occasion: string; emoji: string };

export default function DashboardClient({ cards, canCreate }: { cards: SurpriseCard[]; canCreate: boolean }) {
  const router = useRouter();
  const [toast, setToast] = useState<ToastState>(null);
  const [busy, setBusy] = useState("");

  async function act(id: string, kind: "delete" | "duplicate", title: string) {
    if (kind === "delete" && !confirm(`Delete "${title}"? Its photos, music and text will be removed for good.`)) return;
    setBusy(id);
    const res = await fetch(`/api/surprises/${id}${kind === "duplicate" ? "/duplicate" : ""}`, { method: kind === "delete" ? "DELETE" : "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) { setToast({ kind: "error", text: data.error || "Something went wrong." }); return; }
    setToast({ kind: "success", text: kind === "delete" ? "Deleted." : "Duplicated. The copy is unpublished." });
    router.refresh();
  }
  async function copy(slug: string) {
    try { await navigator.clipboard.writeText(`${window.location.origin}/s/${slug}`); setToast({ kind: "success", text: "Link copied. Share the password separately." }); } catch { setToast({ kind: "error", text: "Could not copy the link." }); }
  }

  if (!cards.length) return <div className="mt-10 rounded-3xl border border-dashed border-rose-200 bg-white p-12 text-center">
    <p className="text-5xl">🎁</p><h2 className="mt-4 text-xl font-black">You have not made a surprise yet</h2>
    <p className="mx-auto mt-2 max-w-sm text-sm text-roseink/60">Pick an occasion, add a few memories, and share the link.</p>
    {canCreate && <Link href="/dashboard/new" className="mt-6 inline-flex items-center gap-2 rounded-full bg-roseink px-6 py-3 font-bold text-white hover:bg-berry"><Plus size={16} /> Make your first surprise</Link>}
  </div>;

  return <>
    <Toast toast={toast} onClose={() => setToast(null)} />
    <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(c => <li key={c.id} className="flex flex-col rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-100 text-2xl">{c.emoji}</span>
          <div className="min-w-0"><h2 className="truncate font-black">{c.title}</h2><p className="text-xs text-roseink/55">{c.occasion}</p></div>
          <span className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${c.published ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-roseink/60"}`}>{c.published ? "Published" : "Draft"}</span>
        </div>
        <p className="mt-4 truncate rounded-xl bg-rose-50/70 px-3 py-2 text-xs text-roseink/70">/s/{c.slug}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
          <Link href={`/dashboard/s/${c.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-roseink px-3.5 py-2 text-white hover:bg-berry"><Pencil size={13} /> Edit</Link>
          <Link href={`/dashboard/s/${c.id}/share`} className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3.5 py-2 text-berry"><Share2 size={13} /> Link and password</Link>
          <button onClick={() => copy(c.slug)} className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3.5 py-2 text-berry"><Copy size={13} /> Copy link</button>
          <a href={`/s/${c.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3.5 py-2 text-berry"><ExternalLink size={13} /> Open</a>
        </div>
        <div className="mt-auto flex gap-4 pt-4 text-xs font-semibold text-roseink/55">
          <button disabled={busy === c.id || !canCreate} onClick={() => act(c.id, "duplicate", c.title)} className="hover:text-berry disabled:opacity-40">Duplicate</button>
          <button disabled={busy === c.id} onClick={() => act(c.id, "delete", c.title)} className="inline-flex items-center gap-1 hover:text-red-600"><Trash2 size={12} /> Delete</button>
        </div>
      </li>)}
    </ul>
  </>;
}
