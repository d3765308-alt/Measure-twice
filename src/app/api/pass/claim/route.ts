import { NextResponse } from "next/server";
import { appUrl, PASS_DAYS, safePath } from "@/lib/config";
import { COOKIE, cookieOptions, sign } from "@/lib/session";
import { stripe, type Stripe } from "@/lib/stripe";

export const runtime = "nodejs";

/** Stripe sends the buyer here after checkout. We verify payment with Stripe, then set the pass cookie. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("session_id");
  const fail = () => NextResponse.redirect(`${appUrl()}/?payment=failed`);
  if (!id) return fail();

  let s: Stripe.Checkout.Session;
  try {
    s = await stripe().checkout.sessions.retrieve(id, { expand: ["payment_intent.latest_charge"] });
  } catch {
    return fail();
  }
  const charge = (s.payment_intent as Stripe.PaymentIntent | null)?.latest_charge as Stripe.Charge | null | undefined;
  const refunded = charge && typeof charge !== "string" && charge.refunded;
  if (s.payment_status !== "paid" || s.metadata?.product !== "pass" || refunded) return fail();

  const res = NextResponse.redirect(`${appUrl()}${safePath(s.metadata?.return)}?unlocked=1`);
  res.cookies.set(COOKIE.pass, await sign({ pass: true, sid: s.id }, PASS_DAYS), cookieOptions(PASS_DAYS));
  return res;
}
