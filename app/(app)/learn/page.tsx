import Link from "next/link";
import { LESSONS } from "@/lib/content/lessons";
import { SECTIONS } from "@/lib/content/sections";
import { getLearningState } from "@/lib/learning/data";

export default async function LearnPage() {
  const { progress, publishedLessonKeys } = await getLearningState();
  const lessons = LESSONS.filter(({ id }) => publishedLessonKeys.has(id));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Learn</h1>
        <p className="muted mt-1 text-sm">Short concepts, worked examples, practice, and review.</p>
      </div>
      {lessons.length ? (
        <ol className="grid gap-3 sm:grid-cols-2">
          {lessons.map((lesson, index) => {
            const done = progress.lessons.includes(lesson.id);
            const open = index === 0 || progress.lessons.includes(lessons[index - 1].id);
            return (
              <li key={lesson.id} className="card p-5">
                <div className="muted text-xs">{SECTIONS[lesson.section].short} · +{lesson.xp} XP</div>
                <h2 className="mt-1 font-display text-lg font-bold">{lesson.title}</h2>
                {open ? (
                  <Link href={`/learn/${lesson.id}`} className="btn-primary mt-3">{done ? "Review lesson" : "Start lesson"}</Link>
                ) : (
                  <p className="muted mt-3 text-sm">Locked. Complete “{lessons[index - 1].title}” first.</p>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <section className="card p-5">
          <h2 className="font-display text-lg font-bold">No lessons are published yet</h2>
          <p className="muted mt-2 text-sm">Please check back later.</p>
        </section>
      )}
    </div>
  );
}
