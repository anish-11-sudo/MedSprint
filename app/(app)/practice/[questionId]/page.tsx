import Link from "next/link";
import { notFound } from "next/navigation";
import { QuestionCard } from "@/components/question-card";
import { getLearningState } from "@/lib/learning/data";
import { presentQuestion } from "@/lib/learning/presentation";

export default async function PracticeQuestionPage({ params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params;
  const { publishedQuestions } = await getLearningState();
  const question = publishedQuestions.find(({ id }) => id === questionId);
  if (!question) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/practice" className="muted text-sm underline">Back to practice</Link>
      <QuestionCard question={presentQuestion(question)} />
    </div>
  );
}
