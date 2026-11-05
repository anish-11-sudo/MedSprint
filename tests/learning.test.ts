import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/lib/content/questions";
import { onboardingSchema } from "@/lib/validation/onboarding";
import { presentQuestion } from "@/lib/learning/presentation";

describe("original learning content", () => {
  it("contains at least 32 questions across all four sections", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(32);
    for (const section of ["CPBS", "CARS", "BBLS", "PSBB"] as const) {
      expect(QUESTIONS.filter((question) => question.section === section).length).toBeGreaterThanOrEqual(8);
    }
  });

  it("does not include answer keys or rationales in the question sent to the browser", () => {
    const question = presentQuestion(QUESTIONS[0]);
    expect(question).not.toHaveProperty("answer");
    expect(question.choices).toHaveLength(4);
    expect(question.choices.every((choice) => !("why" in choice))).toBe(true);
  });
});

describe("onboarding date validation", () => {
  const valid = {
    testDate: "2027-03-01",
    target: 510,
    hours: 10,
    strong: ["CPBS"],
    weak: ["CARS"],
    days: [1, 3, 5],
    planWeeks: 8,
  };

  it("accepts a calendar date with valid plan settings", () => {
    expect(onboardingSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects impossible calendar dates", () => {
    expect(onboardingSchema.safeParse({ ...valid, testDate: "2027-02-31" }).success).toBe(false);
  });
});
