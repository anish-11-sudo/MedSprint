import type { Question } from "@/types";
import type { PlanItem } from "@/lib/plan";
import type { OnboardingInput } from "@/lib/validation/onboarding";

export interface Progress {
  xp: number; streak: number; lastActive: string | null; daily: { date: string; xp: number };
  attempts: Record<string, { n: number; c: number; last: boolean }>;
  log: { date: string; qid: string; ok: boolean }[];
  lessons: string[]; notes: Record<string, string>; confusing: string[]; reports: string[];
  onboarding: (OnboardingInput & { startedOn: string; plan: PlanItem[] }) | null;
}
export const EMPTY: Progress = { xp: 0, streak: 0, lastActive: null, daily: { date: "", xp: 0 }, attempts: {}, log: [], lessons: [], notes: {}, confusing: [], reports: [], onboarding: null };

export const todayStr = (d = new Date()) => d.toISOString().slice(0, 10);
const dayBefore = (s: string) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - 1); return todayStr(d); };
export const level = (xp: number) => Math.floor(xp / 100) + 1;
export const XP_CORRECT = 10, XP_INCORRECT = 3, DAILY_GOAL = 50, WEEKLY_GOAL = 30;

export function addXp(p: Progress, amount: number, today: string): Progress {
  const streak = p.lastActive === today ? p.streak : p.lastActive === dayBefore(today) ? p.streak + 1 : 1;
  const daily = p.daily.date === today ? { date: today, xp: p.daily.xp + amount } : { date: today, xp: amount };
  return { ...p, xp: p.xp + amount, streak, lastActive: today, daily };
}

export function recordAttempt(p: Progress, q: Question, ok: boolean, today: string): Progress {
  const prev = p.attempts[q.id] ?? { n: 0, c: 0, last: true };
  const next = addXp(p, ok ? XP_CORRECT : XP_INCORRECT, today);
  return {
    ...next,
    attempts: { ...p.attempts, [q.id]: { n: prev.n + 1, c: prev.c + (ok ? 1 : 0), last: ok } },
    log: [...p.log, { date: today, qid: q.id, ok }].slice(-500),
  };
}

export function completeLesson(p: Progress, id: string, xp: number, today: string): Progress {
  return p.lessons.includes(id) ? p : { ...addXp(p, xp, today), lessons: [...p.lessons, id] };
}

/** Smoothed accuracy per topic: (correct + 1) / (attempts + 2). Unseen topics start at 50%. */
export function topicMastery(p: Progress, qs: Question[]) {
  const t: Record<string, { section: Question["section"]; c: number; n: number }> = {};
  for (const q of qs) {
    const a = p.attempts[q.id];
    t[q.topic] ??= { section: q.section, c: 0, n: 0 };
    if (a) { t[q.topic].c += a.c; t[q.topic].n += a.n; }
  }
  return Object.entries(t).map(([topic, v]) => ({ topic, section: v.section, n: v.n, mastery: (v.c + 1) / (v.n + 2) }))
    .sort((a, b) => a.mastery - b.mastery);
}

export const reviewQueue = (p: Progress, qs: Question[]) => qs.filter((q) => p.attempts[q.id] && !p.attempts[q.id].last);

/** Simple, transparent next-question rule (full adaptive difficulty arrives in Phase 3). */
export function pickNext(p: Progress, qs: Question[]): { question: Question; reason: string } {
  const recent = p.log[p.log.length - 1]?.qid;
  const pool = qs.filter((q) => q.id !== recent);
  const [weak] = topicMastery(p, qs);
  const unseenWeak = pool.find((q) => q.topic === weak.topic && !p.attempts[q.id]);
  if (unseenWeak) return { question: unseenWeak, reason: `Your lowest-mastery topic is ${weak.topic} (${Math.round(weak.mastery * 100)}%), and you haven't seen this question yet.` };
  const missed = reviewQueue(p, pool)[0];
  if (missed) return { question: missed, reason: "You missed this one last time, so it's back for review." };
  const unseen = pool.find((q) => !p.attempts[q.id]);
  if (unseen) return { question: unseen, reason: "This is new material you haven't practiced." };
  const oldest = [...pool].sort((a, b) => lastSeen(p, a) - lastSeen(p, b))[0];
  return { question: oldest, reason: "It's the question you've gone longest without seeing." };
}
const lastSeen = (p: Progress, q: Question) => { const i = p.log.map((l) => l.qid).lastIndexOf(q.id); return i; };

/** Unofficial practice estimate from MedSprint accuracy only. Not a prediction of an official score. */
export function estimate(p: Progress) {
  const all = Object.values(p.attempts);
  const n = all.reduce((s, a) => s + a.n, 0);
  if (n < 8) return null;
  const acc = all.reduce((s, a) => s + a.c, 0) / n;
  const mid = Math.round(472 + acc * 56);
  return { lo: Math.max(472, mid - 4), hi: Math.min(528, mid + 4) };
}
