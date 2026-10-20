"use client";
import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import Toast, { ToastState } from "@/components/Toast";
import type { Theme } from "@/lib/themes";

const COLORS: [keyof Theme, string][] = [["roseink", "Text"], ["berry", "Accent"], ["petal", "Soft accent"], ["blush", "Tint"], ["cream", "Cream"], ["bg", "Page background"]];
const FONTS: [string, string][] = [
  ['ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif', "Clean sans"], ['ui-rounded, "Nunito", "Segoe UI", system-ui, sans-serif', "Rounded"], ['Georgia, "Times New Roman", serif', "Serif"]];
const blank: Theme = { id: "", name: "", emoji: "🎨", roseink: "#4c2638", berry: "#b84e73", petal: "#f7c6d4", blush: "#fff0f4", cream: "#fffaf5", bg: "#fffaf7", font: FONTS[0][0], enabled: true, sort_order: 0 };
const inp = "mt-1 w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-berry";

export default function ThemeManager() {
  const [items, setItems] = useState<Theme[]>([]);
  const [t, setT] = useState<Theme>(blank), [isNew, setIsNew] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  async function load() { const r = await fetch("/api/admin/catalog/themes"); const d = await r.json().catch(() => ({})); setItems(d.items || []); }
  useEffect(() => { load(); }, []);
  const pick = (x: Theme) => { setT(x); setIsNew(false); };
  async function save() {
    const res = await fetch("/api/admin/catalog/themes", { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(t) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setToast({ kind: "error", text: d.error || "Could not save." });
    setToast({ kind: "success", text: "Saved." }); setIsNew(false); load();
  }
  async function remove() {
    if (!confirm(`Delete the theme "${t.name}"? Surprises using it fall back to the default theme.`)) return;
    const res = await fetch("/api/admin/catalog/themes", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setToast({ kind: "error", text: d.error || "Could not delete." });
    setToast({ kind: "success", text: "Deleted." }); setT(blank); setIsNew(true); load();
  }
  return <div className="grid gap-6 lg:grid-cols-[260px_1fr]"><Toast toast={toast} onClose={() => setToast(null)} />
    <aside className="space-y-2">
      <button onClick={() => { setT(blank); setIsNew(true); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-roseink px-4 py-3 text-sm font-bold text-white"><Plus size={15} /> New theme</button>
      {items.map(x => <button key={x.id} onClick={() => pick(x)} className={`flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-3 text-left text-sm ${t.id === x.id && !isNew ? "border-berry" : "border-transparent ring-1 ring-rose-100"}`}>
        <span className="text-xl">{x.emoji}</span><span className="min-w-0 flex-1"><b className="block truncate">{x.name}</b><span className="mt-1 flex gap-1">{[x.roseink, x.berry, x.petal, x.blush].map(c => <i key={c} className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: c }} />)}</span></span>{!x.enabled && <span className="text-xs text-roseink/50">Off</span>}</button>)}
    </aside>
    <section className="space-y-5 rounded-3xl border border-rose-100 bg-white p-6">
      <h2 className="font-black">{isNew ? "New theme" : `Edit ${t.name}`}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-semibold">Id{isNew ? "" : " (fixed)"}<input className={inp} value={t.id} disabled={!isNew} onChange={e => setT({ ...t, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="sunset" /></label>
        <label className="text-sm font-semibold">Name<input className={inp} value={t.name} onChange={e => setT({ ...t, name: e.target.value })} /></label>
        <label className="text-sm font-semibold">Emoji<input className={inp} value={t.emoji} onChange={e => setT({ ...t, emoji: e.target.value })} /></label>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">{COLORS.map(([k, label]) => <label key={k} className="text-sm font-semibold">{label}
        <span className="mt-1 flex items-center gap-2"><input type="color" value={String(t[k])} onChange={e => setT({ ...t, [k]: e.target.value })} className="h-10 w-12 rounded-lg border border-rose-100 bg-white" aria-label={label} /><input className={inp + " mt-0"} value={String(t[k])} onChange={e => setT({ ...t, [k]: e.target.value })} /></span></label>)}</div>
      <label className="block text-sm font-semibold">Font<select className={inp} value={FONTS.some(f => f[0] === t.font) ? t.font : "custom"} onChange={e => e.target.value !== "custom" && setT({ ...t, font: e.target.value })}>{FONTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}<option value="custom">Custom (below)</option></select>
        <input className={inp} value={t.font} onChange={e => setT({ ...t, font: e.target.value })} /></label>
      <div className="rounded-2xl p-5" style={{ background: t.bg, color: t.roseink, fontFamily: t.font }}><b className="text-lg">{t.emoji} {t.name || "Preview"}</b><p className="mt-1 text-sm">A little place for our memories.</p>
        <span className="mt-3 inline-block rounded-full px-4 py-2 text-sm font-bold text-white" style={{ background: t.berry }}>Open your surprise</span><span className="ml-2 inline-block rounded-full px-4 py-2 text-sm" style={{ background: t.petal }}>Soft</span></div>
      <div className="flex flex-wrap items-center gap-5"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={!!t.enabled} onChange={e => setT({ ...t, enabled: e.target.checked })} /> Available to users</label>
        <label className="flex items-center gap-2 text-sm font-semibold">Order<input type="number" className={inp + " mt-0 w-24"} value={t.sort_order ?? 0} onChange={e => setT({ ...t, sort_order: Number(e.target.value) })} /></label></div>
      <div className="flex gap-3"><button onClick={save} className="inline-flex items-center gap-2 rounded-full bg-roseink px-6 py-3 text-sm font-bold text-white"><Save size={15} /> Save theme</button>
        {!isNew && <button onClick={remove} className="inline-flex items-center gap-2 rounded-full border border-red-200 px-5 py-3 text-sm font-bold text-red-600"><Trash2 size={15} /> Delete</button>}</div>
    </section></div>;
}
