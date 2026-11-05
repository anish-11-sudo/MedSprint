-- Store the end date of a Stripe trial without altering existing subscription rows.
alter table public.subscriptions
  add column if not exists trial_ends_at timestamptz;
