import { CONTRACTOR_MARKUP } from "./config";
import { lowesUrl, toolPrices } from "./prices";
import { getProject, sanitizeVals } from "./projects";
import { region } from "./region";
import type { CalcResult, ToolResult } from "./types";

/** Pure pricing engine. Runs on the server only, so the paid gate cannot be bypassed in the browser. */
export async function compute(slug: string, input: { zip?: unknown; vals?: unknown; owned?: unknown }): Promise<CalcResult | null> {
  const p = getProject(slug);
  if (!p) return null;
  const zip = typeof input.zip === "string" ? input.zip.replace(/\D/g, "").slice(0, 5) : "";
  const R = region(zip);
  const vals = sanitizeVals(p, input.vals);
  const owned = new Set(Array.isArray(input.owned) ? input.owned.filter((x): x is string => typeof x === "string") : []);
  const out = p.calc(vals);

  const mats = out.mats
    .filter((m) => m.q > 0)
    .map((m) => ({ ...m, unit: m.p * R.m, total: m.q * m.p * R.m, url: lowesUrl(m.n) }));
  const matTotal = mats.reduce((s, m) => s + m.total, 0);
  const laborCost = out.hours * p.rate * R.l;
  const markup = matTotal * CONTRACTOR_MARKUP;
  const contractor = out.hours > 0 ? Math.max(p.min * R.l, matTotal + markup + laborCost) : 0;

  const defs = p.tools.filter((t) => !t.when || t.when(vals));
  const tools: ToolResult[] = await Promise.all(
    defs.map(async (t) => {
      const { stores, reference } = await toolPrices(t);
      const best = Math.min(...stores.map((s) => s.price));
      return {
        name: t.name, why: t.why, later: t.later, owned: owned.has(t.name), stores, reference,
        best, bestIdx: stores.findIndex((s) => s.price === best), refLow: Math.min(...reference.map((r) => r.price))
      };
    })
  );
  const need = tools.filter((t) => !t.owned);
  const toolsCost = need.reduce((s, t) => s + t.best, 0);
  const toolsRef = need.reduce((s, t) => s + t.refLow, 0);
  const diy = matTotal + toolsCost;
  const saved = contractor - diy;

  return {
    slug: p.slug, label: p.label, summary: out.summary, region: R, rate: p.rate * R.l, hours: out.hours,
    mats, matTotal, laborCost, markup, contractor, tools, toolsCost, toolsRef, diy, saved,
    savedPct: contractor > 0 ? Math.round((saved / contractor) * 100) : 0
  };
}
