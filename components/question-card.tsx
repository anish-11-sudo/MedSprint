"use client";

import { useState } from "react";
import { reportPracticeQuestion, submitPracticeAnswer, type PracticeAnswerResult } from "@/app/(app)/practice/actions";
import { SECTIONS } from "@/lib/content/sections";
import type { PracticeQuestion } from "@/lib/learning/presentation";

export function QuestionCard({
  question,
  onAnswered,
}: {
  question: PracticeQuestion;
  onAnswered?: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [confusing, setConfusing] = useState(false);
  const [note, setNote] = useState("");
  const [report, setReport] = useState("");
  const [result, setResult] = useState<Extract<PracticeAnswerResult, { error: null }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [reported, setReported] = useState(false);
  const startedAt = useState(() => Date.now())[0];

  async function checkAnswer() {
    if (!picked || result || busy) return;
    setError(null);
    setBusy(true);
    try {
      const response = await submitPracticeAnswer({
        questionKey: question.id,
        choiceLabel: picked,
        seconds: Math.min(3600, Math.max(0, Math.round((Date.now() - startedAt) / 1000))),
        confusing,
        note,
      });
      if (!("correct" in response)) {
        setError(response.error);
        return;
      }
      setResult(response);
      onAnswered?.(response.correct);
    } catch {
      setError("Your answer could not be saved. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function sendReport() {
    if (!report.trim() || reportBusy) return;
    setError(null);
    setReportBusy(true);
    try {
      const response = await reportPracticeQuestion({ questionKey: question.id, reason: report });
      if (response.error) {
        setError(response.error);
      } else {
        setReported(true);
      }
    } catch {
      setError("Your report could not be submitted. Check your connection and try again.");
    } finally {
      setReportBusy(false);
    }
  }

  const explanations = result ? new Map(result.explanations.map(({ label, text }) => [label, text])) : null;
  const correctLabel = result?.correctLabel ?? null;

  return (
    <article className="card space-y-4 p-5 sm:p-6">
      <p className="muted text-xs">
        {SECTIONS[question.section].short} · {question.topic} · {question.type} · difficulty {question.difficulty}/5
      </p>
      {question.passage && <blockquote className="rounded-xl bg-[var(--bg)] p-4 text-sm leading-relaxed">{question.passage}</blockquote>}
      <fieldset disabled={Boolean(result) || busy} className="space-y-2">
        <legend className="mb-3 font-semibold">{question.stem}</legend>
        {question.choices.map((choice) => {
          const correct = correctLabel === choice.label;
          const wrongPick = result && picked === choice.label && !result.correct;
          const state = correct ? "border-mint bg-mint/10" : wrongPick ? "border-red-400 bg-red-400/10" : "";
          return (
            <label key={choice.label} className={`block cursor-pointer rounded-xl border p-3 text-sm ${state || (picked === choice.label ? "border-volt" : "border-[var(--line)]")}`}>
              <span className="flex gap-3">
                <input type="radio" name={`answer-${question.id}`} checked={picked === choice.label} onChange={() => setPicked(choice.label)} className="mt-1" />
                <span><b>{choice.label}.</b> {choice.text}</span>
              </span>
              {explanations?.has(choice.label) && (
                <span className="muted mt-2 block pl-7 text-xs">
                  <b>{correct ? "Correct. " : "Explanation. "}</b>{explanations.get(choice.label)}
                </span>
              )}
            </label>
          );
        })}
      </fieldset>

      {!result ? (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={confusing} onChange={(event) => setConfusing(event.target.checked)} />
            Mark this question as confusing
          </label>
          <label className="block text-sm font-semibold">
            Personal note (optional)
            <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={2} className="input mt-1 font-normal" />
          </label>
          <button onClick={checkAnswer} disabled={!picked || busy} className="btn-primary">
            {busy ? "Saving answer..." : "Check answer"}
          </button>
        </div>
      ) : (
        <div className="space-y-3" role="status">
          <p className={`font-display text-lg font-bold ${result.correct ? "text-mint-700 dark:text-mint" : "text-red-600 dark:text-red-400"}`}>
            {result.correct ? `Correct. +${result.xp} XP` : `Not quite. +${result.xp} XP; added to review.`}
          </p>
          <p className="muted text-sm">Skill: {question.skill}.</p>
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Report a problem with this question</legend>
            <textarea
              value={report}
              onChange={(event) => setReport(event.target.value)}
              maxLength={500}
              rows={2}
              className="input font-normal"
              placeholder="Describe the issue"
              disabled={reported || reportBusy}
            />
            <button type="button" className="btn-ghost" disabled={reported || reportBusy || !report.trim()} onClick={sendReport}>
              {reported ? "Problem reported" : reportBusy ? "Sending report..." : "Report a problem"}
            </button>
          </fieldset>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </article>
  );
}
