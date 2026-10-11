import Link from "next/link";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Landing page after buying a PDF. Verifies payment with Stripe; the PDF itself is emailed by the webhook. */
export default async function Success({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  let paid = false, email: string | null = null;
  if (session_id) {
    try {
      const s = await stripe().checkout.sessions.retrieve(session_id);
      paid = s.payment_status === "paid" && s.metadata?.product === "pdf";
      email = s.customer_details?.email ?? null;
    } catch { /* fall through to the not-verified message */ }
  }
  return (
    <section className="panel">
      {paid ? (
        <>
          <h2>Payment received</h2>
          <p className="sub">Your project guide is on its way{email ? ` to ${email}` : ""}. It usually arrives within a minute. Check your spam folder if you do not see it.</p>
        </>
      ) : (
        <>
          <h2>We could not confirm that payment</h2>
          <p className="sub">If you were charged, your guide will still be emailed once Stripe confirms the payment.</p>
        </>
      )}
      <Link className="btn" href="/">Back to projects</Link>
    </section>
  );
}
