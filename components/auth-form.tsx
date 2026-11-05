"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { loginSchema, signupSchema, emailSchema } from "@/lib/validation/auth";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { Logo } from "./logo";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(() =>
    params.get("error") === "auth_callback" ? "That confirmation link couldn't be verified. Try logging in again or request a new link." : null
  );
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const isSignup = mode === "signup";
  const requestedPlan = params.get("plan");
  const selectedPlan = requestedPlan === "annual" ? "annual" : isSignup || requestedPlan === "monthly" ? "monthly" : null;
  const postAuthPath = safeRedirectPath(
    params.get("next"),
    selectedPlan ? `/billing?plan=${selectedPlan}` : isSignup ? "/onboarding" : "/dashboard",
  );
  const alternateHref = isSignup
    ? selectedPlan ? `/login?plan=${selectedPlan}` : "/login"
    : selectedPlan ? `/signup?plan=${selectedPlan}` : "/signup";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null); setInfo(null);
    const form = new FormData(e.currentTarget);
    const parsed = (isSignup ? signupSchema : loginSchema).safeParse({ email: form.get("email"), password: form.get("password") });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    if (!hasSupabaseEnv) return setError("Supabase isn't configured. Add your keys to .env.local (see README).");

    setBusy(true);
    try {
      const supabase = createClient();
      const { email, password } = parsed.data;
      const callback = new URL("/auth/callback", location.origin);
      callback.searchParams.set("next", postAuthPath);
      const { data, error: authError } = isSignup
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: callback.toString() } })
        : await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setError(isSignup ? "Couldn't create that account. Try a different email or password." : "Email or password is incorrect.");
        return;
      }
      if (isSignup && !data.session) {
        setInfo("Check your email to confirm your account, then log in.");
        return;
      }
      router.push(postAuthPath);
      router.refresh();
    } catch {
      setError("Couldn't reach the authentication service. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    setError(null); setInfo(null);
    const form = document.querySelector<HTMLFormElement>("form");
    const email = emailSchema.safeParse(new FormData(form ?? undefined).get("email"));
    if (!email.success) return setError("Enter your email above, then select Forgot password.");
    if (!hasSupabaseEnv) return setError("Supabase isn't configured. Add your keys to .env.local (see README).");
    setResetBusy(true);
    try {
      const callback = new URL("/auth/callback", location.origin);
      callback.searchParams.set("next", "/settings");
      const { error: resetError } = await createClient().auth.resetPasswordForEmail(email.data, { redirectTo: callback.toString() });
      if (resetError) {
        setError("Couldn't send a password reset email. Try again in a moment.");
        return;
      }
      setInfo("If that email has an account, a reset link is on its way.");
    } catch {
      setError("Couldn't reach the authentication service. Check your connection and try again.");
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-8 self-start" aria-label="MedSprint home"><Logo /></Link>
      <h1 className="font-display text-3xl font-extrabold">{isSignup ? "Start your 14-day free trial" : "Welcome back"}</h1>
      {isSignup && (
        <p className="muted mt-2 text-sm">
          Selected plan: {selectedPlan === "annual" ? "$200/year" : "$19/month"}. Finish Stripe checkout with a payment method to start your 14-day trial; you won&apos;t be charged until it ends.
        </p>
      )}
      <form onSubmit={onSubmit} className="card mt-6 space-y-4 p-6" noValidate>
        <label className="block text-sm font-semibold">Email
          <input id="email" name="email" type="email" autoComplete="email" required className="input mt-1 font-normal" />
        </label>
        <label className="block text-sm font-semibold">Password
          <input name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} required minLength={isSignup ? 8 : undefined} className="input mt-1 font-normal" />
        </label>
        <p role="alert" aria-live="polite" className="min-h-5 text-sm text-red-600 dark:text-red-400">{error}</p>
        {info && <p role="status" className="text-sm text-mint-700 dark:text-mint">{info}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Working..." : isSignup ? "Create account" : "Log in"}</button>
        {!isSignup && <button type="button" onClick={resetPassword} disabled={resetBusy} className="muted w-full text-sm underline disabled:opacity-60">{resetBusy ? "Sending..." : "Forgot password"}</button>}
      </form>
      <p className="muted mt-4 text-sm">
        {isSignup ? "Already have an account? " : "New to MedSprint? "}
        <Link href={alternateHref} className="font-semibold text-volt">{isSignup ? "Log in" : "Create an account"}</Link>
      </p>
    </main>
  );
}
