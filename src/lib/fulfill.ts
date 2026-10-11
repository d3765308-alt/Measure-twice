import { appUrl, env, isCallProduct, PRODUCTS, type ProductId } from "./config";
import { compute } from "./engine";
import { sendEmail } from "./email";
import { buildGuidePdf } from "./pdf";
import { getProject } from "./projects";
import { sign } from "./session";
import { stripe, type Stripe } from "./stripe";

const usd = (cents: number) => "$" + (cents / 100).toFixed(2);

/**
 * Called from the Stripe webhook after payment. Idempotent: Stripe retries webhooks, so we mark the
 * PaymentIntent as fulfilled and skip work on repeats. Throw on failure so Stripe retries.
 */
export async function fulfill(sessionId: string): Promise<void> {
  const s = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
  if (s.payment_status !== "paid") return;
  const pi = s.payment_intent as Stripe.PaymentIntent | null;
  if (!pi || typeof pi === "string") return;
  if (pi.metadata?.fulfilled === "1") return;

  const product = s.metadata?.product as ProductId | undefined;
  if (!product || !(product in PRODUCTS)) return;
  const email = s.customer_details?.email ?? null;
  const plan = PRODUCTS[product];

  if (product === "pdf" && email) {
    const slug = s.metadata?.project ?? "";
    const p = getProject(slug);
    if (p) {
      const vals = JSON.parse(s.metadata?.vals || "{}");
      const r = await compute(slug, { zip: s.metadata?.zip, vals, owned: [] });
      if (r) {
        const pdf = await buildGuidePdf(r, p);
        await sendEmail({
          to: email,
          subject: `Your ${p.label} project guide`,
          text: `Thanks for your purchase. Your ${p.label} guide is attached, sized to your dimensions and priced for your ZIP code.\n\nEstimates are for planning, not a quote. Check local permit rules before you start.`,
          attachments: [{ filename: `${p.slug}-guide.pdf`, content: pdf, type: "application/pdf" }]
        });
      }
    }
  }

  if (isCallProduct(product) && email) {
    // The email carries a signed access link, never the phone number or a calendar link.
    const token = await sign({ sid: s.id }, plan.days);
    await sendEmail({
      to: email,
      subject: "Your troubleshooting call access",
      text: `Thanks for your purchase: ${plan.label}.\n\nUse this private link to book your call. It is tied to your payment, so please do not share it:\n${appUrl()}/api/consult/claim?token=${token}\n\nYour access is valid for ${plan.days} days.`
    });
  }

  // Tell the owner about every sale.
  await sendEmail({
    to: env("NOTIFICATION_EMAIL"),
    subject: `New sale: ${plan.label} (${usd(plan.cents)})`,
    text: [
      `Product: ${plan.label}`,
      `Amount: ${usd(plan.cents)}`,
      `Customer: ${email ?? "(no email)"}`,
      s.metadata?.project ? `Project: ${s.metadata.project}` : "",
      s.metadata?.zip ? `ZIP: ${s.metadata.zip}` : "",
      `Stripe session: ${s.id}`
    ].filter(Boolean).join("\n")
  });

  await stripe().paymentIntents.update(pi.id, { metadata: { fulfilled: "1" } });
}
