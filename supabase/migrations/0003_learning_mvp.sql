alter table public.questions add column if not exists content_key text;
alter table public.lessons add column if not exists content_key text;
create unique index if not exists questions_content_key_uidx on public.questions (content_key);
create unique index if not exists lessons_content_key_uidx on public.lessons (content_key);

alter table public.profiles
  add column if not exists strong_section_codes text[] not null default '{}',
  add column if not exists weak_section_codes text[] not null default '{}';

create table if not exists public.user_lessons (
  user_id uuid not null references public.profiles on delete cascade,
  lesson_id uuid not null references public.lessons on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
alter table public.user_lessons enable row level security;
drop policy if exists "read own lesson completions" on public.user_lessons;
create policy "read own lesson completions" on public.user_lessons
  for select to authenticated using (user_id = auth.uid());

revoke select on public.answer_choices from anon, authenticated;

create or replace function public.save_onboarding(
  p_test_date date,
  p_diagnostic_score integer,
  p_target_score integer,
  p_hours_per_week integer,
  p_plan_weeks integer,
  p_strong_sections text[],
  p_weak_sections text[],
  p_study_days integer[],
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_test_date is null
    or p_target_score is null
    or p_hours_per_week is null
    or p_plan_weeks is null
    or p_strong_sections is null
    or p_weak_sections is null
    or p_study_days is null
    or p_items is null
    or p_test_date <= current_date
    or (p_diagnostic_score is not null and p_diagnostic_score not between 472 and 528)
    or p_target_score not between 472 and 528
    or p_hours_per_week not between 1 and 60
    or p_plan_weeks not between 1 and 26
    or coalesce(array_length(p_study_days, 1), 0) = 0
    or exists (select 1 from unnest(p_study_days) d where d not between 0 and 6)
    or exists (
      select 1 from unnest(coalesce(p_strong_sections, '{}') || coalesce(p_weak_sections, '{}')) s
      where s not in ('CPBS', 'CARS', 'BBLS', 'PSBB')
    )
    or p_strong_sections && p_weak_sections
    or (
      case
        when jsonb_typeof(p_items) = 'array' then jsonb_array_length(p_items) <> p_plan_weeks * 7
        else true
      end
    )
  then
    raise exception 'Invalid study plan input' using errcode = '22023';
  end if;

  insert into public.study_plans (user_id, weeks, starts_on)
  values (v_user_id, p_plan_weeks, current_date)
  returning id into v_plan_id;

  insert into public.study_plan_items (plan_id, day, kind, title)
  select v_plan_id, i.day, i.kind, i.title
  from jsonb_to_recordset(p_items) as i(day date, kind text, title text);

  update public.profiles
  set onboarding_completed = true,
      test_date = p_test_date,
      diagnostic_score = p_diagnostic_score,
      target_score = p_target_score,
      hours_per_week = p_hours_per_week,
      plan_weeks = p_plan_weeks,
      strong_section_codes = coalesce(p_strong_sections, '{}'),
      weak_section_codes = coalesce(p_weak_sections, '{}'),
      study_days = p_study_days
  where id = v_user_id;

  return v_plan_id;
end;
$$;
revoke all on function public.save_onboarding(date, integer, integer, integer, integer, text[], text[], integer[], jsonb) from public;
grant execute on function public.save_onboarding(date, integer, integer, integer, integer, text[], text[], integer[], jsonb) to authenticated;

create or replace function public.submit_practice_answer(
  p_question_key text,
  p_choice_label text,
  p_seconds integer default null,
  p_confusing boolean default false,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_question_id uuid;
  v_choice_id uuid;
  v_correct boolean;
  v_xp integer;
  v_today date := current_date;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_choice_label is null
    or p_choice_label not in ('A', 'B', 'C', 'D')
    or (p_seconds is not null and p_seconds not between 0 and 3600)
    or (p_note is not null and length(p_note) > 500)
  then
    raise exception 'Invalid answer input' using errcode = '22023';
  end if;

  select q.id into v_question_id
  from public.questions q
  where q.content_key = p_question_key and q.status = 'published';
  if v_question_id is null then
    raise exception 'Question not found' using errcode = 'P0002';
  end if;

  select c.id, c.is_correct into v_choice_id, v_correct
  from public.answer_choices c
  where c.question_id = v_question_id and c.label = p_choice_label;
  if v_choice_id is null then
    raise exception 'Choice not found' using errcode = 'P0002';
  end if;

  insert into public.question_attempts (user_id, question_id, choice_id, is_correct, seconds, confusing, note)
  values (v_user_id, v_question_id, v_choice_id, v_correct, p_seconds, p_confusing, p_note);

  perform 1 from public.profiles where id = v_user_id for update;
  v_xp := case when v_correct then 10 else 3 end;
  update public.profiles
  set xp = xp + v_xp,
      streak = case
        when last_active = v_today then streak
        when last_active = v_today - 1 then streak + 1
        else 1
      end,
      last_active = v_today
  where id = v_user_id;

  return jsonb_build_object(
    'correct', v_correct,
    'xp', v_xp,
    'correctLabel', (
      select c.label from public.answer_choices c
      where c.question_id = v_question_id and c.is_correct
    ),
    'explanations', (
      select jsonb_agg(jsonb_build_object('label', c.label, 'text', c.explanation) order by c.label)
      from public.answer_choices c where c.question_id = v_question_id
    )
  );
end;
$$;
revoke all on function public.submit_practice_answer(text, text, integer, boolean, text) from public;
grant execute on function public.submit_practice_answer(text, text, integer, boolean, text) to authenticated;

create or replace function public.report_practice_question(p_question_key text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_question_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_reason is null or length(trim(p_reason)) not between 1 and 500 then
    raise exception 'Invalid report reason' using errcode = '22023';
  end if;

  select q.id into v_question_id
  from public.questions q
  where q.content_key = p_question_key and q.status = 'published';
  if v_question_id is null then
    raise exception 'Question not found' using errcode = 'P0002';
  end if;

  insert into public.reports (user_id, question_id, reason)
  values (v_user_id, v_question_id, trim(p_reason));
end;
$$;
revoke all on function public.report_practice_question(text, text) from public;
grant execute on function public.report_practice_question(text, text) to authenticated;

create or replace function public.complete_lesson(p_lesson_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_lesson_id uuid;
  v_unlock_after uuid;
  v_steps jsonb;
  v_xp integer;
  v_inserted integer;
  v_today date := current_date;
  v_practice_key text;
  v_review_key text;
  v_answered_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  select l.id, l.xp_reward, l.unlock_after, l.steps into v_lesson_id, v_xp, v_unlock_after, v_steps
  from public.lessons l where l.content_key = p_lesson_key and l.status = 'published';
  if v_lesson_id is null then
    raise exception 'Lesson not found' using errcode = 'P0002';
  end if;
  if v_unlock_after is not null and not exists (
    select 1 from public.user_lessons ul
    where ul.user_id = v_user_id and ul.lesson_id = v_unlock_after
  ) then
    raise exception 'Lesson is locked' using errcode = '42501';
  end if;

  select item->>'questionKey' into v_practice_key
  from jsonb_array_elements(v_steps) item where item->>'kind' = 'practice' limit 1;
  select item->>'questionKey' into v_review_key
  from jsonb_array_elements(v_steps) item where item->>'kind' = 'review' limit 1;
  if v_practice_key is null or v_review_key is null then
    raise exception 'Lesson practice steps are missing' using errcode = '22023';
  end if;
  select count(distinct q.content_key)::integer into v_answered_count
  from public.question_attempts a
  join public.questions q on q.id = a.question_id
  where a.user_id = v_user_id and q.content_key in (v_practice_key, v_review_key);
  if v_answered_count < 2 then
    raise exception 'Complete the lesson questions first' using errcode = '42501';
  end if;

  insert into public.user_lessons (user_id, lesson_id)
  values (v_user_id, v_lesson_id)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    update public.profiles
    set xp = xp + v_xp,
        streak = case
          when last_active = v_today then streak
          when last_active = v_today - 1 then streak + 1
          else 1
        end,
        last_active = v_today
    where id = v_user_id;
  else
    v_xp := 0;
  end if;

  return jsonb_build_object('completed', true, 'xp', v_xp);
end;
$$;
revoke all on function public.complete_lesson(text) from public;
grant execute on function public.complete_lesson(text) to authenticated;
