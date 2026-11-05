import type { SectionCode } from "@/types";
import { SECTION_CODES, SECTIONS } from "@/lib/content/sections";

export type PlanKind = "lesson" | "practice" | "review" | "rest" | "test";
export interface PlanItem { day: string; kind: PlanKind; title: string }

export const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Weak sections appear twice as often. Every 4th week ends with a practice test. */
export function generatePlan(o: { weeks: number; days: number[]; weak: SectionCode[] }, start: Date): PlanItem[] {
  const others = SECTION_CODES.filter((s) => !o.weak.includes(s));
  const rotation = [...o.weak, ...o.weak, ...others];
  const kinds: PlanKind[] = ["lesson", "practice", "review", "practice"];
  const items: PlanItem[] = [];
  let k = 0;
  for (let i = 0; i < o.weeks * 7; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + i));
    if (!o.days.includes(d.getUTCDay())) { items.push({ day: dayKey(d), kind: "rest", title: "Rest day" }); continue; }
    const kind = kinds[k % kinds.length];
    const sec = rotation[k % rotation.length];
    items.push({ day: dayKey(d), kind, title: `${kind[0].toUpperCase()}${kind.slice(1)}: ${SECTIONS[sec].short}` });
    k++;
  }
  for (let w = 3; w < o.weeks; w += 4) {
    const week = items.slice(w * 7, w * 7 + 7);
    const last = [...week].reverse().find((x) => x.kind !== "rest");
    if (last) { last.kind = "test"; last.title = "Shortened practice test"; }
  }
  return items;
}
