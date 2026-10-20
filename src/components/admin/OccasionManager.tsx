"use client";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Plus, Save, Trash2 } from "lucide-react";
import Toast, { ToastState } from "@/components/Toast";
import { EFFECTS, STAGE_TYPES } from "@/lib/stages";
import type { Occasion } from "@/lib/catalog";
import type { SeedStage } from "@/lib/seed";

type Th = { id: string; name: string };
const inp = "mt-1 w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-berry";
const OPTION_FIELDS: Record<string, [string, string][]> = {
  ask: [["noText", "\"No\" button text"]], balloons: [["emoji", "Balloon emoji"], ["popEmoji", "After a pop"], ["doneMessage", "Message when all popped"]], camera: [["tapHint", "Hint under camera"], ["count", "Photos to print (blank = all)"]]
};
const ITEM_HINT: Record<string, string> = { ask: "Please-messages, one per line", balloons: "Balloon messages, one per line", letters: "Letters, one per line" };
const blank = (): Occasion => ({ id: "", slug: "", name: "", emoji: "🎁", description: "", theme_id: null, enabled: true, sort_order: 0, effects: ["hearts", "confetti"],
  defaults: { friend_nickname: "{name}", welcome_title: "Hey {name}, this is for you", welcome_message: "I made this just for you.", final_letter: "Thank you for being you, {name}." },
  stages: [{ type: "intro", title: "Hey {name}!", subtitle: "", button_text: "Open your surprise", items: [] }, { type: "memories", title: "Our favourite memories", subtitle: "", button_text: "Continue", items: [] }, { type: "finale", title: "One last thing", subtitle: "", button_text: "Replay", items: [] }] });

export default function OccasionManager({ themes }: { themes: Th[] }) {
  const [items, setItems] = useState<Occasion[]>([]);
  const [o, setO] = useState<Occasion>(blank()), [isNew, setIsNew] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  async function load() { const r = await fetch("/api/admin/catalog/occasions"); const d = await r.json().catch(() => ({})); setItems(d.items || []); }
  useEffect(() => { load(); }, []);

  const setStage = (i: number, p: Partial<SeedStage>) => setO(x => ({ ...x, stages: x.stages.map((s, j) => j === i ? { ...s, ...p } : s) }));
  const move = (i: number, d: number) => setO(x => { const a = [...x.stages], j = i + d; if (j < 0 || j >= a.length) return x; [a[i], a[j]] = [a[j], a[i]]; return { ...x, stages: a }; });
  async function save() {
    const res = await fetch("/api/admin/catalog/occasions", { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(o) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setToast({ kind: "error", text: d.error || "Could not save." });
    setToast({ kind: "success", text: "Saved." }); load(); if (isNew) { setO(blank()); }
  }
  async function remove() {
    if (!confirm(`Delete "${o.name}"? Surprises already made from it keep working.`)) return;
    const res = await fetch("/api/admin/catalog/occasions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: o.id }) });
    if (!res.ok) return setToast({ kind: "error", text: "Could not delete." });
    setToast({ kind: "success", text: "Deleted." }); setO(blank()); setIsNew(true); load();
  }

  return <div className="grid gap-6 lg:grid-cols-[260px_1fr]"><Toast toast={toast} onClose={() => setToast(null)} />
    <aside className="space-y-2">
      <button onClick={() => { setO(blank()); setIsNew(true); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-roseink px-4 py-3 text-sm font-bold text-white"><Plus size={15} /> New occasion</button>
      {items.map(x => <button key={x.id} onClick={() => { setO(x); setIsNew(false); }} className={`flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-3 text-left text-sm ${o.id === x.id && !isNew ? "border-berry" : "border-transparent ring-1 ring-rose-100"}`}>
        <span className="text-xl">{x.emoji}</span><b className="min-w-0 flex-1 truncate">{x.name}</b>{!x.enabled && <span className="text-xs text-roseink/50">Off</span>}</button>)}
    </aside>
    <section className="space-y-6 rounded-3xl border border-rose-100 bg-white p-6">
      <h2 className="font-black">{isNew ? "New occasion" : `Edit ${o.name}`}</h2>
      <div className="grid gap-4 sm:grid-cols-4">
        <label className="text-sm font-semibold sm:col-span-2">Name<input className={inp} value={o.name} onChange={e => setO({ ...o, name: e.target.value })} /></label>
        <label className="text-sm font-semibold">Emoji<input className={inp} value={o.emoji} onChange={e => setO({ ...o, emoji: e.target.value })} /></label>
        <label className="text-sm font-semibold">Slug<input className={inp} value={o.slug} onChange={e => setO({ ...o, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="birthday" /></label>
        <label className="text-sm font-semibold sm:col-span-4">Short description (shown on cards)<input className={inp} value={o.description} maxLength={300} onChange={e => setO({ ...o, description: e.target.value })} /></label>
        <label className="text-sm font-semibold sm:col-span-2">Default theme<select className={inp} value={o.theme_id || ""} onChange={e => setO({ ...o, theme_id: e.target.value || null })}><option value="">Platform default</option>{themes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Order<input type="number" className={inp} value={o.sort_order} onChange={e => setO({ ...o, sort_order: Number(e.target.value) })} /></label>
        <div className="flex flex-col justify-end gap-2 pb-2 text-sm font-semibold"><label className="flex items-center gap-2"><input type="checkbox" checked={o.enabled} onChange={e => setO({ ...o, enabled: e.target.checked })} /> Available to users</label></div>
        <div className="flex flex-wrap gap-5 text-sm font-semibold sm:col-span-4">Effects: {EFFECTS.map(f => <label key={f} className="flex items-center gap-2 font-normal"><input type="checkbox" checked={o.effects.includes(f)} onChange={e => setO({ ...o, effects: e.target.checked ? [...o.effects, f] : o.effects.filter(x => x !== f) })} /> {f}</label>)}</div>
      </div>

      <div><h3 className="font-bold">Starting words</h3><p className="text-xs text-roseink/55">Use {"{name}"} where the receiver's name should go. These are copied into every new surprise, and the creator can edit them.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">Welcome title<input className={inp} value={o.defaults.welcome_title} onChange={e => setO({ ...o, defaults: { ...o.defaults, welcome_title: e.target.value } })} /></label>
          <label className="text-sm font-semibold">Name shown to the receiver<input className={inp} value={o.defaults.friend_nickname} onChange={e => setO({ ...o, defaults: { ...o.defaults, friend_nickname: e.target.value } })} /></label>
          <label className="text-sm font-semibold sm:col-span-2">Welcome message<input className={inp} value={o.defaults.welcome_message} onChange={e => setO({ ...o, defaults: { ...o.defaults, welcome_message: e.target.value } })} /></label>
          <label className="text-sm font-semibold sm:col-span-2">Final letter<textarea rows={3} className={inp} value={o.defaults.final_letter} onChange={e => setO({ ...o, defaults: { ...o.defaults, final_letter: e.target.value } })} /></label></div></div>

      <div><h3 className="font-bold">Slide template</h3><p className="text-xs text-roseink/55">The slides a new surprise starts with, in order.</p>
        <div className="mt-3 space-y-3">{o.stages.map((s, i) => <div key={i} className="rounded-2xl border border-rose-100 p-4">
          <div className="flex items-center justify-between gap-2"><select className={inp + " mt-0 w-40 capitalize"} value={s.type} onChange={e => setStage(i, { type: e.target.value, options: {} })}>{STAGE_TYPES.map(t => <option key={t}>{t}</option>)}</select>
            <div className="flex gap-2"><button aria-label="Move up" onClick={() => move(i, -1)}><ArrowUp size={16} /></button><button aria-label="Move down" onClick={() => move(i, 1)}><ArrowDown size={16} /></button>
              <button aria-label="Duplicate" onClick={() => setO(x => ({ ...x, stages: [...x.stages.slice(0, i + 1), JSON.parse(JSON.stringify(s)), ...x.stages.slice(i + 1)] }))}><Copy size={16} /></button>
              <button aria-label="Remove" className="text-red-500" onClick={() => setO(x => ({ ...x, stages: x.stages.filter((_, j) => j !== i) }))}><Trash2 size={16} /></button></div></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-semibold">Title<input className={inp} value={s.title} onChange={e => setStage(i, { title: e.target.value })} /></label>
            <label className="text-sm font-semibold">Subtitle<input className={inp} value={s.subtitle} onChange={e => setStage(i, { subtitle: e.target.value })} /></label>
            <label className="text-sm font-semibold">Button text<input className={inp} value={s.button_text} onChange={e => setStage(i, { button_text: e.target.value })} /></label></div>
          {ITEM_HINT[s.type] && <label className="mt-3 block text-sm font-semibold">{ITEM_HINT[s.type]}<textarea rows={4} className={inp} value={s.items.join("\n")} onChange={e => setStage(i, { items: e.target.value.split("\n").filter(x => x.trim()) })} /></label>}
          {OPTION_FIELDS[s.type] && <div className="mt-3 grid gap-3 sm:grid-cols-3">{OPTION_FIELDS[s.type].map(([k, label]) => <label key={k} className="text-sm font-semibold">{label}<input className={inp} value={s.options?.[k] || ""} onChange={e => setStage(i, { options: { ...(s.options || {}), [k]: e.target.value } })} /></label>)}</div>}
        </div>)}
          <button onClick={() => setO(x => ({ ...x, stages: [...x.stages, { type: "memories", title: "New slide", subtitle: "", button_text: "Continue", items: [] }] }))} className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-4 py-2 text-sm font-bold text-berry"><Plus size={15} /> Add slide</button></div></div>

      <div className="flex gap-3"><button onClick={save} className="inline-flex items-center gap-2 rounded-full bg-roseink px-6 py-3 text-sm font-bold text-white"><Save size={15} /> Save occasion</button>
        {!isNew && <button onClick={remove} className="inline-flex items-center gap-2 rounded-full border border-red-200 px-5 py-3 text-sm font-bold text-red-600"><Trash2 size={15} /> Delete</button>}</div>
    </section></div>;
}
