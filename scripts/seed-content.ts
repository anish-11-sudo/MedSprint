import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { LESSONS } from "@/lib/content/lessons";
import { QUESTIONS } from "@/lib/content/questions";

const rowSchema = z.array(z.object({ id: z.number(), code: z.string() }));
const topicRowSchema = z.array(z.object({ id: z.number(), section_id: z.number(), name: z.string() }));
const contentRowSchema = z.array(z.object({ id: z.string().uuid(), content_key: z.string() }));

function mappedId(map: Map<string, number>, key: string, label: string) {
  const id = map.get(key);
  if (id === undefined) throw new Error(`Missing ${label} mapping for ${key}.`);
  return id;
}

async function seed() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const sectionResult = await supabase.from("sections").select("id,code");
  if (sectionResult.error) throw sectionResult.error;
  const sectionRows = rowSchema.parse(sectionResult.data);
  const sectionIds = new Map(sectionRows.map(({ id, code }) => [code, id]));

  const topicInput = new Map<string, { section_id: number; subject: string; name: string }>();
  for (const question of QUESTIONS) {
    const sectionId = sectionIds.get(question.section);
    if (sectionId === undefined) throw new Error(`Missing section ${question.section}.`);
    topicInput.set(`${sectionId}:${question.topic}`, {
      section_id: sectionId,
      subject: question.subject,
      name: question.topic,
    });
  }
  for (const lesson of LESSONS) {
    const question = QUESTIONS.find(({ id }) => id === lesson.practiceId);
    if (!question) throw new Error(`Lesson ${lesson.id} references a missing practice question.`);
    const sectionId = sectionIds.get(question.section);
    if (sectionId === undefined) throw new Error(`Missing section ${question.section}.`);
    topicInput.set(`${sectionId}:${question.topic}`, {
      section_id: sectionId,
      subject: question.subject,
      name: question.topic,
    });
  }

  const topicResult = await supabase
    .from("topics")
    .upsert([...topicInput.values()], { onConflict: "section_id,name" })
    .select("id,section_id,name");
  if (topicResult.error) throw topicResult.error;
  const topicRows = topicRowSchema.parse(topicResult.data);
  const topicIds = new Map(topicRows.map(({ id, section_id, name }) => [`${section_id}:${name}`, id]));

  const questionInput = QUESTIONS.map((question) => {
    const sectionId = mappedId(sectionIds, question.section, "section");
    return {
      content_key: question.id,
      topic_id: mappedId(topicIds, `${sectionId}:${question.topic}`, "topic"),
      question_type: question.type,
      difficulty: question.difficulty,
      stem: question.stem,
      passage: question.passage ?? null,
      skill: question.skill,
      est_seconds: question.seconds,
      tags: question.tags,
      version: question.version,
      author: question.author,
      status: question.status,
    };
  });
  const questionResult = await supabase
    .from("questions")
    .upsert(questionInput, { onConflict: "content_key" })
    .select("id,content_key");
  if (questionResult.error) throw questionResult.error;
  const questionRows = contentRowSchema.parse(questionResult.data);
  const questionIds = new Map(questionRows.map(({ id, content_key }) => [content_key, id]));

  const choiceInput = QUESTIONS.flatMap((question) => {
    const questionId = questionIds.get(question.id);
    if (!questionId) throw new Error(`Missing database question ${question.id}.`);
    return question.choices.map((choice, index) => ({
      question_id: questionId,
      label: "ABCD"[index],
      body: choice.text,
      is_correct: index === question.answer,
      explanation: choice.why,
    }));
  });
  const choiceResult = await supabase
    .from("answer_choices")
    .upsert(choiceInput, { onConflict: "question_id,label" });
  if (choiceResult.error) throw choiceResult.error;

  const lessonInput = LESSONS.map((lesson) => {
    const sectionId = mappedId(sectionIds, lesson.section, "section");
    const practiceQuestion = QUESTIONS.find(({ id }) => id === lesson.practiceId);
    if (!practiceQuestion) throw new Error(`Lesson ${lesson.id} references a missing practice question.`);
    const topicId = mappedId(topicIds, `${sectionId}:${practiceQuestion.topic}`, "topic");
    return {
      content_key: lesson.id,
      topic_id: topicId,
      title: lesson.title,
      steps: [
        { kind: "concept", body: lesson.concept },
        { kind: "example", body: lesson.example },
        { kind: "practice", questionKey: lesson.practiceId },
        { kind: "review", questionKey: lesson.reviewId },
      ],
      xp_reward: lesson.xp,
      status: "published",
    };
  });
  const lessonResult = await supabase
    .from("lessons")
    .upsert(lessonInput, { onConflict: "content_key" })
    .select("id,content_key");
  if (lessonResult.error) throw lessonResult.error;
  const seededLessons = contentRowSchema.parse(lessonResult.data);
  const lessonIds = new Map(seededLessons.map(({ id, content_key }) => [content_key, id]));
  for (let index = 1; index < LESSONS.length; index += 1) {
    const previousId = lessonIds.get(LESSONS[index - 1].id);
    const currentId = lessonIds.get(LESSONS[index].id);
    if (!previousId || !currentId) throw new Error("Missing lesson dependency in seed results.");
    const unlockResult = await supabase.from("lessons").update({ unlock_after: previousId }).eq("id", currentId);
    if (unlockResult.error) throw unlockResult.error;
  }

  console.info(`Seeded ${QUESTIONS.length} original questions, ${choiceInput.length} answer choices, and ${LESSONS.length} lessons.`);
}

seed().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
        ? error.message
        : "Unexpected error.";
  console.error("Content seeding failed:", message);
  process.exitCode = 1;
});
