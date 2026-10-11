import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { env } from "./config";

/** Signed, httpOnly cookies carry proof of a verified Stripe payment. */
export const COOKIE = { pass: "mt_pass", consult: "mt_consult" } as const;

const key = () => new TextEncoder().encode(env("SESSION_SECRET"));

export async function sign(payload: Record<string, unknown>, days: number): Promise<string> {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${days}d`).sign(key());
}

export async function verify<T extends Record<string, unknown>>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload as unknown as T;
  } catch {
    return null;
  }
}

export async function readCookie(name: string): Promise<string | undefined> {
  return (await cookies()).get(name)?.value;
}

export const cookieOptions = (days: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: Math.max(60, Math.floor(days * 86400))
});

export async function hasPass(): Promise<boolean> {
  const t = await verify<{ pass?: boolean }>(await readCookie(COOKIE.pass));
  return t?.pass === true;
}
