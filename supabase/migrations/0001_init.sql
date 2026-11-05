-- MedSprint initial schema. Run in the Supabase SQL editor or via `supabase db push`.
create extension if not exists "pgcrypto";

create type user_role as enum ('student', 'admin');
create type review_status as enum ('draft', 'in_review', 'published');
create type sub_status as enum ('free', 'active', 'past_due', 'canceled');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  role user_role not null default 'student',
  onboarding_completed boolean not null default false,
  test_date date, diagnostic_score int check (diagnostic_score between 472 and 528),
  target_score int check (target_score between 472 and 528),
  hours_per_week int, plan_weeks int, strong_sections int[] default '{}', weak_sections int[] default '{}',
  study_days int[] default '{}',
  xp int not null default 0, streak int not null default 0, last_active date,
  created_at timestamptz not null default now()
);

create table sections (id serial primary key, code text unique not null, name text not null);
create table topics (id serial primary key, section_id int not null references sections, subject text not null, name text not null, unique (section_id, name));
create table lessons (id uuid primary key default gen_random_uuid(), topic_id int not null references topics, title text not null, steps jsonb not null default '[]', xp_reward int not null default 20, unlock_after uuid references lessons, status review_status not null default 'draft');

create table questions (
  id uuid primary key default gen_random_uuid(),
  topic_id int not null references topics, question_type text not null, difficulty int not null check (difficulty between 1 and 5),
  stem text not null, passage text, skill text, est_seconds int not null default 90, tags text[] default '{}',
  version int not null default 1, author text, status review_status not null default 'draft', created_at timestamptz not null default now()
);
create table answer_choices (id uuid primary key default gen_random_uuid(), question_id uuid not null references questions on delete cascade, label char(1) not null check (label in ('A','B','C','D')), body text not null, is_correct boolean not null default false, explanation text not null, unique (question_id, label));
create unique index one_correct_choice on answer_choices (question_id) where is_correct;

create table question_attempts (id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, question_id uuid not null references questions, choice_id uuid references answer_choices, is_correct boolean not null, seconds int, confusing boolean not null default false, note text, created_at timestamptz not null default now());
create table study_plans (id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, weeks int not null, starts_on date not null, created_at timestamptz not null default now());
create table study_plan_items (id uuid primary key default gen_random_uuid(), plan_id uuid not null references study_plans on delete cascade, day date not null, kind text not null check (kind in ('lesson','practice','review','rest','test')), title text not null, ref_id uuid, done boolean not null default false);
create table flashcards (id uuid primary key default gen_random_uuid(), user_id uuid references profiles on delete cascade, topic_id int references topics, front text not null, back text not null, tags text[] default '{}', ease real not null default 2.5, interval_days int not null default 0, due_on date not null default current_date);
create table flashcard_reviews (id uuid primary key default gen_random_uuid(), card_id uuid not null references flashcards on delete cascade, user_id uuid not null references profiles on delete cascade, rating text not null check (rating in ('again','hard','good','easy')), created_at timestamptz not null default now());
create table practice_tests (id uuid primary key default gen_random_uuid(), title text not null, kind text not null check (kind in ('diagnostic','practice')), sections jsonb not null, status review_status not null default 'draft');
create table test_attempts (id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, test_id uuid not null references practice_tests, started_at timestamptz not null default now(), finished_at timestamptz, est_score int);
create table test_answers (id uuid primary key default gen_random_uuid(), attempt_id uuid not null references test_attempts on delete cascade, question_id uuid not null references questions, choice_id uuid references answer_choices, flagged boolean not null default false, seconds int);
create table achievements (id serial primary key, code text unique not null, name text not null, description text not null);
create table user_achievements (user_id uuid references profiles on delete cascade, achievement_id int references achievements, earned_at timestamptz not null default now(), primary key (user_id, achievement_id));
create table subscriptions (user_id uuid primary key references profiles on delete cascade, stripe_customer_id text unique, stripe_subscription_id text unique, plan text not null default 'free', status sub_status not null default 'free', current_period_end timestamptz);
create table reports (id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, question_id uuid not null references questions, reason text not null, resolved boolean not null default false, created_at timestamptz not null default now());
create table admin_audit_log (id bigserial primary key, admin_id uuid not null references profiles, action text not null, target text, created_at timestamptz not null default now());

-- Create a profile and free subscription row on signup.
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id) values (new.id);
  insert into subscriptions (user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create function is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

-- Row level security: users only touch their own rows; content is readable once published.
alter table profiles enable row level security;
create policy "own profile read" on profiles for select using (id = auth.uid() or is_admin());
create policy "own profile update" on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid())); -- cannot self-promote

do $$ declare t text; begin
  foreach t in array array['question_attempts','study_plans','flashcard_reviews','test_attempts','user_achievements','reports'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "own rows" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

alter table study_plan_items enable row level security;
create policy "own plan items" on study_plan_items for all
  using (exists (select 1 from study_plans p where p.id = plan_id and p.user_id = auth.uid()))
  with check (exists (select 1 from study_plans p where p.id = plan_id and p.user_id = auth.uid()));
alter table test_answers enable row level security;
create policy "own test answers" on test_answers for all
  using (exists (select 1 from test_attempts a where a.id = attempt_id and a.user_id = auth.uid()))
  with check (exists (select 1 from test_attempts a where a.id = attempt_id and a.user_id = auth.uid()));
alter table flashcards enable row level security;
create policy "own or starter cards" on flashcards for select using (user_id is null or user_id = auth.uid());
create policy "write own cards" on flashcards for all using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table subscriptions enable row level security;
create policy "read own subscription" on subscriptions for select using (user_id = auth.uid()); -- writes: service role (webhook) only

alter table questions enable row level security;
create policy "read published questions" on questions for select using (status = 'published' or is_admin());
create policy "admin manage questions" on questions for all using (is_admin()) with check (is_admin());
alter table answer_choices enable row level security;
create policy "read choices of visible questions" on answer_choices for select using (exists (select 1 from questions q where q.id = question_id));
create policy "admin manage choices" on answer_choices for all using (is_admin()) with check (is_admin());
alter table lessons enable row level security;
create policy "read published lessons" on lessons for select using (status = 'published' or is_admin());
alter table practice_tests enable row level security;
create policy "read published tests" on practice_tests for select using (status = 'published' or is_admin());
do $$ declare t text; begin
  foreach t in array array['sections','topics','achievements'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "public read" on %I for select using (true)', t);
  end loop;
end $$;
alter table admin_audit_log enable row level security;
create policy "admin read audit" on admin_audit_log for select using (is_admin());

insert into sections (code, name) values
  ('CPBS','Chemical and Physical Foundations of Biological Systems'),
  ('CARS','Critical Analysis and Reasoning Skills'),
  ('BBLS','Biological and Biochemical Foundations of Living Systems'),
  ('PSBB','Psychological, Social, and Biological Foundations of Behavior');
