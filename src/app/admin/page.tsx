import Link from "next/link";
import { db, RowDataPacket } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const pool = await db();
  const one = async (sql: string) => Number((await pool.query<RowDataPacket[]>(sql))[0][0].n);
  const [users, blocked, surprises, published, bytes, occasions] = await Promise.all([
    one("SELECT COUNT(*) n FROM users"), one("SELECT COUNT(*) n FROM users WHERE is_blocked = 1"), one("SELECT COUNT(*) n FROM surprises"),
    one("SELECT COUNT(*) n FROM surprises WHERE is_published = 1"), one("SELECT COALESCE(SUM(size),0) n FROM files"), one("SELECT COUNT(*) n FROM occasions WHERE enabled = 1")]);
  const [recent] = await pool.query<RowDataPacket[]>("SELECT s.id, s.slug, s.title, s.created_at, u.email FROM surprises s LEFT JOIN users u ON u.id = s.owner_id ORDER BY s.created_at DESC LIMIT 8");
  const [newUsers] = await pool.query<RowDataPacket[]>("SELECT id, email, name, created_at FROM users ORDER BY created_at DESC LIMIT 8");
  const stats: [string, string][] = [["Users", `${users}${blocked ? ` (${blocked} blocked)` : ""}`], ["Surprises", `${surprises} (${published} published)`], ["Storage used", `${(bytes / 1048576).toFixed(1)} MB`], ["Active occasions", String(occasions)]];
  return <div className="space-y-8">
    <h1 className="text-3xl font-black tracking-tight">Overview</h1>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{stats.map(([k, v]) => <div key={k} className="rounded-3xl border border-rose-100 bg-white p-5"><p className="text-sm text-roseink/60">{k}</p><p className="mt-1 text-2xl font-black">{v}</p></div>)}</div>
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-3xl border border-rose-100 bg-white p-5"><h2 className="font-black">Newest surprises</h2>
        <ul className="mt-3 divide-y divide-rose-50 text-sm">{recent.map(r => <li key={r.id} className="flex justify-between gap-3 py-2"><Link className="truncate font-semibold hover:text-berry" href={`/dashboard/s/${r.id}`}>{r.title}</Link><span className="truncate text-roseink/55">{r.email || "unclaimed"}</span></li>)}{!recent.length && <li className="py-2 text-roseink/55">Nothing yet.</li>}</ul></section>
      <section className="rounded-3xl border border-rose-100 bg-white p-5"><h2 className="font-black">Newest users</h2>
        <ul className="mt-3 divide-y divide-rose-50 text-sm">{newUsers.map(r => <li key={r.id} className="flex justify-between gap-3 py-2"><span className="truncate font-semibold">{r.name || r.email}</span><span className="truncate text-roseink/55">{r.email}</span></li>)}{!newUsers.length && <li className="py-2 text-roseink/55">No one has signed in yet.</li>}</ul></section>
    </div>
  </div>;
}
