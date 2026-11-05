import { notFound } from "next/navigation";
import { LESSONS } from "@/lib/content/lessons";
import { getLearningState } from "@/lib/learning/data";
import { presentQuestion } from "@/lib/learning/presentation";
import { LessonRunner } from "./lesson-runner";

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const { progress, publishedLessonKeys, publishedQuestions } = await getLearningState();
  const lessonIndex = LESSONS.findIndex(({ id }) => id === lessonId && publishedLessonKeys.has(id));
  if (lessonIndex < 0) notFound();
  const lesson = LESSONS[lessonIndex];
  if (lessonIndex > 0 && !progress.lessons.includes(LESSONS[lessonIndex - 1].id)) notFound();

  const practice = publishedQuestions.find(({ id }) => id === lesson.practiceId);
  const review = publishedQuestions.find(({ id }) => id === lesson.reviewId);
  if (!practice || !review) notFound();

  return (
    <LessonRunner
      lesson={lesson}
      practiceQuestion={presentQuestion(practice)}
      reviewQuestion={presentQuestion(review)}
    />
  );
}
