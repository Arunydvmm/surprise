"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, ExternalLink } from "lucide-react";
import Toast, { ToastState } from "@/components/Toast";

const inp = "mt-1.5 w-full rounded-xl border border-rose-100 bg-white px-4 py-3 outline-none focus:border-berry focus:ring-4 focus:ring-pink-100";

export default function SharePanel(p: { id: string; title: string; slug: string; published: boolean; hasPassword: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState(p.title), [slug, setSlug] = useState(p.slug), [password, setPassword] = useState("");
  const [published, setPublished] = useState(p.published), [hasPassword, setHasPassword] = useState(p.hasPassword);
  const [toast, setToast] = useState<ToastState>(null);
  const [busy, setBusy] = useState(false);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = `${origin}/s/${p.slug}`;

  async function patch(body: Record<string, unknown>, ok: string) {
    setBusy(true);
    const res = await fetch(`/api/surprises/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setToast({ kind: "error", text: data.error || "Could not save." }); return false; }
    setToast({ kind: "success", text: ok }); return data;
  }
  async function saveDetails() { const d = await patch({ title, slug }, "Saved."); if (d && d.slug !== p.slug) router.replace(`/dashboard/s/${p.id}/share`), router.refresh(); }
  async function savePassword() { if (await patch({ password }, "New password saved. Anyone who had the old one will need the new one.")) { setPassword(""); setHasPassword(true); } }
  async function togglePublish() { const d = await patch({ is_published: !published }, !published ? "Published. Anyone with the link and password can open it." : "Unpublished. The link no longer opens."); if (d) setPublished(!published); }
  async function remove() {
    if (!confirm(`Delete "${p.title}"? Its photos, music and text will be removed for good.`)) return;
    const res = await fetch(`/api/surprises/${p.id}`, { method: "DELETE" });
    if (res.ok) router.push("/dashboard"); else setToast({ kind: "error", text: "Could not delete." });
  }
  async function copy() { try { await navigator.clipboard.writeText(link); setToast({ kind: "success", text: "Link copied." }); } catch { setToast({ kind: "error", text: "Could not copy the link." }); } }

  return <div className="space-y-6">
    <Toast toast={toast} onClose={() => setToast(null)} />
    <Link href={`/dashboard/s/${p.id}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-berry"><ArrowLeft size={14} /> Back to editing</Link>
    <h1 className="text-3xl font-black tracking-tight">Link and password</h1>

    <section className="rounded-3xl border border-rose-100 bg-white p-6">
      <div className="flex items-center justify-between gap-3"><b>Status</b><span className={`rounded-full px-3 py-1 text-xs font-bold ${published ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-roseink/60"}`}>{published ? "Published" : "Draft"}</span></div>
      <p className="mt-2 text-sm text-roseink/65">{published ? "Anyone who has the link and the password can open this surprise." : hasPassword ? "Only you can see it right now. Publish it when it is ready." : "Set a password below, then publish."}</p>
      <button disabled={busy || (!published && !hasPassword)} onClick={togglePublish} className="mt-4 rounded-full bg-roseink px-5 py-2.5 text-sm font-bold text-white hover:bg-berry disabled:opacity-50">{published ? "Unpublish" : "Publish"}</button>
    </section>

    <section className="rounded-3xl border border-rose-100 bg-white p-6">
      <b>Your link</b>
      <div className="mt-3 flex items-center gap-2"><code className="min-w-0 flex-1 truncate rounded-xl bg-rose-50/70 px-3 py-2.5 text-sm">{link}</code>
        <button onClick={copy} aria-label="Copy link" className="grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-berry"><Copy size={16} /></button>
        <a href={link} target="_blank" rel="noreferrer" aria-label="Open link" className="grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-berry"><ExternalLink size={16} /></a></div>
      <p className="mt-2 text-xs text-roseink/55">Send the link and the password in separate messages for extra privacy.</p>
    </section>

    <section className="rounded-3xl border border-rose-100 bg-white p-6">
      <label className="block text-sm font-semibold">Title (only you see this)<input className={inp} maxLength={80} value={title} onChange={e => setTitle(e.target.value)} /></label>
      <label className="mt-4 block text-sm font-semibold">Link name<input className={inp} maxLength={40} value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
        <span className="mt-1 block text-xs font-normal text-roseink/55">Changing it makes the old link stop working.</span></label>
      <button disabled={busy} onClick={saveDetails} className="mt-4 rounded-full bg-roseink px-5 py-2.5 text-sm font-bold text-white hover:bg-berry disabled:opacity-50">Save</button>
    </section>

    <section className="rounded-3xl border border-rose-100 bg-white p-6">
      <label className="block text-sm font-semibold">{hasPassword ? "Set a new password" : "Set a password"}<input className={inp} type="text" autoComplete="off" minLength={4} maxLength={100} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 4 characters" /></label>
      <p className="mt-1 text-xs text-roseink/55">{hasPassword ? "The current password is stored securely and cannot be shown. A new one replaces it." : "No password is set yet."}</p>
      <button disabled={busy || password.length < 4} onClick={savePassword} className="mt-4 rounded-full bg-roseink px-5 py-2.5 text-sm font-bold text-white hover:bg-berry disabled:opacity-50">Save password</button>
    </section>

    <section className="rounded-3xl border border-red-100 bg-white p-6"><b className="text-red-700">Delete this surprise</b>
      <p className="mt-1 text-sm text-roseink/65">Removes the link, photos, music and text for good.</p>
      <button onClick={remove} className="mt-4 rounded-full border border-red-200 px-5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50">Delete surprise</button></section>
  </div>;
}
