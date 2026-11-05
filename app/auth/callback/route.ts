import { NextRequest, NextResponse } from "next/server";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";

function loginRedirect(request: NextRequest) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", "auth_callback");
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code || !hasSupabaseEnv) return loginRedirect(request);

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return loginRedirect(request);

    const next = safeRedirectPath(request.nextUrl.searchParams.get("next"), "/dashboard");
    return NextResponse.redirect(new URL(next, request.url));
  } catch {
    return loginRedirect(request);
  }
}
