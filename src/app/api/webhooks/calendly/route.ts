import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { adjustCallsUsed } from "@/lib/entitlements";

export const runtime = "nodejs";

/**
 * Calendly webhook. Subscribe it to invitee.created and invitee.canceled (Calendly API:
 * POST /webhook_subscriptions) and put the signing key in CALENDLY_WEBHOOK_SIGNING_KEY.
 * A booked call is counted against the purchase named in utm_content (a Stripe PaymentIntent id).
 * Verify the signature scheme against Calendly's current docs when you set this up.
 */
export async function POST(req: Request) {
  const key = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (!key) return NextResponse.json({ error: "Not configured" }, { status: 501 });

  const header = req.headers.get("calendly-webhook-signature") ?? "";
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = parts.t, v1 = parts.v1;
  const raw = await req.text();
  if (!t || !v1 || Math.abs(Date.now() / 1000 - Number(t)) > 180) return NextResponse.json({ error: "Bad signature" }, { status: 400 });

  const expected = createHmac("sha256", key).update(`${t}.${raw}`).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(v1);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Bad signature" }, { status: 400 });

  const evt = JSON.parse(raw) as {
    event?: string;
    payload?: { uri?: string; tracking?: { utm_content?: string | null } };
  };
  const pi = evt.payload?.tracking?.utm_content;
  if (!pi || !pi.startsWith("pi_")) return NextResponse.json({ ignored: true });

  const key2 = `${evt.event}:${evt.payload?.uri ?? ""}`;
  if (evt.event === "invitee.created") await adjustCallsUsed(pi, 1, key2);
  else if (evt.event === "invitee.canceled") await adjustCallsUsed(pi, -1, key2);
  return NextResponse.json({ ok: true });
}
