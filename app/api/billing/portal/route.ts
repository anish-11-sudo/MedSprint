import { NextResponse } from "next/server";
import { hasBillingConfiguration } from "@/lib/billing-config";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl, getStripeClient } from "@/lib/stripe";

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const appUrl = getAppUrl(new URL(request.url).origin);
  if (!stripe || !appUrl || !hasBillingConfiguration()) {
    return NextResponse.json(
      { error: "Payments are not connected yet. Add the Stripe settings to the server environment." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to manage billing." }, { status: 401 });

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    console.error("Could not load customer for billing portal:", error.message);
    return NextResponse.json({ error: "Could not load your billing account. Try again." }, { status: 500 });
  }
  if (!subscription?.stripe_customer_id) {
    return NextResponse.json({ error: "There is no Stripe billing account to manage yet." }, { status: 404 });
  }

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl}/billing`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (error) {
    console.error("Creating Stripe billing portal session failed:", error);
    return NextResponse.json({ error: "The billing portal could not be opened. Try again." }, { status: 502 });
  }
}
