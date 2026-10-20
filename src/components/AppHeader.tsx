import Link from "next/link";
import { Heart } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";

/** Top bar shared by the dashboard and admin pages. */
export default function AppHeader({ user, brand }: { user: SessionUser; brand: string }) {
  return <header className="sticky top-0 z-20 border-b border-rose-100 bg-white/90 backdrop-blur">
    <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
      <Link href="/" className="flex items-center gap-2 font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-100 text-berry"><Heart size={16} fill="currentColor" /></span>{brand}</Link>
      <nav className="flex items-center gap-3 text-sm font-semibold">
        <Link href="/dashboard" className="hidden hover:text-berry sm:inline">My surprises</Link>
        {user.role === "admin" && <Link href="/admin" className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-bold text-berry">Admin</Link>}
        <span className="hidden max-w-[160px] truncate text-xs text-roseink/60 md:inline" title={user.email}>{user.name || user.email}</span>
        <SignOutButton />
      </nav>
    </div>
  </header>;
}
