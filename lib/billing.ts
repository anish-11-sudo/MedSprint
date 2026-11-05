import type Stripe from "stripe";

export type BillingPlan = "monthly" | "annual";
export type SubscriptionStatus = "free" | "active" | "past_due" | "canceled";

export function hasSubscriptionAccess(
  status: string | null | undefined,
  trialEndsAt: string | null | undefined,
  now = Date.now(),
) {
  if (status !== "active") return false;
  return !trialEndsAt || Date.parse(trialEndsAt) > now;
}

export function subscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (status === "incomplete" || status === "incomplete_expired") return "free";
  return "canceled";
}

export function subscriptionPlan(subscription: Stripe.Subscription): BillingPlan | null {
  const metadataPlan = subscription.metadata.plan;
  if (metadataPlan === "monthly" || metadataPlan === "annual") return metadataPlan;

  const priceId = subscription.items.data[0]?.price.id;
  if (priceId && priceId === process.env.STRIPE_MONTHLY_PRICE_ID) return "monthly";
  if (priceId && priceId === process.env.STRIPE_ANNUAL_PRICE_ID) return "annual";
  return null;
}
