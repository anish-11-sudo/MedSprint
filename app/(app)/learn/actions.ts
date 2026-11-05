"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { getLessonByKey } from "@/lib/learning/data";

const completionResultSchema = z.object({
  completed: z.boolean(),
  xp: z.number().int().nonnegative(),
});

export async function completeLesson(lessonKey: string): Promise<{ error: string | null; xp?: number }> {
  if (!getLessonByKey(lessonKey)) return { error: "This lesson is no longer available." };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("complete_lesson", { p_lesson_key: lessonKey });
  if (error) {
    console.error("Completing lesson failed:", error.message);
    return { error: "Your lesson completion could not be saved. Please try again." };
  }
  const result = completionResultSchema.safeParse(data);
  if (!result.success || !result.data.completed) {
    console.error("Lesson completion response failed validation:", result.success ? data : result.error.flatten());
    return { error: "The lesson completion response was invalid. Refresh and check your progress." };
  }
  revalidatePath("/dashboard");
  revalidatePath("/learn");
  return { error: null, xp: result.data.xp };
}
