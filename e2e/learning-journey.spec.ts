import { test, expect } from "@playwright/test";

test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  "Configure local Supabase credentials, apply migrations, disable email confirmation, and seed content to run this journey.",
);

test("signup, onboarding, lesson, answer, explanation, and progress", async ({ page }) => {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await page.goto("/signup");
  await page.getByLabel("Email").fill(`medsprint-${unique}@example.test`);
  await page.getByLabel("Password").fill(`MCAT-Study-${unique}`);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  const testDate = new Date();
  testDate.setUTCDate(testDate.getUTCDate() + 90);
  await page.getByLabel("Planned test date").fill(testDate.toISOString().slice(0, 10));
  await page.getByRole("group", { name: "Weakest sections" }).getByLabel("CARS").check();
  await page.getByRole("button", { name: "Create my plan" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /Ready when you are|day streak/ })).toBeVisible();

  await page.getByRole("link", { name: "Learn" }).click();
  await page.getByRole("link", { name: "Start lesson" }).first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  for (const questionId of ["q01", "q03"]) {
    await page.locator(`input[name="answer-${questionId}"]`).first().check();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByText(/Correct\. \+\d+ XP|Not quite\. \+\d+ XP/)).toBeVisible();
    if (questionId === "q01") {
      await expect(page.getByText("Pressure would fall only if volume grew or temperature dropped.")).toBeVisible();
    }
    if (questionId === "q01") await page.getByRole("button", { name: "Continue" }).click();
  }
  await page.getByRole("button", { name: "Finish lesson" }).click();
  await expect(page.getByText(/Lesson complete/)).toBeVisible();

  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Recent answers" })).toBeVisible();
  await expect(page.getByText("No answers yet.")).toHaveCount(0);
});
