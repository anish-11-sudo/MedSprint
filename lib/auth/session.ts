import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { hasSupabaseEnv, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { hasSubscriptionAccess } from "@/lib/billing";
import { hasBillingConfiguration } from "@/lib/billing-config";

export const PROTECTED = ["/onboarding", "/dashboard", "/learn", "/practice", "/tests", "/review", "/flashcards", "/analytics", "/study-plan", "/leaderboard", "/settings", "/admin", "/billing"];

export function isProtected(path: string) {
  return PROTECTED.some((p) => path === p || path.startsWith(p + "/"));
}

/** Refreshes the Supabase session and redirects anonymous users away from protected routes. */
export async function updateSession(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  if (!hasSupabaseEnv) {
    if (isProtected(req.nextUrl.pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    return res;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll(list: { name: string; value: string; options: CookieOptions }[]) {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && isProtected(req.nextUrl.pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (
    user &&
    hasBillingConfiguration() &&
    isProtected(req.nextUrl.pathname) &&
    req.nextUrl.pathname !== "/billing"
  ) {
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("status,trial_ends_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      console.error("Could not verify subscription access:", error.message);
      const url = req.nextUrl.clone();
      url.pathname = "/billing";
      url.search = "";
      url.searchParams.set("error", "billing_status");
      return NextResponse.redirect(url);
    }
    if (!hasSubscriptionAccess(subscription?.status, subscription?.trial_ends_at)) {
      const url = req.nextUrl.clone();
      url.pathname = "/billing";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }
  return res;
}
