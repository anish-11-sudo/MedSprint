"use client";

import { useState } from "react";
import Link from "next/link";
import { QuestionCard } from "@/components/question-card";
import { completeLesson } from "@/app/(app)/learn/actions";
import type { Lesson } from "@/types";
import type { PracticeQuestion } from "@/lib/learning/presentation";

const TITLES = ["Concept", "Example", "Practice question", "Mini-review", "Complete"];

export function LessonRunner({
  lesson,
  practiceQuestion,
  reviewQuestion,
}: {
  lesson: Lesson;
  practiceQuestion: PracticeQuestion;
  reviewQuestion: PracticeQuestion;
}) {
  const [step, setStep] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [earnedXp, setEarnedXp] = useState<number | null>(null);

  async function advance() {
    setError(null);
    if (step === 3) {
      setBusy(true);
      try {
        const result = await completeLesson(lesson.id);
        if (result.error) {
          setError(result.error);
          return;
        }
        setEarnedXp(result.xp ?? 0);
      } catch {
        setError("Your lesson completion could not be saved. Check your connection and try again.");
        return;
      } finally {
        setBusy(false);
      }
    }
    setAnswered(false);
    setStep((current) => current + 1);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-display text-3xl font-extrabold">{lesson.title}</h1>
      <div className="h-2 rounded-full bg-[var(--line)]" role="progressbar" aria-label="Lesson progress" aria-valuenow={step} aria-valuemin={0} aria-valuemax={4}>
        <div className="h-2 rounded-full bg-mint" style={{ width: `${(step / 4) * 100}%` }} />
      </div>
      <p className="muted text-sm">Step {Math.min(step + 1, 5)} of 5: {TITLES[step]}</p>
      {step === 0 && <div className="card p-5 text-sm leading-relaxed">{lesson.concept}</div>}
      {step === 1 && <div className="card p-5 text-sm leading-relaxed"><b>Worked example. </b>{lesson.example}</div>}
      {step === 2 && <QuestionCard key={`${lesson.id}-practice`} question={practiceQuestion} onAnswered={() => setAnswered(true)} />}
      {step === 3 && <QuestionCard key={`${lesson.id}-review`} question={reviewQuestion} onAnswered={() => setAnswered(true)} />}
      {step === 4 && (
        <div className="card space-y-3 p-5">
          <p className="font-display text-xl font-bold">Lesson complete{earnedXp ? `. +${earnedXp} XP` : "."}</p>
          <Link href="/learn" className="btn-primary">Back to lessons</Link>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {step < 4 && (
        <button onClick={advance} disabled={busy || (step >= 2 && !answered)} className="btn-primary">
          {busy ? "Saving completion..." : step === 3 ? "Finish lesson" : "Continue"}
        </button>
      )}
    </div>
  );
}
