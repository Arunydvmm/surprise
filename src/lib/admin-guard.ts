import { NextResponse } from "next/server";
import { getSessionUser, SessionUser } from "@/lib/auth";
import { isSameOrigin } from "@/lib/request-security";

export const adminErr = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/** Every /api/admin route calls this first: signed in, an admin, and (for writes) a same-origin request. */
export async function requireAdmin(req: Request): Promise<{ user: SessionUser; res?: undefined } | { user?: undefined; res: NextResponse }> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return { res: adminErr("Not allowed.", user ? 403 : 401) };
  if (req.method !== "GET" && !isSameOrigin(req)) return { res: adminErr("Cross-origin request blocked.", 403) };
  return { user };
}
