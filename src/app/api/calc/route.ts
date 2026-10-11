import { NextResponse } from "next/server";
import { compute } from "@/lib/engine";
import { hasPass } from "@/lib/session";

export const runtime = "nodejs";

/** The calculator. Server-side only, so the $4.99 pass cannot be bypassed from the browser. */
export async function POST(req: Request) {
  if (!(await hasPass())) return NextResponse.json({ error: "Calculator pass required" }, { status: 402 });
  const body = await req.json().catch(() => null);
  const result = await compute(String(body?.slug ?? ""), { zip: body?.zip, vals: body?.vals, owned: body?.owned });
  if (!result) return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  return NextResponse.json(result);
}
