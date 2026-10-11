# Measure Twice

DIY homeowner platform: nine project calculators (roofing, metal roofing, bathroom, kitchen, basement,
electrical, plumbing, drywall, flooring) with ZIP-adjusted pricing, tool price comparison, contractor
comparison, and three paid products. Next.js (App Router) + Stripe Checkout + SendGrid + Calendly.

## What is paid, and how the gate works

| Product | Price | Unlocks |
|---|---|---|
| Calculator Access Pass | $4.99 | 30 days of the calculator on every project |
| Project PDF Guide | $19.99 | PDF emailed by SendGrid after payment |
| Call, 1 / 5 / unlimited month | $49.99 / $199 / $299 | Booking flow and support line |

Nothing is trusted from the browser. Every unlock re-checks Stripe on the server.

1. `POST /api/checkout` creates a Stripe Checkout Session. The success URL is a **server route**, not a page.
2. **Pass:** `/api/pass/claim` retrieves the session from Stripe, requires `paid` and not refunded, then sets a
   signed httpOnly cookie. `/api/calc` and `/api/ask` return 402 without it, and the pricing engine only runs on the server.
3. **Calls:** `/api/consult/claim` re-verifies the payment with Stripe, sets a signed cookie, and redirects to
   `/consult?auto=1`, which immediately calls `POST /api/consult/book`. That route re-checks Stripe again
   (paid, not refunded, inside the plan window, calls remaining) and only then creates a **single-use Calendly link**
   and returns it. The phone number is rendered only inside the verified `/consult` view.
   The confirmation email contains a signed link to the same claim route, so access works on any device.
4. **Stripe webhook** (`/api/webhooks/stripe`) is the fulfillment path: it builds and emails the PDF, emails the
   call-access link, and notifies the owner. It is idempotent (marks the PaymentIntent `fulfilled`).
5. **Calendly webhook** (`/api/webhooks/calendly`) counts calls used: +1 on `invitee.created`, -1 on `invitee.canceled`,
   stored in the PaymentIntent metadata. Stripe is the only datastore, so there is no database to run.

Why the redirect is not driven by the webhook: a webhook is server-to-server and cannot move the buyer's browser.
The success route verifies the payment directly with Stripe, so the buyer is never stuck waiting for webhook timing.

## Setup

```bash
npm install
cp .env.example .env.local     # fill in the values
npm run dev
```

Generate `SESSION_SECRET` with `openssl rand -base64 32`.

### Stripe
1. Put the **secret** key in `STRIPE_SECRET_KEY` (host environment settings only, never in git or chat).
2. Dashboard > Developers > Webhooks > add endpoint `https://YOUR-DOMAIN/api/webhooks/stripe` with events
   `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`.
3. Local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, then use test keys and card `4242 4242 4242 4242`.
4. Turn on Stripe Tax and add `automatic_tax: { enabled: true }` in `src/app/api/checkout/route.ts` if you collect sales tax.

### SendGrid
Verify the sender address you set in `SENDGRID_FROM` (single sender or domain authentication).

### Calendly (use the API setup, not a public link)
1. Create a personal access token and put it in `CALENDLY_TOKEN`.
2. `CALENDLY_EVENT_TYPE_URI`: the event type's API URI (`GET /event_types`).
3. Create a webhook subscription for `invitee.created` and `invitee.canceled` pointing at
   `https://YOUR-DOMAIN/api/webhooks/calendly`, and put its signing key in `CALENDLY_WEBHOOK_SIGNING_KEY`.
4. In the event type, set the location to your phone call so the number appears in the confirmation email Calendly sends.
`CALENDLY_URL` is a fallback only. A reusable public link can be shared, which defeats the paid gate.

### Affiliate programs (apply first; each has its own rules)
- Lowe's: through the affiliate network you are approved on. Set `LOWES_AFFILIATE_URL_TEMPLATE` with a `{url}` placeholder for the destination.
- Amazon Associates: set `AMAZON_ASSOCIATE_TAG`. Price display from the Product Advertising API needs an approved account.
- eBay Partner Network: set `EBAY_CAMPAIGN_ID`. Add `EBAY_CLIENT_ID/SECRET` to fetch live prices for items in `data/catalog.json`.
Until prices are connected, the UI labels them **sample price**. Do not advertise comparison savings off sample data.
Fill `data/catalog.json` with the exact product you recommend per tool (name must match `src/lib/projects.ts`).

## Deploy (Vercel)
1. Push to a private GitHub repo and import it in Vercel.
2. Add every variable from `.env.example` under Project > Settings > Environment Variables (Production).
3. Set `APP_URL` to your live https domain, deploy, then create the Stripe and Calendly webhooks with that domain.
4. Make one real $4.99 purchase and one refund to test the whole path, including that a refunded pass or call is rejected.

## Before you launch
- **Pricing data:** `src/lib/region.ts` is an illustrative index. Replace with ZIP-level labor and material data.
- **Formulas:** have a contractor review quantity and labor formulas in `src/lib/projects.ts` per project.
- **PDF depth:** `steps[]` is an outline. Expand each project into full instructions, photos and checklists before selling at $19.99.
- **Legal:** terms of service, privacy policy, refund policy, affiliate disclosure (included in the footer), and advice disclaimers.
  Ask a lawyer and your insurer about selling live help on electrical, gas, roofing and structural work. Some states regulate this.
- **Rate limiting:** `/api/ask` uses an in-memory limiter. Use Upstash or Vercel KV when you run more than one instance.
- **Call credits:** stored in Stripe PaymentIntent metadata. Move to a database if you add accounts or reporting.
- **Secrets:** rotate any key that was ever pasted into a chat, ticket or commit.

## Layout
```
data/catalog.json            curated tool products per store
src/lib/projects.ts          all project data, formulas, tools, steps
src/lib/engine.ts            server-side pricing engine
src/lib/prices.ts            store prices and affiliate links
src/lib/entitlements.ts      live Stripe entitlement checks for calls
src/lib/{session,stripe,email,calendly,pdf,fulfill}.ts
src/app/api/{checkout,calc,ask,pass/claim,consult/{claim,book},webhooks/{stripe,calendly}}/route.ts
src/app/{page,[project]/page,consult/page,success/page}.tsx
```
