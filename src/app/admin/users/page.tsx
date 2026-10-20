import { db, RowDataPacket } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { UserActions } from "@/components/admin/AdminActions";
import SearchBar, { Pager } from "@/components/admin/SearchBar";

export const dynamic = "force-dynamic";
const PAGE = 25;

export default async function AdminUsers({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const me = await getSessionUser();
  const q = (searchParams.q || "").trim().slice(0, 100), page = Math.max(1, Number(searchParams.page) || 1);
  const pool = await db();
  const like = `%${q.replace(/[%_\\]/g, m => "\\" + m)}%`;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.email, u.name, u.role, u.is_blocked, u.created_at, u.last_login_at, COUNT(s.id) AS surprises
     FROM users u LEFT JOIN surprises s ON s.owner_id = u.id ${q ? "WHERE u.email LIKE ? OR u.name LIKE ?" : ""}
     GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?`, [...(q ? [like, like] : []), PAGE + 1, (page - 1) * PAGE]);
  const hasMore = rows.length > PAGE, list = rows.slice(0, PAGE);
  return <div className="space-y-5">
    <h1 className="text-3xl font-black tracking-tight">Users</h1>
    <SearchBar action="/admin/users" q={q} placeholder="Search by name or email" />
    <div className="overflow-x-auto rounded-3xl border border-rose-100 bg-white"><table className="w-full min-w-[720px] text-left text-sm">
      <thead className="border-b border-rose-100 text-xs text-roseink/60"><tr><th className="p-4">User</th><th>Role</th><th>Surprises</th><th>Last sign-in</th><th>Status</th><th className="pr-4">Actions</th></tr></thead>
      <tbody className="divide-y divide-rose-50">{list.map(u => <tr key={u.id}>
        <td className="p-4"><p className="font-bold">{u.name || "No name"}</p><p className="text-xs text-roseink/55">{u.email}</p></td>
        <td>{u.role}</td><td>{u.surprises}</td><td className="text-xs text-roseink/60">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "Never"}</td>
        <td>{u.is_blocked ? <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">Blocked</span> : <span className="text-xs text-emerald-700">Active</span>}</td>
        <td className="py-3 pr-4"><UserActions id={u.id} blocked={!!u.is_blocked} role={u.role} self={u.id === me?.id} /></td></tr>)}
        {!list.length && <tr><td colSpan={6} className="p-6 text-center text-roseink/55">No users found.</td></tr>}</tbody></table></div>
    <Pager base="/admin/users" q={q} page={page} hasMore={hasMore} />
  </div>;
}
