import type { Metadata } from "next";
import Link from "next/link";
import { getPlatformSettings } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Privacy Policy" };

export default async function Privacy() {
  const s = await getPlatformSettings();
  const email = s.contact_email || process.env.CONTACT_EMAIL || "";
  return <main className="mx-auto max-w-2xl px-5 py-12 leading-7">
    <Link href="/" className="text-sm font-bold text-berry">← {s.brand_name}</Link>
    <h1 className="mt-4 text-3xl font-black">Privacy Policy</h1>
    <p className="mt-1 text-sm text-roseink/55">Last updated: 20 October 2026</p>
    <h2 className="mt-8 text-xl font-bold">What we collect</h2>
    <p className="mt-2">When you sign in with Google we receive your name, email address and profile picture. We do not receive your Google password. We also store what you add: memories, photos, music, letters and the settings of your surprises.</p>
    <h2 className="mt-8 text-xl font-bold">How we use it</h2>
    <p className="mt-2">We use your account details to sign you in and show you your own surprises. Your content is shown only to people who have your surprise link and its password, and to site administrators who manage the service. We do not sell your data or use it for advertising.</p>
    <h2 className="mt-8 text-xl font-bold">People you share with</h2>
    <p className="mt-2">Visitors do not need an account. They open your link and enter the password you set. Only share photos and details of people who are happy for you to share them.</p>
    <h2 className="mt-8 text-xl font-bold">Cookies</h2>
    <p className="mt-2">We use essential cookies only: one to keep you signed in, and one for each surprise a visitor has unlocked. They are not used for tracking.</p>
    <h2 className="mt-8 text-xl font-bold">Your choices</h2>
    <p className="mt-2">You can edit or delete any surprise from your dashboard, which removes its photos, music and text. To delete your account or ask what we hold about you{email ? <>, email <a className="underline" href={`mailto:${email}`}>{email}</a></> : ", contact the site owner"}.</p>
    <h2 className="mt-8 text-xl font-bold">Security</h2>
    <p className="mt-2">Surprise passwords are stored as one-way hashes. Sessions can be ended at any time by signing out. No online service is perfectly secure, so please do not upload anything you could not bear to lose.</p>
  </main>;
}
