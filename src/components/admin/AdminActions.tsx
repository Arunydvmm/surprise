"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Toast, { ToastState } from "@/components/Toast";

async function run(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, error: data.error as string | undefined };
}
const btn = "rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50";

function useAction() {
  const router = useRouter();
  const [toast, setToast] = useState<ToastState>(null);
  const [busy, setBusy] = useState(false);
  async function go(body: Record<string, unknown>, ok: string, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true); const r = await run(body); setBusy(false);
    if (!r.ok) setToast({ kind: "error", text: r.error || "Failed." }); else { setToast({ kind: "success", text: ok }); router.refresh(); }
  }
  return { toast, setToast, busy, go };
}

export function UserActions({ id, blocked, role, self }: { id: string; blocked: boolean; role: string; self: boolean }) {
  const { toast, setToast, busy, go } = useAction();
  if (self) return <span className="text-xs text-roseink/50">You</span>;
  return <div className="flex flex-wrap gap-2"><Toast toast={toast} onClose={() => setToast(null)} />
    <button disabled={busy} className={`${btn} ${blocked ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`} onClick={() => go({ action: "user.block", id, value: !blocked }, blocked ? "Unblocked." : "Blocked and signed out.", blocked ? undefined : "Block this user? They will be signed out and cannot sign in again.")}>{blocked ? "Unblock" : "Block"}</button>
    <button disabled={busy} className={`${btn} bg-rose-100 text-berry`} onClick={() => go({ action: "user.role", id, value: role === "admin" ? "user" : "admin" }, "Role updated.", role === "admin" ? "Remove admin rights from this user?" : "Make this user an admin? Admins can see and manage everything.")}>{role === "admin" ? "Remove admin" : "Make admin"}</button>
  </div>;
}

export function SurpriseAdminActions({ id, slug, published }: { id: string; slug: string; published: boolean }) {
  const { toast, setToast, busy, go } = useAction();
  return <div className="flex flex-wrap gap-2"><Toast toast={toast} onClose={() => setToast(null)} />
    <a className={`${btn} bg-roseink text-white`} href={`/dashboard/s/${id}`}>Manage</a>
    <a className={`${btn} bg-rose-100 text-berry`} href={`/s/${slug}`} target="_blank" rel="noreferrer">Open</a>
    <button disabled={busy} className={`${btn} bg-rose-100 text-berry`} onClick={() => go({ action: "surprise.publish", id, value: !published }, published ? "Unpublished." : "Published.")}>{published ? "Unpublish" : "Publish"}</button>
    <button disabled={busy} className={`${btn} bg-red-50 text-red-600`} onClick={() => go({ action: "surprise.delete", id }, "Deleted.", "Delete this surprise and all its photos, music and text? This cannot be undone.")}>Delete</button>
  </div>;
}
