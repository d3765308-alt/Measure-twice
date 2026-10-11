import { isCallProduct, PRODUCTS, type CallProductId } from "./config";
import { stripe, type Stripe } from "./stripe";

/**
 * Consultation entitlement, derived live from Stripe on every check. Stripe is the single source of truth:
 *   - session must be paid
 *   - the charge must not be refunded
 *   - the plan window (days since purchase) must still be open
 *   - calls used is stored in the PaymentIntent metadata (updated by the Calendly webhook)
 * Nothing here depends on the Stripe webhook having arrived yet, so the buyer is never stuck on a race.
 */
export type Entitlement =
  | {
      ok: true;
      sessionId: string;
      paymentIntentId: string;
      product: CallProductId;
      email: string | null;
      total: number | null; // null = unlimited
      used: number;
      remaining: number | null; // null = unlimited
      expiresAt: number; // ms
      pendingLink: string | null;
    }
  | { ok: false; reason: "unpaid" | "not_a_consultation" | "refunded" | "expired" | "not_found" };

export async function loadEntitlement(sessionId: string): Promise<Entitlement> {
  let s: Stripe.Checkout.Session;
  try {
    s = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["payment_intent.latest_charge"] });
  } catch {
    return { ok: false, reason: "not_found" };
  }
  if (s.payment_status !== "paid") return { ok: false, reason: "unpaid" };
  const product = s.metadata?.product;
  if (!isCallProduct(product)) return { ok: false, reason: "not_a_consultation" };

  const pi = s.payment_intent as Stripe.PaymentIntent | null;
  if (!pi || typeof pi === "string") return { ok: false, reason: "not_found" };
  const charge = pi.latest_charge as Stripe.Charge | null;
  if (charge && typeof charge !== "string" && (charge.refunded || charge.amount_refunded > 0)) return { ok: false, reason: "refunded" };

  const plan = PRODUCTS[product];
  const expiresAt = (s.created + plan.days * 86400) * 1000;
  if (Date.now() > expiresAt) return { ok: false, reason: "expired" };

  const used = Number(pi.metadata?.calls_used ?? 0) || 0;
  const total = plan.calls;
  return {
    ok: true,
    sessionId: s.id,
    paymentIntentId: pi.id,
    product,
    email: s.customer_details?.email ?? null,
    total,
    used,
    remaining: total === null ? null : Math.max(0, total - used),
    expiresAt,
    pendingLink: pi.metadata?.pending_link || null
  };
}

export async function setPendingLink(paymentIntentId: string, link: string): Promise<void> {
  await stripe().paymentIntents.update(paymentIntentId, { metadata: { pending_link: link } });
}

/** Called by the Calendly webhook: delta +1 when a call is booked, -1 when it is canceled. */
export async function adjustCallsUsed(paymentIntentId: string, delta: 1 | -1, eventKey: string): Promise<void> {
  const pi = await stripe().paymentIntents.retrieve(paymentIntentId);
  if (pi.metadata?.last_calendly_event === eventKey) return; // duplicate delivery
  const used = Math.max(0, (Number(pi.metadata?.calls_used ?? 0) || 0) + delta);
  await stripe().paymentIntents.update(paymentIntentId, {
    metadata: { calls_used: String(used), pending_link: "", last_calendly_event: eventKey }
  });
}
