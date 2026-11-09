"use client";

import { useState } from "react";
import { formatMoney } from "../../lib/tools/finance";
import {
  evaluatePayment,
  formatMonths,
  PAYMENT_MODES,
  type PaymentMode,
  type PaymentRaw,
} from "../../lib/tools/loans";
import { TenureFields } from "./loanShared";
import { NumberField, Results, SelectField, ToolLayout } from "./ui";

export default function PaymentCalculator() {
  const [raw, setRaw] = useState<PaymentRaw>({
    mode: "payment",
    principal: "1000000",
    payment: "20000",
    rate: "9",
    tenure: "5",
    tenureUnit: "years",
  });
  const set = <K extends keyof PaymentRaw>(key: K, value: PaymentRaw[K]) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluatePayment(raw);

  const headline =
    result &&
    (result.mode === "payment"
      ? { label: "Monthly payment", value: formatMoney(result.payment) }
      : result.mode === "amount"
        ? { label: "Loan you can afford", value: formatMoney(result.principal) }
        : { label: "Time to pay off", value: formatMonths(result.months) });

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <SelectField
            label="Find"
            value={raw.mode}
            onChange={(v: PaymentMode) => set("mode", v)}
            options={(Object.keys(PAYMENT_MODES) as PaymentMode[]).map((k) => ({
              value: k,
              label: PAYMENT_MODES[k],
            }))}
          />
          {raw.mode !== "amount" && (
            <NumberField
              label="Loan amount (₹)"
              value={raw.principal}
              onChange={(v) => set("principal", v)}
              error={errors.principal}
            />
          )}
          {raw.mode !== "payment" && (
            <NumberField
              label="Monthly payment (₹)"
              value={raw.payment}
              onChange={(v) => set("payment", v)}
              error={errors.payment}
            />
          )}
          <NumberField
            label="Interest rate (% per year)"
            value={raw.rate}
            onChange={(v) => set("rate", v)}
            error={errors.rate}
          />
          {raw.mode !== "term" && (
            <TenureFields
              value={raw.tenure}
              unit={raw.tenureUnit}
              onValue={(v) => set("tenure", v)}
              onUnit={(u) => set("tenureUnit", u)}
              error={errors.tenure}
            />
          )}
        </>
      }
      results={
        <Results
          emptyMessage="Fill in the values to see the result."
          headline={headline}
          rows={
            result && [
              ...(result.mode === "payment"
                ? []
                : result.mode === "amount"
                  ? [
                      {
                        label: "Monthly payment",
                        value: formatMoney(result.payment),
                      },
                    ]
                  : [
                      {
                        label: "Loan amount",
                        value: formatMoney(result.principal),
                      },
                    ]),
              {
                label: "Total interest",
                value: formatMoney(result.totalInterest),
              },
              {
                label: `Total of the payments (${result.months} months)`,
                value: formatMoney(result.totalPayment),
              },
            ]
          }
        />
      }
    />
  );
}
