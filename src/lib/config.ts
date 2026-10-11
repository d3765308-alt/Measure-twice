/** Shared constants. Nothing secret lives here: this file is imported by browser code too. */

export const PRODUCTS = {
  pass: { cents: 499, label: "Calculator Access Pass (30 days)", days: 30, calls: 0 },
  pdf: { cents: 1999, label: "Project PDF Guide", days: 0, calls: 0 },
  call_one: { cents: 4999, label: "Troubleshooting call (1 call)", days: 90, calls: 1 },
  call_five: { cents: 19900, label: "Troubleshooting calls (5 calls)", days: 180, calls: 5 },
  /** calls: null means unlimited inside the window */
  call_month: { cents: 29900, label: "Unlimited troubleshooting calls (30 days)", days: 30, calls: null }
} as const;

export type ProductId = keyof typeof PRODUCTS;
export type CallProductId = "call_one" | "call_five" | "call_month";

export const CALL_PRODUCTS: CallProductId[] = ["call_one", "call_five", "call_month"];
export const isProduct = (p: unknown): p is ProductId => typeof p === "string" && p in PRODUCTS;
export const isCallProduct = (p: unknown): p is CallProductId => CALL_PRODUCTS.includes(p as CallProductId);

export const CONTRACTOR_MARKUP = 0.15;
export const PASS_DAYS = PRODUCTS.pass.days;

export const CALL_PLAN_COPY: { id: CallProductId; name: string; note: string }[] = [
  { id: "call_one", name: "One call", note: "A single troubleshooting call. Valid for 90 days." },
  { id: "call_five", name: "Five calls", note: "Use them across the whole project. Valid for 180 days." },
  { id: "call_month", name: "Unlimited month", note: "Book as many calls as you need for 30 days." }
];

/** Server-side helpers (only call from server code). */
export function env(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required environment variable ${key}`);
  return v;
}
export const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Only allow same-site relative return paths. */
export function safePath(p: unknown, fallback = "/"): string {
  return typeof p === "string" && p.startsWith("/") && !p.startsWith("//") ? p : fallback;
}
