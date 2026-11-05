import type { Lesson } from "@/types";

export const LESSONS: Lesson[] = [
  { id: "gas-laws", section: "CPBS", title: "Gas laws at constant volume", xp: 20, practiceId: "q01", reviewId: "q03",
    concept: "For a fixed amount of gas at constant volume, pressure is directly proportional to absolute temperature (kelvin). Always convert to kelvin before comparing.",
    example: "A rigid tank at 300 K heats to 450 K. The temperature ratio is 450/300 = 1.5, so the pressure rises by a factor of 1.5." },
  { id: "main-idea", section: "CARS", title: "Finding the main idea", xp: 20, practiceId: "q09", reviewId: "q13",
    concept: "The main idea is the claim the whole passage works to support. Test an answer by asking: does every paragraph serve it? Beware choices that are true in the passage but too narrow, or that go beyond it.",
    example: "If a passage spends most of its length contrasting two defenses of an institution and favors one, the main idea is the favored defense, not a detail about either one." },
  { id: "enzyme-inhibition", section: "BBLS", title: "Enzyme inhibition", xp: 20, practiceId: "q17", reviewId: "q18",
    concept: "A competitive inhibitor binds the active site, so high substrate can overcome it: apparent Km rises while Vmax is unchanged. Noncompetitive inhibition lowers Vmax instead.",
    example: "If adding more substrate restores the original maximum rate, suspect competitive inhibition." },
  { id: "conditioning", section: "PSBB", title: "Classical conditioning", xp: 20, practiceId: "q25", reviewId: "q28",
    concept: "Classical conditioning pairs a neutral stimulus with an unconditioned stimulus until the neutral stimulus alone triggers a conditioned response.",
    example: "A song played during a stressful event can later cause stress by itself: the song is the conditioned stimulus." },
];
