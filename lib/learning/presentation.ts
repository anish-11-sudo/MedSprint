import type { Question, SectionCode } from "@/types";

export interface PracticeQuestion {
  id: string;
  section: SectionCode;
  subject: string;
  topic: string;
  type: string;
  difficulty: number;
  skill: string;
  seconds: number;
  stem: string;
  passage?: string;
  choices: { label: string; text: string }[];
}

export function presentQuestion(question: Question): PracticeQuestion {
  return {
    id: question.id,
    section: question.section,
    subject: question.subject,
    topic: question.topic,
    type: question.type,
    difficulty: question.difficulty,
    skill: question.skill,
    seconds: question.seconds,
    stem: question.stem,
    passage: question.passage,
    choices: question.choices.map(({ text }, index) => ({ label: "ABCD"[index], text })),
  };
}
