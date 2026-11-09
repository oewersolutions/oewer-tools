"use client";

import { useState } from "react";
import { formatQuantity } from "../../lib/tools/units";
import { DISTANCE_UNITS, evaluateMotion, formatDuration, SOLVE_LABELS, SPEED_UNITS, type DistanceUnit, type MotionRaw, type Solve, type SpeedUnit } from "../../lib/tools/motion";
import { NumberField, Results, SelectField, ToolLayout } from "./ui";

export default function SpeedDistanceTimeCalculator() {
  const [raw, setRaw] = useState<MotionRaw>({ solve: "speed", distance: "150", distanceUnit: "km", speed: "", speedUnit: "kmh", hours: "2", minutes: "30", seconds: "" });
  const set = <K extends keyof MotionRaw>(key: K, value: MotionRaw[K]) => setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateMotion(raw);

  const distanceUnit = DISTANCE_UNITS[raw.distanceUnit];
  const speedUnit = SPEED_UNITS[raw.speedUnit];
  const headline =
    result &&
    (result.solve === "speed"
      ? { label: "Speed", value: `${formatQuantity(result.mps / speedUnit.mps)} ${speedUnit.symbol}` }
      : result.solve === "distance"
        ? { label: "Distance", value: `${formatQuantity(result.metres / distanceUnit.metres)} ${distanceUnit.symbol}` }
        : { label: "Time", value: formatDuration(result.seconds) });
  const rows =
    result &&
    [
      ...(Object.keys(SPEED_UNITS) as SpeedUnit[]).filter((u) => !(result.solve === "speed" && u === raw.speedUnit)).map((u) => ({ label: `Speed in ${SPEED_UNITS[u].symbol}`, value: formatQuantity(result.mps / SPEED_UNITS[u].mps) })),
      ...(Object.keys(DISTANCE_UNITS) as DistanceUnit[]).filter((u) => !(result.solve === "distance" && u === raw.distanceUnit)).map((u) => ({ label: `Distance in ${DISTANCE_UNITS[u].symbol}`, value: formatQuantity(result.metres / DISTANCE_UNITS[u].metres) })),
      { label: "Time", value: result.solve === "time" ? `${formatQuantity(result.seconds)} s` : formatDuration(result.seconds) },
    ];

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <SelectField label="Find" value={raw.solve} onChange={(v: Solve) => set("solve", v)} options={(Object.keys(SOLVE_LABELS) as Solve[]).map((k) => ({ value: k, label: SOLVE_LABELS[k] }))} />
          {raw.solve !== "distance" && (
            <>
              <NumberField label="Distance" value={raw.distance} onChange={(v) => set("distance", v)} error={errors.distance} />
              <SelectField label="Distance unit" value={raw.distanceUnit} onChange={(v: DistanceUnit) => set("distanceUnit", v)} options={(Object.keys(DISTANCE_UNITS) as DistanceUnit[]).map((k) => ({ value: k, label: `${DISTANCE_UNITS[k].label} (${DISTANCE_UNITS[k].symbol})` }))} />
            </>
          )}
          {raw.solve === "distance" && (
            <SelectField label="Show distance in" value={raw.distanceUnit} onChange={(v: DistanceUnit) => set("distanceUnit", v)} options={(Object.keys(DISTANCE_UNITS) as DistanceUnit[]).map((k) => ({ value: k, label: `${DISTANCE_UNITS[k].label} (${DISTANCE_UNITS[k].symbol})` }))} />
          )}
          {raw.solve !== "speed" && <NumberField label="Speed" value={raw.speed} onChange={(v) => set("speed", v)} error={errors.speed} />}
          <SelectField label={raw.solve === "speed" ? "Show speed in" : "Speed unit"} value={raw.speedUnit} onChange={(v: SpeedUnit) => set("speedUnit", v)} options={(Object.keys(SPEED_UNITS) as SpeedUnit[]).map((k) => ({ value: k, label: `${SPEED_UNITS[k].label} (${SPEED_UNITS[k].symbol})` }))} />
          {raw.solve !== "time" && (
            <div className="grid grid-cols-3 gap-3">
              <NumberField label="Hours" value={raw.hours} onChange={(v) => set("hours", v)} error={errors.hours} />
              <NumberField label="Minutes" value={raw.minutes} onChange={(v) => set("minutes", v)} error={errors.minutes} />
              <NumberField label="Seconds" value={raw.seconds} onChange={(v) => set("seconds", v)} error={errors.seconds} />
            </div>
          )}
        </>
      }
      results={<Results emptyMessage="Fill in the two values you know to see the third." headline={headline} rows={rows} />}
    />
  );
}
