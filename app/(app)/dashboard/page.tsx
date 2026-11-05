import Link from "next/link";
import { LESSONS } from "@/lib/content/lessons";
import { SECTIONS } from "@/lib/content/sections";
import { DAILY_GOAL, WEEKLY_GOAL, estimate, pickNext, reviewQueue, todayStr, topicMastery } from "@/lib/progress";
import { getLearningState } from "@/lib/learning/data";

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="card p-4">
      <div className="muted text-xs">{label}</div>
      <div className="font-display text-2xl font-extrabold">{value}</div>
      {detail && <div className="muted text-xs">{detail}</div>}
    </div>
  );
}

function ProgressBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-2.5 rounded-full bg-[var(--line)]" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max}>
      <div className="h-2.5 rounded-full bg-mint" style={{ width: `${percent}%` }} />
    </div>
  );
}

export default async function DashboardPage() {
  const { progress, profile, publishedQuestions, publishedLessonKeys } = await getLearningState();
  const today = todayStr();
  const weeklyCount = progress.log.filter(({ date }) => date >= todayStr(new Date(Date.now() - 6 * 86400000))).length;
  const recommendation = publishedQuestions.length ? pickNext(progress, publishedQuestions) : null;
  const review = reviewQueue(progress, publishedQuestions);
  const mastery = topicMastery(progress, publishedQuestions).filter(({ n }) => n > 0).slice(0, 3);
  const nextLesson = LESSONS.find((lesson, index) =>
    publishedLessonKeys.has(lesson.id) &&
    !progress.lessons.includes(lesson.id) &&
    (index === 0 || progress.lessons.includes(LESSONS[index - 1].id)),
  );
  const currentEstimate = estimate(progress);
  const todayItem = progress.onboarding?.plan.find(({ day }) => day === today);
  const daysUntilTest = profile.test_date
    ? Math.max(0, Math.ceil((new Date(`${profile.test_date}T00:00:00Z`).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold">{progress.streak > 0 ? `${progress.streak}-day streak. Keep it going.` : "Ready when you are."}</h1>
        <p className="muted mt-1 text-sm">Your progress is based on your saved MedSprint activity.</p>
      </div>
      {!progress.onboarding && (
        <Link href="/onboarding" className="card block p-4 font-semibold text-volt">
          Set up your study plan to personalize this dashboard.
        </Link>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Daily XP" value={`${progress.daily.xp} / ${DAILY_GOAL}`} />
        <Stat label="Streak" value={`${progress.streak} days`} />
        <Stat label="Level" value={`${Math.floor(progress.xp / 100) + 1}`} detail={`${progress.xp % 100}/100 XP to next`} />
        <Stat label="Weekly questions" value={`${weeklyCount} / ${WEEKLY_GOAL}`} />
      </div>
      <ProgressBar label="Daily XP progress" value={progress.daily.xp} max={DAILY_GOAL} />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card space-y-3 p-5" aria-labelledby="continue-heading">
          <h2 id="continue-heading" className="font-display text-lg font-bold">Continue learning</h2>
          {nextLesson ? (
            <>
              <p className="text-sm">{nextLesson.title} · {SECTIONS[nextLesson.section].short}</p>
              <Link href={`/learn/${nextLesson.id}`} className="btn-primary">Start lesson</Link>
            </>
          ) : publishedLessonKeys.size ? (
            <p className="muted text-sm">All available lessons are complete. Keep your skills fresh with practice.</p>
          ) : (
            <p className="muted text-sm">No lessons are published yet.</p>
          )}
          {todayItem && <p className="muted text-sm">Today&apos;s plan: {todayItem.title}</p>}
        </section>

        <section className="card space-y-3 p-5" aria-labelledby="practice-heading">
          <h2 id="practice-heading" className="font-display text-lg font-bold">Recommended practice</h2>
          {recommendation ? (
            <>
              <p className="muted text-sm">{recommendation.reason}</p>
              <p className="text-sm">{recommendation.question.topic} · {SECTIONS[recommendation.question.section].short}</p>
              <Link href={`/practice/${recommendation.question.id}`} className="btn-primary">Start question</Link>
            </>
          ) : <p className="muted text-sm">Practice questions are not published yet.</p>}
        </section>

        <section className="card p-5" aria-labelledby="mastery-heading">
          <h2 id="mastery-heading" className="font-display text-lg font-bold">Topics to revisit</h2>
          {mastery.length ? (
            <ul className="mt-3 space-y-3">
              {mastery.map(({ topic, mastery: value, n }) => (
                <li key={topic}>
                  <div className="mb-1 flex justify-between text-sm"><span>{topic}</span><span>{Math.round(value * 100)}% · {n} attempts</span></div>
                  <ProgressBar label={`${topic} mastery`} value={value * 100} />
                </li>
              ))}
            </ul>
          ) : <p className="muted mt-2 text-sm">Answer a few questions to see topic progress.</p>}
        </section>

        <section className="card space-y-2 p-5" aria-labelledby="review-heading">
          <h2 id="review-heading" className="font-display text-lg font-bold">Review queue</h2>
          <p className="muted text-sm">{review.length ? `${review.length} question${review.length === 1 ? "" : "s"} missed on the last attempt.` : "No missed questions waiting for review."}</p>
          {review[0] && <Link href={`/practice/${review[0].id}`} className="btn-ghost mt-2">Review a missed question</Link>}
        </section>

        <section className="card space-y-2 p-5" aria-labelledby="score-heading">
          <h2 id="score-heading" className="font-display text-lg font-bold">Practice estimate</h2>
          {daysUntilTest !== null && <p className="text-sm">{daysUntilTest} days until your planned test date.</p>}
          {currentEstimate ? (
            <p className="text-sm">Unofficial MedSprint practice estimate: <b>{currentEstimate.lo}–{currentEstimate.hi}</b></p>
          ) : (
            <p className="muted text-sm">Answer at least 8 questions to see an unofficial practice estimate.</p>
          )}
          <p className="muted text-xs">This is not an official MCAT score or a prediction of one.</p>
        </section>

        <section className="card p-5" aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="font-display text-lg font-bold">Recent answers</h2>
          {progress.log.length ? (
            <div className="mt-3 flex gap-1" role="list" aria-label="Recent answer results">
              {progress.log.slice(-10).map((answer, index) => (
                <span key={`${answer.qid}-${index}`} role="listitem" title={answer.ok ? "Correct" : "Incorrect"} className={`h-4 w-4 rounded-full ${answer.ok ? "bg-mint" : "bg-red-400"}`} />
              ))}
            </div>
          ) : <p className="muted mt-2 text-sm">No answers yet.</p>}
          <Link href="/practice" className="btn-ghost mt-3">Go to practice</Link>
        </section>
      </div>
      <p className="muted text-xs">Dashboard totals are computed from your account’s saved attempts and completed lessons.</p>
    </div>
  );
}
