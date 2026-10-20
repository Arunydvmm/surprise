"use client";
import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Heart, LockKeyhole, Sparkles } from "lucide-react";

export default function UnlockForm({ slug, emoji }: { slug: string; emoji: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const res = await fetch(`/api/s/${slug}/unlock`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not unlock.");
      window.location.reload();
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); setBusy(false); }
  }
  return <main className="heart-field paper-grain grid min-h-screen place-items-center p-5">
    <motion.div initial={{ opacity: 0, y: 18, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-md rounded-[2rem] border border-white bg-white/85 p-8 text-center shadow-dreamy backdrop-blur-xl sm:p-10">
      <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-rose-100 text-3xl" aria-hidden="true">{emoji || <LockKeyhole size={28} />}</div>
      <p className="mb-3 text-xs font-bold text-berry">A little secret</p>
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Just for you <span className="text-berry">♡</span></h1>
      <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-roseink/65">Someone made a tiny corner of the internet for you. Enter the password they gave you to open it.</p>
      <form onSubmit={submit} className="mt-7 space-y-3">
        <input aria-label="Password" type="password" autoComplete="off" required maxLength={100} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter the password" className="w-full rounded-2xl border border-rose-100 bg-rose-50/60 px-4 py-3.5 outline-none transition focus:border-berry focus:ring-4 focus:ring-pink-100" />
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-roseink px-5 py-3.5 font-bold text-white transition hover:bg-berry disabled:opacity-60">{busy ? "Opening..." : <>Open the surprise <Heart size={17} fill="currentColor" /></>}</button>
      </form>
      <p className="mt-6 flex items-center justify-center gap-2 text-xs text-roseink/45"><Sparkles size={13} /> Made with love</p>
    </motion.div>
  </main>;
}
