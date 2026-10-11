import { NextResponse } from "next/server";
import { appUrl, PRODUCTS } from "@/lib/config";
import { loadEntitlement } from "@/lib/entitlements";
import { COOKIE, cookieOptions, sign, verify } from "@/lib/session";

export const runtime = "nodejs";

/**
 * The only door to the booking flow. Two ways in:
 *   ?session_id=cs_...  Stripe's redirect right after checkout
 *   ?token=...          the signed link in the confirmation email (works on any device)
 * Either way the payment is re-verified with Stripe before the access cookie is set.
 * Then the buyer is sent on to the booking flow automatically.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  let sessionId = url.searchParams.get("session_id");
  const token = url.searchParams.get("token");
  if (!sessionId && token) sessionId = (await verify<{ sid?: string }>(token))?.sid ?? null;
  if (!sessionId) return NextResponse.redirect(`${appUrl()}/consult?error=invalid`);

  const ent = await loadEntitlement(sessionId);
  if (!ent.ok) return NextResponse.redirect(`${appUrl()}/consult?error=${ent.reason}`);

  const days = Math.min(PRODUCTS[ent.product].days, 180);
  const res = NextResponse.redirect(`${appUrl()}/consult?auto=1`);
  res.cookies.set(COOKIE.consult, await sign({ sid: sessionId }, days), cookieOptions(days));
  return res;
}
