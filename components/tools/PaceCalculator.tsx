"use client";

import { useState } from "react";
import { formatClockShort } from "../../lib/tools/duration";
import {
  evaluatePace,
  pacePer,
  PACE_SOLVE_LABELS,
  speedIn,
  UNIT_LABELS,
  UNIT_METRES,
  type PaceRaw,
  type PaceSolve,
  type PaceUnit,
} from "../../lib/tools/pace";
import { formatQuantity } from "../../lib/tools/units";
import { NumberField, Results, SelectField, ToolLayout } from "./ui";

const unitOptions = (Object.keys(UNIT_LABELS) as PaceUnit[]).map((k) => ({
  value: k,
  label: UNIT_LABELS[k],
}));

export default function PaceCalculator() {
  const [raw, setRaw] = useState<PaceRaw>({
    solve: "pace",
    distance: "10",
    distanceUnit: "km",
    hours: "",
    minutes: "55",
    seconds: "",
    paceMinutes: "5",
    paceSeconds: "30",
    paceUnit: "km",
  });
  const set = <K extends keyof PaceRaw>(key: K, value: PaceRaw[K]) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluatePace(raw);

  const headline =
    result &&
    (result.solve === "pace"
      ? {
          label: `Pace per ${raw.paceUnit}`,
          value: pacePer(result.secPerMetre, raw.paceUnit),
        }
      : result.solve === "time"
        ? { label: "Finish time", value: formatClockShort(result.seconds) }
        : {
            label: "Distance",
            value: `${formatQuantity(result.metres / UNIT_METRES[raw.distanceUnit])} ${raw.distanceUnit}`,
          });
  const rows = result && [
    { label: "Pace per km", value: pacePer(result.secPerMetre, "km") },
    { label: "Pace per mile", value: pacePer(result.secPerMetre, "mi") },
    {
      label: "Speed",
      value: `${formatQuantity(speedIn(result.secPerMetre, "km"))} km/h · ${formatQuantity(speedIn(result.secPerMetre, "mi"))} mph`,
    },
    ...result.races.map((r) => ({
      label: `${r.label} at this pace`,
      value: r.time,
    })),
  ];

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <SelectField
            label="Find"
            value={raw.solve}
            onChange={(v: PaceSolve) => set("solve", v)}
            options={(Object.keys(PACE_SOLVE_LABELS) as PaceSolve[]).map(
              (k) => ({ value: k, label: PACE_SOLVE_LABELS[k] }),
            )}
          />
          <SelectField
            label={
              raw.solve === "distance" ? "Show distance in" : "Distance unit"
            }
            value={raw.distanceUnit}
            onChange={(v: PaceUnit) => set("distanceUnit", v)}
            options={unitOptions}
          />
          {raw.solve !== "distance" && (
            <NumberField
              label="Distance"
              value={raw.distance}
              onChange={(v) => set("distance", v)}
              error={errors.distance}
            />
          )}
          {raw.solve !== "time" && (
            <div className="grid grid-cols-3 gap-3">
              <NumberField
                label="Hours"
                value={raw.hours}
                onChange={(v) => set("hours", v)}
                error={errors.hours}
              />
              <NumberField
                label="Minutes"
                value={raw.minutes}
                onChange={(v) => set("minutes", v)}
                error={errors.minutes}
              />
              <NumberField
                label="Seconds"
                value={raw.seconds}
                onChange={(v) => set("seconds", v)}
                error={errors.seconds}
              />
            </div>
          )}
          {raw.solve !== "pace" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Pace minutes"
                  value={raw.paceMinutes}
                  onChange={(v) => set("paceMinutes", v)}
                  error={errors.paceMinutes}
                />
                <NumberField
                  label="Pace seconds"
                  value={raw.paceSeconds}
                  onChange={(v) => set("paceSeconds", v)}
                  error={errors.paceSeconds}
                />
              </div>
              <SelectField
                label="Pace per"
                value={raw.paceUnit}
                onChange={(v: PaceUnit) => set("paceUnit", v)}
                options={[
                  { value: "km", label: "Kilometre" },
                  { value: "mi", label: "Mile" },
                ]}
              />
            </>
          )}
        </>
      }
      results={
        <Results
          emptyMessage="Fill in the two values you know to see the third."
          headline={headline}
          rows={rows}
        />
      }
    />
  );
}
