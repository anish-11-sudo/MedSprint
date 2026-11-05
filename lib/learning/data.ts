import "server-only";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { LESSONS } from "@/lib/content/lessons";
import { QUESTIONS } from "@/lib/content/questions";
import { SECTION_CODES } from "@/lib/content/sections";
import { onboardingSchema } from "@/lib/validation/onboarding";
import type { Progress } from "@/lib/progress";

const profileSchema = z.object({
  xp: z.number().int().nonnegative(),
  streak: z.number().int().nonnegative(),
  last_active: z.string().nullable(),
  test_date: z.string().nullable(),
  diagnostic_score: z.number().int().nullable(),
  target_score: z.number().int().nullable(),
  hours_per_week: z.number().int().nullable(),
  plan_weeks: z.number().int().nullable(),
  strong_section_codes: z.array(z.string()),
  weak_section_codes: z.array(z.string()),
  study_days: z.array(z.number().int()),
  onboarding_completed: z.boolean(),
});

const questionRowsSchema = z.array(z.object({
  id: z.string().uuid(),
  content_key: z.string().nullable(),
}));

const attemptRowsSchema = z.array(z.object({
  question_id: z.string().uuid(),
  is_correct: z.boolean(),
  created_at: z.string(),
  seconds: z.number().nullable(),
  confusing: z.boolean(),
  note: z.string().nullable(),
}));

const lessonRowsSchema = z.array(z.object({
  lesson_id: z.string().uuid(),
  completed_at: z.string(),
}));

const publishedLessonRowsSchema = z.array(z.object({
  id: z.string().uuid(),
  content_key: z.string().nullable(),
  xp_reward: z.number().int(),
}));

const planRowsSchema = z.array(z.object({
  id: z.string().uuid(),
  weeks: z.number().int(),
  starts_on: z.string(),
}));

const planItemsSchema = z.array(z.object({
  day: z.string(),
  kind: z.enum(["lesson", "practice", "review", "rest", "test"]),
  title: z.string(),
}));

function throwOnError(error: { message: string } | null, operation: string): void {
  if (error) {
    console.error(`${operation} failed:`, error.message);
    throw new Error(`${operation} failed.`);
  }
}

export async function getLearningState() {
  const { supabase, user } = await requireUser();
  const [profileResult, questionsResult, attemptsResult, completionsResult, publishedLessonsResult, plansResult] = await Promise.all([
    supabase.from("profiles").select("xp,streak,last_active,test_date,diagnostic_score,target_score,hours_per_week,plan_weeks,strong_section_codes,weak_section_codes,study_days,onboarding_completed").eq("id", user.id).single(),
    supabase.from("questions").select("id,content_key").eq("status", "published"),
    supabase.from("question_attempts").select("question_id,is_correct,created_at,seconds,confusing,note").eq("user_id", user.id).order("created_at", { ascending: true }).limit(2000),
    supabase.from("user_lessons").select("lesson_id,completed_at").eq("user_id", user.id).order("completed_at", { ascending: true }),
    supabase.from("lessons").select("id,content_key,xp_reward").eq("status", "published"),
    supabase.from("study_plans").select("id,weeks,starts_on").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
  ]);
  throwOnError(profileResult.error, "Loading profile");
  throwOnError(questionsResult.error, "Loading published questions");
  throwOnError(attemptsResult.error, "Loading question history");
  throwOnError(completionsResult.error, "Loading lesson history");
  throwOnError(publishedLessonsResult.error, "Loading published lessons");
  throwOnError(plansResult.error, "Loading study plan");

  const profile = profileSchema.parse(profileResult.data);
  const questionRows = questionRowsSchema.parse(questionsResult.data);
  const attemptRows = attemptRowsSchema.parse(attemptsResult.data);
  const completionRows = lessonRowsSchema.parse(completionsResult.data);
  const publishedLessonRows = publishedLessonRowsSchema.parse(publishedLessonsResult.data);
  const plans = planRowsSchema.parse(plansResult.data);

  const publishedQuestionKeys = new Set(questionRows.flatMap(({ content_key }) => content_key ? [content_key] : []));
  const questionKeys = new Map(questionRows.flatMap(({ id, content_key }) => content_key ? [[id, content_key] as const] : []));
  const attempts: Progress["attempts"] = {};
  const notes: Progress["notes"] = {};
  const confusing = new Set<string>();
  const log: Progress["log"] = [];
  let dailyXp = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (const attempt of attemptRows) {
    const key = questionKeys.get(attempt.question_id);
    if (!key) continue;
    const previous = attempts[key] ?? { n: 0, c: 0, last: true };
    attempts[key] = { n: previous.n + 1, c: previous.c + Number(attempt.is_correct), last: attempt.is_correct };
    log.push({ date: attempt.created_at.slice(0, 10), qid: key, ok: attempt.is_correct });
    if (attempt.note) notes[key] = attempt.note;
    if (attempt.confusing) confusing.add(key);
    if (attempt.created_at.slice(0, 10) === today) dailyXp += attempt.is_correct ? 10 : 3;
  }

  const lessonKeys = new Map(publishedLessonRows.flatMap(({ id, content_key }) => content_key ? [[id, content_key] as const] : []));
  const lessons = completionRows.flatMap(({ lesson_id }) => {
    const key = lessonKeys.get(lesson_id);
    return key ? [key] : [];
  });
  const lessonXp = new Map(publishedLessonRows.flatMap(({ id, content_key, xp_reward }) => content_key ? [[content_key, { id, xp_reward }] as const] : []));
  for (const completion of completionRows) {
    const key = lessonKeys.get(completion.lesson_id);
    const lesson = key ? lessonXp.get(key) : undefined;
    if (lesson && completion.completed_at.slice(0, 10) === today) dailyXp += lesson.xp_reward;
  }

  let onboarding: Progress["onboarding"] = null;
  const activePlan = plans[0];
  if (profile.onboarding_completed && profile.test_date && profile.target_score !== null && profile.hours_per_week !== null && profile.plan_weeks !== null && activePlan) {
    const planResult = await supabase.from("study_plan_items").select("day,kind,title").eq("plan_id", activePlan.id).order("day", { ascending: true });
    throwOnError(planResult.error, "Loading study plan items");
    const items = planItemsSchema.parse(planResult.data);
    const parsedOnboarding = onboardingSchema.safeParse({
      testDate: profile.test_date,
      diagnostic: profile.diagnostic_score ?? undefined,
      target: profile.target_score,
      hours: profile.hours_per_week,
      strong: profile.strong_section_codes,
      weak: profile.weak_section_codes,
      days: profile.study_days,
      planWeeks: profile.plan_weeks,
    });
    if (!parsedOnboarding.success) {
      console.error("Stored onboarding data failed validation:", parsedOnboarding.error.flatten());
      throw new Error("Stored study-plan settings are invalid.");
    }
    onboarding = { ...parsedOnboarding.data, startedOn: activePlan.starts_on, plan: items };
  }

  const progress: Progress = {
    xp: profile.xp,
    streak: profile.streak,
    lastActive: profile.last_active,
    daily: { date: today, xp: dailyXp },
    attempts,
    log: log.slice(-500),
    lessons,
    notes,
    confusing: [...confusing],
    reports: [],
    onboarding,
  };

  return {
    supabase,
    user,
    profile,
    progress,
    publishedQuestions: QUESTIONS.filter(({ id }) => publishedQuestionKeys.has(id)),
    publishedLessonKeys: new Set(publishedLessonRows.flatMap(({ content_key }) => content_key ? [content_key] : [])),
  };
}

export function getQuestionByKey(key: string) {
  return QUESTIONS.find((question) => question.id === key);
}

export function getLessonByKey(key: string) {
  return LESSONS.find((lesson) => lesson.id === key);
}

export function getPublishedLessonKeys() {
  return new Set(LESSONS.map(({ id }) => id));
}

export function getSectionCodes() {
  return SECTION_CODES;
}
