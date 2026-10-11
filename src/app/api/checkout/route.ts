import { NextResponse } from "next/server";
import { appUrl, isCallProduct, isProduct, PRODUCTS, safePath } from "@/lib/config";
import { getProject, sanitizeVals } from "@/lib/projects";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Creates a Stripe Checkout Session and returns its URL. The browser redirects there to pay.
 * The success URL points at a server route that re-verifies the payment with Stripe before
 * unlocking anything, so a hand-typed URL cannot skip the gate.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const product = body?.product;
  if (!isProduct(product)) return NextResponse.json({ error: "Unknown product" }, { status: 400 });

  const plan = PRODUCTS[product];
  const base = appUrl();
  const returnTo = safePath(body?.returnTo, "/");
  const metadata: Record<string, string> = { product, return: returnTo };

  if (product === "pdf") {
    const p = getProject(String(body?.slug ?? ""));
    if (!p) return NextResponse.json({ error: "Unknown project" }, { status: 400 });
    metadata.project = p.slug;
    metadata.zip = String(body?.zip ?? "").replace(/\D/g, "").slice(0, 5);
    metadata.vals = JSON.stringify(sanitizeVals(p, body?.vals)); // under Stripe's 500-char limit
  }

  const success_url =
    product === "pass" ? `${base}/api/pass/claim?session_id={CHECKOUT_SESSION_ID}`
    : isCallProduct(product) ? `${base}/api/consult/claim?session_id={CHECKOUT_SESSION_ID}`
    : `${base}/success?session_id={CHECKOUT_SESSION_ID}`;

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: plan.cents, product_data: { name: plan.label } } }],
    metadata,
    payment_intent_data: { metadata, description: plan.label },
    allow_promotion_codes: true,
    success_url,
    cancel_url: `${base}${returnTo}`
    // Turn on Stripe Tax in the Dashboard, then add: automatic_tax: { enabled: true }
  });

  return NextResponse.json({ url: session.url });
}
