import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { subscriptionPlan, subscriptionStatus } from "@/lib/billing";
import { getStripeClient } from "@/lib/stripe";
import { supabaseUrl } from "@/lib/supabase/env";

export const runtime = "nodejs";

async function saveSubscription(subscription: Stripe.Subscription) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing.");

  const userId = subscription.metadata.user_id;
  const plan = subscriptionPlan(subscription);
  if (!userId || !plan) throw new Error("Stripe subscription is missing its MedSprint user or plan metadata.");

  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;
  const periodEnds = subscription.items.data.map((item) => item.current_period_end);
  const currentPeriodEnd = periodEnds.length > 0 ? Math.max(...periodEnds) : null;
  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await supabase.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    plan,
    status: subscriptionStatus(subscription.status),
    current_period_end: currentPeriodEnd
      ? new Date(currentPeriodEnd * 1000).toISOString()
      : null,
    trial_ends_at: subscription.status === "trialing" && subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
  }, { onConflict: "user_id" });
  if (error) throw new Error(`Saving Stripe subscription failed: ${error.message}`);
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret || !supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
        await saveSubscription(await stripe.subscriptions.retrieve(subscriptionId));
      }
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await saveSubscription(event.data.object);
    }
  } catch (error) {
    console.error(`Handling Stripe webhook event ${event.id} failed:`, error);
    return NextResponse.json({ error: "Could not process subscription update." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
