import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Readiness probe for deployment platforms; keep /api/health as liveness. */
export async function GET() {
  try {
    const pool = await db();
    await pool.query("SELECT 1");
    return NextResponse.json({ ok: true, database: "ready" }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[ready] database check failed:", error);
    return NextResponse.json({ ok: false, database: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
