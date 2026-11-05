import Link from "next/link";
import { redirect } from "next/navigation";
import { Disclaimer } from "@/components/disclaimer";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export const dynamic = "force-dynamic";

const nav = [
  ["Dashboard", "/dashboard"],
  ["Learn", "/learn"],
  ["Practice", "/practice"],
  ["Billing", "/billing"],
  ["Settings", "/settings"],
];

export default async function LearningLayout({ children }: { children: React.ReactNode }) {
  if (!hasSupabaseEnv) redirect("/login");
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  return (
    <>
      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4">
        <Link href="/dashboard" aria-label="MedSprint dashboard"><Logo /></Link>
        <nav aria-label="App" className="flex flex-wrap items-center gap-1 text-sm font-semibold">
          {nav.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-lg px-3 py-2 hover:bg-[var(--line)]">{label}</Link>
          ))}
          <ThemeToggle />
          <form action={signOut}>
            <button className="btn-ghost !px-3 !py-2">Log out</button>
          </form>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-16">{children}</main>
      <footer className="mx-auto max-w-5xl px-5 pb-10"><Disclaimer /></footer>
    </>
  );
}
