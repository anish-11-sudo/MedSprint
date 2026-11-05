import { NextResponse } from "next/server";
import { z } from "zod";
import { hasBillingConfiguration } from "@/lib/billing-config";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl, getStripeClient, getStripePriceId } from "@/lib/stripe";

const checkoutSchema = z.object({ plan: z.enum(["monthly", "annual"]) });

export async function POST(request: Request) {
  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a valid billing plan." }, { status: 400 });
  }

  const stripe = getStripeClient();
  const priceId = getStripePriceId(parsed.data.plan);
  const appUrl = getAppUrl(new URL(request.url).origin);
  if (!stripe || !priceId || !appUrl || !hasBillingConfiguration()) {
    return NextResponse.json(
      { error: "Payments are not connected yet. Add the Stripe settings to the server environment." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to start your free trial." }, { status: 401 });
  }
  if (!user.email) {
    return NextResponse.json({ error: "Your account needs an email address before checkout." }, { status: 400 });
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id,stripe_subscription_id,status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (subscriptionError) {
    console.error("Could not load subscription before checkout:", subscriptionError.message);
    return NextResponse.json({ error: "Could not load your billing status. Try again." }, { status: 500 });
  }
  if (subscription?.stripe_subscription_id && ["active", "past_due"].includes(subscription.status)) {
    return NextResponse.json(
      { error: "You already have a subscription. Manage it from the billing page." },
      { status: 409 },
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer: subscription?.stripe_customer_id || undefined,
      customer_email: subscription?.stripe_customer_id ? undefined : user.email,
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan: parsed.data.plan },
      subscription_data: {
        metadata: { user_id: user.id, plan: parsed.data.plan },
        ...(subscription?.stripe_subscription_id ? {} : { trial_period_days: 14 }),
      },
      payment_method_collection: "always",
      success_url: `${appUrl}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing?checkout=cancelled`,
    });

    if (!session.url) {
      console.error("Stripe Checkout returned a session without a URL.");
      return NextResponse.json({ error: "Checkout could not be opened. Try again." }, { status: 502 });
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Creating Stripe Checkout session failed:", error);
    return NextResponse.json({ error: "Checkout could not be started. Try again." }, { status: 502 });
  }
}
