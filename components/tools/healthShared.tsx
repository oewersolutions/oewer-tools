import type { BodyRaw, Sex, Units } from "../../lib/tools/health";
import { NumberField, SelectField } from "./ui";

/** The measurements the health calculators share: units, sex, age, height, weight, and optionally neck, waist and hip. */
export function BodyFields<R extends BodyRaw>({
  raw,
  set,
  errors,
  show,
}: {
  raw: R;
  set: <K extends keyof BodyRaw>(key: K, value: BodyRaw[K]) => void;
  errors: Partial<Record<string, string>>;
  show: { age?: boolean; weight?: boolean; neckWaist?: boolean; hip?: boolean };
}) {
  const metric = raw.units === "metric";
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Units"
          value={raw.units}
          onChange={(v: Units) => set("units", v)}
          options={[
            { value: "metric", label: "Metric (cm, kg)" },
            { value: "imperial", label: "Imperial (ft, in, lb)" },
          ]}
        />
        <SelectField
          label="Sex"
          value={raw.sex}
          onChange={(v: Sex) => set("sex", v)}
          options={[
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
          ]}
        />
      </div>
      {show.age && (
        <NumberField
          label="Age (years)"
          value={raw.age}
          onChange={(v) => set("age", v)}
          error={errors.age}
        />
      )}
      {metric ? (
        <NumberField
          label="Height (cm)"
          value={raw.heightCm}
          onChange={(v) => set("heightCm", v)}
          error={errors.heightCm}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Height (feet)"
            value={raw.heightFt}
            onChange={(v) => set("heightFt", v)}
            error={errors.heightFt}
          />
          <NumberField
            label="Height (inches)"
            value={raw.heightIn}
            onChange={(v) => set("heightIn", v)}
            error={errors.heightIn}
          />
        </div>
      )}
      {show.weight && (
        <NumberField
          label={metric ? "Weight (kg)" : "Weight (lb)"}
          value={raw.weight}
          onChange={(v) => set("weight", v)}
          error={errors.weight}
        />
      )}
      {show.neckWaist && (
        <NumberField
          label={metric ? "Neck (cm)" : "Neck (in)"}
          value={raw.neck}
          onChange={(v) => set("neck", v)}
          error={errors.neck}
          hint="Measured below the larynx (Adam's apple)."
        />
      )}
      {show.neckWaist && (
        <NumberField
          label={metric ? "Waist (cm)" : "Waist (in)"}
          value={raw.waist}
          onChange={(v) => set("waist", v)}
          error={errors.waist}
          hint={
            raw.sex === "male"
              ? "Measured at the navel."
              : "Measured at the narrowest point."
          }
        />
      )}
      {show.hip && (
        <NumberField
          label={metric ? "Hip (cm)" : "Hip (in)"}
          value={raw.hip}
          onChange={(v) => set("hip", v)}
          error={errors.hip}
          hint="Measured at the widest point."
        />
      )}
    </>
  );
}

/** The short reminder shown under every health result. */
export function MedicalNote({ children }: { children?: string }) {
  return (
    <p className="mt-5 text-xs leading-relaxed text-white/75">
      {children ??
        "General information, not medical advice. Speak to a doctor or a registered dietitian about your own health."}
    </p>
  );
}

export const DEFAULT_BODY: BodyRaw = {
  units: "metric",
  sex: "male",
  age: "30",
  heightCm: "175",
  heightFt: "5",
  heightIn: "9",
  weight: "70",
  neck: "38",
  waist: "90",
  hip: "95",
};
