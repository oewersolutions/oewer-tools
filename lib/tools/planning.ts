/**
 * Maths for the investment, retirement, inflation, finance (time value of money) and interest calculators. Pure functions, no DOM.
 * Every figure assumes a steady return or rate and is an estimate: real returns and prices go up and down.
 * Returns compound monthly (rate ÷ 12 ÷ 100 a month), the same way the SIP calculator does; inflation compounds yearly.
 */
import {
  MAX_AMOUNT,
  formatMoney as m,
  readAll,
  readNumber,
  type Evaluation,
} from "./finance";
import {
  COMPOUNDING_CHOICES,
  calculateSimple,
  compoundBalance,
  TIME_UNITS,
  type CompoundingPerYear,
  type TimeUnit,
} from "./interest";
import { formatQuantity as q } from "./units";
import type { Workings } from "./workings";

const pct = (v: number): string => `${q(v)}%`;

/** Future value of a lump sum and regular deposits: FV = P × g + C × ((g − 1) ÷ i) × (1 + i × t), with g = (1 + i)^periods and t = 1 for deposits at the start of a period. */
export function futureValue(
  start: number,
  deposit: number,
  ratePerPeriod: number,
  periods: number,
  atStart = false,
): number {
  if (ratePerPeriod === 0) return start + deposit * periods;
  const growth = (1 + ratePerPeriod) ** periods;
  return (
    start * growth +
    deposit * ((growth - 1) / ratePerPeriod) * (atStart ? 1 + ratePerPeriod : 1)
  );
}

// Investment calculator

export interface InvestmentRaw extends Record<string, string> {
  start: string;
  monthly: string;
  rate: string;
  years: string;
  timing: "end" | "start";
}
export interface InvestmentResult {
  balance: number;
  invested: number;
  returns: number;
  months: number;
  rows: { year: number; invested: number; balance: number }[];
  workings: Workings;
}

export function evaluateInvestment(
  raw: InvestmentRaw,
): Evaluation<InvestmentRaw, InvestmentResult> {
  const errors: Partial<Record<string, string>> = {};
  const start = readNumber(raw.start, "Starting amount", { max: MAX_AMOUNT });
  const monthly = readNumber(raw.monthly, "Monthly addition", {
    max: MAX_AMOUNT,
  });
  const rate = readNumber(raw.rate, "Expected return", { max: 50 });
  const years = readNumber(raw.years, "Time period", {
    positive: true,
    max: 60,
  });
  for (const [key, s] of [
    ["start", start],
    ["monthly", monthly],
    ["rate", rate],
    ["years", years],
  ] as const)
    if ("error" in s) errors[key] = s.error;
  if (Object.keys(errors).length > 0 || "empty" in rate || "empty" in years)
    return { errors };
  const P = "value" in start ? start.value : 0;
  const C = "value" in monthly ? monthly.value : 0;
  if (P === 0 && C === 0) return { errors };
  const r = (rate as { value: number }).value;
  const months = Math.round((years as { value: number }).value * 12);
  if (months < 1)
    return { errors: { years: "Time period must be at least 1 month." } };
  const i = r / 12 / 100;
  const atStart = raw.timing === "start";
  const balance = futureValue(P, C, i, months, atStart);
  const invested = P + C * months;
  const rows: InvestmentResult["rows"] = [];
  for (let y = 1; y <= Math.floor(months / 12); y++)
    rows.push({
      year: y,
      invested: P + C * y * 12,
      balance: futureValue(P, C, i, y * 12, atStart),
    });
  if (months % 12 !== 0) rows.push({ year: months / 12, invested, balance });
  const growth = (1 + i) ** months;
  const steps = [
    `Monthly rate i = ${q(r)} ÷ 12 ÷ 100 = ${q(i)}`,
    `Number of months n = ${q((years as { value: number }).value)} years × 12 = ${months}`,
  ];
  if (i === 0)
    steps.push(
      `The return is 0%, so the balance is just the money put in: ${m(P)} + ${m(C)} × ${months} = ${m(balance)}`,
    );
  else {
    steps.push(
      `Growth factor (1 + i)^n = (1 + ${q(i)})^${months} = ${q(growth)}`,
      `Starting amount grows to ${m(P)} × ${q(growth)} = ${m(P * growth)}`,
    );
    if (C > 0)
      steps.push(
        `Monthly additions grow to ${m(C)} × (${q(growth)} − 1) ÷ ${q(i)}${atStart ? ` × (1 + ${q(i)})` : ""} = ${m(balance - P * growth)}`,
      );
    steps.push(
      `Final balance = ${m(P * growth)} + ${m(balance - P * growth)} = ${m(balance)}`,
    );
  }
  steps.push(
    `Money put in = ${m(P)} + ${m(C)} × ${months} = ${m(invested)}`,
    `Estimated returns = ${m(balance)} − ${m(invested)} = ${m(balance - invested)}`,
  );
  return {
    errors: {},
    result: {
      balance,
      invested,
      returns: balance - invested,
      months,
      rows,
      workings: {
        formula: [
          "Balance = P × (1 + i)^n + C × ((1 + i)^n − 1) ÷ i",
          "P = starting amount, C = monthly addition, i = monthly return, n = number of months",
          ...(atStart
            ? [
                "Additions at the start of each month are multiplied by (1 + i) once more",
              ]
            : []),
        ],
        steps,
        note: "Assumes the same return every month. Real investments go up and down, and past returns do not predict future ones, so this is an estimate, not advice.",
      },
    },
  };
}

// Retirement calculator

export interface RetirementRaw extends Record<string, string> {
  age: string;
  retireAge: string;
  lifeAge: string;
  savings: string;
  monthly: string;
  expense: string;
  returnBefore: string;
  returnAfter: string;
  inflation: string;
}
export interface RetirementResult {
  yearsToRetire: number;
  yearsInRetirement: number;
  corpus: number;
  expenseAtRetirement: number;
  required: number;
  gap: number;
  /** Extra monthly saving that would close a shortfall (0 when there is none). */
  extraMonthly: number;
  workings: Workings;
}

export function evaluateRetirement(
  raw: RetirementRaw,
): Evaluation<RetirementRaw, RetirementResult> {
  const { errors, values: v } = readAll(raw, {
    age: ["Current age", { positive: true, integer: true, max: 90 }],
    retireAge: ["Retirement age", { positive: true, integer: true, max: 100 }],
    lifeAge: ["Plan to age", { positive: true, integer: true, max: 120 }],
    expense: ["Monthly expenses", { positive: true, max: MAX_AMOUNT }],
    returnBefore: ["Return before retirement", { max: 50 }],
    returnAfter: ["Return after retirement", { max: 50 }],
    inflation: ["Inflation", { max: 50 }],
  });
  const all: Partial<Record<string, string>> = { ...errors };
  const savings = readNumber(raw.savings, "Current savings", {
    max: MAX_AMOUNT,
  });
  const monthly = readNumber(raw.monthly, "Monthly saving", {
    max: MAX_AMOUNT,
  });
  if ("error" in savings) all.savings = savings.error;
  if ("error" in monthly) all.monthly = monthly.error;
  if (!v || "error" in savings || "error" in monthly) return { errors: all };
  if (v.retireAge <= v.age)
    return {
      errors: { retireAge: "Retirement age must be after your current age." },
    };
  if (v.lifeAge <= v.retireAge)
    return {
      errors: {
        lifeAge: "The age you plan to has to be after your retirement age.",
      },
    };

  const S = "value" in savings ? savings.value : 0;
  const C = "value" in monthly ? monthly.value : 0;
  const N = (v.retireAge - v.age) * 12;
  const M = (v.lifeAge - v.retireAge) * 12;
  const i1 = v.returnBefore / 12 / 100;
  const i2 = v.returnAfter / 12 / 100;
  const g = (1 + v.inflation / 100) ** (1 / 12) - 1; // monthly rate that adds up to the yearly inflation
  const corpus = futureValue(S, C, i1, N);
  const expenseAtRetirement =
    v.expense * (1 + v.inflation / 100) ** (v.retireAge - v.age);
  const ratio = (1 + g) / (1 + i2);
  const required =
    ratio === 1
      ? expenseAtRetirement * M
      : (expenseAtRetirement * (1 - ratio ** M)) / (1 - ratio);
  const gap = corpus - required;
  const factor = i1 === 0 ? N : ((1 + i1) ** N - 1) / i1;
  const extraMonthly = gap < 0 ? -gap / factor : 0;

  const steps = [
    `Years to retirement = ${v.retireAge} − ${v.age} = ${v.retireAge - v.age}, which is ${N} months`,
    `Savings at retirement = ${m(S)} × (1 + ${q(i1)})^${N} + ${m(C)} × ((1 + ${q(i1)})^${N} − 1) ÷ ${q(i1)} = ${m(corpus)}`,
    `Monthly expenses at retirement = ${m(v.expense)} × (1 + ${q(v.inflation)}%)^${v.retireAge - v.age} = ${m(expenseAtRetirement)}`,
    `Months to fund = (${v.lifeAge} − ${v.retireAge}) × 12 = ${M}`,
    `Return after retirement i = ${q(v.returnAfter)} ÷ 12 ÷ 100 = ${q(i2)}, and expenses rise ${q(g)} a month (${q(v.inflation)}% a year)`,
    `Corpus needed = ${m(expenseAtRetirement)} × (1 − r^${M}) ÷ (1 − r), where r = (1 + ${q(g)}) ÷ (1 + ${q(i2)}) = ${q(ratio)}, which gives ${m(required)}`,
    `${gap >= 0 ? "Surplus" : "Shortfall"} = ${m(corpus)} − ${m(required)} = ${m(gap)}`,
  ];
  if (gap < 0)
    steps.push(
      `Extra saving needed each month = ${m(-gap)} ÷ ((1 + ${q(i1)})^${N} − 1) ÷ ${q(i1)} = ${m(extraMonthly)}`,
    );
  return {
    errors: {},
    result: {
      yearsToRetire: v.retireAge - v.age,
      yearsInRetirement: v.lifeAge - v.retireAge,
      corpus,
      expenseAtRetirement,
      required,
      gap,
      extraMonthly,
      workings: {
        formula: [
          "Savings at retirement = S × (1 + i)^N + C × ((1 + i)^N − 1) ÷ i",
          "Expenses at retirement = Expenses today × (1 + inflation)^years",
          "Corpus needed = Expenses × (1 − r^M) ÷ (1 − r), r = (1 + monthly inflation) ÷ (1 + monthly return)",
        ],
        steps,
        note: "A simple model with a steady return and steady inflation, withdrawals at the start of each month and no tax, pension, or other income. Real life is less tidy, so treat it as a rough guide and not as financial advice.",
      },
    },
  };
}

// Inflation calculator

export type InflationMode = "future" | "value" | "rate";
export const INFLATION_MODES: Record<InflationMode, string> = {
  future: "Future cost of something",
  value: "Today's worth of a future amount",
  rate: "Average inflation rate",
};

export interface InflationRaw extends Record<string, string> {
  mode: InflationMode;
  amount: string;
  newAmount: string;
  rate: string;
  years: string;
}
export interface InflationResult {
  mode: InflationMode;
  /** The headline: an amount, or the yearly rate in percent. */
  value: number;
  change: number;
  workings: Workings;
}

export function evaluateInflation(
  raw: InflationRaw,
): Evaluation<InflationRaw, InflationResult> {
  const errors: Partial<Record<string, string>> = {};
  const read = (
    key: "amount" | "newAmount" | "rate" | "years",
    label: string,
    rules: Parameters<typeof readNumber>[2],
  ) => {
    const s = readNumber(raw[key], label, rules);
    if ("error" in s) {
      errors[key] = s.error;
      return undefined;
    }
    return "value" in s ? s.value : undefined;
  };
  const amount = read("amount", raw.mode === "rate" ? "Old price" : "Amount", {
    positive: true,
    max: MAX_AMOUNT,
  });
  const years = read("years", "Number of years", { positive: true, max: 100 });
  const rate =
    raw.mode === "rate"
      ? undefined
      : read("rate", "Inflation rate", { max: 100 });
  const newAmount =
    raw.mode === "rate"
      ? read("newAmount", "New price", { positive: true, max: MAX_AMOUNT })
      : undefined;
  if (
    Object.keys(errors).length > 0 ||
    amount === undefined ||
    years === undefined
  )
    return { errors };
  if (raw.mode === "rate") {
    if (newAmount === undefined) return { errors };
    const r = ((newAmount / amount) ** (1 / years) - 1) * 100;
    return {
      errors: {},
      result: {
        mode: "rate",
        value: r,
        change: ((newAmount - amount) / amount) * 100,
        workings: {
          formula: ["Yearly rate = (New price ÷ Old price)^(1 ÷ years) − 1"],
          steps: [
            `Price ratio = ${m(newAmount)} ÷ ${m(amount)} = ${q(newAmount / amount)}`,
            `Yearly rate = ${q(newAmount / amount)}^(1 ÷ ${q(years)}) − 1 = ${q(r / 100)} = ${pct(r)}`,
            `Total rise over ${q(years)} years = (${m(newAmount)} − ${m(amount)}) ÷ ${m(amount)} = ${pct(((newAmount - amount) / amount) * 100)}`,
          ],
          note: "This is the average rate that, repeated every year, turns the old price into the new one. Individual years will have been higher or lower.",
        },
      },
    };
  }
  if (rate === undefined) return { errors };
  const factor = (1 + rate / 100) ** years;
  if (raw.mode === "future") {
    const future = amount * factor;
    return {
      errors: {},
      result: {
        mode: "future",
        value: future,
        change: future - amount,
        workings: {
          formula: ["Future cost = Cost today × (1 + inflation)^years"],
          steps: [
            `Yearly factor = 1 + ${q(rate)} ÷ 100 = ${q(1 + rate / 100)}`,
            `Factor over ${q(years)} years = ${q(1 + rate / 100)}^${q(years)} = ${q(factor)}`,
            `Future cost = ${m(amount)} × ${q(factor)} = ${m(future)}`,
            `Increase = ${m(future)} − ${m(amount)} = ${m(future - amount)}`,
          ],
          note: "Assumes the same inflation rate every year. Real inflation changes from year to year and differs between goods.",
        },
      },
    };
  }
  const today = amount / factor;
  return {
    errors: {},
    result: {
      mode: "value",
      value: today,
      change: amount - today,
      workings: {
        formula: [
          "Worth in today's money = Future amount ÷ (1 + inflation)^years",
        ],
        steps: [
          `Factor over ${q(years)} years = (1 + ${q(rate)} ÷ 100)^${q(years)} = ${q(factor)}`,
          `Worth today = ${m(amount)} ÷ ${q(factor)} = ${m(today)}`,
          `Purchasing power lost = ${m(amount)} − ${m(today)} = ${m(amount - today)}`,
        ],
        note: "Shows what a future amount could buy in today's prices, if prices rise at the rate you entered.",
      },
    },
  };
}

// Finance calculator: any one of the amount at the end, the amount at the start, the regular deposit, the rate or the time

export type FinanceSolve = "fv" | "pv" | "pmt" | "years" | "rate";
export const FINANCE_SOLVE: Record<FinanceSolve, string> = {
  fv: "Final amount",
  pv: "Starting amount",
  pmt: "Regular deposit",
  years: "Time",
  rate: "Interest rate",
};

export interface FinanceRaw extends Record<string, string> {
  solve: FinanceSolve;
  pv: string;
  pmt: string;
  fv: string;
  rate: string;
  years: string;
  perYear: "12" | "4" | "2" | "1";
  timing: "end" | "start";
}
export interface FinanceResult {
  solve: FinanceSolve;
  value: number;
  workings: Workings;
}

const PER_YEAR_LABEL = {
  "12": "monthly",
  "4": "quarterly",
  "2": "half-yearly",
  "1": "yearly",
} as const;

export function evaluateFinance(
  raw: FinanceRaw,
): Evaluation<FinanceRaw, FinanceResult> {
  const errors: Partial<Record<string, string>> = {};
  /** The number in a field, or undefined when it is empty or wrong. `emptyIsZero` lets the starting amount and the deposit be left blank. */
  const read = (
    key: "pv" | "pmt" | "fv" | "rate" | "years",
    label: string,
    rules: Parameters<typeof readNumber>[2],
    emptyIsZero = false,
  ): number | undefined => {
    const s = readNumber(raw[key], label, rules);
    if ("error" in s) {
      errors[key] = s.error;
      return undefined;
    }
    if ("value" in s) return s.value;
    return emptyIsZero ? 0 : undefined;
  };
  const pv =
    raw.solve === "pv"
      ? 0
      : read("pv", "Starting amount", { max: MAX_AMOUNT }, true);
  const pmt =
    raw.solve === "pmt"
      ? 0
      : read("pmt", "Regular deposit", { max: MAX_AMOUNT }, true);
  const fv =
    raw.solve === "fv"
      ? 0
      : read("fv", "Final amount", { positive: true, max: MAX_AMOUNT });
  const rate =
    raw.solve === "rate" ? 0 : read("rate", "Interest rate", { max: 100 });
  const years =
    raw.solve === "years"
      ? 0
      : read("years", "Time", { positive: true, max: 100 });
  if (
    Object.keys(errors).length > 0 ||
    pv === undefined ||
    pmt === undefined ||
    fv === undefined ||
    rate === undefined ||
    years === undefined
  )
    return { errors };

  const k = Number(raw.perYear);
  const t = raw.timing === "start" ? 1 : 0;
  const label = PER_YEAR_LABEL[raw.perYear];
  const formula = [
    "Final = Start × (1 + i)^n + Deposit × ((1 + i)^n − 1) ÷ i × (1 + i × t)",
    `i = rate per period (yearly rate ÷ ${k} ÷ 100), n = number of periods, t = 1 for deposits at the start of a period, 0 for the end`,
  ];
  const note =
    "Assumes a steady rate, deposits of the same size every period, and interest added every period. An estimate, not advice.";
  const per = (nPeriods: number, i: number) => ({
    g: (1 + i) ** nPeriods,
    s: i === 0 ? nPeriods : (((1 + i) ** nPeriods - 1) / i) * (1 + i * t),
  });
  const iOf = (r: number) => r / k / 100;

  if (raw.solve === "fv") {
    const i = iOf(rate);
    const nP = Math.round(years * k);
    if (nP < 1)
      return { errors: { years: "Time must cover at least one period." } };
    const { g, s } = per(nP, i);
    const value = pv * g + pmt * s;
    return {
      errors: {},
      result: {
        solve: "fv",
        value,
        workings: {
          formula,
          steps: [
            `Rate per period i = ${q(rate)} ÷ ${k} ÷ 100 = ${q(i)} (${label})`,
            `Number of periods n = ${q(years)} × ${k} = ${nP}`,
            `Growth factor (1 + i)^n = ${q(g)}, and the deposit factor = ${q(s)}`,
            `Final amount = ${m(pv)} × ${q(g)} + ${m(pmt)} × ${q(s)} = ${m(value)}`,
          ],
          note,
        },
      },
    };
  }
  if (raw.solve === "pv") {
    const i = iOf(rate);
    const nP = Math.round(years * k);
    if (nP < 1)
      return { errors: { years: "Time must cover at least one period." } };
    const { g, s } = per(nP, i);
    const value = (fv - pmt * s) / g;
    if (value < 0)
      return {
        errors: {
          pmt: "The deposits alone already reach more than the final amount, so no starting amount is needed.",
        },
      };
    return {
      errors: {},
      result: {
        solve: "pv",
        value,
        workings: {
          formula: [
            "Start = (Final − Deposit × deposit factor) ÷ (1 + i)^n",
            ...formula.slice(1),
          ],
          steps: [
            `Rate per period i = ${q(rate)} ÷ ${k} ÷ 100 = ${q(i)}`,
            `Number of periods n = ${q(years)} × ${k} = ${nP}`,
            `Growth factor = ${q(g)} and deposit factor = ${q(s)}`,
            `Start = (${m(fv)} − ${m(pmt)} × ${q(s)}) ÷ ${q(g)} = ${m(value)}`,
          ],
          note,
        },
      },
    };
  }
  if (raw.solve === "pmt") {
    const i = iOf(rate);
    const nP = Math.round(years * k);
    if (nP < 1)
      return { errors: { years: "Time must cover at least one period." } };
    const { g, s } = per(nP, i);
    const value = (fv - pv * g) / s;
    if (value < 0)
      return {
        errors: {
          pv: "The starting amount alone already grows to more than the final amount, so no deposits are needed.",
        },
      };
    return {
      errors: {},
      result: {
        solve: "pmt",
        value,
        workings: {
          formula: [
            "Deposit = (Final − Start × (1 + i)^n) ÷ deposit factor",
            ...formula.slice(1),
          ],
          steps: [
            `Rate per period i = ${q(rate)} ÷ ${k} ÷ 100 = ${q(i)}`,
            `Number of periods n = ${q(years)} × ${k} = ${nP}`,
            `Growth factor = ${q(g)} and deposit factor = ${q(s)}`,
            `Deposit = (${m(fv)} − ${m(pv)} × ${q(g)}) ÷ ${q(s)} = ${m(value)} per period (${label})`,
          ],
          note,
        },
      },
    };
  }
  if (raw.solve === "years") {
    const i = iOf(rate);
    let nP: number | undefined;
    if (i === 0) nP = pmt > 0 ? (fv - pv) / pmt : undefined;
    else {
      const adj = pmt * (1 + i * t);
      const top = fv * i + adj;
      const bottom = pv * i + adj;
      nP =
        top > 0 && bottom > 0 && top > bottom
          ? Math.log(top / bottom) / Math.log(1 + i)
          : undefined;
    }
    if (nP === undefined || !(nP > 0))
      return {
        errors: {
          fv: "With these amounts and rate the final amount is never reached. Check that it is larger than the starting amount.",
        },
      };
    const yearsNeeded = nP / k;
    return {
      errors: {},
      result: {
        solve: "years",
        value: yearsNeeded,
        workings: {
          formula: [
            "n = ln((Final × i + D) ÷ (Start × i + D)) ÷ ln(1 + i), D = Deposit × (1 + i × t)",
            "i = rate per period, n = number of periods",
          ],
          steps: [
            `Rate per period i = ${q(rate)} ÷ ${k} ÷ 100 = ${q(i)}`,
            `n = ${q(nP)} periods`,
            `Time = ${q(nP)} ÷ ${k} = ${q(yearsNeeded)} years`,
          ],
          note,
        },
      },
    };
  }
  // rate: the per-period rate at which the start and deposits grow to the final amount, found by halving the range
  const nP = Math.round(years * k);
  if (nP < 1)
    return { errors: { years: "Time must cover at least one period." } };
  const putIn = pv + pmt * nP;
  if (fv < putIn - 1e-9)
    return {
      errors: {
        fv: `The final amount is less than the money put in (${m(putIn)}), so the rate would be negative.`,
      },
    };
  let lo = 0;
  let hi = 1;
  for (let step = 0; step < 200; step++) {
    const mid = (lo + hi) / 2;
    if (futureValue(pv, pmt, mid, nP, t === 1) > fv) hi = mid;
    else lo = mid;
  }
  const i = (lo + hi) / 2;
  const yearly = i * k * 100;
  if (pv === 0 && pmt === 0)
    return { errors: { pv: "Enter a starting amount or a regular deposit." } };
  return {
    errors: {},
    result: {
      solve: "rate",
      value: yearly,
      workings: {
        formula: [
          "There is no direct formula for the rate, so it is found by trying rates and narrowing in on the one that gives the final amount",
          ...formula,
        ],
        steps: [
          `Number of periods n = ${q(years)} × ${k} = ${nP}`,
          `Money put in = ${m(pv)} + ${m(pmt)} × ${nP} = ${m(putIn)}`,
          `Rate per period found by halving the range each time: i = ${q(i)}`,
          `Yearly rate = ${q(i)} × ${k} × 100 = ${q(yearly)}%`,
          `Check: ${m(pv)} and ${nP} deposits of ${m(pmt)} at ${q(yearly)}% grow to ${m(futureValue(pv, pmt, i, nP, t === 1))}, which matches ${m(fv)}`,
        ],
        note,
      },
    },
  };
}

// Interest calculator: simple and compound interest side by side

export interface InterestRaw extends Record<string, string> {
  principal: string;
  rate: string;
  time: string;
  unit: TimeUnit;
  compounding: CompoundingPerYear;
}
export interface InterestResult {
  years: number;
  simpleInterest: number;
  simpleTotal: number;
  compoundInterest: number;
  compoundTotal: number;
  difference: number;
  workings: Workings;
}

export function evaluateInterest(
  raw: InterestRaw,
): Evaluation<InterestRaw, InterestResult> {
  const max = { years: 100, months: 1200, days: 36500 }[raw.unit];
  const { errors, values } = readAll(raw, {
    principal: ["Principal", { positive: true, max: MAX_AMOUNT }],
    rate: ["Interest rate", { max: 100 }],
    time: ["Time period", { positive: true, max }],
  });
  if (!values) return { errors };
  const simple = calculateSimple(
    values.principal,
    values.rate,
    values.time,
    raw.unit,
  );
  const k = Number(raw.compounding);
  const compoundTotal = compoundBalance(
    values.principal,
    values.rate,
    simple.years,
    k,
  );
  const compoundInterest = compoundTotal - values.principal;
  const factor = (1 + values.rate / 100 / k) ** (k * simple.years);
  const conversion =
    raw.unit === "years"
      ? ""
      : `${q(values.time)} ${raw.unit} ÷ ${raw.unit === "months" ? 12 : 365} = `;
  return {
    errors: {},
    result: {
      years: simple.years,
      simpleInterest: simple.interest,
      simpleTotal: simple.amount,
      compoundInterest,
      compoundTotal,
      difference: compoundInterest - simple.interest,
      workings: {
        formula: [
          "Simple interest = P × R × T ÷ 100",
          "Compound amount A = P × (1 + r ÷ k)^(k × T)",
          "Compound interest = A − P",
        ],
        steps: [
          `Time T = ${conversion}${q(simple.years)} years`,
          `Simple interest = ${m(values.principal)} × ${q(values.rate)} × ${q(simple.years)} ÷ 100 = ${m(simple.interest)}`,
          `Compound growth factor = (1 + ${q(values.rate / 100)} ÷ ${k})^(${k} × ${q(simple.years)}) = ${q(factor)} (${COMPOUNDING_CHOICES[raw.compounding].toLowerCase()})`,
          `Compound amount = ${m(values.principal)} × ${q(factor)} = ${m(compoundTotal)}, so the compound interest is ${m(compoundInterest)}`,
          `Compounding earns ${m(compoundInterest)} − ${m(simple.interest)} = ${m(compoundInterest - simple.interest)} more than simple interest`,
        ],
        note:
          raw.unit === "days"
            ? "Days are counted as 1/365 of a year."
            : undefined,
      },
    },
  };
}

export { TIME_UNITS, COMPOUNDING_CHOICES };
