import { describe, expect, it } from "vitest";
import { EMPTY, estimate, level, pickNext, recordAttempt, reviewQueue, topicMastery } from "@/lib/progress";
import { QUESTIONS } from "@/lib/content/questions";
import { LESSONS } from "@/lib/content/lessons";
import { generatePlan } from "@/lib/plan";
import { onboardingSchema } from "@/lib/validation/onboarding";

describe("seed content", () => {
  it("has 32+ valid, original-format questions across all sections", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(32);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    for (const s of ["CPBS", "CARS", "BBLS", "PSBB"]) expect(QUESTIONS.filter((q) => q.section === s).length).toBeGreaterThanOrEqual(8);
    for (const q of QUESTIONS) {
      expect(q.choices).toHaveLength(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      q.choices.forEach((c) => { expect(c.text.length).toBeGreaterThan(0); expect(c.why.length).toBeGreaterThan(0); });
    }
  });
  it("lessons point at real questions", () => {
    const ids = new Set(QUESTIONS.map((q) => q.id));
    LESSONS.forEach((l) => { expect(ids.has(l.practiceId)).toBe(true); expect(ids.has(l.reviewId)).toBe(true); });
  });
});

describe("progress", () => {
  const q = QUESTIONS[0];
  it("awards XP, builds streaks and queues misses", () => {
    let p = recordAttempt(EMPTY, q, true, "2026-11-04");
    expect(p.xp).toBe(10);
    expect(p.streak).toBe(1);
    p = recordAttempt(p, QUESTIONS[1], false, "2026-11-05");
    expect(p.streak).toBe(2);
    expect(reviewQueue(p, QUESTIONS).map((x) => x.id)).toEqual([QUESTIONS[1].id]);
    p = recordAttempt(p, QUESTIONS[2], true, "2026-11-09");
    expect(p.streak).toBe(1);
    expect(level(250)).toBe(3);
  });
  it("lowers mastery after misses and recommends with a reason", () => {
    let p = EMPTY;
    for (let i = 0; i < 3; i++) p = recordAttempt(p, QUESTIONS[0], false, "2026-11-04");
    expect(topicMastery(p, QUESTIONS)[0].topic).toBe(QUESTIONS[0].topic);
    const next = pickNext(p, QUESTIONS);
    expect(next.reason.length).toBeGreaterThan(0);
    expect(next.question.id).not.toBe(QUESTIONS[0].id);
  });
  it("withholds the unofficial estimate until enough data exists", () => {
    expect(estimate(EMPTY)).toBeNull();
  });
});

describe("study plan", () => {
  it("rests on non-study days and adds a test every 4th week", () => {
    const plan = generatePlan({ weeks: 4, days: [1, 3, 5], weak: ["CARS"] }, new Date(2026, 10, 2));
    expect(plan).toHaveLength(28);
    expect(plan.filter((i) => i.kind === "rest").length).toBe(16);
    expect(plan.filter((i) => i.kind === "test")).toHaveLength(1);
  });
  it("validates onboarding input", () => {
    const base = { testDate: "2027-03-01", target: 510, hours: 10, strong: ["CPBS"], weak: ["CARS"], days: [1], planWeeks: 8 };
    expect(onboardingSchema.safeParse(base).success).toBe(true);
    expect(onboardingSchema.safeParse({ ...base, weak: ["CPBS"] }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...base, target: 600 }).success).toBe(false);
  });
});
