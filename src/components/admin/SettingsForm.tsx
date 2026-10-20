"use client";
import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import Toast, { ToastState } from "@/components/Toast";

type Th = { id: string; name: string };
const inp = "mt-1 w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-berry";
const parse = (v: string) => { try { const x = JSON.parse(v); return Array.isArray(x) ? x : []; } catch { return []; } };

function ListEditor({ label, value, onChange, fields }: { label: string; value: any[]; onChange: (v: any[]) => void; fields: [string, string, boolean?][] }) {
  return <div><h3 className="font-bold">{label}</h3><div className="mt-3 space-y-3">
    {value.map((row, i) => <div key={i} className="rounded-2xl border border-rose-100 p-4"><div className="grid gap-3 sm:grid-cols-2">{fields.map(([k, l, wide]) => <label key={k} className={`text-sm font-semibold ${wide ? "sm:col-span-2" : ""}`}>{l}
      {wide ? <textarea rows={2} className={inp} value={row[k] || ""} onChange={e => onChange(value.map((r, j) => j === i ? { ...r, [k]: e.target.value } : r))} /> : <input className={inp} value={row[k] || ""} onChange={e => onChange(value.map((r, j) => j === i ? { ...r, [k]: e.target.value } : r))} />}</label>)}</div>
      <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-red-500"><Trash2 size={13} /> Remove</button></div>)}
    <button onClick={() => onChange([...value, Object.fromEntries(fields.map(([k]) => [k, ""]))])} className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-4 py-2 text-sm font-bold text-berry"><Plus size={15} /> Add</button></div></div>;
}

export default function SettingsForm({ initial, themes }: { initial: Record<string, string>; themes: Th[] }) {
  const [s, setS] = useState(initial);
  const [steps, setSteps] = useState(parse(initial.landing_steps)), [features, setFeatures] = useState(parse(initial.landing_features)), [faq, setFaq] = useState(parse(initial.landing_faq));
  const [toast, setToast] = useState<ToastState>(null);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setS({ ...s, [k]: e.target.value });
  async function save() {
    const settings = { ...s, landing_steps: JSON.stringify(steps), landing_features: JSON.stringify(features), landing_faq: JSON.stringify(faq) };
    const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings }) });
    const d = await res.json().catch(() => ({}));
    setToast(res.ok ? { kind: "success", text: "Settings saved." } : { kind: "error", text: d.error || "Could not save." });
  }
  return <div className="space-y-8"><Toast toast={toast} onClose={() => setToast(null)} />
    <section className="space-y-4 rounded-3xl border border-rose-100 bg-white p-6"><h2 className="font-black">Brand and limits</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Brand name<input className={inp} value={s.brand_name} onChange={set("brand_name")} /></label>
        <label className="text-sm font-semibold">Default theme<select className={inp} value={s.default_theme_id} onChange={set("default_theme_id")}>{themes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Surprises per user (admins are unlimited)<input type="number" min={0} className={inp} value={s.max_surprises_per_user} onChange={set("max_surprises_per_user")} /></label>
        <label className="text-sm font-semibold">Storage per user, in MB<input type="number" min={0} className={inp} value={s.max_storage_mb} onChange={set("max_storage_mb")} /></label>
        <label className="text-sm font-semibold">Contact email (shown in the footer and legal pages)<input type="email" className={inp} value={s.contact_email} onChange={set("contact_email")} /></label>
        <label className="text-sm font-semibold">Example surprise link (optional)<input className={inp} value={s.demo_url} onChange={set("demo_url")} placeholder="https://…" /></label></div></section>
    <section className="space-y-4 rounded-3xl border border-rose-100 bg-white p-6"><h2 className="font-black">Home page</h2>
      <label className="block text-sm font-semibold">Headline<input className={inp} value={s.landing_hero_title} onChange={set("landing_hero_title")} /></label>
      <label className="block text-sm font-semibold">Subheading<textarea rows={3} className={inp} value={s.landing_hero_subtitle} onChange={set("landing_hero_subtitle")} /></label>
      <label className="block text-sm font-semibold">Sign-in button text<input className={inp} value={s.landing_cta_text} onChange={set("landing_cta_text")} /></label>
      <ListEditor label="How it works" value={steps} onChange={setSteps} fields={[["title", "Title"], ["text", "Text", true]]} />
      <ListEditor label="Features" value={features} onChange={setFeatures} fields={[["emoji", "Emoji"], ["title", "Title"], ["text", "Text", true]]} />
      <ListEditor label="Questions and answers" value={faq} onChange={setFaq} fields={[["q", "Question", true], ["a", "Answer", true]]} /></section>
    <button onClick={save} className="inline-flex items-center gap-2 rounded-full bg-roseink px-7 py-3.5 font-bold text-white"><Save size={16} /> Save settings</button>
  </div>;
}
