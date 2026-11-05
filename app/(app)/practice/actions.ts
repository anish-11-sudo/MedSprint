"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { getQuestionByKey } from "@/lib/learning/data";

const answerInputSchema = z.object({
  questionKey: z.string().regex(/^q\d{2}$/),
  choiceLabel: z.enum(["A", "B", "C", "D"]),
  seconds: z.number().int().min(0).max(3600),
  confusing: z.boolean(),
  note: z.string().max(500),
});

const answerResultSchema = z.object({
  correct: z.boolean(),
  xp: z.number().int().nonnegative(),
  correctLabel: z.string(),
  explanations: z.array(z.object({ label: z.string(), text: z.string() })),
});

export type PracticeAnswerResult =
  | { error: string }
  | { error: null; correct: boolean; xp: number; correctLabel: string; explanations: { label: string; text: string }[] };

export async function submitPracticeAnswer(input: unknown): Promise<PracticeAnswerResult> {
  const parsed = answerInputSchema.safeParse(input);
  if (!parsed.success) return { error: "Choose an answer and try again." };
  if (!getQuestionByKey(parsed.data.questionKey)) return { error: "This question is no longer available." };

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("submit_practice_answer", {
    p_question_key: parsed.data.questionKey,
    p_choice_label: parsed.data.choiceLabel,
    p_seconds: parsed.data.seconds,
    p_confusing: parsed.data.confusing,
    p_note: parsed.data.note || null,
  });
  if (error) {
    console.error("Submitting practice answer failed:", error.message);
    return { error: "Your answer could not be saved. Please try again." };
  }

  const result = answerResultSchema.safeParse(data);
  if (!result.success) {
    console.error("Practice answer response failed validation:", result.error.flatten());
    return { error: "The answer was saved, but its explanation could not be loaded. Refresh and check your progress." };
  }
  revalidatePath("/dashboard");
  revalidatePath("/practice");
  return { error: null, ...result.data };
}

const reportInputSchema = z.object({
  questionKey: z.string().regex(/^q\d{2}$/),
  reason: z.string().trim().min(1).max(500),
});

export async function reportPracticeQuestion(input: unknown): Promise<{ error: string | null }> {
  const parsed = reportInputSchema.safeParse(input);
  if (!parsed.success) return { error: "Add a short reason for the report." };
  if (!getQuestionByKey(parsed.data.questionKey)) return { error: "This question is no longer available." };

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("report_practice_question", {
    p_question_key: parsed.data.questionKey,
    p_reason: parsed.data.reason,
  });
  if (error) {
    console.error("Reporting practice question failed:", error.message);
    return { error: "Your report could not be submitted. Please try again." };
  }
  return { error: null };
}
