// Small client-side helper used by the admin pages. Every call goes through the
// password-protected server routes (/api/admin/db and /api/admin/upload) which talk to MySQL.
async function call(body: any): Promise<{ data: any; error: any }> {
  const r = await fetch("/api/admin/db", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  return { data: j.data ?? null, error: j.error ?? (r.ok ? null : { message: "Request failed." }) };
}
class Q {
  s: any = { eq: [] };
  constructor(table: string) { this.s.table = table; }
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
export function createAdminClient() {
  return {
    from: (t: string) => new Q(t),
    storage: { from: (bucket: string) => ({
      upload: async (path: string, file: File, _o?: any) => {
        const form = new FormData();
        form.append("bucket", bucket); form.append("path", path); form.append("file", file);
        try {
          const r = await fetch("/api/admin/upload", { method: "POST", body: form });
          const j = await r.json().catch(() => ({}));
          return { error: j.error ?? (r.ok ? null : { message: `Upload failed (${r.status}).` }) };
        } catch { return { error: { message: "Network error during upload." } }; }
      },
      createSignedUrls: async (paths: string[]) => { const r = await call({ op: "signedUrls", paths, bucket }); return { data: r.data || {}, error: r.error }; },
      remove: async (paths: string[]) => paths.length ? call({ op: "remove", paths, bucket }) : { data: null, error: null }
    }) }
  };
}
