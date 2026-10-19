"use client";
import { useEffect } from "react";
import { CheckCircle2, Loader2, X, XCircle } from "lucide-react";

export type ToastState = { kind: "success" | "error" | "loading"; text: string } | null;

/** Turns the admin pages' plain status strings into a popup type. */
export function toastFromNote(note: string): ToastState {
  const text = (note || "").trim();
  if (!text) return null;
  if (/(…|\.\.\.)$/.test(text)) return { kind: "loading", text };
  if (/\b(saved|deleted|uploaded|removed)\b/i.test(text) && !/fail|error|could not|not allowed|too large/i.test(text)) return { kind: "success", text };
  return { kind: "error", text };
}

export default function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    if (!toast || toast.kind === "loading") return;
    const t = setTimeout(onClose, toast.kind === "error" ? 8000 : 3500);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-red-200 bg-red-50 text-red-900",
    loading: "border-rose-200 bg-white text-roseink"
  }[toast.kind];
  const Icon = toast.kind === "success" ? CheckCircle2 : toast.kind === "error" ? XCircle : Loader2;
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:justify-end">
      <div className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border p-4 shadow-lg ${styles}`}>
        <Icon size={20} className={`mt-0.5 shrink-0 ${toast.kind === "loading" ? "animate-spin" : ""}`} />
        <p className="min-w-0 flex-1 break-words text-sm font-semibold">{toast.text}</p>
        {toast.kind !== "loading" && <button type="button" aria-label="Dismiss" onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100"><X size={16} /></button>}
      </div>
    </div>
  );
}
