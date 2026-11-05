import Link from "next/link";
import { BillingPortalButton, CheckoutButton } from "@/components/billing-actions";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { hasSubscriptionAccess } from "@/lib/billing";
import { hasBillingConfiguration } from "@/lib/billing-config";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type BillingPageProps = {
  searchParams: Promise<{ plan?: string; checkout?: string; error?: string }>;
};

type BillingSubscription = {
  plan: string;
  status: string;
  current_period_end: string | null;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

const planNames: Record<string, string> = {
  monthly: "Monthly — $19/month",
  annual: "Annual — $200/year",
};

export default async function BillingPage({ searchParams }: BillingPageProps) {
  if (!hasSupabaseEnv) redirect("/login");
  const params = await searchParams;
  const plan = params.plan === "annual" ? "annual" : "monthly";
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=${encodeURIComponent("/billing")}`);

  const configured = hasBillingConfiguration();
  let subscription: BillingSubscription | null = null;
  let subscriptionError: string | null = null;
  if (configured) {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("plan,status,current_period_end,trial_ends_at,stripe_customer_id,stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();
    subscriptionError = error?.message ?? null;
    if (data) subscription = data;
  } else {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("plan,status,current_period_end,stripe_customer_id,stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();
    subscriptionError = error?.message ?? null;
    if (data) subscription = { ...data, trial_ends_at: null };
  }
  if (subscriptionError) {
    console.error("Loading billing settings failed:", subscriptionError);
    return (
      <section className="card mx-auto max-w-2xl space-y-3 p-6">
        <h1 className="font-display text-2xl font-bold">Billing status unavailable</h1>
        <p role="alert" className="text-sm">Billing details could not be loaded. Confirm Supabase migrations 0001–0004 have been applied and try again.</p>
      </section>
    );
  }
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Loading billing profile failed:", profileError.message);
    throw new Error("Your account setup status could not be loaded. Please try again later.");
  }

  const active = subscription?.status === "active" || subscription?.status === "past_due";
  const trialAvailable = !subscription?.stripe_subscription_id;
  const trialEndsAt = configured ? subscription?.trial_ends_at : null;
  const canAccess = !configured || hasSubscriptionAccess(subscription?.status, trialEndsAt);
  const trialEnd = trialEndsAt ? new Date(trialEndsAt) : null;

  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Billing</h1>
        <p className="muted mt-2 text-sm">
          {trialAvailable
            ? "Complete Stripe checkout with a payment method to start your 14-day free trial. Your selected plan is charged after the trial."
            : "Your previous trial has been used. Your selected plan will be charged at checkout; manage or cancel it from this page."}
        </p>
      </div>

      {params.checkout === "success" && (
        <p role="status" className="card border-mint-700 p-4 text-sm">
          {configured && canAccess
            ? "Checkout complete. Your trial is active."
            : "Checkout complete. Stripe is confirming your subscription now; refresh this page in a moment."}
        </p>
      )}
      {params.error === "billing_status" && (
        <p role="alert" className="card p-4 text-sm">Your subscription status could not be verified. Confirm migration 0004 is applied, then refresh this page.</p>
      )}
      {params.checkout === "cancelled" && (
        <p role="status" className="card p-4 text-sm">Checkout was canceled. You have not been charged.</p>
      )}

      {active ? (
        <div className="card space-y-4 p-6">
          <div>
            <p className="muted text-sm">Current plan</p>
            <h2 className="font-display text-2xl font-bold">{planNames[subscription?.plan ?? ""] ?? "Subscription"}</h2>
            <p className="mt-2 text-sm">
              Status: {trialEnd && trialEnd.getTime() > Date.now() ? "Free trial" : subscription?.status === "past_due" ? "Payment needs attention" : "Active"}
            </p>
            {trialEnd && trialEnd.getTime() > Date.now() && (
              <p className="muted mt-1 text-sm">Trial ends {trialEnd.toLocaleDateString()}.</p>
            )}
            {subscription?.current_period_end && (
              <p className="muted mt-1 text-sm">Current billing period ends {new Date(subscription.current_period_end).toLocaleDateString()}.</p>
            )}
          </div>
          <BillingPortalButton />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(["monthly", "annual"] as const).map((selectedPlan) => (
            <div className={`card p-5 ${plan === selectedPlan ? "ring-2 ring-volt" : ""}`} key={selectedPlan}>
              <h2 className="font-display text-xl font-bold">{planNames[selectedPlan]}</h2>
              <p className="muted mt-2 text-sm">
                {trialAvailable
                  ? `14-day free trial, then billed ${selectedPlan === "monthly" ? "monthly" : "annually"}. Cancel before the trial ends to avoid a charge.`
                  : `Billed ${selectedPlan === "monthly" ? "monthly" : "annually"} from checkout. You will not receive another free trial.`}
              </p>
              <CheckoutButton plan={selectedPlan} disabled={!configured} trialAvailable={trialAvailable} />
            </div>
          ))}
        </div>
      )}

      {!configured && (
        <p className="card p-4 text-sm">
          Stripe isn&apos;t connected yet. Add the server-side Stripe secret, both recurring price IDs, webhook signing secret, public app URL, and Supabase service-role key to the deployment environment. See the Stripe setup section in the README.
        </p>
      )}

      {canAccess && !profile?.onboarding_completed && (
        <p className="muted text-sm">Want to finish setting up your account? <Link href="/onboarding" className="font-semibold text-volt underline">Continue to onboarding</Link>.</p>
      )}
      {!canAccess && !active && (
        <p className="muted text-sm">Choose a plan to activate your 14-day trial and unlock the study app.</p>
      )}
    </section>
  );
}
