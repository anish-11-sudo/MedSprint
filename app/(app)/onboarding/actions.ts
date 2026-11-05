"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generatePlan, dayKey } from "@/lib/plan";
import { requireUser } from "@/lib/auth/server";
import { onboardingSchema } from "@/lib/validation/onboarding";

export type OnboardingActionState = { error: string | null };

function readNumber(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return Number(value);
}

export async function saveOnboarding(
  previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  void previousState;
  const selectedWeeks = formData.get("planWeeks");
  const planWeeks = selectedWeeks === "custom" ? readNumber(formData, "customPlanWeeks") : Number(selectedWeeks);
  const parsed = onboardingSchema.safeParse({
    testDate: formData.get("testDate"),
    diagnostic: readNumber(formData, "diagnostic"),
    target: readNumber(formData, "target"),
    hours: readNumber(formData, "hours"),
    strong: formData.getAll("strong"),
    weak: formData.getAll("weak"),
    days: formData.getAll("days").map((value) => typeof value === "string" ? Number(value) : Number.NaN),
    planWeeks,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your study plan details." };
  if (parsed.data.testDate <= dayKey(new Date())) return { error: "Pick a test date in the future." };

  const { supabase } = await requireUser();
  const items = generatePlan(
    { weeks: parsed.data.planWeeks, days: parsed.data.days, weak: parsed.data.weak },
    new Date(),
  );
  const { error } = await supabase.rpc("save_onboarding", {
    p_test_date: parsed.data.testDate,
    p_diagnostic_score: parsed.data.diagnostic ?? null,
    p_target_score: parsed.data.target,
    p_hours_per_week: parsed.data.hours,
    p_plan_weeks: parsed.data.planWeeks,
    p_strong_sections: parsed.data.strong,
    p_weak_sections: parsed.data.weak,
    p_study_days: parsed.data.days,
    p_items: items,
  });
  if (error) {
    console.error("Saving onboarding failed:", error.message);
    return { error: "Your study plan could not be saved. Please try again." };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
