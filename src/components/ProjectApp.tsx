"use client";

import { useEffect, useState } from "react";
import { CALL_PLAN_COPY } from "@/lib/config";
import type { CalcResult, PublicProject } from "@/lib/types";

type Prices = { pass: number; pdf: number; call_one: number; call_five: number; call_month: number };
const usd0 = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const cents = (n: number) => usd2(n / 100);

export default function ProjectApp({ project, prices }: { project: PublicProject; prices: Prices }) {
  const [zip, setZip] = useState("37203");
  const [vals, setVals] = useState<Record<string, number>>(() => Object.fromEntries(project.inputs.map((f) => [f.id, f.def])));
  const [owned, setOwned] = useState<string[]>([]);
  const [res, setRes] = useState<CalcResult | null>(null);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");

  // Recalculate on the server (debounced). A 402 means the $4.99 pass is needed.
  useEffect(() => {
    const ac = new AbortController();
    const id = setTimeout(async () => {
      try {
        const r = await fetch("/api/calc", {
          method: "POST", headers: { "content-type": "application/json" }, signal: ac.signal,
          body: JSON.stringify({ slug: project.slug, zip, vals, owned })
        });
        if (r.status === 402) { setLocked(true); setRes(null); setErr(""); }
        else if (r.ok) { setLocked(false); setRes(await r.json()); setErr(""); }
        else setErr("The calculator is unavailable right now. Please try again.");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setErr("The calculator is unavailable right now. Please try again.");
      }
    }, 300);
    return () => { clearTimeout(id); ac.abort(); };
  }, [project.slug, zip, vals, owned]);

  async function buy(product: string) {
    setBusy(product); setErr("");
    try {
      const r = await fetch("/api/checkout", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ product, slug: project.slug, zip, vals, returnTo: `/${project.slug}` })
      });
      const j = await r.json();
      if (j.url) window.location.href = j.url; else throw new Error();
    } catch {
      setErr("Could not start checkout. Please try again."); setBusy(null);
    }
  }

  async function ask() {
    if (!q.trim()) return;
    setAnswer("Working on it...");
    const r = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: project.slug, question: q }) });
    const j = await r.json().catch(() => ({}));
    setAnswer(r.ok ? j.answer : j.error ?? "Could not get an answer right now.");
  }

  const toggleOwned = (name: string) => setOwned((o) => (o.includes(name) ? o.filter((x) => x !== name) : [...o, name]));
  const maxBar = res ? Math.max(res.contractor, res.diy, 1) : 1;

  return (
    <div className="grid">
      <form className="panel sticky" onSubmit={(e) => e.preventDefault()} autoComplete="off">
        <h2>{project.label}</h2>
        <p className="sub">{project.blurb}</p>
        <div className="field">
          <label htmlFor="zip">Your ZIP code</label>
          <div className="ctl"><input id="zip" inputMode="numeric" maxLength={5} value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))} /></div>
        </div>
        {res && (
          <div className="region">
            Prices adjusted for <b>{res.region.name}</b>. Materials ×{res.region.m.toFixed(2)}, labor ×{res.region.l.toFixed(2)}. Contractor rate here: <b className="num">{usd0(res.rate)}/hr</b>.
          </div>
        )}
        {project.inputs.map((f) => (
          <div className="field" key={f.id}>
            <label htmlFor={`f-${f.id}`}>{f.label}</label>
            <div className="ctl">
              {f.options ? (
                <select id={`f-${f.id}`} value={vals[f.id]} onChange={(e) => setVals({ ...vals, [f.id]: Number(e.target.value) })}>
                  {f.options.map((o) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}
                </select>
              ) : (
                <>
                  <input id={`f-${f.id}`} type="number" inputMode="decimal" min={f.min} max={f.max} step={f.step} value={vals[f.id]}
                    onChange={(e) => setVals({ ...vals, [f.id]: Number(e.target.value) })} />
                  {f.unit && <span className="unit">{f.unit}</span>}
                </>
              )}
            </div>
          </div>
        ))}
        <p className="fine">Estimates for planning, not a quote.</p>
      </form>

      <div className="results">
        {err && <p className="err" role="alert">{err}</p>}

        {locked && (
          <section className="panel paywall" aria-labelledby="pw">
            <h2 id="pw">Unlock the calculator</h2>
            <p className="sub" style={{ margin: 0 }}>The Calculator Access Pass gives you 30 days on every project: exact quantities for your dimensions, prices for your ZIP, store price comparisons, and the contractor comparison.</p>
            <div className="price num">{cents(prices.pass)}</div>
            <button type="button" className="btn" disabled={busy === "pass"} onClick={() => buy("pass")}>{busy === "pass" ? "Opening checkout..." : "Get the 30-day pass"}</button>
          </section>
        )}

        {res && (
          <>
            <div className="kpis">
              <div className="kpi"><p className="kl">Estimated DIY cost</p><p className="kv num">{usd0(res.diy)}</p></div>
              <div className="kpi"><p className="kl">Contractor estimate</p><p className="kv num">{usd0(res.contractor)}</p></div>
              <div className="kpi hero"><p className="kl">Total savings</p><p className={`kv num ${res.saved > 0 ? "pos" : ""}`}>{usd0(res.saved)}{res.saved > 0 ? ` · ${res.savedPct}%` : ""}</p></div>
            </div>

            <section className="panel" aria-labelledby="h-save">
              <h2 id="h-save">How the numbers add up</h2>
              <p className="sub">{res.summary}. {res.region.name} pricing.</p>
              <div className="bars">
                <div className="bar-row"><span>Contractor</span><div className="bar-track"><div className="bar-fill a" style={{ width: `${(res.contractor / maxBar) * 100}%` }} /></div><span className="bar-val num">{usd0(res.contractor)}</span></div>
                <div className="bar-row"><span>You, DIY</span><div className="bar-track"><div className="bar-fill b" style={{ width: `${(res.diy / maxBar) * 100}%` }} /></div><span className="bar-val num">{usd0(res.diy)}</span></div>
              </div>
              <div className="break num">
                <div><span>Materials (your ZIP)</span><span>{usd0(res.matTotal)}</span></div>
                <div><span>Tools you still need</span><span>{usd0(res.toolsCost)}</span></div>
                <div><span>Contractor labor</span><span>{usd0(res.laborCost)}</span></div>
                <div><span>Contractor material markup</span><span>{usd0(res.markup)}</span></div>
                <div><span>Pro hours / first-time DIY</span><span>{res.hours.toFixed(1)} / {(res.hours * 1.6).toFixed(1)}</span></div>
                <div><span>Saved on tools vs. typical retail</span><span>{usd0(res.toolsRef - res.toolsCost)}</span></div>
                <div><span>Net after the {cents(prices.pdf)} guide</span><span>{usd0(res.saved - prices.pdf / 100)}</span></div>
              </div>
              <p className="fine" style={{ marginTop: 12 }}>Tools you keep are not used up. Check &quot;I own this&quot; and the total drops. Excludes sales tax, permits and debris removal.</p>
            </section>

            <section className="panel" aria-labelledby="h-mat">
              <h2 id="h-mat">Materials list</h2>
              <p className="sub">Quantities from your dimensions, priced for your ZIP. Links go to Lowe&apos;s.</p>
              <div className="tablewrap">
                <table>
                  <thead><tr><th>Item</th><th className="r">Qty</th><th className="r">Each</th><th className="r">Total</th><th /></tr></thead>
                  <tbody>
                    {res.mats.map((m) => (
                      <tr key={m.n}>
                        <td>{m.n}{m.note && <small>{m.note}</small>}</td>
                        <td className="r num">{m.q} {m.u}</td><td className="r num">{usd2(m.unit)}</td><td className="r num">{usd2(m.total)}</td>
                        <td><a className="buy" href={m.url} target="_blank" rel="sponsored noopener noreferrer">Buy</a></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><td colSpan={3}>Materials total</td><td className="r num">{usd2(res.matTotal)}</td><td /></tr></tfoot>
                </table>
              </div>
            </section>

            <section className="panel" aria-labelledby="h-tool">
              <h2 id="h-tool">Tools for this job</h2>
              <p className="sub">Highlighted is the lowest of the three affiliate stores. Typical retail prices are struck through for comparison. Prices marked sample are placeholders until live pricing is connected.</p>
              <ul className="tools">
                {res.tools.map((t) => (
                  <li key={t.name} className={`tool${t.owned ? " owned" : ""}`}>
                    <label className="tname">
                      <input type="checkbox" checked={t.owned} onChange={() => toggleOwned(t.name)} />
                      <span><b>{t.name}</b><br /><span className="why">{t.why}</span></span>
                    </label>
                    <div className="prices">
                      {t.stores.map((s, i) => (
                        <div key={s.store} className={`pc partner${i === t.bestIdx ? " best" : ""}`}>
                          <span className="st">{s.store}{i === t.bestIdx ? " · lowest" : ""}</span>
                          <span className="pr num">{usd2(s.price)}</span>
                          <a className="buy" href={s.url} target="_blank" rel="sponsored noopener noreferrer">Buy</a>
                          {s.source === "sample" && <span className="badge">sample price</span>}
                        </div>
                      ))}
                      {t.reference.map((r) => (
                        <div key={r.label} className="pc other"><span className="st">{r.label}</span><span className="pr num">{usd2(r.price)}</span></div>
                      ))}
                    </div>
                    <p className="why" style={{ margin: "8px 0 0" }}><b>Use it again for:</b> {t.later}</p>
                  </li>
                ))}
              </ul>
              <div className="sum-line num">
                <span>Best-price kit: <b>{usd2(res.toolsCost)}</b></span>
                <span>Typical retail: <b>{usd2(res.toolsRef)}</b></span>
                <span className="pill">You save {usd2(res.toolsRef - res.toolsCost)}</span>
              </div>
            </section>
          </>
        )}

        <section className="panel" aria-labelledby="h-steps">
          <h2 id="h-steps">Start to finish</h2>
          <p className="sub">The outline. The project PDF adds your measurements, prices, tools and every step in order.</p>
          <div className="callout"><b>{project.safety.title}</b>{project.safety.text}</div>
          <ol className="steps">{project.steps.map((s) => <li key={s.title}><div><b>{s.title}</b><span>{s.text}</span></div></li>)}</ol>
        </section>

        <section className="panel" aria-labelledby="h-offer">
          <h2 id="h-offer">Get the guide, or talk to a person</h2>
          <p className="sub">Calls are booked after checkout. We never show a phone number or calendar before you pay.</p>
          <div className="offer">
            <div className="card2">
              <h3>{project.label} project PDF</h3>
              <div className="price num">{cents(prices.pdf)}</div>
              <ul>
                <li>Materials list sized to your dimensions</li>
                <li>Tool list with store price comparison</li>
                <li>Every step with timing and what to check</li>
                <li>Your savings summary and safety checklist</li>
              </ul>
              <button type="button" className="btn" disabled={busy === "pdf"} onClick={() => buy("pdf")}>{busy === "pdf" ? "Opening checkout..." : "Buy the PDF"}</button>
              <p className="fine">Delivered to your email right after payment.</p>
            </div>
            <div className="card2">
              <h3>Troubleshooting calls</h3>
              {CALL_PLAN_COPY.map((c) => (
                <div className="plan" key={c.id}>
                  <span><b className="num">{cents(prices[c.id])}</b> · {c.name}<br /><span className="why">{c.note}</span></span>
                  <button type="button" className="btn ghost" disabled={busy === c.id} onClick={() => buy(c.id)}>{busy === c.id ? "Opening..." : "Buy"}</button>
                </div>
              ))}
              <p className="fine">After payment you go straight to booking.</p>
            </div>
          </div>
        </section>

        {!locked && (
          <section className="panel" aria-labelledby="h-ask">
            <h2 id="h-ask">Ask a question, any hour</h2>
            <p className="sub">AI-written answers about this project. Answers can be wrong. For wiring, gas, structure and water lines, confirm with a licensed pro or your building office.</p>
            <div className="ctl" style={{ flexWrap: "wrap" }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Example: How far apart do I space the screws?" aria-label="Your question" style={{ flex: "1 1 240px", border: "1.5px solid var(--line)", background: "var(--soft)", borderRadius: 6, padding: "8px 10px" }} />
              <button type="button" className="btn" onClick={ask}>Ask</button>
            </div>
            <p role="status" style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{answer}</p>
          </section>
        )}
      </div>
    </div>
  );
}
