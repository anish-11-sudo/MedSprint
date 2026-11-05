# MedSprint Project Status

## Status summary

The Phase 2 learning journey is restored in this folder and wired to Supabase:
signup/login, onboarding, dashboard, four lessons, original practice questions,
answer explanations, saved question attempts, lesson completion, and password
settings. It is not the complete Phase 3/4 product. Core authenticated learning
RPCs and answer-key access controls have been integration-tested, but the
signup-to-progress browser journey and broader per-user RLS behavior remain
unverified. Supabase credentials are configured locally, migrations 0001–0003
are applied, and the original content seed completed. Migration 0004 and Stripe
account configuration have not been applied; paid checkout is therefore not
connected yet. The full browser journey remains unverified because Playwright
Chromium could not be installed with the available disk space.

A sibling `MedSprint Phase 1` folder contains an alternate browser-storage
implementation; it was used only as a reference. Phase 2 now stores user
progress in Supabase and does not import that localStorage progress provider.

## Fixed and built

- Added Node.js 22 runtime requirements, a non-interactive ESLint setup, and
  patched PostCSS/Zod versions. Upgraded Vitest to a patched major.
- Added safe same-origin redirects, a server-side PKCE callback, working
  password reset/update routing, sign-out, and protected routes.
- Added onboarding validation and a transactional Supabase RPC that saves
  profile settings and study-plan rows.
- Restored original authored question/lesson content and an idempotent
  service-role seed script.
- Added server-rendered learning pages and server actions for question
  submission, answer explanations, reports, lesson completion, XP, and streaks.
- Kept answer keys and rationales out of browser question payloads; the
  migration revokes direct browser access to answer-choice rows.
- Fixed a PostgreSQL syntax error in the onboarding RPC's `CASE` expression
  discovered while applying migration 0003.
- Added a Playwright signup-to-progress flow, loading/error states, and tests for
  content, redirect safety, progress rules, and onboarding validation.
- Updated the pricing page to a 14-day card-required trial followed by
  $19/month or $200/year, with plan selection carried through signup.
- Added Stripe Checkout, signed webhook synchronization, customer portal links,
  subscription status display, protected-route gating, and an additive
  migration for trial end dates.
- Added canonical/Open Graph metadata plus a production-domain-aware sitemap
  and robots file. Search indexing still requires deployment to a real domain.
- Added Cloudflare Workers/OpenNext config, Wrangler scripts, local preview
  variables template, and static-asset caching headers. Local Workers preview
  passed; deployment to a Cloudflare account and custom domain remain unverified.

## Verification

Checks were run using a temporary Node.js 22.23.4 runtime because the machine's
default Node is 18.15.0:

- `npm ci` — passed from the lockfile.
- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm test` — passed (21 tests across 4 files), including Stripe status and
  subscription access rules.
- `npm run build` — passed after the protected route group was forced dynamic.
- Production HTTP smoke checks — `/`, `/login`, and `/signup` returned HTTP 200;
  unauthenticated `/dashboard` redirected to `/login`. The landing page was
  also checked in the browser.
- Supabase migrations 0001–0003 — applied in order in the project's SQL Editor;
  verified the expected tables and RPC functions.
- `npm run seed` — passed; seeded 32 original questions, 128 choices, and 4
  lessons. Repeated successfully to confirm the seed is idempotent.
- Authenticated Supabase RPC integration — passed using a temporary confirmed
  user that was deleted after the test. Verified onboarding-plan persistence,
  two answer submissions, lesson completion, and XP persistence.
- Answer-key access check — passed; the anon key cannot select correctness
  fields from `answer_choices`.
- `npm run e2e` — could not start because Playwright's Chromium executable is
  absent. `playwright install chromium` failed with `ENOSPC` (about 190 MiB was
  free), so the signup-to-progress UI journey is still unverified.
- `npm audit` — passed with 0 vulnerabilities.
- Stripe checkout/webhook/portal — implementation added but not connected or
  tested against a Stripe account. No Stripe keys or price IDs are configured.
- Final production smoke checks — `/` and annual signup return HTTP 200,
  unauthenticated `/billing` redirects to login, and checkout returns HTTP 503
  with an explicit setup message while Stripe is unconfigured.
- Local `robots.txt` disallows indexing and local `sitemap.xml` is empty until a
  public HTTPS domain is configured; this is intentional.
- `npm run cf:preview` — OpenNext build and local Wrangler Worker runtime passed
  on `http://localhost:8787`. The home page, annual signup, robots, and sitemap
  each returned HTTP 200. No Cloudflare account deployment was attempted.

The Supabase Auth health endpoint returned HTTP 200, and the database schema
and content seed are now verified. Authenticated onboarding, answer, and lesson
RPCs were exercised; anon answer-key access was denied as intended. The UI
signup journey, email confirmation behavior, and broader per-user RLS behavior
have not been verified end to end.

## Environment variables

Copy `.env.example` to `.env.local`.

- Required for hosted auth: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Required for content seeding and Stripe webhooks:
  `SUPABASE_SERVICE_ROLE_KEY` (server-side only; never expose it in browser
  code). These three Supabase values are configured in the local Phase 2
  `.env.local`; do not commit that file.
- Optional direct database/Prisma use: `DATABASE_URL`.
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_ANNUAL_PRICE_ID`, and
  `NEXT_PUBLIC_APP_URL`. Configure in a private environment file or hosting
  provider; Stripe secrets are server-side only. Full setup is in README.
- Reserved for the unimplemented AI provider: `AI_API_KEY`.

## Run locally

Use Node.js 22 or later:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

The landing page renders without Supabase configuration. Protected routes
redirect to login, and auth operations explain that credentials are missing.

## Database and seed data

Run the Supabase SQL migrations in order:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_fix_profile_update_policy.sql`
3. `supabase/migrations/0003_learning_mvp.sql`
4. `supabase/migrations/0004_billing_trial.sql`

Migrations 0001–0003 have been applied in the Supabase SQL Editor; apply 0004 to
add the non-destructive trial-end timestamp before enabling Stripe. After
migrations, run `npm run seed`. The script idempotently seeds the four
sections' original 32 questions, answer choices, and four lessons. It never
logs or ships the service-role key.

## Playwright

`npm run e2e` runs `e2e/learning-journey.spec.ts`. The database is configured,
migrated, and seeded, but this run could not start because Playwright Chromium
is missing and browser installation ran out of disk space. Once Chromium is
available, configure email confirmation for testing and run the
signup → onboarding → lesson → answer → explanation → dashboard journey.

## Stripe

The app's checkout, subscription webhook sync, trial status, and customer
portal wiring and protected-route gating are implemented but awaiting Stripe
account setup. Create recurring $19 monthly and $200 annual prices, configure
the four Stripe values plus the public URL, apply migration 0004, and configure
the documented webhook. The 14-day trial begins at checkout and collects a
payment method; Stripe charges after the trial unless canceled. Checkout and
webhook behavior have not yet been tested against Stripe. Some advertised
premium product features are still incomplete.

## Remaining work

- Free disk space, install Playwright Chromium, and run the signup-to-progress
  Playwright journey with email confirmation configured for testing.
- Verify per-user RLS, streak updates, and unlock enforcement through the
  authenticated app journey.
- Expand the review queue with bookmarks, search/filter, notes editing, and
  mark-as-mastered.
- Implement full flashcards, editable/rescheduled study plans, detailed
  analytics, timed diagnostic/practice tests, admin tools, and a server-side
  AI abstraction.
- Configure and test Stripe, apply migration 0004, choose/register a domain,
  deploy the site, and submit its sitemap to search engines.
- Prisma remains a schema-pull stub; SQL migrations are the database source of
  truth.
