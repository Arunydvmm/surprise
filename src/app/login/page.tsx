import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getPlatformSettings } from "@/lib/catalog";
import { googleConfig, safeNext } from "@/lib/google";
import GoogleButton from "@/components/GoogleButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const MESSAGES: Record<string, string> = {
  blocked: "This account has been blocked. Contact the site owner if you think this is a mistake.",
  cancelled: "Sign-in was cancelled. You can try again whenever you like.",
  state: "That sign-in link expired. Please try again.",
  google_failed: "Google sign-in did not complete. Please try again.",
  rate: "Too many attempts. Please wait a few minutes.",
  config: "Sign-in is not set up on this site yet. The site owner needs to add the Google keys."
};

export default async function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const next = safeNext(searchParams.next);
  if (await getSessionUser()) redirect(next);
  const brand = (await getPlatformSettings()).brand_name;
  const error = searchParams.error ? MESSAGES[searchParams.error] || MESSAGES.google_failed : "";
  return <main className="heart-field paper-grain grid min-h-screen place-items-center p-5">
    <div className="w-full max-w-md rounded-[2rem] border border-white bg-white/85 p-8 text-center shadow-dreamy backdrop-blur-xl sm:p-10">
      <Link href="/" className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-rose-100 text-berry" aria-label={`${brand} home`}><Heart size={28} fill="currentColor" /></Link>
      <h1 className="text-3xl font-black tracking-tight">Sign in to {brand}</h1>
      <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-roseink/65">Use your Google account. We never see your Google password, and a new account is created the first time you sign in.</p>
      {error && <p role="alert" className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="mt-7">{googleConfig() ? <GoogleButton next={next} className="w-full" /> : <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-roseink/70">{MESSAGES.config}</p>}</div>
      <p className="mt-6 text-xs leading-5 text-roseink/50">By continuing you agree to the <Link className="underline" href="/terms">Terms</Link> and <Link className="underline" href="/privacy">Privacy Policy</Link>.</p>
    </div>
  </main>;
}
