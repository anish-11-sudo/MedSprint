import { describe, expect, it } from "vitest";
import { hasSubscriptionAccess, subscriptionStatus } from "@/lib/billing";

describe("Stripe subscription status mapping", () => {
  it("treats a trial as active access", () => {
    expect(subscriptionStatus("trialing")).toBe("active");
  });

  it("preserves payment problems for billing follow-up", () => {
    expect(subscriptionStatus("past_due")).toBe("past_due");
    expect(subscriptionStatus("unpaid")).toBe("past_due");
  });

  it("does not grant access to incomplete or ended subscriptions", () => {
    expect(subscriptionStatus("incomplete")).toBe("free");
    expect(subscriptionStatus("incomplete_expired")).toBe("free");
    expect(subscriptionStatus("canceled")).toBe("canceled");
  });
});

describe("subscription access", () => {
  it("allows paid subscriptions and active trials only", () => {
    expect(hasSubscriptionAccess("active", null)).toBe(true);
    expect(hasSubscriptionAccess("active", "2030-01-01T00:00:00.000Z", Date.parse("2029-01-01"))).toBe(true);
  });

  it("blocks expired trials and subscriptions without active status", () => {
    expect(hasSubscriptionAccess("active", "2020-01-01T00:00:00.000Z")).toBe(false);
    expect(hasSubscriptionAccess("past_due", null)).toBe(false);
    expect(hasSubscriptionAccess("free", null)).toBe(false);
  });
});
