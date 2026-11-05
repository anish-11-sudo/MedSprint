"use client";

import { useState } from "react";

type Plan = "monthly" | "annual";

export function CheckoutButton({
  plan,
  disabled = false,
  trialAvailable = true,
}: {
  plan: Plan;
  disabled?: boolean;
  trialAvailable?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = plan === "monthly" ? "$19/month" : "$200/year";

  async function startCheckout() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const result: { url?: string; error?: string } = await response.json();
      if (response.status === 401) {
        window.location.assign(`/signup?plan=${plan}`);
        return;
      }
      if (!response.ok || !result.url) throw new Error(result.error ?? "Could not start checkout.");
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start checkout. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <button type="button" className="btn-primary w-full" onClick={startCheckout} disabled={disabled || busy}>
        {busy ? "Opening secure checkout..." : `${trialAvailable ? "Start 14-day free trial" : "Subscribe"} — ${label}`}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function BillingPortalButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const result: { url?: string; error?: string } = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error ?? "Could not open billing management.");
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open billing management. Try again.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="btn-ghost" onClick={openPortal} disabled={busy}>
        {busy ? "Opening..." : "Manage or cancel subscription"}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
