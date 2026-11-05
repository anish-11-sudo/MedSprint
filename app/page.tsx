import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Disclaimer } from "@/components/disclaimer";

const features = [
  { t: "Adaptive practice", d: "Difficulty rises after streaks of correct answers and eases after repeated misses. Every recommendation tells you why." },
  { t: "Small lessons", d: "Concept, example, question, explanation, mini-review. Ten minutes a step." },
  { t: "Spaced flashcards", d: "Again, Hard, Good, Easy. Cards return right before you forget them." },
  { t: "Honest analytics", d: "Mastery by section and topic, timing, and trends. Estimates are labeled unofficial." },
  { t: "A plan that bends", d: "Missed a day? Your study plan reschedules itself." },
  { t: "All four sections", d: "Chem/Phys, CARS, Bio/Biochem and Psych/Soc, all with original content." },
];
const plans = [
  { n: "Monthly", p: "$19/month", plan: "monthly", b: ["14 days free", "Then $19, billed monthly", "Cancel anytime"], hot: true },
  { n: "Annual", p: "$200/year", plan: "annual", b: ["14 days free", "Then $200, billed annually", "Save $28 vs. monthly billing"] },
];
const faqs = [
  ["Is the content from the AAMC?", "No. Every question, passage and explanation in MedSprint is original."],
  ["Does MedSprint predict my real score?", "No. Estimates are unofficial practice estimates based on your MedSprint results."],
  ["How does the free trial work?", "Choose monthly or annual billing, add a payment method at Stripe checkout, and pay nothing for 14 days. Your selected plan is charged after the trial unless you cancel first."],
  ["Can I cancel?", "Yes. Manage or cancel a subscription through the Stripe customer portal from your account settings."],
];
const sections = [
  { name: "Chem/Phys", mastery: 72 },
  { name: "CARS", mastery: 58 },
  { name: "Bio/Biochem", mastery: 81 },
  { name: "Psych/Soc", mastery: 66 },
];

export default function Home() {
  return (
    <>
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-5 sm:px-5">
        <Link href="/" aria-label="MedSprint home"><Logo /></Link>
        <nav className="flex items-center gap-1 text-sm font-semibold sm:gap-2" aria-label="Main">
          <a href="#pricing" className="hidden px-3 sm:inline">Pricing</a>
          <Link href="/login" className="px-3">Log in</Link>
          <Link href="/signup?plan=monthly" className="btn-primary">Start 14-day trial</Link>
          <ThemeToggle />
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 md:grid-cols-2 md:py-20">
          <div>
            <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              Turn MCAT prep into a daily habit.
            </h1>
            <p className="muted mt-5 max-w-lg text-lg">
              Short lessons, adaptive questions and spaced review that adjust to what you actually know. Original content, honest progress.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup?plan=monthly" className="btn-primary">Start 14-day trial</Link>
              <a href="#preview" className="btn-ghost">See the dashboard</a>
            </div>
          </div>

          <section id="preview" className="card p-5 sm:p-6" aria-labelledby="preview-title">
            <div className="flex items-center justify-between">
              <h2 id="preview-title" className="font-display text-lg font-bold">Today</h2>
              <span className="rounded-full bg-sun px-3 py-1 text-xs font-bold text-navy">12-day streak</span>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm"><span id="daily-xp-label">Daily XP</span><span className="font-semibold">80 / 120</span></div>
              <div className="mt-2 h-3 rounded-full bg-[var(--line)]" role="progressbar" aria-labelledby="daily-xp-label" aria-valuemin={0} aria-valuemax={120} aria-valuenow={80}>
                <div className="h-3 w-2/3 rounded-full bg-mint" />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              {sections.map(({ name, mastery }) => (
                <div key={name} className="rounded-xl border border-[var(--line)] p-3">
                  <div className="muted">{name}</div>
                  <div className="font-display text-2xl font-bold">{mastery}%</div>
                  <div className="mt-1 h-1.5 rounded-full bg-[var(--line)]" role="progressbar" aria-label={`${name} sample mastery`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={mastery}>
                    <div className="h-1.5 rounded-full bg-volt" style={{ width: `${mastery}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="muted mt-4 text-xs">Sample dashboard. Progress and recommendations are illustrative.</p>
          </section>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-10" aria-labelledby="features">
          <h2 id="features" className="font-display text-3xl font-bold">Built for showing up every day</h2>
          <p className="muted mt-2 max-w-2xl text-sm">MedSprint is a product preview. Adaptive practice, flashcards, analytics and automatic schedule changes are planned for future releases.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.t} className="card p-5">
                <h3 className="font-display text-lg font-bold">{f.t}</h3>
                <p className="muted mt-2 text-sm">{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-5 py-10" aria-labelledby="pricing-h">
          <h2 id="pricing-h" className="font-display text-3xl font-bold">14 days free. Choose how you pay.</h2>
          <p className="muted mt-2 max-w-2xl text-sm">Choose monthly or annual billing. A payment method is required to start the trial; Stripe charges only after 14 days unless you cancel first.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {plans.map((p) => (
              <div key={p.n} className={`card p-6 ${p.hot ? "ring-2 ring-volt" : ""}`}>
                <h3 className="font-display text-lg font-bold">{p.n} plan</h3>
                <div className="mt-2 font-display text-4xl font-extrabold">{p.p}</div>
                <ul className="muted mt-4 space-y-2 text-sm">{p.b.map((x) => <li key={x}>{x}</li>)}</ul>
                <Link href={`/signup?plan=${p.plan}`} className={`${p.hot ? "btn-primary" : "btn-ghost"} mt-6 w-full`}>Start 14-day free trial</Link>
              </div>
            ))}
          </div>
          <p className="muted mt-3 text-xs">Annual billing saves $28 compared with 12 monthly payments ($228).</p>
          <p className="muted mt-2 text-xs">Stripe checkout is available once payment settings are connected. Some features shown above are still in development.</p>
        </section>

        <section className="mx-auto max-w-3xl px-5 py-10" aria-labelledby="faq">
          <h2 id="faq" className="font-display text-3xl font-bold">FAQ</h2>
          <div className="mt-4 space-y-2">
            {faqs.map(([q, a]) => (
              <details key={q} className="card p-4"><summary className="cursor-pointer font-semibold">{q}</summary><p className="muted mt-2 text-sm">{a}</p></details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-12">
          <div className="rounded-3xl bg-navy p-10 text-center text-white">
            <h2 className="font-display text-3xl font-bold">Ten minutes today beats a cram session later.</h2>
            <Link href="/signup?plan=monthly" className="btn mt-6 bg-sun text-navy hover:brightness-95">Start 14-day trial</Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-5 py-10"><Disclaimer /></footer>
    </>
  );
}
