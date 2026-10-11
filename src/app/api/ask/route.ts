import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getProject } from "@/lib/projects";
import { hasPass } from "@/lib/session";

export const runtime = "nodejs";

/** Naive per-instance rate limit. Use a shared store (Upstash, Vercel KV) when you scale past one instance. */
const hits = new Map<string, number[]>();
function limited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > 6;
}

export async function POST(req: Request) {
  if (!(await hasPass())) return NextResponse.json({ error: "Calculator pass required" }, { status: 402 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "Question service not configured" }, { status: 501 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (limited(ip)) return NextResponse.json({ error: "Too many questions. Try again in a minute." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const q = String(body?.question ?? "").trim().slice(0, 1000);
  const p = getProject(String(body?.slug ?? ""));
  if (!q || !p) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const system =
    `You answer homeowner DIY questions about the "${p.label}" project. Be practical and specific in under 200 words. ` +
    `If the question involves electrical panels, gas lines, load-bearing structure, asbestos, lead, roofs over one story or anything unsafe, ` +
    `tell them to stop and call a licensed professional. Always end by reminding them to confirm local code and permit rules. ` +
    `Never claim to have verified anything on the web unless you used a search tool.`;

  const client = new Anthropic();
  const params: Record<string, unknown> = {
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
    max_tokens: 700,
    system,
    messages: [{ role: "user", content: q }]
  };
  // Optional: let the model search the web. Confirm the current tool version in Anthropic's docs first.
  if (process.env.ENABLE_WEB_SEARCH === "1") params.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }];

  try {
    const msg = (await client.messages.create(params as never)) as unknown as { content: { type: string; text?: string }[] };
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
    return NextResponse.json({ answer: text || "I could not produce an answer. Please try rephrasing." });
  } catch (err) {
    console.error("ask failed", err);
    return NextResponse.json({ error: "Could not get an answer right now" }, { status: 502 });
  }
}
