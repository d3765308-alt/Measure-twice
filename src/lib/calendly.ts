/**
 * Booking links are created per purchase and are single-use when the Calendly API is configured.
 * The link is only ever returned by /api/consult/book after Stripe confirms payment, so the booking
 * calendar is never on a public page. The payment intent id is attached as utm_content so the Calendly
 * webhook can count the booked call against the right purchase.
 */
export async function createBookingLink(paymentIntentId: string, email: string | null): Promise<string> {
  const token = process.env.CALENDLY_TOKEN;
  const eventType = process.env.CALENDLY_EVENT_TYPE_URI;
  let base: string | undefined;

  if (token && eventType) {
    const r = await fetch("https://api.calendly.com/scheduling_links", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ max_event_count: 1, owner: eventType, owner_type: "EventType" })
    });
    if (!r.ok) throw new Error(`Calendly link creation failed (${r.status})`);
    const j = (await r.json()) as { resource?: { booking_url?: string } };
    base = j.resource?.booking_url;
  } else {
    // Weaker fallback: a reusable public link. Use the API setup above for production.
    base = process.env.CALENDLY_URL;
  }
  if (!base) throw new Error("Calendly is not configured (set CALENDLY_TOKEN + CALENDLY_EVENT_TYPE_URI)");

  const u = new URL(base);
  u.searchParams.set("utm_source", "measuretwice");
  u.searchParams.set("utm_content", paymentIntentId);
  if (email) u.searchParams.set("email", email);
  return u.toString();
}
