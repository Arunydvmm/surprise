"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

type Occ = { id: string; slug: string; name: string; emoji: string; description: string };
const inp = "mt-1.5 w-full rounded-xl border border-rose-100 bg-white px-4 py-3 outline-none focus:border-berry focus:ring-4 focus:ring-pink-100";

export default function NewSurpriseForm({ occasions, preselect }: { occasions: Occ[]; preselect: string }) {
  const router = useRouter();
  const [occ, setOcc] = useState(occasions.find(o => o.slug === preselect)?.id || occasions[0]?.id || "");
  const [name, setName] = useState(""), [title, setTitle] = useState(""), [slug, setSlug] = useState(""), [password, setPassword] = useState("");
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    const res = await fetch("/api/surprises", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ occasion_id: occ || null, recipient_name: name, title, slug, password }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || "Could not create the surprise."); setBusy(false); return; }
    router.push(`/dashboard/s/${data.id}`);
  }

  return <form onSubmit={submit} className="space-y-8">
    <div><h1 className="text-3xl font-black tracking-tight">Make a new surprise</h1><p className="mt-1 text-sm text-roseink/60">Pick an occasion. You can change every word and slide afterwards.</p></div>
    {occasions.length > 0 && <fieldset><legend className="font-bold">1. Occasion</legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {occasions.map(o => <label key={o.id} className={`relative flex cursor-pointer items-start gap-3 rounded-2xl border-2 bg-white p-4 transition ${occ === o.id ? "border-berry shadow-dreamy" : "border-rose-100 hover:border-rose-200"}`}>
          <input type="radio" name="occasion" className="sr-only" checked={occ === o.id} onChange={() => setOcc(o.id)} />
          <span className="text-3xl">{o.emoji}</span><span><span className="block font-black">{o.name}</span><span className="block text-xs leading-5 text-roseink/60">{o.description}</span></span>
          {occ === o.id && <Check size={16} className="absolute right-3 top-3 text-berry" />}
        </label>)}
      </div></fieldset>}
    <section className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2"><span className="font-bold">2. Details</span></div>
      <label className="text-sm font-semibold">Who is it for?<input required maxLength={60} className={inp} value={name} onChange={e => setName(e.target.value)} placeholder="Their name or nickname" /></label>
      <label className="text-sm font-semibold">Title (only you see this)<input maxLength={80} className={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="Optional" /></label>
      <label className="text-sm font-semibold">Link name<input className={inp} value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} maxLength={40} placeholder="Optional, e.g. priya-bday" />
        <span className="mt-1 block text-xs font-normal text-roseink/55">Their link will be /s/{slug || "a-random-name"}. Lowercase letters, numbers and dashes.</span></label>
      <label className="text-sm font-semibold">Password for the link<input required minLength={4} maxLength={100} className={inp} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 4 characters" autoComplete="off" />
        <span className="mt-1 block text-xs font-normal text-roseink/55">Share this with them yourself. We cannot show it again, but you can set a new one.</span></label>
    </section>
    {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    <button disabled={busy} className="rounded-full bg-roseink px-8 py-4 font-bold text-white hover:bg-berry disabled:opacity-60">{busy ? "Creating…" : "Create surprise"}</button>
  </form>;
}
