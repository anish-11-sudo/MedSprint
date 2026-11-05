import Link from "next/link";
import { getLearningState } from "@/lib/learning/data";
import { pickNext, reviewQueue } from "@/lib/progress";
import { SECTIONS, SECTION_CODES } from "@/lib/content/sections";

export default async function PracticePage() {
  const { progress, publishedQuestions } = await getLearningState();
  const recommendation = publishedQuestions.length ? pickNext(progress, publishedQuestions) : null;
  const review = reviewQueue(progress, publishedQuestions);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Practice</h1>
        <p className="muted mt-1 text-sm">Original questions with explanations after each submitted answer.</p>
      </div>
      {recommendation && (
        <section className="card space-y-3 p-5" aria-labelledby="recommended-heading">
          <h2 id="recommended-heading" className="font-display text-lg font-bold">Recommended next</h2>
          <p className="muted text-sm">{recommendation.reason}</p>
          <Link href={`/practice/${recommendation.question.id}`} className="btn-primary">Start {recommendation.question.topic}</Link>
        </section>
      )}
      {review.length > 0 && (
        <section className="card p-5" aria-labelledby="review-heading">
          <h2 id="review-heading" className="font-display text-lg font-bold">Missed questions</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {review.map((question) => (
              <li key={question.id}>
                <Link href={`/practice/${question.id}`} className="btn-ghost">{question.topic} · review</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {publishedQuestions.length ? SECTION_CODES.map((section) => {
        const questions = publishedQuestions.filter((question) => question.section === section);
        if (!questions.length) return null;
        return (
          <section key={section} aria-labelledby={`section-${section}`}>
            <h2 id={`section-${section}`} className="font-display text-lg font-bold">{SECTIONS[section].short}</h2>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {questions.map((question) => {
                const attempt = progress.attempts[question.id];
                return (
                  <li key={question.id}>
                    <Link href={`/practice/${question.id}`} className="card block p-3 text-sm hover:border-volt">
                      {question.topic}
                      <span className="muted"> · {question.type}{attempt ? (attempt.last ? " · answered" : " · review") : ""}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      }) : (
        <section className="card p-5">
          <h2 className="font-display text-lg font-bold">Practice is not available yet</h2>
          <p className="muted mt-2 text-sm">No questions are published. Please check back later.</p>
        </section>
      )}
    </div>
  );
}
