export const DISCLAIMER =
  "MedSprint is an independent educational product and is not affiliated with or endorsed by the Association of American Medical Colleges.";

export function Disclaimer() {
  return <p className="muted max-w-2xl text-xs leading-relaxed">{DISCLAIMER} Score estimates are unofficial practice estimates.</p>;
}
