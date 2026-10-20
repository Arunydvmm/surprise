"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Heart, LockKeyhole, Music } from "lucide-react";
import { Stage, defaultStages } from "@/lib/stages";

type Photo = { id: string; storage_path: string; caption: string | null; alt_text: string | null; sort_order: number };
type Memory = { id: string; title: string; story: string | null; happened_on: string | null; memory_photos: Photo[] };
type Settings = { friend_nickname: string; final_letter: string; effects: string[] };

/* ---- tweak these to change the feel ---- */
const PRINT_S = 6;      // seconds the photo takes to slide out of the camera
const DEVELOP_S = 5;    // seconds the photo takes to "develop" after printing
const MUSIC_VOLUME = 0.8;
const SIGN_OFF = "Always, with love 💗";

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
  const [printing, setPrinting] = useState(false);
  const slotRef = useRef<HTMLDivElement>(null);
  const endTimer = useRef<number | undefined>(undefined);
  const done = printed >= photos.length && !printing;

  useEffect(() => { if (done) onReady(); }, [done, onReady]);
  useEffect(() => () => window.clearTimeout(endTimer.current), []);

  // Every time a new photo starts printing, glide the page so the photo is in view.
  useEffect(() => {
    if (!printed) return;
    const look = () => slotRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t1 = window.setTimeout(look, 150);
    const t2 = window.setTimeout(look, (PRINT_S * 1000) / 2);
    const t3 = window.setTimeout(look, PRINT_S * 1000 + 400);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); window.clearTimeout(t3); };
  }, [printed]);

  function take() {
    if (printing || printed >= photos.length) return;
    setPrinted(n => n + 1);
    setPrinting(true);
    window.clearTimeout(endTimer.current);
    endTimer.current = window.setTimeout(() => setPrinting(false), PRINT_S * 1000 + 300);
  }

  if (!photos.length) return <p className="text-sm text-roseink/55">Photos will print here once memories with photos are published.</p>;
  const latest = printed > 0 ? photos[printed - 1] : null;
  return <div>
    <motion.div key={printed} initial={{ opacity: printed ? .85 : 0 }} animate={{ opacity: 0 }} transition={{ duration: .6 }} className="pointer-events-none fixed inset-0 z-20 bg-white" />
    <div className="relative mx-auto w-60">
      <motion.button
        whileTap={{ scale: .95 }}
        animate={printing ? { x: [0, -1.5, 1.5, -1.5, 0] } : { x: 0 }}
        transition={printing ? { duration: .28, repeat: Infinity } : { duration: .2 }}
        disabled={done || printing} onClick={take} aria-label="Take photo"
        className="relative z-10 block w-full rounded-3xl bg-gradient-to-b from-[#fff3e6] to-[#f0d9c2] p-4 shadow-dreamy">
        <motion.span animate={printing ? { opacity: [1, .2, 1] } : { opacity: 1 }} transition={{ duration: .6, repeat: Infinity }} className={`absolute right-5 top-4 h-2.5 w-2.5 rounded-full ${printing ? "bg-red-500" : "bg-emerald-400"}`} />
        <div className="mx-auto h-4 w-24 rounded-full bg-[#8a5a44]/80" />
        <div className="mx-auto mt-3 grid h-28 w-28 place-items-center rounded-full bg-[#8a5a44] shadow-inner"><div className="grid h-20 w-20 place-items-center rounded-full bg-[#2b1a14]"><div className="h-8 w-8 rounded-full bg-sky-200/70" /></div></div>
        <div className="mx-auto mt-3 h-2 w-40 rounded-full bg-[#3a2218]" />
      </motion.button>
      {latest && <div ref={slotRef} className="relative z-0 mx-auto -mt-3 h-[18rem] w-52 overflow-hidden pt-3">
        <motion.figure key={printed}
          initial={{ y: "-100%" }}
          animate={{ y: ["-100%", "-76%", "-76%", "-52%", "-52%", "-27%", "-27%", "0%"] }}
          transition={{ duration: PRINT_S, times: [0, .22, .3, .52, .6, .78, .86, 1], ease: "easeInOut" }}
          className="mx-auto w-44 rounded-lg border border-white bg-white p-2 pb-4 shadow-lg">
          <motion.div initial={{ filter: "blur(10px) sepia(1) brightness(1.8)" }} animate={{ filter: "blur(0px) sepia(0) brightness(1)" }} transition={{ duration: DEVELOP_S, delay: PRINT_S * .6, ease: "easeOut" }}>
            {latest.src ? <img src={latest.src} alt={latest.caption} className="aspect-[4/5] w-full rounded object-cover" /> : <div className="grid aspect-[4/5] place-items-center bg-rose-50 text-4xl">📸</div>}
          </motion.div>
          <figcaption className="pt-2 text-center text-xs text-roseink/70">{latest.caption}</figcaption>
        </motion.figure>
      </div>}
    </div>
    <p className="mt-4 text-xs text-roseink/50">{printing ? "Printing your memory… 📷" : done ? "All photos printed 💗" : (options?.tapHint || "Tap the camera")} · {printed} of {photos.length}</p>
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

function Memories({ memories, urls }: { memories: Memory[]; urls: Record<string, string> }) {
  if (!memories.length) return <p className="text-sm text-roseink/55">Memories will appear here once they are published.</p>;
  return <div className="grid grid-cols-2 gap-4 md:grid-cols-3">{memories.flatMap((m): { p: Photo | null; m: Memory }[] => m.memory_photos.length ? m.memory_photos.map(p => ({ p, m })) : [{ p: null, m }]).map(({ p, m }, i) =>
    <motion.figure key={p?.id || m.id} initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1, rotate: i % 2 ? 2 : -2 }} transition={{ delay: i * .06 }} className="rounded-2xl border border-white bg-white p-2 pb-3 text-left shadow-dreamy">
      {p && urls[p.storage_path] ? <img src={urls[p.storage_path]} alt={p.alt_text || m.title} className="aspect-[4/5] w-full rounded-xl object-cover" /> : <div className="grid aspect-[4/5] place-items-center rounded-xl bg-rose-50 text-4xl">📸</div>}
      <figcaption className="px-1 pt-2 text-xs"><b>{m.title}</b>{(p?.caption || m.story) && <span className="mt-1 block text-roseink/60">{p?.caption || m.story}</span>}</figcaption>
    </motion.figure>)}</div>;
}

/* ================= FINALE (special) ================= */

// Slow, endless rain of hearts and sparkles behind the letter.
function Hearts({ count = 18 }: { count?: number }) {
  const [items, setItems] = useState<{ id: number; left: number; size: number; dur: number; delay: number; sway: number; emoji: string }[]>([]);
  useEffect(() => {
    const e = ["💗", "💖", "✨", "💕", "🌸"];
    setItems(Array.from({ length: count }, (_, i) => ({ id: i, left: Math.random() * 100, size: 14 + Math.random() * 22, dur: 9 + Math.random() * 8, delay: Math.random() * 9, sway: (Math.random() - .5) * 90, emoji: e[i % e.length] })));
  }, [count]);
  return <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
    {items.map(h => <motion.span key={h.id} initial={{ y: "10vh", opacity: 0 }} animate={{ y: "-115vh", x: [0, h.sway, 0], opacity: [0, .85, .85, 0] }} transition={{ duration: h.dur, delay: h.delay, repeat: Infinity, ease: "linear" }} style={{ left: `${h.left}%`, fontSize: h.size }} className="absolute bottom-0">{h.emoji}</motion.span>)}
  </div>;
}

// One-time confetti burst when the envelope opens.
function Confetti() {
  const [p, setP] = useState<{ id: number; dx: number; dy: number; rot: number; c: string; s: number; d: number }[]>([]);
  useEffect(() => {
    const colors = ["#f7c6d4", "#b84e73", "#ffd36e", "#9ad7ff", "#c4ecd8"];
    setP(Array.from({ length: 46 }, (_, i) => ({ id: i, dx: (Math.random() - .5) * 560, dy: -(120 + Math.random() * 320), rot: Math.random() * 720, c: colors[i % colors.length], s: 6 + Math.random() * 8, d: Math.random() * .25 })));
  }, []);
  return <div className="pointer-events-none fixed inset-0 z-20 grid place-items-center overflow-hidden" aria-hidden>
    {p.map(c => <motion.span key={c.id} initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }} animate={{ x: c.dx, y: [0, c.dy, c.dy + 520], opacity: [1, 1, 0], rotate: c.rot }} transition={{ duration: 2.8, delay: c.d, ease: "easeOut", times: [0, .35, 1] }} style={{ width: c.s, height: c.s * 1.6, background: c.c }} className="absolute rounded-sm" />)}
  </div>;
}

function Finale({ title, subtitle, nickname, letter, memories, urls, effects, onReady }: { title: string; subtitle: string; nickname: string; letter: string; memories: Memory[]; urls: Record<string, string>; effects: string[]; onReady: () => void }) {
  const [flap, setFlap] = useState(false);
  const [opened, setOpened] = useState(false);
  const [count, setCount] = useState(0);
  const chars = useMemo(() => Array.from(letter || ""), [letter]);
  const caretRef = useRef<HTMLSpanElement>(null);
  const openTimer = useRef<number | undefined>(undefined);
  const done = opened && count >= chars.length;
  const photos = memories.flatMap(m => m.memory_photos.map(p => ({ src: urls[p.storage_path], caption: p.caption || m.title }))).filter(p => p.src).slice(0, 5);

  useEffect(() => { if (done) onReady(); }, [done, onReady]);
  useEffect(() => () => window.clearTimeout(openTimer.current), []);

  // Typewriter: slower on punctuation and line breaks, so it feels like someone is writing it.
  useEffect(() => {
    if (!opened || count >= chars.length) return;
    const base = Math.max(22, Math.min(60, 26000 / Math.max(chars.length, 1)));
    const ch = chars[count];
    const wait = ch === "\n" ? base * 7 : /[.!?]/.test(ch) ? base * 5 : /[,;:]/.test(ch) ? base * 3 : base;
    const t = window.setTimeout(() => setCount(c => Math.min(c + 1, chars.length)), wait);
    return () => window.clearTimeout(t);
  }, [opened, count, chars]);

  // Keep the newest words on screen while the page "writes".
  useEffect(() => {
    if (opened && count > 0 && count % 30 === 0) caretRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [count, opened]);

  // When the whole letter is written, glide down to the photos / sign-off.
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => caretRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 900);
    return () => window.clearTimeout(t);
  }, [done]);

  function openEnvelope() {
    if (flap) return;
    setFlap(true);
    openTimer.current = window.setTimeout(() => setOpened(true), 1300);
  }

  return <div className="relative">
    {effects.includes("hearts") && <Hearts />}
    {opened && effects.includes("confetti") && <Confetti />}
    <div className="relative z-10">
      <p className="mb-3 text-xs font-bold uppercase tracking-[.3em] text-berry">{title}</p>
      <AnimatePresence mode="wait">
        {!opened ? (
          <motion.div key="envelope" exit={{ opacity: 0, y: 50, scale: .9 }} transition={{ duration: .5 }}>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl">A letter for <span className="bg-gradient-to-r from-berry to-roseink bg-clip-text text-transparent">{nickname}</span></h1>
            {subtitle && <p className="mx-auto mt-4 max-w-xl text-roseink/65">{subtitle}</p>}
            <motion.button onClick={openEnvelope} aria-label="Open the envelope" whileHover={{ scale: 1.04 }} whileTap={{ scale: .97 }}
              animate={flap ? { y: 0 } : { y: [0, -8, 0] }} transition={flap ? {} : { duration: 3, repeat: Infinity }}
              className="relative mx-auto mt-10 block h-48 w-72" style={{ perspective: 900 }}>
              <div className="absolute inset-0 rounded-2xl border border-white bg-petal/70 shadow-dreamy" />
              <motion.div animate={{ y: flap ? -70 : 0 }} transition={{ delay: .5, duration: .7 }} className="paper-grain absolute inset-x-4 top-3 h-40 rounded-lg bg-white shadow" />
              <div className="absolute inset-0 rounded-2xl bg-blush" style={{ clipPath: "polygon(0 100%, 0 30%, 50% 68%, 100% 30%, 100% 100%)" }} />
              <motion.div animate={{ rotateX: flap ? 180 : 0, zIndex: flap ? 0 : 20 }} transition={{ duration: .9, ease: "easeInOut" }} style={{ transformOrigin: "top", clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-petal to-blush" />
              <motion.span animate={flap ? { opacity: 0, scale: 1.6 } : { scale: [1, 1.12, 1] }} transition={flap ? { duration: .3 } : { duration: 1.4, repeat: Infinity }} className="absolute left-1/2 top-[5.4rem] z-30 grid h-12 w-12 -translate-x-1/2 place-items-center rounded-full bg-berry text-lg text-white shadow-lg">♥</motion.span>
            </motion.button>
            <p className="mt-8 text-xs font-bold uppercase tracking-[.25em] text-roseink/50">{flap ? "Opening…" : "Tap the envelope"}</p>
          </motion.div>
        ) : (
          <motion.div key="paper" initial={{ opacity: 0, y: 70, rotate: -2, scale: .92 }} animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }} transition={{ type: "spring", damping: 18, stiffness: 90 }}>
            <div onClick={() => !done && setCount(chars.length)} className="paper-grain relative mx-auto max-w-2xl rounded-[2rem] border border-white bg-white/90 p-8 text-left shadow-dreamy sm:p-12">
              <motion.span animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 1.3, repeat: Infinity }} className="absolute -top-5 left-1/2 -translate-x-1/2 text-4xl">💗</motion.span>
              <h2 className="font-serif text-3xl font-bold italic sm:text-4xl"><span className="bg-gradient-to-r from-berry to-roseink bg-clip-text text-transparent">Dear {nickname},</span></h2>
              <p className="mt-6 whitespace-pre-wrap font-serif text-lg leading-9 sm:text-xl sm:leading-10">
                {chars.slice(0, count).join("")}
                <span ref={caretRef} className={`ml-0.5 inline-block h-6 w-0.5 translate-y-1 animate-pulse bg-berry ${done ? "opacity-0" : ""}`} />
              </p>
              {!done && chars.length > 0 && <p className="mt-6 text-center text-[11px] text-roseink/35">tap the page to skip the typing</p>}
              {done && <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2 }} className="mt-8 text-right font-serif text-xl italic text-berry">{SIGN_OFF}</motion.p>}
            </div>
            {done && photos.length > 0 && <div className="mt-12 flex justify-center -space-x-5">
              {photos.map((p, i) => <motion.figure key={i} initial={{ opacity: 0, y: 50, rotate: 0 }} animate={{ opacity: 1, y: 0, rotate: (i - (photos.length - 1) / 2) * 7 }} transition={{ delay: 1 + i * .3, type: "spring", damping: 14 }} className="w-24 rounded-md border border-white bg-white p-1.5 pb-4 shadow-lg sm:w-28">
                <img src={p.src} alt={p.caption} className="aspect-[4/5] w-full rounded object-cover" />
              </motion.figure>)}
            </div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>;
}

/* ================= MAIN ================= */

export default function SurpriseExperience({ slug, canLock }: { slug: string; canLock: boolean }) {
  const [idx, setIdx] = useState(0);
  const [ready, setReady] = useState(false);
  const [stages, setStages] = useState<Stage[]>(defaultStages);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [musicUrls, setMusicUrls] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<Settings>({ friend_nickname: "Bestie", final_letter: "", effects: ["hearts", "confetti"] });
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const wantMusic = useRef(false);
  const fade = useRef<number | undefined>(undefined);

  useEffect(() => {
    fetch(`/api/s/${slug}/content`, { cache: "no-store" }).then(r => r.json()).then(d => {
      if (d.stages?.length) setStages(d.stages);
      setMemories(d.memories || []); setUrls(d.photoUrls || {}); setMusicUrls(d.musicUrls || {});
      setSettings({ friend_nickname: d.settings?.friend_nickname || "Bestie", final_letter: d.settings?.final_letter || "", effects: typeof d.settings?.effects === "string" ? d.settings.effects.split(",").map((x: string) => x.trim()).filter(Boolean) : ["hearts", "confetti"] });
    }).catch(() => {});
  }, [slug]);

  // ONE song for the whole experience: the first stage that has music uploaded (set in Admin > memories stage).
  const musicStage = stages.find(s => s.options?.music_path && musicUrls[s.options.music_path]);
  const musicUrl = musicStage ? musicUrls[musicStage.options!.music_path] : "";
  const musicTitle = musicStage?.options?.music_title || "Our song";

  const startMusic = useCallback(() => {
    wantMusic.current = true;
    const a = audioRef.current;
    if (!a || !a.paused) return;
    window.clearInterval(fade.current);
    a.volume = 0;
    a.play().then(() => {
      fade.current = window.setInterval(() => {
        if (a.volume >= MUSIC_VOLUME - .05) { a.volume = MUSIC_VOLUME; window.clearInterval(fade.current); return; }
        a.volume = Math.min(MUSIC_VOLUME, a.volume + .05);
      }, 150);
    }).catch(() => {});
  }, []);

  // If the song URL arrives after the first tap, start it right away.
  useEffect(() => { if (musicUrl && wantMusic.current) startMusic(); }, [musicUrl, startMusic]);
  // Safety net: the very first tap anywhere starts the music (browsers need a tap to allow sound).
  useEffect(() => {
    const h = () => startMusic();
    window.addEventListener("pointerdown", h, { once: true });
    return () => window.removeEventListener("pointerdown", h);
  }, [startMusic]);
  useEffect(() => () => window.clearInterval(fade.current), []);

  const st = stages[idx];
  const last = idx === stages.length - 1;
  useEffect(() => { setReady(["intro", "memories"].includes(st?.type)); }, [idx, st?.type]);
  // Every new stage starts from the top of the page.
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [idx]);
  const onReady = useCallback(() => setReady(true), []);
  async function logout() { await fetch(`/api/s/${slug}/lock`, { method: "POST" }); window.location.reload(); }
  if (!st) return null;
  return <main className="heart-field paper-grain min-h-screen overflow-hidden">
    {musicUrl && <audio ref={audioRef} src={musicUrl} loop preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />}
    <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
      <span className="flex items-center gap-2 text-sm font-extrabold"><Heart size={16} fill="currentColor" className="text-berry" /> {idx + 1} / {stages.length}</span>
      {canLock && <button onClick={logout} className="flex items-center gap-2 rounded-full border border-rose-200 bg-white/60 px-3 py-2 text-xs font-semibold"><LockKeyhole size={13} /> Lock again</button>}
    </header>
    {musicUrl && <button onClick={() => { const a = audioRef.current; if (!a) return; if (a.paused) { wantMusic.current = true; a.volume = MUSIC_VOLUME; a.play().catch(() => {}); } else { wantMusic.current = false; a.pause(); } }}
      aria-label={playing ? "Pause music" : "Play music"} className="fixed bottom-4 right-4 z-30 inline-flex max-w-[70vw] items-center gap-2 rounded-full border border-white bg-white/90 px-4 py-2 text-xs font-bold shadow-dreamy">
      {playing ? <span className="flex h-3.5 items-end gap-0.5">{[0, 1, 2].map(i => <motion.span key={i} animate={{ height: ["30%", "100%", "40%"] }} transition={{ duration: .8, repeat: Infinity, delay: i * .15 }} className="w-0.5 rounded bg-berry" />)}</span> : <Music size={14} />}
      <span className="truncate">{playing ? musicTitle : `Play · ${musicTitle}`}</span>
    </button>}
    <section className="mx-auto flex min-h-[75vh] max-w-4xl items-center justify-center px-5 pb-24 text-center">
      <AnimatePresence mode="wait"><motion.div key={st.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="w-full">
        {st.type !== "finale" && <>
          {st.type === "intro" && <p className="mb-4 text-xs font-bold uppercase tracking-[.3em] text-berry">A tiny surprise for {settings.friend_nickname}</p>}
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">{st.title}</h1>
          {st.subtitle && <p className="mx-auto mt-4 max-w-xl text-roseink/65">{st.subtitle}</p>}
        </>}
        <div className={st.type === "finale" ? "" : "mt-8"}>
          {st.type === "ask" && <Ask st={st} onYes={() => { startMusic(); setIdx(i => Math.min(i + 1, stages.length - 1)); }} />}
          {st.type === "camera" && <Camera memories={memories} urls={urls} options={st.options} onReady={onReady} />}
          {st.type === "balloons" && <Balloons items={st.items} options={st.options} onReady={onReady} />}
          {st.type === "letters" && <Letters items={st.items} onReady={onReady} />}
          {st.type === "memories" && <Memories memories={memories} urls={urls} />}
          {st.type === "finale" && <Finale title={st.title} subtitle={st.subtitle} nickname={settings.friend_nickname} letter={settings.final_letter} memories={memories} urls={urls} effects={settings.effects} onReady={onReady} />}
        </div>
        {st.type !== "ask" && <button disabled={!ready} onClick={() => last ? setIdx(0) : setIdx(i => i + 1)} className="relative z-10 mt-8 inline-flex items-center gap-2 rounded-full bg-roseink px-7 py-4 font-bold text-white transition hover:bg-berry disabled:opacity-30">{st.button_text || "Continue"} <ArrowRight size={16} /></button>}
      </motion.div></AnimatePresence>
    </section>
  </main>;
}
