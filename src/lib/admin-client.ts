// Small client-side helper used by the surprise editor pages. Every call goes through the signed-in
// server routes (/api/manage/db and /api/manage/upload), which check that you own the surprise.
async function call(body: any): Promise<{ data: any; error: any }> {
  const r = await fetch("/api/manage/db", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  return { data: j.data ?? null, error: j.error ?? (r.ok ? null : { message: r.status === 401 ? "Please sign in again." : "Request failed." }) };
}
class Q {
  s: any = { eq: [] };
  constructor(table: string, surpriseId: string) { this.s.table = table; this.s.surprise_id = surpriseId; }
  select(cols = "*") { if (!this.s.op || this.s.op === "select") { this.s.op = "select"; this.s.columns = cols; } else this.s.returning = cols; return this; }
  insert(v: any) { this.s.op = "insert"; this.s.values = v; return this; }
  update(v: any) { this.s.op = "update"; this.s.values = v; return this; }
  upsert(v: any, o?: { onConflict?: string }) { this.s.op = "upsert"; this.s.values = v; this.s.onConflict = o?.onConflict; return this; }
  delete() { this.s.op = "delete"; return this; }
  eq(c: string, v: any) { this.s.eq.push([c, v]); return this; }
  order(c: string) { this.s.order = c; return this; }
  single() { this.s.single = "single"; return this; }
  maybeSingle() { this.s.single = "maybe"; return this; }
  then(res?: (v: any) => any, rej?: (e: any) => any) { return call(this.s).then(res, rej); }
}
export function createAdminClient(surpriseId: string) {
  return {
    from: (t: string) => new Q(t, surpriseId),
    storage: { from: (bucket: string) => ({
      upload: async (path: string, file: File, _o?: any) => {
        const form = new FormData();
        form.append("surprise_id", surpriseId); form.append("bucket", bucket); form.append("path", path); form.append("file", file);
        try {
          const r = await fetch("/api/manage/upload", { method: "POST", body: form });
          const j = await r.json().catch(() => ({}));
          return { error: j.error ?? (r.ok ? null : { message: `Upload failed (${r.status}).` }) };
        } catch { return { error: { message: "Network error during upload." } }; }
      },
      createSignedUrls: async (paths: string[]) => { const r = await call({ surprise_id: surpriseId, op: "signedUrls", paths, bucket }); return { data: r.data || {}, error: r.error }; },
      remove: async (paths: string[]) => paths.length ? call({ surprise_id: surpriseId, op: "remove", paths, bucket }) : { data: null, error: null }
    }) }
  };
}
