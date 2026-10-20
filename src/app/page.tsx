import Link from "next/link";
import { ArrowRight, Heart, LockKeyhole } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getPlatformSettings, listOccasions, parseList } from "@/lib/catalog";
import GoogleButton from "@/components/GoogleButton";

export const dynamic = "force-dynamic";

type Step = { title: string; text: string };
type Feature = { emoji: string; title: string; text: string };
type Faq = { q: string; a: string };

export default async function Home() {
  const [s, user] = await Promise.all([getPlatformSettings(), getSessionUser()]);
  let occasions: Awaited<ReturnType<typeof listOccasions>> = [];
  try { occasions = await listOccasions(true); } catch {}
  const steps = parseList<Step>(s.landing_steps, []), features = parseList<Feature>(s.landing_features, []), faq = parseList<Faq>(s.landing_faq, []);
  const start = (slug?: string) => { const next = `/dashboard/new${slug ? `?occasion=${slug}` : ""}`; return user ? next : `/login?next=${encodeURIComponent(next)}`; };

  return <div className="min-h-screen">
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
      <Link href="/" className="flex items-center gap-2 text-lg font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-100 text-berry"><Heart size={16} fill="currentColor" /></span>{s.brand_name}</Link>
      <nav className="flex items-center gap-5 text-sm font-semibold">
        <a href="#occasions" className="hidden hover:text-berry sm:inline">Occasions</a>
        <a href="#how" className="hidden hover:text-berry sm:inline">How it works</a>
        <a href="#faq" className="hidden hover:text-berry sm:inline">FAQ</a>
        {user ? <Link href="/dashboard" className="rounded-full bg-roseink px-4 py-2 text-white hover:bg-berry">My surprises</Link> : <Link href="/login" className="rounded-full border border-rose-200 bg-white/70 px-4 py-2 hover:border-berry">Sign in</Link>}
      </nav>
    </header>

    <section className="heart-field paper-grain">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 lg:grid-cols-[1.1fr_.9fr] lg:pt-16">
        <div>
          <h1 className="text-balance text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">{s.landing_hero_title}</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-roseink/70">{s.landing_hero_subtitle}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {user ? <Link href="/dashboard/new" className="inline-flex items-center gap-2 rounded-full bg-roseink px-7 py-4 font-bold text-white transition hover:bg-berry">Make a surprise <ArrowRight size={17} /></Link> : <GoogleButton next="/dashboard/new" label={s.landing_cta_text} />}
            {s.demo_url && <a href={s.demo_url} className="font-bold text-berry underline-offset-4 hover:underline" target="_blank" rel="noreferrer">See an example</a>}
          </div>
          <p className="mt-4 text-sm text-roseink/55">Free to start. The person you send it to needs no account.</p>
        </div>

        {/* What the receiver sees: password, then a printed photo, then a note */}
        <div className="relative mx-auto h-[420px] w-full max-w-md" aria-hidden="true">
          <div className="absolute left-0 top-6 w-64 -rotate-6 rounded-3xl border border-white bg-white/90 p-6 text-center shadow-dreamy">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-100 text-berry"><LockKeyhole size={22} /></div>
            <p className="mt-3 font-black">Just for you ♡</p>
            <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2 text-left text-sm tracking-widest text-roseink/50">••••••••</div>
            <div className="mt-3 rounded-xl bg-roseink py-2 text-sm font-bold text-white">Open the surprise</div>
          </div>
          <div className="absolute right-2 top-0 w-44 rotate-6 rounded-md bg-white p-2 pb-8 shadow-xl">
            <div className="grid h-40 place-items-center rounded bg-petal/60 text-6xl">{occasions[0]?.emoji || "🎂"}</div>
            <p className="mt-3 text-center text-sm font-semibold text-roseink/70">the best day ever</p>
          </div>
          <div className="absolute bottom-0 right-6 w-72 -rotate-2 rounded-2xl border border-rose-100 bg-cream p-5 shadow-xl">
            <p className="text-sm leading-6 text-roseink/80">Thank you for every late-night talk and every silly laugh. I am always cheering for you.</p>
            <p className="mt-3 text-right text-sm font-bold text-berry">Always, with love 💗</p>
          </div>
        </div>
      </div>
    </section>

    {occasions.length > 0 && <section id="occasions" className="mx-auto max-w-6xl px-5 py-20">
      <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Pick an occasion to start</h2>
      <p className="mt-3 max-w-xl text-roseink/65">Each one comes with ready-made slides, words and colours. Change anything you like.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {occasions.map(o => <Link key={o.id} href={start(o.slug)} className="group flex items-start gap-4 rounded-3xl border border-rose-100 bg-white p-5 transition hover:border-berry hover:shadow-dreamy">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-rose-100 text-3xl">{o.emoji}</span>
          <span><span className="block font-black">{o.name}</span><span className="mt-1 block text-sm leading-5 text-roseink/60">{o.description}</span></span>
        </Link>)}
      </div>
    </section>}

    {steps.length > 0 && <section id="how" className="bg-white/60 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">How it works</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((st, i) => <li key={i} className="rounded-3xl border border-rose-100 bg-white p-6">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-roseink text-sm font-black text-white">{i + 1}</span>
            <h3 className="mt-4 text-lg font-black">{st.title}</h3><p className="mt-2 text-sm leading-6 text-roseink/65">{st.text}</p>
          </li>)}
        </ol>
      </div>
    </section>}

    {features.length > 0 && <section className="mx-auto max-w-6xl px-5 py-20">
      <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Made to feel personal</h2>
      <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {features.map((f, i) => <div key={i} className="flex gap-4"><span className="text-3xl" aria-hidden="true">{f.emoji}</span><div><h3 className="font-black">{f.title}</h3><p className="mt-1 text-sm leading-6 text-roseink/65">{f.text}</p></div></div>)}
      </div>
    </section>}

    {faq.length > 0 && <section id="faq" className="mx-auto max-w-3xl px-5 pb-20">
      <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Questions</h2>
      <div className="mt-8 divide-y divide-rose-100 rounded-3xl border border-rose-100 bg-white">
        {faq.map((f, i) => <details key={i} className="group px-6 py-4"><summary className="cursor-pointer list-none font-bold marker:hidden">{f.q}</summary><p className="mt-2 text-sm leading-6 text-roseink/70">{f.a}</p></details>)}
      </div>
    </section>}

    <section className="heart-field px-5 py-20 text-center">
      <h2 className="mx-auto max-w-xl text-balance text-3xl font-black tracking-tight sm:text-4xl">Someone is going to smile because of this</h2>
      <div className="mt-8">{user ? <Link href="/dashboard/new" className="inline-flex items-center gap-2 rounded-full bg-roseink px-7 py-4 font-bold text-white hover:bg-berry">Make a surprise <ArrowRight size={17} /></Link> : <GoogleButton next="/dashboard/new" label={s.landing_cta_text} />}</div>
    </section>

    <footer className="border-t border-rose-100 bg-white/70 py-8 text-sm text-roseink/60">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5">
        <span>© {new Date().getFullYear()} {s.brand_name}</span>
        <span className="flex gap-5"><Link href="/privacy" className="hover:text-berry">Privacy</Link><Link href="/terms" className="hover:text-berry">Terms</Link>{(s.contact_email || process.env.CONTACT_EMAIL) && <a className="hover:text-berry" href={`mailto:${s.contact_email || process.env.CONTACT_EMAIL}`}>Contact</a>}</span>
      </div>
    </footer>
  </div>;
}
