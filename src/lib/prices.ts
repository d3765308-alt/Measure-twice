import catalog from "../../data/catalog.json";
import type { StorePrice, ToolDef } from "./types";

/**
 * Store pricing. Three affiliate stores (Lowe's, Amazon, eBay) plus two "typical retail" reference
 * prices for comparison.
 *
 * Price sources, best first:
 *   live     eBay Browse API (needs EBAY_CLIENT_ID/SECRET and an itemId in data/catalog.json)
 *   catalog  a price you entered in data/catalog.json
 *   sample   generated from the tool's reference price, clearly labeled in the UI
 *
 * Lowe's has no public price API. Use your affiliate network's product feed to fill catalog.json
 * on a schedule. Amazon prices come from the Product Advertising API, which requires an approved
 * Associates account. Until then, sample prices are shown and labeled as samples.
 */
type Entry = {
  lowes?: { url?: string; price?: number };
  amazon?: { asin?: string; price?: number };
  ebay?: { itemId?: string; price?: number };
};
const CAT = catalog as unknown as Record<string, Entry>;
const enc = encodeURIComponent;

export function lowesUrl(query: string, direct?: string): string {
  const target = direct ?? `https://www.lowes.com/search?searchTerm=${enc(query)}`;
  const tpl = process.env.LOWES_AFFILIATE_URL_TEMPLATE; // e.g. https://network.example/click?id=XXX&u={url}
  return tpl ? tpl.replace("{url}", enc(target)) : target;
}
export function amazonUrl(query: string, asin?: string): string {
  const base = asin ? `https://www.amazon.com/dp/${asin}` : `https://www.amazon.com/s?k=${enc(query)}`;
  const tag = process.env.AMAZON_ASSOCIATE_TAG;
  return tag ? `${base}${base.includes("?") ? "&" : "?"}tag=${enc(tag)}` : base;
}
export function ebayUrl(query: string): string {
  const base = `https://www.ebay.com/sch/i.html?_nkw=${enc(query)}`;
  const camp = process.env.EBAY_CAMPAIGN_ID;
  return camp ? `${base}&mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=${enc(camp)}&customid=measuretwice&toolid=10001&mkevt=1` : base;
}

function hash(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}
const snap = (v: number) => Math.max(0.99, Math.round(v) - 0.01);

let ebayToken: { value: string; exp: number } | null = null;
async function ebayPrice(itemId: string): Promise<number | null> {
  const id = process.env.EBAY_CLIENT_ID, secret = process.env.EBAY_CLIENT_SECRET;
  if (!id || !secret) return null;
  try {
    if (!ebayToken || ebayToken.exp < Date.now() + 60_000) {
      const r = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64") },
        body: "grant_type=client_credentials&scope=" + enc("https://api.ebay.com/oauth/api_scope")
      });
      if (!r.ok) return null;
      const j = (await r.json()) as { access_token: string; expires_in: number };
      ebayToken = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
    }
    const r = await fetch(`https://api.ebay.com/buy/browse/v1/item/${enc(itemId)}`, {
      headers: { Authorization: `Bearer ${ebayToken.value}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" },
      next: { revalidate: 21600 }
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { price?: { value?: string } };
    const n = Number(j.price?.value);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export async function toolPrices(tool: ToolDef): Promise<{ stores: StorePrice[]; reference: { label: string; price: number }[] }> {
  const e = CAT[tool.name] ?? {};
  const h = hash(tool.name);
  const sample = (k: number) => snap(tool.base * (0.8 + ((h >> k) % 9) / 100));

  const liveEbay = e.ebay?.itemId ? await ebayPrice(e.ebay.itemId) : null;
  const lowesAff = Boolean(process.env.LOWES_AFFILIATE_URL_TEMPLATE);
  const amazonAff = Boolean(process.env.AMAZON_ASSOCIATE_TAG);
  const ebayAff = Boolean(process.env.EBAY_CAMPAIGN_ID);

  const stores: StorePrice[] = [
    { store: "Lowe's", price: e.lowes?.price ?? sample(3), url: lowesUrl(tool.name, e.lowes?.url), source: e.lowes?.price ? "catalog" : "sample", affiliate: lowesAff },
    { store: "Amazon", price: e.amazon?.price ?? sample(6), url: amazonUrl(tool.name, e.amazon?.asin), source: e.amazon?.price ? "catalog" : "sample", affiliate: amazonAff },
    { store: "eBay", price: liveEbay ?? e.ebay?.price ?? sample(9), url: ebayUrl(tool.name), source: liveEbay ? "live" : e.ebay?.price ? "catalog" : "sample", affiliate: ebayAff }
  ];
  const reference = [
    { label: "Typical retail", price: snap(tool.base) },
    { label: "Typical online", price: snap(tool.base * (1.03 + (h % 6) / 100)) }
  ];
  return { stores, reference };
}
