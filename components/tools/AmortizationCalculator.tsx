"use client";

import { useState } from "react";
import { formatMoney } from "../../lib/tools/finance";
import {
  evaluateAmort,
  formatMonths,
  type AmortRaw,
} from "../../lib/tools/loans";
import { TenureFields } from "./loanShared";
import { DataTable, NumberField, Results, SelectField, ToolLayout } from "./ui";

export default function AmortizationCalculator() {
  const [raw, setRaw] = useState<AmortRaw>({
    principal: "1000000",
    rate: "9",
    tenure: "5",
    tenureUnit: "years",
    extra: "",
  });
  const [view, setView] = useState<"yearly" | "monthly">("yearly");
  const set = <K extends keyof AmortRaw>(key: K, value: AmortRaw[K]) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateAmort(raw);

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <NumberField
            label="Loan amount (₹)"
            value={raw.principal}
            onChange={(v) => set("principal", v)}
            error={errors.principal}
          />
          <NumberField
            label="Interest rate (% per year)"
            value={raw.rate}
            onChange={(v) => set("rate", v)}
            error={errors.rate}
          />
          <TenureFields
            value={raw.tenure}
            unit={raw.tenureUnit}
            onValue={(v) => set("tenure", v)}
            onUnit={(u) => set("tenureUnit", u)}
            error={errors.tenure}
          />
          <NumberField
            label="Extra payment each month (₹, optional)"
            value={raw.extra}
            onChange={(v) => set("extra", v)}
            error={errors.extra}
          />
          <SelectField
            label="Schedule"
            value={view}
            onChange={setView}
            options={[
              { value: "yearly", label: "Year by year" },
              { value: "monthly", label: "Month by month" },
            ]}
          />
        </>
      }
      results={
        <>
          <Results
            emptyMessage="Enter the loan amount, interest rate and tenure to see the schedule."
            headline={
              result && { label: "Monthly EMI", value: formatMoney(result.emi) }
            }
            rows={
              result && [
                {
                  label: "Total interest",
                  value: formatMoney(result.schedule.totalInterest),
                },
                {
                  label: "Total paid",
                  value: formatMoney(result.schedule.totalPaid),
                },
                {
                  label: "Paid off in",
                  value: formatMonths(result.schedule.months),
                },
              ]
            }
          />
          {result && view === "yearly" && (
            <DataTable
              caption="Principal and interest paid in each year, and the balance at the end of it"
              label="Year by year"
              columns={["Year", "Principal", "Interest", "Balance"]}
              rows={result.years.map((y) => [
                y.year,
                formatMoney(y.principal),
                formatMoney(y.interest),
                formatMoney(y.balance),
              ])}
            />
          )}
          {result && view === "monthly" && (
            <DataTable
              caption="Principal and interest paid in each month, and the balance after it"
              label="Month by month"
              columns={["Month", "Principal", "Interest", "Balance"]}
              rows={result.schedule.rows.map((r) => [
                r.month,
                formatMoney(r.principal),
                formatMoney(r.interest),
                formatMoney(r.balance),
              ])}
            />
          )}
        </>
      }
    />
  );
}
