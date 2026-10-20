"use client";
import { FormEvent, useState } from "react";
import { Heart } from "lucide-react";
export default function AdminGate() {
  const [password, setPassword] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMsg("");
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    if (r.ok) { window.location.reload(); return; }
    setMsg((await r.json().catch(() => ({}))).error || `Could not sign in (server error ${r.status}). Check the server logs and your environment variables.`); setBusy(false);
  }
  return <main className="heart-field grid min-h-screen place-items-center p-5"><form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-white bg-white/90 p-8 shadow-dreamy">
    <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-rose-100 text-berry"><Heart fill="currentColor" /></div>
    <h1 className="text-2xl font-black">Admin</h1>
    <input type="password" required autoFocus value={password} onChange={e => setPassword(e.target.value)} placeholder="Admin password" className="mt-5 w-full rounded-xl border border-rose-100 px-4 py-3 outline-none focus:border-berry" />
    {msg && <p className="mt-3 text-sm text-red-600">{msg}</p>}
    <button disabled={busy} className="mt-4 w-full rounded-xl bg-roseink px-4 py-3 font-bold text-white disabled:opacity-50">{busy ? "Checking…" : "Enter"}</button>
  </form></main>;
}
