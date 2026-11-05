# MedSprint

Original MCAT prep with daily-habit mechanics. Next.js (App Router) + TypeScript + Tailwind + Supabase.

> MedSprint is an independent educational product and is not affiliated with or endorsed by the Association of American Medical Colleges.

## Run locally

Use Node.js 22 or later. Install dependencies and start the app:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

The landing page renders without Supabase credentials. Signup and login require
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Without them,
protected routes redirect to login and the auth form explains the missing setup.

Run the available automated checks with `npm run typecheck` and `npm test`.
`npm run lint` and `npm run build` also require the supported Node.js runtime.

## Supabase setup
1. Create a project at supabase.com. Copy the URL and anon key into `.env.local`.
2. Run `supabase/migrations/0001_init.sql`, `0002_fix_profile_update_policy.sql`, and `0003_learning_mvp.sql` in order in the SQL editor. Migrations 0002 and 0003 are additive and do not delete user data.
3. Add `http://localhost:3000/**` under Auth > URL Configuration so local email confirmation and password-reset links can return to the app.
4. To seed the original learning content, set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`, then run `npm run seed`. The key is also used only by the server-side Stripe webhook to sync subscriptions. Never expose it in browser code.
5. To grant admin access, use a trusted SQL editor: `update public.profiles set role='admin' where id='<your user id>';`. Never expose service-role credentials in browser code.

The answer-key columns are not readable by browser clients. Published questions
are rendered without answers; submission and explanation retrieval use the
authenticated `submit_practice_answer` database function.

To run `npm run e2e`, use a local Supabase project with all migrations applied,
content seeded, and email confirmation disabled for the test project. The
Playwright signup-to-progress journey is skipped when Supabase URL/key are absent.

## Stripe subscriptions

The pricing page offers a 14-day trial with a card collected at Stripe Checkout,
then $19/month or $200/year. The trial starts after the customer completes
Checkout. The app creates subscription Checkout Sessions, syncs subscription
status from signed webhooks, links customers to Stripe's billing portal, and
protects the study app behind an active trial or subscription. The broader
premium feature set is not complete yet; do not advertise premium features as
available until they ship. The 14-day trial is offered once per MedSprint
account.

1. In Stripe, create one recurring monthly Price for $19 USD and one recurring
   annual Price for $200 USD. Copy each `price_...` ID.
2. Set `STRIPE_SECRET_KEY` (use a test key while developing),
   `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_ANNUAL_PRICE_ID`, and
   `STRIPE_WEBHOOK_SECRET` in `.env.local` or your hosting provider's server
   environment. Never prefix secret keys with `NEXT_PUBLIC_`.
3. Apply `supabase/migrations/0004_billing_trial.sql` after migrations 0001–0003.
   It only adds the nullable `trial_ends_at` column; it does not remove or alter
   existing subscription data.
4. Configure the Stripe Customer Portal to allow customers to update payment
   methods and cancel subscriptions. Add a webhook endpoint at
   `https://YOUR_DOMAIN/api/billing/webhook` for
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, and `customer.subscription.deleted`.
   Save the endpoint's signing secret as `STRIPE_WEBHOOK_SECRET`.
5. For local webhook testing, use Stripe CLI:
   `stripe listen --forward-to localhost:3000/api/billing/webhook`, then set the
   CLI's signing secret in `.env.local`. Test checkout with Stripe test cards.
6. Set `NEXT_PUBLIC_APP_URL` to the exact public origin (for local development,
   `http://localhost:3000`; in production, your HTTPS domain), then restart or
   redeploy the app.

Stripe Dashboard prices, webhook signing secrets, test cards, and account
verification are managed by the site owner. Checkout is disabled until all
required Stripe environment values and the migration are in place. Local app
use remains available when billing is not configured.

## Domain and search visibility

The application includes a canonical URL, Open Graph metadata, `robots.txt`,
and `sitemap.xml`. Register a domain with a low-cost registrar, deploy this app
to a host that supports Next.js, point the domain's DNS to that host, then set
`NEXT_PUBLIC_APP_URL` to the final HTTPS origin and redeploy. Verify the domain
in Google Search Console and Bing Webmaster Tools, submit `/sitemap.xml`, and
keep the landing page public. Indexing and search rankings are controlled by
search engines and are not guaranteed. Cloudflare Registrar advertises
registration and renewal at cost; exact prices vary by domain ending. Compare
renewal prices and DNS support, not just first-year promotions. Vercel's free
Hobby plan is for personal/non-commercial use, so it is only a preview option
for this subscription business; check commercial hosting terms and cost before
launching. A low-cost commercial option to evaluate is Cloudflare Workers'
Paid plan (currently a $5/month minimum) with the OpenNext Cloudflare adapter
for this Next.js app. That deployment path is not yet configured or tested for
MedSprint; verify build, Stripe webhook, and Supabase flows before switching
production traffic.

## Cloudflare Workers deployment

This project includes the OpenNext Cloudflare adapter and Wrangler configuration.
The first local runtime preview is `npm run cf:preview`; it runs the app in the
Workers runtime without publishing it. After creating a Cloudflare account, run
`npx wrangler login`, check `wrangler.jsonc`'s Worker name if it is already in
use, then use `npm run cf:deploy` to publish to the account's `workers.dev`
hostname. See the [OpenNext Cloudflare guide](https://opennext.js.org/cloudflare/get-started)
and [Wrangler documentation](https://developers.cloudflare.com/workers/wrangler/).
The local Worker preview was verified; account deployment is still pending.

Set `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` as build-time variables before deploying; Next.js
embeds public variables into the generated app. Set `SUPABASE_SERVICE_ROLE_KEY`,
`STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET` as Worker secrets. Set the
monthly and annual Stripe Price IDs as Worker variables. For local Wrangler
preview, copy `.dev.vars.example` to `.dev.vars` and add local values there.
These files are ignored by git.

To attach a custom domain, register/transfer it to Cloudflare, add it as a Worker
custom domain in Cloudflare, set `NEXT_PUBLIC_APP_URL` to its HTTPS origin, and
redeploy. Update Supabase Auth's allowed redirect URLs and Stripe's webhook URL
to use the final domain. The local preview, Cloudflare account deployment, and
custom-domain setup still need to be tested with the owner's account.

## Prisma
SQL is the source of truth. Set `DATABASE_URL` to a Supabase Postgres connection string, then run `npx prisma db pull && npx prisma generate`. The Prisma schema is currently a stub; application routes do not yet query through Prisma.

## Current scope

This checkout includes a landing page, Supabase login/signup and callback,
protected onboarding/dashboard/lesson/practice routes, original content seeding,
Supabase-backed lesson/answer progress, account password settings, Stripe
subscription checkout/webhooks/customer portal wiring, and basic search-engine
metadata. The Stripe account, price IDs, webhook, and production domain still
need owner setup. Expanded review queue, flashcards, editable study plans,
detailed analytics, timed tests, and admin screens are not implemented yet. See
[`PROJECT_STATUS.md`](./PROJECT_STATUS.md) and [`DEBUG_REPORT.md`](./DEBUG_REPORT.md)
for the audited status and known limitations.
