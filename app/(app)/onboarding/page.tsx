"use client";

import { useActionState, useState } from "react";
import { SECTION_CODES, SECTIONS } from "@/lib/content/sections";
import { saveOnboarding } from "./actions";
import type { SectionCode } from "@/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const initialState = { error: null };

function Checks<T extends string | number>({
  legend,
  name,
  options,
  selected,
}: {
  legend: string;
  name: string;
  options: [T, string][];
  selected?: T[];
}) {
  return (
    <fieldset className="space-y-1">
      <legend className="mb-1 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([value, label]) => (
          <label key={String(value)} className="cursor-pointer">
            <input
              type="checkbox"
              name={name}
              value={value}
              defaultChecked={selected?.includes(value)}
              className="peer sr-only"
            />
            <span className="inline-flex rounded-xl border border-[var(--line)] px-3 py-2 text-sm peer-checked:border-volt peer-checked:bg-volt/10 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-volt">
              {label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function OnboardingPage() {
  const [state, formAction, pending] = useActionState(saveOnboarding, initialState);
  const [planWeeks, setPlanWeeks] = useState("8");
  const sectionOptions = SECTION_CODES.map((code): [SectionCode, string] => [code, SECTIONS[code].short]);

  return (
    <form action={formAction} className="card mx-auto max-w-2xl space-y-5 p-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Build your study plan</h1>
        <p className="muted mt-2 text-sm">Your answers personalize an adjustable plan. Any score estimate is unofficial.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Planned test date
          <input name="testDate" type="date" required className="input mt-1 font-normal" />
        </label>
        <label className="text-sm font-semibold">
          Study hours per week
          <input name="hours" type="number" min={1} max={60} defaultValue={10} required className="input mt-1 font-normal" />
        </label>
        <label className="text-sm font-semibold">
          Current diagnostic score (optional)
          <input name="diagnostic" type="number" min={472} max={528} placeholder="472 to 528" className="input mt-1 font-normal" />
        </label>
        <label className="text-sm font-semibold">
          Target score
          <input name="target" type="number" min={472} max={528} defaultValue={510} required className="input mt-1 font-normal" />
        </label>
      </div>
      <Checks legend="Strongest sections" name="strong" options={sectionOptions} />
      <Checks legend="Weakest sections" name="weak" options={sectionOptions} />
      <Checks
        legend="Preferred study days"
        name="days"
        options={DAYS.map((day, index): [number, string] => [index, day])}
        selected={[1, 3, 5, 6]}
      />
      <label className="block max-w-xs text-sm font-semibold">
        Plan length
        <select
          name="planWeeks"
          value={planWeeks}
          onChange={(event) => setPlanWeeks(event.target.value)}
          className="input mt-1 font-normal"
        >
          <option value="4">4 weeks</option>
          <option value="8">8 weeks</option>
          <option value="12">12 weeks</option>
          <option value="custom">Custom</option>
        </select>
      </label>
      {planWeeks === "custom" && (
        <label className="block max-w-xs text-sm font-semibold">
          Number of weeks
          <input name="customPlanWeeks" type="number" min={1} max={26} defaultValue={6} required className="input mt-1 font-normal" />
        </label>
      )}
      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-red-600 dark:text-red-400">
        {state.error}
      </p>
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Creating your plan..." : "Create my plan"}
      </button>
    </form>
  );
}
