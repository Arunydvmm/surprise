import { db, RowDataPacket } from "@/lib/db";
import { SurpriseAdminActions } from "@/components/admin/AdminActions";
import SearchBar, { Pager } from "@/components/admin/SearchBar";

export const dynamic = "force-dynamic";
const PAGE = 25;

export default async function AdminSurprises({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const q = (searchParams.q || "").trim().slice(0, 100), page = Math.max(1, Number(searchParams.page) || 1);
  const pool = await db();
  const like = `%${q.replace(/[%_\\]/g, m => "\\" + m)}%`;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.id, s.slug, s.title, s.is_published, s.created_at, u.email AS owner, o.name AS occasion, o.emoji,
       (SELECT COALESCE(SUM(size), 0) FROM files f WHERE f.surprise_id = s.id) AS bytes
     FROM surprises s LEFT JOIN users u ON u.id = s.owner_id LEFT JOIN occasions o ON o.id = s.occasion_id
     ${q ? "WHERE s.title LIKE ? OR s.slug LIKE ? OR u.email LIKE ?" : ""} ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
    [...(q ? [like, like, like] : []), PAGE + 1, (page - 1) * PAGE]);
  const hasMore = rows.length > PAGE, list = rows.slice(0, PAGE);
  return <div className="space-y-5">
    <h1 className="text-3xl font-black tracking-tight">Surprises</h1>
    <SearchBar action="/admin/surprises" q={q} placeholder="Search by title, link or owner email" />
    <div className="overflow-x-auto rounded-3xl border border-rose-100 bg-white"><table className="w-full min-w-[820px] text-left text-sm">
      <thead className="border-b border-rose-100 text-xs text-roseink/60"><tr><th className="p-4">Surprise</th><th>Owner</th><th>Storage</th><th>Status</th><th className="pr-4">Actions</th></tr></thead>
      <tbody className="divide-y divide-rose-50">{list.map(s => <tr key={s.id}>
        <td className="p-4"><p className="font-bold">{s.emoji || "🎁"} {s.title}</p><p className="text-xs text-roseink/55">/s/{s.slug} · {s.occasion || "No occasion"}</p></td>
        <td className="text-xs">{s.owner || "Unclaimed"}</td><td className="text-xs">{(Number(s.bytes) / 1048576).toFixed(1)} MB</td>
        <td><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.is_published ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-roseink/60"}`}>{s.is_published ? "Published" : "Draft"}</span></td>
        <td className="py-3 pr-4"><SurpriseAdminActions id={s.id} slug={s.slug} published={!!s.is_published} /></td></tr>)}
        {!list.length && <tr><td colSpan={5} className="p-6 text-center text-roseink/55">No surprises found.</td></tr>}</tbody></table></div>
    <Pager base="/admin/surprises" q={q} page={page} hasMore={hasMore} />
  </div>;
}
