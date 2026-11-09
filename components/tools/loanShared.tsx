import type { TenureUnit } from "../../lib/tools/loans";
import { NumberField, SelectField } from "./ui";

/** The loan tenure: a number and whether it is in years or months. */
export function TenureFields({
  value,
  unit,
  onValue,
  onUnit,
  error,
}: {
  value: string;
  unit: TenureUnit;
  onValue: (v: string) => void;
  onUnit: (u: TenureUnit) => void;
  error?: string;
}) {
  return (
    <>
      <NumberField
        label="Loan tenure"
        value={value}
        onChange={onValue}
        error={error}
      />
      <SelectField
        label="Tenure unit"
        value={unit}
        onChange={onUnit}
        options={[
          { value: "years", label: "Years" },
          { value: "months", label: "Months" },
        ]}
      />
    </>
  );
}
