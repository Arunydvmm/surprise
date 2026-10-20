"use client";
import { useEffect, useState } from "react";
import { createAdminClient } from "@/lib/admin-client";
import Toast, { ToastState, toastFromNote } from "@/components/Toast";
import { ArrowDown, ArrowUp, Copy, Music, Plus, Save, Trash2 } from "lucide-react";
import { Stage } from "@/lib/stages";
import { Theme, themeVars } from "@/lib/themes";
import { STAGE_TYPES } from "@/lib/stages";

export default function StagesEditor({ surpriseId, themes }: { surpriseId: string; themes: Theme[] }) {
  const api = createAdminClient(surpriseId);
  const [stages, setStages] = useState<Stage[]>([]);
  const [, setNoteRaw] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const setNote = (m: string) => { setNoteRaw(m); setToast(toastFromNote(m)); };
  const [themeId, setThemeId] = useState("blush");
  const applyTheme = (id: string) => { const t = themes.find(x => x.id === id); if (t) Object.entries(themeVars(t)).forEach(([k, v]) => document.documentElement.style.setProperty(k, v)); };
  // The theme preview is applied to the whole page while editing; remove it again when leaving.
  useEffect(() => () => { ["--roseink", "--berry", "--petal", "--blush", "--cream", "--bg", "--font"].forEach(k => document.documentElement.style.removeProperty(k)); }, []);
  useEffect(() => { (async () => {
    const { data: th } = await api.from("surprise_settings").select("value").eq("key", "theme").maybeSingle();
    if (th?.value) { setThemeId(th.value); applyTheme(th.value); }
    const { data, error } = await api.from("stages").select("*").order("sort_order");
    if (error) setNote(error.message); else setStages((data || []) as Stage[]);
  })(); }, []);
  async function pickTheme(id: string) {
    setThemeId(id);
    applyTheme(id);
    const { error } = await api.from("surprise_settings").upsert({ key: "theme", value: id }, { onConflict: "key" });
    setNote(error ? error.message : "Theme saved.");
  }
  const patch = (i: number, p: Partial<Stage>) => setStages(s => s.map((x, j) => j === i ? { ...x, ...p } : x));
  const move = (i: number, d: number) => setStages(s => { const a = [...s], j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });
  async function save() {
    setNote("Saving…");
    for (let i = 0; i < stages.length; i++) {
      const { error } = await api.from("stages").update({ title: stages[i].title, subtitle: stages[i].subtitle, button_text: stages[i].button_text, items: stages[i].items, enabled: stages[i].enabled, options: stages[i].options || {}, sort_order: i }).eq("id", stages[i].id);
      if (error) { setNote(error.message); return; }
    }
    setNote("Stages saved.");
  }
  const opt = (i: number, k: string, v: string) => patch(i, { options: { ...(stages[i].options || {}), [k]: v } });
  const [newType, setNewType] = useState("memories");
  async function add(src?: Stage) {
    const row = src ? { type: src.type, title: src.title, subtitle: src.subtitle, button_text: src.button_text, items: src.items, options: src.options || {}, enabled: src.enabled, sort_order: stages.length }
      : { type: newType as Stage["type"], title: "New slide", subtitle: "", button_text: "Continue", items: [], options: {}, enabled: true, sort_order: stages.length };
    const { data, error } = await api.from("stages").insert(row).select("*").single();
    if (error) setNote(error.message); else setStages(s => [...s, data as Stage]);
  }
  async function remove(id: string) {
    if (!confirm("Delete this slide?")) return;
    const { error } = await api.from("stages").delete().eq("id", id);
    if (error) setNote(error.message); else setStages(s => s.filter(x => x.id !== id));
  }
  async function persistOptions(i: number, options: Record<string, string>) {
    const { error } = await api.from("stages").update({ options }).eq("id", stages[i].id);
    setNote(error ? error.message : "Music saved."); if (!error) patch(i, { options });
  }
  async function uploadMusic(i: number, file: File) {
    if (!file.type.startsWith("audio/") || file.size > 15 * 1024 * 1024) { setNote("Choose an audio file up to 15 MB."); return; }
    setNote("Uploading music…");
    const path = `music/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const up: any = await api.storage.from("surprise-music").upload(path, file);
    if (up.error) { setNote("Upload failed: " + up.error.message); return; }
    const old = stages[i].options?.music_path;
    await persistOptions(i, { ...(stages[i].options || {}), music_path: path, music_title: stages[i].options?.music_title || file.name.replace(/\.[^.]+$/, "") });
    if (old) await api.storage.from("surprise-music").remove([old]);
  }
  async function removeMusic(i: number) {
    const old = stages[i].options?.music_path; if (!old) return;
    const { music_path, music_title, ...rest } = stages[i].options || {};
    await persistOptions(i, rest);
    await api.storage.from("surprise-music").remove([old]);
  }
  const itemHint: Record<string, string> = { ask: "'Please' messages, one per line (shown each time she clicks No)", balloons: "One balloon message per line (each opens as a popup)", letters: "One letter per line (use \\n for line breaks)" };
  const inp = "mt-1 w-full rounded-xl border border-rose-100 px-3 py-2 font-normal";
  return <main className="min-h-screen bg-[#fffaf7] p-6"><Toast toast={toast} onClose={() => setToast(null)} /><div className="mx-auto max-w-3xl space-y-4">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-black">Edit slides</h1><a href={`/dashboard/s/${surpriseId}`} className="text-sm font-bold text-berry">← Back to memories</a></div>
    <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm"><b>Theme</b><p className="mb-3 text-xs text-roseink/55">Pick one. It saves instantly and applies to this surprise.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{themes.map(t => <button key={t.id} onClick={() => pickTheme(t.id)} className={`rounded-2xl border-2 p-3 text-left ${themeId === t.id ? "border-berry" : "border-transparent bg-rose-50"}`} style={{ background: t.blush }}>
        <span className="text-sm font-bold" style={{ color: t.roseink }}>{t.emoji} {t.name}</span>
        <span className="mt-2 flex gap-1">{[t.roseink, t.berry, t.petal, t.cream].map(c => <i key={c} className="h-5 w-5 rounded-full border border-black/10" style={{ background: c }} />)}</span></button>)}</div></section>
    {stages.map((s, i) => <section key={s.id} className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between"><b className="capitalize">{i + 1}. {s.type}</b>
        <div className="flex items-center gap-2"><label className="text-xs font-semibold"><input type="checkbox" checked={s.enabled} onChange={e => patch(i, { enabled: e.target.checked })} /> Show</label>
          <button onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp size={16} /></button><button onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown size={16} /></button><button onClick={() => add(s)} aria-label="Duplicate"><Copy size={16} /></button><button onClick={() => remove(s.id)} aria-label="Delete" className="text-red-500"><Trash2 size={16} /></button></div></div>
      <label className="mt-3 block text-sm font-semibold">Title<input className={inp} value={s.title} onChange={e => patch(i, { title: e.target.value })} /></label>
      <label className="mt-3 block text-sm font-semibold">Subtitle<input className={inp} value={s.subtitle} onChange={e => patch(i, { subtitle: e.target.value })} /></label>
      <label className="mt-3 block text-sm font-semibold">Button text<input className={inp} value={s.button_text} onChange={e => patch(i, { button_text: e.target.value })} /></label>
      {itemHint[s.type] && <label className="mt-3 block text-sm font-semibold">{itemHint[s.type]}<textarea rows={4} className={inp} value={(s.items || []).join("\n")} onChange={e => patch(i, { items: e.target.value.split("\n").map(x => x.replace(/\\n/g, "\n")).filter(x => x.trim()) })} /></label>}
      {s.type === "memories" && <div className="mt-3 rounded-2xl border border-dashed border-rose-200 bg-rose-50/60 p-4">
        <span className="flex items-center gap-2 text-sm font-bold"><Music size={16} /> Background music</span>
        {s.options?.music_path ? <div className="mt-2 flex items-center justify-between gap-2 text-sm"><span className="truncate">🎵 {s.options?.music_title || "Uploaded song"}</span><button onClick={() => removeMusic(i)} className="text-xs font-bold text-red-500">Remove</button></div> : <p className="mt-1 text-xs text-roseink/55">No song yet.</p>}
        <input type="file" accept="audio/*" onChange={e => { const f = e.target.files?.[0]; if (f) uploadMusic(i, f); e.target.value = ""; }} className="mt-3 block w-full text-sm" />
        <label className="mt-3 block text-sm font-semibold">Song name shown to her<input className={inp} value={s.options?.music_title || ""} onChange={e => opt(i, "music_title", e.target.value)} /></label>
        <span className="mt-1 block text-xs text-roseink/55">MP3, M4A, WAV or OGG, up to 15 MB. Uploading a new file replaces the old one. After renaming, press Save all stages.</span></div>}
      {s.type === "camera" && <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">Hint under camera<input className={inp} value={s.options?.tapHint || ""} placeholder="Tap the camera 📸" onChange={e => opt(i, "tapHint", e.target.value)} /></label>
        <label className="text-sm font-semibold">Photos to print (blank = all)<input type="number" min={1} className={inp} value={s.options?.count || ""} onChange={e => opt(i, "count", e.target.value)} /></label></div>}
      {s.type === "ask" && <label className="mt-3 block text-sm font-semibold">"No" button text<input className={inp} value={s.options?.noText || ""} placeholder="No" onChange={e => opt(i, "noText", e.target.value)} /></label>}
      {s.type === "balloons" && <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">Balloon emoji<input className={inp} value={s.options?.emoji || ""} placeholder="🎈" onChange={e => opt(i, "emoji", e.target.value)} /></label>
        <label className="text-sm font-semibold">Shown after a pop<input className={inp} value={s.options?.popEmoji || ""} placeholder="✨" onChange={e => opt(i, "popEmoji", e.target.value)} /></label>
        <label className="text-sm font-semibold sm:col-span-2">Message after all are popped<input className={inp} value={s.options?.doneMessage || ""} placeholder="You popped them all! 💗" onChange={e => opt(i, "doneMessage", e.target.value)} /></label></div>}
    </section>)}
    <div className="flex gap-2"><select value={newType} onChange={e => setNewType(e.target.value)} className="flex-1 rounded-xl border border-rose-100 bg-white px-3 py-2">{STAGE_TYPES.map(t => <option key={t}>{t}</option>)}</select><button onClick={() => add()} className="flex items-center gap-2 rounded-xl bg-rose-100 px-4 py-2 font-bold text-berry"><Plus size={16} /> Add slide</button></div>
    <button onClick={save} className="flex w-full items-center justify-center gap-2 rounded-xl bg-roseink px-4 py-3 font-bold text-white"><Save size={16} /> Save all stages</button>
    
  </div></main>;
}
