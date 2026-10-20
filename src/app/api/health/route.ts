import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
// Render health check: answers without touching the database so deploys never fail on a slow DB wake-up.
export async function GET() { return NextResponse.json({ ok: true }); }
