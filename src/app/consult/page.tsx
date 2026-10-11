import BuyButton from "@/components/BuyButton";
import { CALL_PLAN_COPY, PRODUCTS } from "@/lib/config";
import { loadEntitlement } from "@/lib/entitlements";
import { COOKIE, readCookie, verify } from "@/lib/session";
import BookButton from "./BookButton";

export const dynamic = "force-dynamic";

const REASONS: Record<string, string> = {
  unpaid: "We could not confirm a payment for this link.",
  refunded: "This purchase was refunded, so call access is closed.",
  expired: "This plan has expired. You can buy a new one below.",
  not_a_consultation: "That purchase does not include calls.",
  not_found: "We could not find that purchase.",
  invalid: "That access link is not valid."
};

/**
 * Consultation hub. Phone number and booking flow are rendered ONLY after the server has verified a paid,
 * unrefunded, unexpired consultation purchase with Stripe. Everyone else sees the plans and a checkout button.
 */
export default async function ConsultPage({ searchParams }: { searchParams: Promise<{ auto?: string; error?: string }> }) {
  const sp = await searchParams;
  const sid = (await verify<{ sid?: string }>(await readCookie(COOKIE.consult)))?.sid;
  const ent = sid ? await loadEntitlement(sid) : null;

  if (!ent || !ent.ok) {
    const reason = sp.error ?? (ent && !ent.ok ? ent.reason : undefined);
    return (
      <section className="panel" aria-labelledby="h">
        <h2 id="h">Troubleshooting calls</h2>
        {reason && <p className="err" role="alert">{REASONS[reason] ?? "We could not verify your purchase."}</p>}
        <p className="sub">Choose a plan and pay at checkout. You will be taken straight to booking afterward.</p>
        <div className="offer">
          {CALL_PLAN_COPY.map((c) => (
            <div className="card2" key={c.id}>
              <h3>{c.name}</h3>
              <div className="price num">${(PRODUCTS[c.id].cents / 100).toFixed(2)}</div>
              <p className="fine">{c.note}</p>
              <BuyButton product={c.id} label="Buy" returnTo="/consult" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const canBook = ent.remaining === null || ent.remaining > 0;
  const phone = process.env.SUPPORT_PHONE; // server-only, rendered only for verified buyers
  return (
    <section className="panel" aria-labelledby="h">
      <h2 id="h">Book your call</h2>
      <p className="sub">
        {PRODUCTS[ent.product].label}.{" "}
        {ent.remaining === null ? "Unlimited calls" : `${ent.remaining} of ${ent.total} calls remaining`}, valid until{" "}
        {new Date(ent.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
      </p>
      {canBook ? (
        <>
          <BookButton auto={sp.auto === "1"} />
          {phone && <p className="fine" style={{ marginTop: 12 }}>Call support line: <b className="num">{phone}</b>. Please book a time first so we can be ready for you.</p>}
        </>
      ) : (
        <p className="sub">You have used all of your calls. Check your email for your booking confirmation, or buy another plan from any project page.</p>
      )}
    </section>
  );
}
