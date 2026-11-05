import { z } from "zod";
import { SECTION_CODES } from "@/lib/content/sections";
import type { SectionCode } from "@/types";

const section = z.enum(SECTION_CODES as [SectionCode, ...SectionCode[]]);
const score = z.number().int().min(472, "Scores run from 472 to 528.").max(528, "Scores run from 472 to 528.");

export const onboardingSchema = z.object({
  testDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick your planned test date.")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, "Enter a valid test date."),
  diagnostic: score.optional(),
  target: score,
  hours: z.number().int().min(1, "Enter at least 1 hour.").max(60, "Enter 60 hours or fewer."),
  strong: z.array(section),
  weak: z.array(section),
  days: z.array(z.number().int().min(0).max(6)).min(1, "Pick at least one study day."),
  planWeeks: z.number().int().min(1, "Plans run 1 to 26 weeks.").max(26, "Plans run 1 to 26 weeks."),
}).refine((v) => !v.weak.some((w) => v.strong.includes(w)), { message: "A section can't be both strongest and weakest.", path: ["weak"] });

export type OnboardingInput = z.infer<typeof onboardingSchema>;
