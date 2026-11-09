/**
 * Loan maths for the loan, auto loan, mortgage, payment, amortization and interest rate calculators. Pure functions, no DOM.
 * All of them use the usual Indian convention: a fixed monthly instalment on a reducing balance, with interest charged each month at
 * annual rate ÷ 12 ÷ 100. Banks round and count days in their own ways, so a lender's own figure can differ by a small amount.
 */
import {
  MAX_AMOUNT,
  formatMoney as m,
  readAll,
  readNumber,
  type Evaluation,
} from "./finance";
import { formatQuantity as q } from "./units";
import type { Workings } from "./workings";

const n = (text: string): number => Number(text.replace(/[,\s]/g, ""));

export type TenureUnit = "years" | "months";

/** Monthly instalment on a reducing balance. A rate of 0 splits the principal evenly. */
export function monthlyPayment(
  principal: number,
  annualRatePercent: number,
  months: number,
): number {
  const i = annualRatePercent / 12 / 100;
  return i === 0
    ? principal / months
    : (principal * i * (1 + i) ** months) / ((1 + i) ** months - 1);
}

export interface ScheduleRow {
  month: number;
  interest: number;
  principal: number;
  payment: number;
  balance: number;
}
export interface Schedule {
  rows: ScheduleRow[];
  months: number;
  totalInterest: number;
  totalPaid: number;
  /** False when the payment is too small to ever clear the loan within the limit. */
  cleared: boolean;
}

const MAX_MONTHS = 1200;

/** Month by month: add the month's interest, take off the payment, repeat until the balance is zero. The last payment is smaller if it has to be. */
export function buildSchedule(
  principal: number,
  annualRatePercent: number,
  payment: number,
): Schedule {
  const i = annualRatePercent / 12 / 100;
  const rows: ScheduleRow[] = [];
  let balance = principal;
  let totalInterest = 0;
  let totalPaid = 0;
  for (let month = 1; month <= MAX_MONTHS && balance > 1e-6; month++) {
    const interest = balance * i;
    const pay = Math.min(payment, balance + interest);
    const paidOff = pay - interest;
    balance = Math.max(0, balance - paidOff);
    if (balance < 1e-6) balance = 0;
    totalInterest += interest;
    totalPaid += pay;
    rows.push({ month, interest, principal: paidOff, payment: pay, balance });
  }
  return {
    rows,
    months: rows.length,
    totalInterest,
    totalPaid,
    cleared: balance === 0,
  };
}

/** The loan a payment can carry: P = A × (1 − (1 + i)^−n) ÷ i. */
export function affordablePrincipal(
  payment: number,
  annualRatePercent: number,
  months: number,
): number {
  const i = annualRatePercent / 12 / 100;
  return i === 0 ? payment * months : (payment * (1 - (1 + i) ** -months)) / i;
}

/** Months a payment takes to clear a loan: n = −ln(1 − P × i ÷ A) ÷ ln(1 + i). Undefined when the payment does not even cover the interest. */
export function monthsToClear(
  principal: number,
  annualRatePercent: number,
  payment: number,
): number | undefined {
  const i = annualRatePercent / 12 / 100;
  if (i === 0) return principal / payment;
  const ratio = (principal * i) / payment;
  return ratio >= 1 ? undefined : -Math.log(1 - ratio) / Math.log(1 + i);
}

/** The yearly rate (in percent) at which `months` payments of `payment` repay `principal`, found by halving the range. Undefined when the payments add up to less than the loan. */
export function solveRate(
  principal: number,
  payment: number,
  months: number,
): number | undefined {
  if (payment * months < principal - 1e-9) return undefined;
  if (Math.abs(payment * months - principal) < 1e-9) return 0;
  let lo = 0;
  let hi = 1; // 100% a month is far beyond any real loan
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    const pay = monthlyPayment(principal, mid * 12 * 100, months);
    if (pay > payment) hi = mid;
    else lo = mid;
  }
  return ((lo + hi) / 2) * 12 * 100;
}

/** "5 years 3 months" for 63 months. */
export function formatMonths(months: number): string {
  const y = Math.floor(months / 12);
  const mo = months % 12;
  return (
    [
      y ? `${y} year${y === 1 ? "" : "s"}` : "",
      mo ? `${mo} month${mo === 1 ? "" : "s"}` : "",
    ]
      .filter(Boolean)
      .join(" ") || "0 months"
  );
}

/** The steps that turn a loan into a monthly instalment, shared by every tool that needs one. */
function emiSteps(
  principal: number,
  rate: number,
  months: number,
  tenure?: { value: string; unit: TenureUnit },
): string[] {
  const i = rate / 12 / 100;
  const steps = [
    `Monthly rate i = ${q(rate)} ÷ 12 ÷ 100 = ${q(i)}`,
    `Number of months n = ${tenure && tenure.unit === "years" ? `${q(n(tenure.value))} years × 12 = ` : ""}${months}`,
  ];
  if (i === 0)
    return [
      ...steps,
      `The rate is 0, so each instalment is the loan split evenly: ${m(principal)} ÷ ${months} = ${m(principal / months)}`,
    ];
  const growth = (1 + i) ** months;
  return [
    ...steps,
    `Growth over the loan: (1 + i)^n = (1 + ${q(i)})^${months} = ${q(growth)}`,
    `EMI = ${m(principal)} × ${q(i)} × ${q(growth)} ÷ (${q(growth)} − 1) = ${m(monthlyPayment(principal, rate, months))}`,
  ];
}
const EMI_FORMULA = [
  "EMI = P × i × (1 + i)^n ÷ ((1 + i)^n − 1)",
  "P = amount borrowed, i = monthly rate, n = number of months",
];
const NOTE =
  "A reducing-balance loan with equal monthly instalments. A lender's own figure can differ by a few rupees because of rounding and the date of the first instalment.";

function readMonths(
  raw: Record<string, string>,
  valueKey: string,
  unitKey: string,
  errors: Record<string, string>,
): number | undefined {
  const years = raw[unitKey] === "years";
  const state = readNumber(raw[valueKey] ?? "", "Tenure", {
    positive: true,
    max: years ? 40 : 480,
    ...(years ? {} : { integer: true }),
  });
  if ("error" in state) {
    errors[valueKey] = state.error;
    return undefined;
  }
  if ("empty" in state) return undefined;
  const months = Math.round(years ? state.value * 12 : state.value);
  if (months < 1) {
    errors[valueKey] = "Tenure must be at least 1 month.";
    return undefined;
  }
  return months;
}

// Loan calculator: an instalment, and what an extra payment each month saves

export interface LoanRaw extends Record<string, string> {
  principal: string;
  rate: string;
  tenure: string;
  tenureUnit: TenureUnit;
  extra: string;
}
export interface LoanResult {
  emi: number;
  months: number;
  totalInterest: number;
  totalPayment: number;
  extra?: {
    months: number;
    totalInterest: number;
    monthsSaved: number;
    interestSaved: number;
  };
  workings: Workings;
}

export function evaluateLoan(raw: LoanRaw): Evaluation<LoanRaw, LoanResult> {
  const { errors, values } = readAll(
    { principal: raw.principal, rate: raw.rate },
    {
      principal: ["Loan amount", { positive: true, max: MAX_AMOUNT }],
      rate: ["Interest rate", { max: 100 }],
    },
  );
  const all: Record<string, string> = { ...errors };
  const months = readMonths(raw, "tenure", "tenureUnit", all);
  const extraState = readNumber(raw.extra, "Extra payment", {
    max: MAX_AMOUNT,
  });
  if ("error" in extraState) all.extra = extraState.error;
  if (!values || months === undefined || "error" in extraState)
    return { errors: all };
  const emi = monthlyPayment(values.principal, values.rate, months);
  const totalPayment = emi * months;
  const totalInterest = totalPayment - values.principal;
  const extra =
    "value" in extraState && extraState.value > 0 ? extraState.value : 0;
  const steps = [
    ...emiSteps(values.principal, values.rate, months, {
      value: raw.tenure,
      unit: raw.tenureUnit,
    }),
    `Total payment = ${m(emi)} × ${months} = ${m(totalPayment)}`,
    `Total interest = ${m(totalPayment)} − ${m(values.principal)} = ${m(totalInterest)}`,
  ];
  let withExtra: LoanResult["extra"];
  if (extra > 0) {
    const s = buildSchedule(values.principal, values.rate, emi + extra);
    withExtra = {
      months: s.months,
      totalInterest: s.totalInterest,
      monthsSaved: months - s.months,
      interestSaved: totalInterest - s.totalInterest,
    };
    steps.push(
      `With ${m(extra)} extra each month, each month adds interest on the balance (balance × i) and then takes off ${m(emi)} + ${m(extra)} = ${m(emi + extra)}, until the balance reaches 0`,
      `That takes ${s.months} months (${formatMonths(s.months)}) instead of ${months}, so ${formatMonths(months - s.months)} sooner`,
      `Interest with the extra payment = ${m(s.totalInterest)}, which saves ${m(totalInterest - s.totalInterest)}`,
    );
  }
  return {
    errors: {},
    result: {
      emi,
      months,
      totalInterest,
      totalPayment,
      ...(withExtra ? { extra: withExtra } : {}),
      workings: { formula: EMI_FORMULA, steps, note: NOTE },
    },
  };
}

// Auto loan: the price of a vehicle, a down payment and the cost of borrowing the rest

export interface AutoRaw extends Record<string, string> {
  price: string;
  down: string;
  rate: string;
  tenure: string;
  tenureUnit: TenureUnit;
  fee: string;
}
export interface AutoResult {
  loan: number;
  emi: number;
  months: number;
  totalInterest: number;
  feeAmount: number;
  totalCost: number;
  workings: Workings;
}

export function evaluateAuto(raw: AutoRaw): Evaluation<AutoRaw, AutoResult> {
  const { errors, values } = readAll(
    { price: raw.price, rate: raw.rate },
    {
      price: ["Vehicle price", { positive: true, max: MAX_AMOUNT }],
      rate: ["Interest rate", { max: 100 }],
    },
  );
  const all: Record<string, string> = { ...errors };
  const down = readNumber(raw.down, "Down payment", { max: MAX_AMOUNT });
  if ("error" in down) all.down = down.error;
  const fee = readNumber(raw.fee, "Processing fee", { max: 10 });
  if ("error" in fee) all.fee = fee.error;
  const months = readMonths(raw, "tenure", "tenureUnit", all);
  if (!values || months === undefined || "error" in down || "error" in fee)
    return { errors: all };
  const downValue = "value" in down ? down.value : 0;
  if (downValue >= values.price)
    return {
      errors: { down: "The down payment must be less than the vehicle price." },
    };
  const loan = values.price - downValue;
  const emi = monthlyPayment(loan, values.rate, months);
  const totalPayment = emi * months;
  const totalInterest = totalPayment - loan;
  const feePercent = "value" in fee ? fee.value : 0;
  const feeAmount = (loan * feePercent) / 100;
  const totalCost = downValue + totalPayment + feeAmount;
  const steps = [
    `Loan amount = ${m(values.price)} − ${m(downValue)} = ${m(loan)}`,
    ...emiSteps(loan, values.rate, months, {
      value: raw.tenure,
      unit: raw.tenureUnit,
    }),
    `Total of the instalments = ${m(emi)} × ${months} = ${m(totalPayment)}`,
    `Total interest = ${m(totalPayment)} − ${m(loan)} = ${m(totalInterest)}`,
  ];
  if (feePercent > 0)
    steps.push(
      `Processing fee = ${m(loan)} × ${q(feePercent)} ÷ 100 = ${m(feeAmount)}`,
    );
  steps.push(
    `Total cost of the vehicle = down payment + instalments + fee = ${m(downValue)} + ${m(totalPayment)} + ${m(feeAmount)} = ${m(totalCost)}`,
  );
  return {
    errors: {},
    result: {
      loan,
      emi,
      months,
      totalInterest,
      feeAmount,
      totalCost,
      workings: {
        formula: [
          "Loan = Price − Down payment",
          ...EMI_FORMULA,
          "Total cost = Down payment + (EMI × n) + Processing fee",
        ],
        steps,
        note: `${NOTE} Insurance, registration and other charges are not included unless they are part of the price you enter.`,
      },
    },
  };
}

// Mortgage (home loan)

export interface MortgageRaw extends Record<string, string> {
  price: string;
  downPercent: string;
  rate: string;
  tenure: string;
  tenureUnit: TenureUnit;
}
export interface MortgageResult {
  downPayment: number;
  loan: number;
  loanToValue: number;
  emi: number;
  months: number;
  totalInterest: number;
  totalPayment: number;
  totalCost: number;
  workings: Workings;
}

export function evaluateMortgage(
  raw: MortgageRaw,
): Evaluation<MortgageRaw, MortgageResult> {
  const { errors, values } = readAll(
    { price: raw.price, downPercent: raw.downPercent, rate: raw.rate },
    {
      price: ["Home price", { positive: true, max: MAX_AMOUNT }],
      downPercent: ["Down payment", { max: 99 }],
      rate: ["Interest rate", { max: 100 }],
    },
  );
  const all: Record<string, string> = { ...errors };
  const months = readMonths(raw, "tenure", "tenureUnit", all);
  if (!values || months === undefined) return { errors: all };
  const downPayment = (values.price * values.downPercent) / 100;
  const loan = values.price - downPayment;
  const emi = monthlyPayment(loan, values.rate, months);
  const totalPayment = emi * months;
  const totalInterest = totalPayment - loan;
  const totalCost = downPayment + totalPayment;
  const ltv = (loan / values.price) * 100;
  return {
    errors: {},
    result: {
      downPayment,
      loan,
      loanToValue: ltv,
      emi,
      months,
      totalInterest,
      totalPayment,
      totalCost,
      workings: {
        formula: [
          "Down payment = Home price × Down payment % ÷ 100",
          "Loan = Home price − Down payment",
          ...EMI_FORMULA,
        ],
        steps: [
          `Down payment = ${m(values.price)} × ${q(values.downPercent)} ÷ 100 = ${m(downPayment)}`,
          `Loan = ${m(values.price)} − ${m(downPayment)} = ${m(loan)}`,
          `Loan-to-value = ${m(loan)} ÷ ${m(values.price)} × 100 = ${q(ltv)}%`,
          ...emiSteps(loan, values.rate, months, {
            value: raw.tenure,
            unit: raw.tenureUnit,
          }),
          `Total of the instalments = ${m(emi)} × ${months} = ${m(totalPayment)}`,
          `Total interest = ${m(totalPayment)} − ${m(loan)} = ${m(totalInterest)}`,
          `Total paid over the loan, with the down payment = ${m(downPayment)} + ${m(totalPayment)} = ${m(totalCost)}`,
        ],
        note: `${NOTE} Stamp duty, registration, insurance, maintenance and processing fees are not included.`,
      },
    },
  };
}

// Payment calculator: find the payment, the loan a payment can carry, or how long a payment takes

export type PaymentMode = "payment" | "amount" | "term";
export const PAYMENT_MODES: Record<PaymentMode, string> = {
  payment: "Monthly payment",
  amount: "Loan amount I can afford",
  term: "Time to pay off",
};

export interface PaymentRaw extends Record<string, string> {
  mode: PaymentMode;
  principal: string;
  payment: string;
  rate: string;
  tenure: string;
  tenureUnit: TenureUnit;
}
export interface PaymentResult {
  mode: PaymentMode;
  payment: number;
  principal: number;
  months: number;
  totalInterest: number;
  totalPayment: number;
  workings: Workings;
}

export function evaluatePayment(
  raw: PaymentRaw,
): Evaluation<PaymentRaw, PaymentResult> {
  const all: Record<string, string> = {};
  let ready = true;
  const field = (
    key: "principal" | "payment" | "rate",
    label: string,
    rules: Parameters<typeof readNumber>[2],
  ) => {
    const state = readNumber(raw[key], label, rules);
    if ("error" in state) {
      all[key] = state.error;
      ready = false;
      return 0;
    }
    if ("empty" in state) {
      ready = false;
      return 0;
    }
    return state.value;
  };
  const rate = field("rate", "Interest rate", { max: 100 });
  const principal =
    raw.mode === "amount"
      ? 0
      : field("principal", "Loan amount", { positive: true, max: MAX_AMOUNT });
  const payment =
    raw.mode === "payment"
      ? 0
      : field("payment", "Monthly payment", {
          positive: true,
          max: MAX_AMOUNT,
        });
  const months =
    raw.mode === "term" ? 0 : readMonths(raw, "tenure", "tenureUnit", all);
  if (raw.mode !== "term" && months === undefined) ready = false;
  if (!ready) return { errors: all };
  const i = rate / 12 / 100;

  if (raw.mode === "payment") {
    const emi = monthlyPayment(principal, rate, months!);
    const total = emi * months!;
    return {
      errors: {},
      result: {
        mode: "payment",
        payment: emi,
        principal,
        months: months!,
        totalInterest: total - principal,
        totalPayment: total,
        workings: {
          formula: EMI_FORMULA,
          steps: [
            ...emiSteps(principal, rate, months!, {
              value: raw.tenure,
              unit: raw.tenureUnit,
            }),
            `Total payment = ${m(emi)} × ${months} = ${m(total)}`,
            `Total interest = ${m(total)} − ${m(principal)} = ${m(total - principal)}`,
          ],
          note: NOTE,
        },
      },
    };
  }
  if (raw.mode === "amount") {
    const loan = affordablePrincipal(payment, rate, months!);
    const total = payment * months!;
    const steps = [
      `Monthly rate i = ${q(rate)} ÷ 12 ÷ 100 = ${q(i)}`,
      `Number of months n = ${raw.tenureUnit === "years" ? `${q(n(raw.tenure))} years × 12 = ` : ""}${months}`,
    ];
    steps.push(
      i === 0
        ? `The rate is 0, so the loan is ${m(payment)} × ${months} = ${m(loan)}`
        : `Loan = ${m(payment)} × (1 − (1 + ${q(i)})^−${months}) ÷ ${q(i)} = ${m(loan)}`,
    );
    steps.push(
      `Total payments = ${m(payment)} × ${months} = ${m(total)}, so the interest is ${m(total)} − ${m(loan)} = ${m(total - loan)}`,
    );
    return {
      errors: {},
      result: {
        mode: "amount",
        payment,
        principal: loan,
        months: months!,
        totalInterest: total - loan,
        totalPayment: total,
        workings: {
          formula: [
            "Loan = Payment × (1 − (1 + i)^−n) ÷ i",
            "i = monthly rate, n = number of months",
          ],
          steps,
          note: NOTE,
        },
      },
    };
  }
  const needed = monthsToClear(principal, rate, payment);
  if (needed === undefined)
    return {
      errors: {
        payment: `The payment must be more than the interest charged in the first month (${m(principal * i)}), or the loan never gets smaller.`,
      },
    };
  const wholeMonths = Math.ceil(needed - 1e-9);
  const s = buildSchedule(principal, rate, payment);
  const steps = [`Monthly rate i = ${q(rate)} ÷ 12 ÷ 100 = ${q(i)}`];
  steps.push(
    i === 0
      ? `The rate is 0, so n = ${m(principal)} ÷ ${m(payment)} = ${q(needed)} months`
      : `n = −ln(1 − ${m(principal)} × ${q(i)} ÷ ${m(payment)}) ÷ ln(1 + ${q(i)}) = ${q(needed)} months`,
  );
  steps.push(
    `Rounded up to whole months: ${wholeMonths} months (${formatMonths(wholeMonths)}); the last payment is smaller`,
    `Total paid = ${m(s.totalPaid)}, so the interest is ${m(s.totalPaid)} − ${m(principal)} = ${m(s.totalInterest)}`,
  );
  return {
    errors: {},
    result: {
      mode: "term",
      payment,
      principal,
      months: s.months,
      totalInterest: s.totalInterest,
      totalPayment: s.totalPaid,
      workings: {
        formula: [
          "n = −ln(1 − P × i ÷ A) ÷ ln(1 + i)",
          "P = loan, A = monthly payment, i = monthly rate, n = months",
        ],
        steps,
        note: NOTE,
      },
    },
  };
}

// Amortization schedule

export interface AmortRaw extends Record<string, string> {
  principal: string;
  rate: string;
  tenure: string;
  tenureUnit: TenureUnit;
  extra: string;
}
export interface YearRow {
  year: number;
  principal: number;
  interest: number;
  balance: number;
}
export interface AmortResult {
  emi: number;
  schedule: Schedule;
  years: YearRow[];
  workings: Workings;
}

export function evaluateAmort(
  raw: AmortRaw,
): Evaluation<AmortRaw, AmortResult> {
  const { errors, values } = readAll(
    { principal: raw.principal, rate: raw.rate },
    {
      principal: ["Loan amount", { positive: true, max: MAX_AMOUNT }],
      rate: ["Interest rate", { max: 100 }],
    },
  );
  const all: Record<string, string> = { ...errors };
  const months = readMonths(raw, "tenure", "tenureUnit", all);
  const extraState = readNumber(raw.extra, "Extra payment", {
    max: MAX_AMOUNT,
  });
  if ("error" in extraState) all.extra = extraState.error;
  if (!values || months === undefined || "error" in extraState)
    return { errors: all };
  const emi = monthlyPayment(values.principal, values.rate, months);
  const extra = "value" in extraState ? extraState.value : 0;
  const schedule = buildSchedule(values.principal, values.rate, emi + extra);
  const years: YearRow[] = [];
  for (const row of schedule.rows) {
    const year = Math.ceil(row.month / 12);
    let y = years[year - 1];
    if (!y) {
      y = { year, principal: 0, interest: 0, balance: 0 };
      years[year - 1] = y;
    }
    y.principal += row.principal;
    y.interest += row.interest;
    y.balance = row.balance;
  }
  const i = values.rate / 12 / 100;
  const first = schedule.rows[0]!;
  return {
    errors: {},
    result: {
      emi,
      schedule,
      years,
      workings: {
        formula: [
          "Interest for a month = Balance × i",
          "Principal repaid = Payment − Interest",
          "New balance = Balance − Principal repaid",
        ],
        steps: [
          ...emiSteps(values.principal, values.rate, months, {
            value: raw.tenure,
            unit: raw.tenureUnit,
          }),
          `Month 1 interest = ${m(values.principal)} × ${q(i)} = ${m(first.interest)}`,
          `Month 1 principal repaid = ${m(first.payment)} − ${m(first.interest)} = ${m(first.principal)}`,
          `Month 1 closing balance = ${m(values.principal)} − ${m(first.principal)} = ${m(first.balance)}`,
          `The same three steps repeat each month with the new balance, so the interest part shrinks and the principal part grows, until the balance is 0 after ${schedule.months} months`,
          `Total interest = ${m(schedule.totalInterest)}, total paid = ${m(schedule.totalPaid)}`,
        ],
        note: NOTE,
      },
    },
  };
}

// Interest rate: the rate hidden in an instalment

export interface RateRaw extends Record<string, string> {
  principal: string;
  payment: string;
  tenure: string;
  tenureUnit: TenureUnit;
}
export interface RateResult {
  rate: number;
  months: number;
  totalInterest: number;
  totalPayment: number;
  workings: Workings;
}

export function evaluateRate(raw: RateRaw): Evaluation<RateRaw, RateResult> {
  const { errors, values } = readAll(
    { principal: raw.principal, payment: raw.payment },
    {
      principal: ["Loan amount", { positive: true, max: MAX_AMOUNT }],
      payment: ["Monthly payment", { positive: true, max: MAX_AMOUNT }],
    },
  );
  const all: Record<string, string> = { ...errors };
  const months = readMonths(raw, "tenure", "tenureUnit", all);
  if (!values || months === undefined) return { errors: all };
  const rate = solveRate(values.principal, values.payment, months);
  if (rate === undefined)
    return {
      errors: {
        payment: `${m(values.payment)} × ${months} months is ${m(values.payment * months)}, which is less than the loan. The payments must add up to at least the loan.`,
      },
    };
  if (rate > 1000)
    return {
      errors: {
        payment:
          "That payment is so large for this loan that the rate is not realistic. Check the numbers.",
      },
    };
  const check = monthlyPayment(values.principal, rate, months);
  const total = values.payment * months;
  return {
    errors: {},
    result: {
      rate,
      months,
      totalInterest: total - values.principal,
      totalPayment: total,
      workings: {
        formula: [
          "EMI = P × i × (1 + i)^n ÷ ((1 + i)^n − 1)",
          "There is no direct formula for i, so it is found by trying rates and narrowing in on the one that gives your EMI",
        ],
        steps: [
          `Number of months n = ${raw.tenureUnit === "years" ? `${q(n(raw.tenure))} years × 12 = ` : ""}${months}`,
          `Total of the payments = ${m(values.payment)} × ${months} = ${m(total)}, so the interest paid is ${m(total)} − ${m(values.principal)} = ${m(total - values.principal)}`,
          `Trying rates between 0% and a very high rate and halving the range each time gives i = ${q(rate / 12 / 100)} a month`,
          `Yearly rate = ${q(rate / 12 / 100)} × 12 × 100 = ${q(rate)}% a year`,
          `Check: a loan of ${m(values.principal)} at ${q(rate)}% for ${months} months has an EMI of ${m(check)}, which matches ${m(values.payment)}`,
        ],
        note: "The rate is the nominal yearly rate with monthly charging, the way Indian lenders quote it. Fees and charges that the lender adds to the loan are not part of this rate.",
      },
    },
  };
}
