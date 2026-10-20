import { redirect } from "next/navigation";
import { db, RowDataPacket } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Old links pointed at /unlock. Send them to the original surprise (the "legacy" one), or the home page. */
export default async function LegacyUnlock() {
  let slug = "";
  try {
    const pool = await db();
    const [rows] = await pool.query<RowDataPacket[]>("SELECT slug FROM surprises WHERE is_legacy = 1 LIMIT 1");
    slug = rows[0]?.slug || "";
  } catch {}
  redirect(slug ? `/s/${slug}` : "/");
}
