# MedSprint Debug Report

## Audit scope

Inspected the Phase 2 file tree, package scripts/dependencies, environment-variable
references, Supabase helpers and middleware, the initial SQL schema and RLS
policies, routes/components, original content in the sibling Phase 1 folder, and
the existing tests. The Phase 2 folder initially contained only the landing and
auth pages. Its sibling has an alternate localStorage implementation; it was
used as source material, not modified or used for Phase 2 progress persistence.

## Findings and disposition

| Priority | File(s) | Finding and cause | Fix / remaining action | Verification |
|---|---|---|---|---|
| P1 | `package.json`, runtime | The available Node 18.15 runtime was too old for Next.js and the resolved Supabase/Playwright packages. `next lint` also opened an interactive first-run prompt because no lint config existed. | **Fixed in repo:** require Node 22+, configure ESLint, and run ESLint directly. A temporary Node 22.23.4 runtime was used for checks. | `npm run lint`, `npm run build` |
| P1 | `components/auth-form.tsx`, `app/auth/callback/route.ts`, `app/(app)/settings/*` | Auth requests could throw and leave forms busy; reset errors were ignored; email confirmation had no explicit PKCE exchange; reset links landed on a missing settings page. | **Fixed in code:** catch request failures with visible messages, release busy states in `finally`, exchange callback codes server-side, safely validate redirects, and provide password update settings. Hosted Supabase behavior remains unverified. | `npm run typecheck`, `npm test`; Supabase-backed signup/reset flow |
| P1 | `lib/auth/session.ts`, `app/(app)/layout.tsx` | Protected pages bypassed auth when Supabase env vars were absent. Pages could also be statically rendered at build time with missing build env and remain redirects after runtime configuration. | **Fixed in code:** redirect protected paths when env is missing and force the protected route group to render dynamically. | Production build; local unauthenticated route smoke test |
| P1 | `supabase/migrations/0001_init.sql`, `supabase/migrations/0002_fix_profile_update_policy.sql` | The profile update policy queried `profiles` from a policy on the same table, risking recursive RLS evaluation. | **Fixed and applied:** security-definer role lookup replaces the self-query without deleting user data. Role-escalation denial still needs an authenticated policy test. | Migration applied; test profile update and role-escalation denial |
| P1 | `supabase/migrations/0001_init.sql`, `supabase/migrations/0003_learning_mvp.sql`, `app/(app)/practice/*` | Published answer-choice rows included correctness and rationale columns readable by browser clients. | **Fixed and applied:** revoke direct client SELECT and return correctness/explanations only through authenticated submission RPC. Anon-key answer-choice access is denied; broader per-user RLS still needs testing. | Anon answer-choice SELECT denied; run authenticated ownership/RLS checks |
| P1 | `supabase/migrations/0003_learning_mvp.sql` | PostgreSQL rejected the onboarding RPC's unparenthesized `CASE` expression in an `IF` condition while applying the migration. | **Fixed:** parenthesized the `CASE` boolean expression and applied the corrected onboarding function. | Migration applied; authenticated `save_onboarding` integration passed |
| P1 | `app/(app)/*`, `lib/learning/*`, `components/question-card.tsx` | The tagged Phase 2 folder had no onboarding, dashboard, lesson, or answer flow; sibling progress was localStorage-only. | **Implemented in Phase 2:** Supabase-backed onboarding/plan persistence, data-driven dashboard, lesson completion, protected question submission, answer explanations, reports, and logout. Authenticated RPC integration passed; UI journey remains unverified. | Typecheck, tests, production build, configured Playwright journey |
| P1 | `supabase/migrations/0003_learning_mvp.sql`, `scripts/seed-content.ts` | The initial migration seeded only sections, so learning tables had no authored questions or lessons. | **Implemented:** idempotent seed script imports original content and stores topics, questions, answer choices, and lessons. | `npm run seed` passed repeatedly against the configured Supabase project |
| P2 | `playwright.config.ts`, `e2e/learning-journey.spec.ts` | The package had an `e2e` script but no config or journey tests. | **Implemented:** signup → onboarding → lesson → answers/explanation → dashboard test. It could not start because Chromium is absent and installation ran out of disk space. | Free space, install Chromium, then run `npm run e2e` with email confirmation disabled |
| P2 | `package.json`, `package-lock.json` | Dependency audit found advisories in PostCSS, Zod, and the test dependency tree. | **Fixed:** pinned patched PostCSS with an override for Next's pinned vulnerable copy, upgraded Zod and Vitest/Vite, and applied compatible audit fixes. No current dependency audit findings remain. | `npm audit` (0 findings) |
| P2 | `lib/validation/onboarding.ts`, `lib/plan.ts`, `lib/progress.ts` | Onboarding accepted impossible calendar dates; date formatting depended on machine timezone. | **Fixed:** validate real calendar dates and use UTC day keys for plans and streaks. | `npm test` |
| P2 | `README.md`, `PROJECT_STATUS.md` | README said only Phase 1 existed and did not give current setup, migration, seed, and feature status. | **Fixed:** documented Node 22, migration order, content seed, tests, and remaining work. | Review docs against scripts and `.env.example` |
| P1 | `app/page.tsx`, `app/api/billing/*`, `app/(app)/billing/page.tsx`, `lib/auth/session.ts`, `supabase/migrations/0004_billing_trial.sql` | The pricing page offered a $149 annual plan, but no checkout or subscription management existed. Trial duration, payment collection, and subscription state were undefined. | **Implemented in code:** pricing is $19/month or $200/year after a 14-day card-required trial; checkout, webhook sync, billing portal, trial end storage, and protected-route gating are added. Requires the owner to configure Stripe, apply migration 0004, and test with Stripe test mode. | `npm run typecheck`, `npm test`, `npm run build`; test Checkout and webhook after setup |
| P2 | `app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts` | The site had no domain canonical metadata, crawler policy, or sitemap for search engines. | **Fixed in code:** canonical/Open Graph metadata and domain-aware `robots.txt`/`sitemap.xml` are generated from `NEXT_PUBLIC_APP_URL`. A public deployment, registered domain, and search-console submission are still required. | Build and inspect `/robots.txt` and `/sitemap.xml` on the deployed domain |
| P2 | `next.config.mjs`, `package.json`, `wrangler.jsonc` | The app had no supported commercial deployment configuration or way to preview the production Worker runtime. | **Implemented in code:** added OpenNext Cloudflare adapter, Wrangler scripts/config, ignored local secret files, and Worker asset headers. Local Worker preview passed; account deployment and custom domain still require owner setup. | `npm run cf:preview` passed; deploy only after Cloudflare account/domain and server secrets are configured |
| P3 | `app/page.tsx` | The landing page showed sample stats and premium prices while billing was not implemented. | **Fixed:** sample stats remain explicitly illustrative; pricing reflects the requested $19 monthly / $200 annual subscription with the 14-day trial. Unfinished premium features are called out rather than represented as available. | Landing-page review |

## Baseline verification

Before fixes:

- `npm run typecheck` — passed.
- `npm test` — passed: 1 file, 3 tests.
- `npm run lint` — could not run on the machine's Node 18.15.0; under Node 22 it prompted interactively for ESLint setup.
- `npm run build` — blocked by Node 18.15.0.
- No Playwright config/test existed.

## Current verification

- `npm run lint` — passed under temporary Node 22.23.4.
- `npm run typecheck` — passed under temporary Node 22.23.4.
- `npm test` — passed: 4 files, 21 tests, under Vitest 5.
- `npm run build` — passed after lockfile validation.
- `npm run e2e` — blocked before the test starts because Playwright Chromium is absent. Browser installation failed with `ENOSPC` due low disk space; no E2E pass is claimed.
- Production HTTP smoke checks — landing, login, and signup return HTTP 200; an unauthenticated dashboard request redirects to login.
- `npm audit` — 0 vulnerabilities.
- Stripe endpoints and billing page are implemented, but no Stripe account keys/price IDs are set, migration 0004 is unapplied, and no Stripe test checkout/webhook has been run.
- Domain-aware SEO routes are implemented; production indexing has not been verified because no public domain is configured.
- Final production smoke checks passed for the landing page and annual signup (HTTP 200); unauthenticated billing redirects to login (HTTP 307); checkout fails closed with HTTP 503 until Stripe is configured.
- Cloudflare OpenNext/Workers local preview passed at `http://localhost:8787`; deployment to an authenticated Cloudflare account was not attempted.
- Supabase URL, anon key, and service-role key are configured locally. The Auth health endpoint returns HTTP 200; migrations 0001–0003 are applied, expected tables and RPCs are present, and the content seed passes repeatedly. The authenticated signup-to-progress journey remains unverified.
- Authenticated RPC integration passed for onboarding, two question answers, lesson completion, and XP; the temporary user was deleted. Anon access to answer-choice correctness is denied.

The local Supabase-backed signup journey and broader per-user RLS behavior remain
unverified.
The project is not complete until those integration checks pass.
