import { NextResponse } from "next/server";
import { createBookingLink } from "@/lib/calendly";
import { loadEntitlement, setPendingLink } from "@/lib/entitlements";
import { COOKIE, readCookie, verify } from "@/lib/session";

export const runtime = "nodejs";

/**
 * Returns a booking link only if Stripe says this purchase is paid, not refunded, unexpired and has
 * calls left. One outstanding link at a time: if the buyer already has an unused link we return the
 * same one, so asking twice never burns a second call.
 */
export async function POST() {
  const sid = (await verify<{ sid?: string }>(await readCookie(COOKIE.consult)))?.sid;
  if (!sid) return NextResponse.json({ error: "Purchase required" }, { status: 402 });

  const ent = await loadEntitlement(sid);
  if (!ent.ok) return NextResponse.json({ error: "Purchase required", reason: ent.reason }, { status: 402 });
  if (ent.remaining === 0) return NextResponse.json({ error: "No calls remaining", reason: "used_up" }, { status: 403 });

  try {
    const url = ent.pendingLink ?? (await createBookingLink(ent.paymentIntentId, ent.email));
    if (!ent.pendingLink) await setPendingLink(ent.paymentIntentId, url);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("booking link failed", err);
    return NextResponse.json({ error: "Booking is temporarily unavailable" }, { status: 502 });
  }
}
