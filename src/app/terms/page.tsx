import type { Metadata } from "next";
import Link from "next/link";
import { getPlatformSettings } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Terms of Use" };

export default async function Terms() {
  const s = await getPlatformSettings();
  const email = s.contact_email || process.env.CONTACT_EMAIL || "";
  return <main className="mx-auto max-w-2xl px-5 py-12 leading-7">
    <Link href="/" className="text-sm font-bold text-berry">← {s.brand_name}</Link>
    <h1 className="mt-4 text-3xl font-black">Terms of Use</h1>
    <p className="mt-1 text-sm text-roseink/55">Last updated: 20 October 2026</p>
    <h2 className="mt-8 text-xl font-bold">Using {s.brand_name}</h2>
    <p className="mt-2">You can create surprises for people you know and share them with a link and password. You are responsible for what you upload and for keeping your surprise password to the right people.</p>
    <h2 className="mt-8 text-xl font-bold">What you may not do</h2>
    <p className="mt-2">Do not upload anything illegal, abusive, hateful or sexual, content that involves children in an unsafe way, or photos of people who have not agreed to be shared. Do not try to break into other people's surprises or the service itself.</p>
    <h2 className="mt-8 text-xl font-bold">Your content</h2>
    <p className="mt-2">Your photos, words and music stay yours. You allow us to store and show them to the people you share them with so that the service can work.</p>
    <h2 className="mt-8 text-xl font-bold">Limits and removal</h2>
    <p className="mt-2">Each account has limits on the number of surprises and amount of storage. We may unpublish content or block accounts that break these terms or put others at risk.</p>
    <h2 className="mt-8 text-xl font-bold">No guarantees</h2>
    <p className="mt-2">The service is provided as it is. We work to keep it available but cannot promise it will never fail, so keep your own copies of anything important.</p>
    <h2 className="mt-8 text-xl font-bold">Contact</h2>
    <p className="mt-2">{email ? <>Questions? Email <a className="underline" href={`mailto:${email}`}>{email}</a>.</> : "Questions? Contact the site owner."}</p>
  </main>;
}
