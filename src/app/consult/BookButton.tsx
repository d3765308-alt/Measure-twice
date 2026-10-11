"use client";

import { useEffect, useRef, useState } from "react";

/** Asks the server for a booking link (which re-checks payment with Stripe) and sends the buyer to Calendly. */
export default function BookButton({ auto }: { auto: boolean }) {
  const [state, setState] = useState<"idle" | "working" | "error">(auto ? "working" : "idle");
  const [msg, setMsg] = useState("");
  const started = useRef(false);

  async function go() {
    setState("working"); setMsg("");
    try {
      const r = await fetch("/api/consult/book", { method: "POST" });
      const j = await r.json();
      if (r.ok && j.url) { window.location.href = j.url; return; }
      setMsg(j.error ?? "Booking is unavailable right now."); setState("error");
    } catch {
      setMsg("Booking is unavailable right now."); setState("error");
    }
  }

  useEffect(() => {
    if (auto && !started.current) { started.current = true; void go(); }
  }, [auto]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button type="button" className="btn" onClick={go} disabled={state === "working"}>
        {state === "working" ? "Opening your booking page..." : "Book a call"}
      </button>
      {msg && <p className="err" role="alert">{msg}</p>}
    </div>
  );
}
