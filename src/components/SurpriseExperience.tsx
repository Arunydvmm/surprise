"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Heart, LockKeyhole, Music, Pause } from "lucide-react";
import { Stage, defaultStages } from "@/lib/stages";

type Photo = { id: string; storage_path: string; caption: string | null; alt_text: string | null; sort_order: number };
type Memory = { id: string; title: string; story: string | null; happened_on: string | null; memory_photos: Photo[] };
type Settings = { friend_nickname: string; final_letter: string };

function Cat({ face, size = "text-7xl" }: { face: string; size?: string }) {
  return <motion.div key={face} initial={{ rotate: -12, scale: .8 }} animate={{ rotate: [-6, 6, -6], y: [0, -10, 0], scale: 1 }} transition={{ duration: 1.6, repeat: Infinity }} className={`inline-block ${size}`}>{face}</motion.div>;
}

function Ask({ st, onYes }: { st: Stage; onYes: () => void }) {
  const [no, setNo] = useState(0);
  const pleases = st.items.length ? st.items : ["Please? 🥺"];
  return <div>
    <Cat face={no === 0 ? "😺" : no < 3 ? "😿" : "🙀"} size="text-8xl" />
    {no > 0 && <motion.p key={no} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 font-bold text-berry">{pleases[Math.min(no - 1, pleases.length - 1)]}</motion.p>}
    <div className="mt-6 flex items-center justify-center gap-4">
      <motion.button animate={{ scale: 1 + Math.min(no, 5) * .12 }} onClick={onYes} className="rounded-full bg-roseink px-7 py-4 font-bold text-white hover:bg-berry">{st.button_text || "Yes"}</motion.button>
      <motion.button animate={{ scale: Math.max(.6, 1 - no * .08) }} onClick={() => setNo(n => n + 1)} className="rounded-full border border-rose-200 bg-white/70 px-5 py-3 text-sm font-bold">{st.options?.noText || "No"}</motion.button>
    </div>
  </div>;
}

function Balloons({ items, options, onReady }: { items: string[]; options?: Record<string, string>; onReady: () => void }) {
  const [popped, setPopped] = useState<number[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const emoji = options?.emoji || "🎈", popEmoji = options?.popEmoji || "✨";
  const done = items.length > 0 && popped.length === items.length;
  useEffect(() => { if (items.length === 0 || done) onReady(); }, [done, items, onReady]);
  return <div>
    <div className="flex flex-wrap justify-center gap-5">{items.map((_, i) => popped.includes(i)
      ? <span key={i} className="text-5xl">{popEmoji}</span>
      : <motion.button key={i} animate={{ y: [0, -8, 0] }} transition={{ duration: 3 + i * .4, repeat: Infinity }} onClick={() => { setPopped(p => [...p, i]); setActive(i); }} className="text-6xl" aria-label="Pop balloon">{emoji}</motion.button>)}</div>
    <p className="mt-4 text-xs text-roseink/50">{popped.length} of {items.length} popped</p>
    {done && active === null && options?.doneMessage && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 font-bold text-berry">{options.doneMessage}</motion.p>}
    <AnimatePresence>{active !== null && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-20 grid place-items-center bg-roseink/30 p-5 backdrop-blur-sm">
      <motion.div initial={{ scale: .8, y: 20 }} animate={{ scale: 1, y: 0 }} className="paper-grain w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-dreamy">
        <Cat face="😸" size="text-6xl" />
        <p className="mt-3 whitespace-pre-wrap text-lg leading-8">{items[active]}</p>
        <button onClick={() => setActive(null)} className="mt-6 rounded-full bg-roseink px-6 py-3 text-sm font-bold text-white hover:bg-berry">{done ? "Done 💗" : "Next balloon"}</button>
      </motion.div></motion.div>}</AnimatePresence>
  </div>;
}

function Camera({ memories, urls, options, onReady }: { memories: Memory[]; urls: Record<string, string>; options?: Record<string, string>; onReady: () => void }) {
  const all = memories.flatMap(m => m.memory_photos.map(p => ({ src: urls[p.storage_path], caption: p.caption || m.title })));
  const photos = options?.count ? all.slice(0, Math.max(1, Number(options.count) || all.length)) : all;
  const [printed, setPrinted] = useState(0);
  const done = printed >= photos.length;
  useEffect(() => { if (done) onReady(); }, [done, onReady]);
  if (!photos.length) return <p className="text-sm text-roseink/55">Photos will print here once memories with photos are published.</p>;
  const latest = printed > 0 ? photos[printed - 1] : null;
  return <div>
    <motion.div key={printed} initial={{ opacity: printed ? .9 : 0 }} animate={{ opacity: 0 }} transition={{ duration: .5 }} className="pointer-events-none fixed inset-0 z-20 bg-white" />
    <div className="relative mx-auto w-60">
      <motion.button whileTap={{ scale: .95 }} disabled={done} onClick={() => setPrinted(n => n + 1)} aria-label="Take photo" className="relative z-10 block w-full rounded-3xl bg-gradient-to-b from-[#fff3e6] to-[#f0d9c2] p-4 shadow-dreamy">
        <div className="mx-auto h-4 w-24 rounded-full bg-[#8a5a44]/80" />
        <div className="mx-auto mt-3 grid h-28 w-28 place-items-center rounded-full bg-[#8a5a44] shadow-inner"><div className="grid h-20 w-20 place-items-center rounded-full bg-[#2b1a14]"><div className="h-8 w-8 rounded-full bg-sky-200/70" /></div></div>
        <div className="mx-auto mt-3 h-2 w-40 rounded-full bg-[#3a2218]" />
      </motion.button>
      {latest && <motion.figure key={printed} initial={{ y: -170 }} animate={{ y: 0 }} transition={{ duration: 1.4, ease: "easeOut" }} className="relative z-0 mx-auto -mt-3 w-44 rounded-lg border border-white bg-white p-2 pb-4 shadow-dreamy">
        <motion.div initial={{ filter: "blur(8px) sepia(1) brightness(1.7)" }} animate={{ filter: "blur(0px) sepia(0) brightness(1)" }} transition={{ duration: 3, delay: 1 }}>
          {latest.src ? <img src={latest.src} alt={latest.caption} className="aspect-[4/5] w-full rounded object-cover" /> : <div className="grid aspect-[4/5] place-items-center bg-rose-50 text-4xl">📸</div>}
        </motion.div>
        <figcaption className="pt-2 text-center text-xs text-roseink/70">{latest.caption}</figcaption>
      </motion.figure>}
    </div>
    <p className="mt-4 text-xs text-roseink/50">{done ? "All photos printed 💗" : (options?.tapHint || "Tap the camera")} · {printed} of {photos.length}</p>
    {printed > 1 && <div className="mt-4 flex flex-wrap justify-center gap-2">{photos.slice(0, printed - 1).map((p, i) => p.src && <img key={i} src={p.src} alt="" className="h-16 w-12 rounded border-2 border-white object-cover shadow" style={{ transform: `rotate(${i % 2 ? 4 : -4}deg)` }} />)}</div>}
  </div>;
}

function Letters({ items, onReady }: { items: string[]; onReady: () => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const [read, setRead] = useState<number[]>([]);
  useEffect(() => { if (items.length === 0 || read.length === items.length) onReady(); }, [read, items, onReady]);
  return <div>
    <div className="flex flex-wrap justify-center gap-4">{items.map((_, i) => <button key={i} onClick={() => { setOpen(i); setRead(r => r.includes(i) ? r : [...r, i]); }} className={`text-6xl transition hover:scale-110 ${read.includes(i) ? "opacity-50" : ""}`}>{read.includes(i) ? "📖" : "💌"}</button>)}</div>
    <p className="mt-3 text-xs text-roseink/50">{read.length} of {items.length} letters read</p>
    {open !== null && <motion.div initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} className="paper-grain mx-auto mt-5 max-w-md rounded-3xl bg-white p-6 text-left shadow-dreamy"><p className="whitespace-pre-wrap leading-7">{items[open]}</p></motion.div>}
  </div>;
}

function MusicPlayer({ url, title }: { url: string; title?: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => { const a = ref.current; a?.play().catch(() => {}); return () => { a?.pause(); }; }, [url]);
  return <div className="mb-6 flex justify-center">
    <audio ref={ref} src={url} loop preload="auto" onPlay={() => setOn(true)} onPause={() => setOn(false)} />
    <button onClick={() => { const a = ref.current; if (!a) return; a.paused ? a.play().catch(() => {}) : a.pause(); }} className="inline-flex items-center gap-2 rounded-full border border-white bg-white/90 px-4 py-2 text-xs font-bold shadow-dreamy">
      {on ? <Pause size={14} /> : <Music size={14} />} {on ? "Pause" : "Play"} · {title || "Our song"}
    </button></div>;
}

function Memories({ memories, urls }: { memories: Memory[]; urls: Record<string, string> }) {
  if (!memories.length) return <p className="text-sm text-roseink/55">Memories will appear here once they are published.</p>;
  return <div className="grid grid-cols-2 gap-4 md:grid-cols-3">{memories.flatMap((m): { p: Photo | null; m: Memory }[] => m.memory_photos.length ? m.memory_photos.map(p => ({ p, m })) : [{ p: null, m }]).map(({ p, m }, i) =>
    <motion.figure key={p?.id || m.id} initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1, rotate: i % 2 ? 2 : -2 }} transition={{ delay: i * .06 }} className="rounded-2xl border border-white bg-white p-2 pb-3 text-left shadow-dreamy">
      {p && urls[p.storage_path] ? <img src={urls[p.storage_path]} alt={p.alt_text || m.title} className="aspect-[4/5] w-full rounded-xl object-cover" /> : <div className="grid aspect-[4/5] place-items-center rounded-xl bg-rose-50 text-4xl">📸</div>}
      <figcaption className="px-1 pt-2 text-xs"><b>{m.title}</b>{(p?.caption || m.story) && <span className="mt-1 block text-roseink/60">{p?.caption || m.story}</span>}</figcaption>
    </motion.figure>)}</div>;
}

export default function SurpriseExperience() {
  const [idx, setIdx] = useState(0);
  const [ready, setReady] = useState(false);
  const [stages, setStages] = useState<Stage[]>(defaultStages);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [musicUrls, setMusicUrls] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<Settings>({ friend_nickname: "Bestie", final_letter: "" });
  useEffect(() => {
    fetch("/api/memories", { cache: "no-store" }).then(r => r.json()).then(d => {
      if (d.stages?.length) setStages(d.stages);
      setMemories(d.memories || []); setUrls(d.photoUrls || {}); setMusicUrls(d.musicUrls || {});
      setSettings({ friend_nickname: d.settings?.friend_nickname || "Bestie", final_letter: d.settings?.final_letter || "" });
    }).catch(() => {});
  }, []);
  const st = stages[idx];
  const last = idx === stages.length - 1;
  useEffect(() => { setReady(["intro", "memories", "finale"].includes(st?.type)); }, [idx, st?.type]);
  const onReady = () => setReady(true);
  async function logout() { await fetch("/api/gate/logout", { method: "POST" }); window.location.href = "/unlock"; }
  if (!st) return null;
  return <main className="heart-field paper-grain min-h-screen overflow-hidden">
    <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
      <span className="flex items-center gap-2 text-sm font-extrabold"><Heart size={16} fill="currentColor" className="text-berry" /> {idx + 1} / {stages.length}</span>
      <button onClick={logout} className="flex items-center gap-2 rounded-full border border-rose-200 bg-white/60 px-3 py-2 text-xs font-semibold"><LockKeyhole size={13} /> Lock again</button>
    </header>
    <section className="mx-auto flex min-h-[75vh] max-w-4xl items-center justify-center px-5 pb-24 text-center">
      <AnimatePresence mode="wait"><motion.div key={st.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="w-full">
        {st.type === "intro" && <p className="mb-4 text-xs font-bold uppercase tracking-[.3em] text-berry">A tiny surprise for {settings.friend_nickname}</p>}
        <h1 className="text-4xl font-black leading-tight sm:text-5xl">{st.type === "finale" ? `Dear ${settings.friend_nickname},` : st.title}</h1>
        {st.type === "finale" && <p className="mt-2 text-xs font-bold uppercase tracking-[.25em] text-berry">{st.title}</p>}
        {st.subtitle && <p className="mx-auto mt-4 max-w-xl text-roseink/65">{st.subtitle}</p>}
        <div className="mt-8">
          {st.type === "ask" && <Ask st={st} onYes={() => setIdx(i => Math.min(i + 1, stages.length - 1))} />}
          {st.type === "camera" && <Camera memories={memories} urls={urls} options={st.options} onReady={onReady} />}
          {st.type === "balloons" && <Balloons items={st.items} options={st.options} onReady={onReady} />}
          {st.type === "letters" && <Letters items={st.items} onReady={onReady} />}
          {st.type === "memories" && st.options?.music_path && musicUrls[st.options.music_path] && <MusicPlayer url={musicUrls[st.options.music_path]} title={st.options.music_title} />}
          {st.type === "memories" && <Memories memories={memories} urls={urls} />}
          {st.type === "finale" && <div className="paper-grain mx-auto max-w-2xl rounded-3xl bg-white/85 p-8 text-left shadow-dreamy"><p className="whitespace-pre-wrap leading-8">{settings.final_letter}</p></div>}
        </div>
        {st.type !== "ask" && <button disabled={!ready} onClick={() => last ? setIdx(0) : setIdx(i => i + 1)} className="mt-8 inline-flex items-center gap-2 rounded-full bg-roseink px-7 py-4 font-bold text-white transition hover:bg-berry disabled:opacity-30">{st.button_text || "Continue"} <ArrowRight size={16} /></button>}
      </motion.div></AnimatePresence>
    </section>
  </main>;
}
