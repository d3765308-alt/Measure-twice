import Stripe from "stripe";
import { env } from "./config";

let client: Stripe | null = null;
export const stripe = (): Stripe => (client ??= new Stripe(env("STRIPE_SECRET_KEY")));
export type { Stripe };
