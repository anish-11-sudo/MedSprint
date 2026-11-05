import type { SectionCode } from "@/types";

export const SECTIONS: Record<SectionCode, { name: string; short: string }> = {
  CPBS: { name: "Chemical and Physical Foundations of Biological Systems", short: "Chem/Phys" },
  CARS: { name: "Critical Analysis and Reasoning Skills", short: "CARS" },
  BBLS: { name: "Biological and Biochemical Foundations of Living Systems", short: "Bio/Biochem" },
  PSBB: { name: "Psychological, Social, and Biological Foundations of Behavior", short: "Psych/Soc" },
};
export const SECTION_CODES = Object.keys(SECTIONS) as SectionCode[];
