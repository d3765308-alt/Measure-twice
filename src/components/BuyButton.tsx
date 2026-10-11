"use client";

import { useState } from "react";

export default function BuyButton({ product, label, returnTo = "/", ghost = false }: { product: string; label: string; returnTo?: string; ghost?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function go() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product, returnTo }) });
      const j = await r.json();
      if (j.url) window.location.href = j.url; else throw new Error();
    } catch {
      setErr("Could not start checkout. Please try again."); setBusy(false);
    }
  }
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <button type="button" className={`btn${ghost ? " ghost" : ""}`} disabled={busy} onClick={go}>{busy ? "Opening checkout..." : label}</button>
      {err && <span className="err" role="alert">{err}</span>}
    </span>
  );
}
