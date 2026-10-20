"use client";
import { LogOut } from "lucide-react";
export default function SignOutButton() {
  async function out() { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/"; }
  return <button onClick={out} className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/70 px-3 py-2 text-xs font-semibold"><LogOut size={14} /> Sign out</button>;
}
