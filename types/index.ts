export type SectionCode = "CPBS" | "CARS" | "BBLS" | "PSBB";
export type ReviewStatus = "draft" | "in_review" | "published";

export type QuestionType =
  | "Independent science"
  | "Passage-based science"
  | "Data interpretation"
  | "Graph and table reasoning"
  | "Experimental design"
  | "CARS passage"
  | "CARS argument analysis"
  | "Vocabulary in context";

export interface Choice {
  text: string;
  why: string;
}

export interface Question {
  id: string;
  section: SectionCode;
  subject: string;
  topic: string;
  type: QuestionType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  skill: string;
  seconds: number;
  tags: string[];
  stem: string;
  passage?: string;
  choices: Choice[];
  answer: number;
  version: number;
  author: string;
  status: ReviewStatus;
}

export interface Lesson {
  id: string;
  section: SectionCode;
  title: string;
  concept: string;
  example: string;
  practiceId: string;
  reviewId: string;
  xp: number;
}
