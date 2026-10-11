import { NextResponse } from "next/server";
import { env } from "@/lib/config";
import { fulfill } from "@/lib/fulfill";
import { stripe, type Stripe } from "@/lib/stripe";

export const runtime = "nodejs";

/** Stripe webhook: verifies the signature on the RAW body, then fulfills paid sessions. */
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, env("STRIPE_WEBHOOK_SECRET"));
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await fulfill((event.data.object as Stripe.Checkout.Session).id);
    }
  } catch (err) {
    console.error("fulfillment failed", err);
    return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 }); // Stripe will retry
  }
  return NextResponse.json({ received: true });
}
