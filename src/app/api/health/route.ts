import { NextResponse } from "next/server";
import { runHealthChecks } from "@/lib/health";

export const dynamic = "force-dynamic";

/** Setup diagnostics: open /api/health in a browser. Shows only whether things are configured, never secret values. */
export async function GET() {
  const result = await runHealthChecks();
  return NextResponse.json(result, { status: result.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
