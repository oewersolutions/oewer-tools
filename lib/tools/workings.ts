/**
 * The equation and the step-by-step working shown under each calculator's result. Every function takes the same raw input as the
 * calculator, runs the calculator's own `evaluate` function and writes out the steps with the visitor's numbers, so the working can never
 * disagree with the answer. They return undefined until the inputs are valid.
 */
import {
  addMonths,
  calculateDays,
  dayNumber,
  evaluateAge,
  evaluateDays,
  formatLong,
  parseDate,
  weekdayOf,
  type AgeRaw,
  type DaysRaw,
} from "./dates";
import {
  calculateDiscount,
  evaluateDiscount,
  evaluateRd,
  type DiscountRaw,
  type RdRaw,
} from "./deposits";
import {
  COMPOUNDING_LABELS,
  evaluateEmi,
  evaluateFd,
  evaluateGst,
  evaluatePercentage,
  formatMoney as m,
  type EmiRaw,
  type FdRaw,
  type GstRaw,
  type PercentageRaw,
} from "./finance";
import {
  evaluateLumpsum,
  evaluateSip,
  type LumpsumRaw,
  type SipRaw,
} from "./growth";
import {
  COMPOUNDING_CHOICES,
  evaluateCompound,
  evaluateSimple,
  type CompoundRaw,
  type SimpleRaw,
} from "./interest";
import {
  convert,
  evaluateConverter,
  findUnit,
  formatQuantity as q,
  type ConverterRaw,
  type UnitCategory,
} from "./units";

export interface Workings {
  formula: string[];
  steps: string[];
  note?: string;
}

/** A number the visitor typed, already checked by the calculator's own validation. */
const n = (text: string): number => Number(text.replace(/[,\s]/g, ""));
const pct = (value: number): string => `${q(value)}%`;

export function emiWorkings(raw: EmiRaw): Workings | undefined {
  const { result } = evaluateEmi(raw);
  if (!result) return undefined;
  const { principal, months, emi, totalPayment, totalInterest } = result;
  const rate = n(raw.rate);
  const i = rate / 12 / 100;
  const steps = [
    `Monthly rate i = ${q(rate)} ÷ 12 ÷ 100 = ${q(i)}`,
    `Number of months n = ${raw.tenureUnit === "years" ? `${q(n(raw.tenure))} years × 12 = ` : ""}${months}`,
  ];
  if (i === 0)
    steps.push(
      `The rate is 0, so each instalment is just the loan split evenly: EMI = ${m(principal)} ÷ ${months} = ${m(emi)}`,
    );
  else {
    const growth = (1 + i) ** months;
    steps.push(
      `Growth over the loan: (1 + i)^n = (1 + ${q(i)})^${months} = ${q(growth)}`,
      `EMI = ${m(principal)} × ${q(i)} × ${q(growth)} ÷ (${q(growth)} − 1) = ${m(emi)}`,
    );
  }
  steps.push(
    `Total payment = ${m(emi)} × ${months} = ${m(totalPayment)}`,
    `Total interest = ${m(totalPayment)} − ${m(principal)} = ${m(totalInterest)}`,
  );
  return {
    formula: [
      "EMI = P × i × (1 + i)^n ÷ ((1 + i)^n − 1)",
      "P = loan amount, i = monthly rate, n = number of months",
    ],
    steps,
    note: "A reducing-balance loan with equal monthly instalments. A bank's own figure can differ by a few rupees because of rounding and the date of the first instalment.",
  };
}

export function fdWorkings(raw: FdRaw): Workings | undefined {
  const { result } = evaluateFd(raw);
  if (!result) return undefined;
  const years = raw.tenureUnit === "years" ? n(raw.tenure) : n(raw.tenure) / 12;
  const rate = n(raw.rate);
  const r = rate / 100;
  const times = Number(raw.compounding);
  const time = `Time t = ${raw.tenureUnit === "years" ? "" : `${q(n(raw.tenure))} months ÷ 12 = `}${q(years)} years`;
  const tail = [
    `Interest earned = ${m(result.maturityAmount)} − ${m(result.principal)} = ${m(result.interestEarned)}`,
  ];
  if (times === 0) {
    return {
      formula: [
        "A = P × (1 + r × t)",
        "P = deposit, r = yearly rate as a fraction, t = years",
      ],
      steps: [
        `Rate r = ${q(rate)} ÷ 100 = ${q(r)}`,
        time,
        `A = ${m(result.principal)} × (1 + ${q(r)} × ${q(years)}) = ${m(result.maturityAmount)}`,
        ...tail,
      ],
      note: "Simple interest paid at maturity, so there is no compounding.",
    };
  }
  return {
    formula: [
      "A = P × (1 + r ÷ k)^(k × t)",
      "P = deposit, r = yearly rate as a fraction, k = times interest is added each year, t = years",
    ],
    steps: [
      `Rate r = ${q(rate)} ÷ 100 = ${q(r)}`,
      `Interest is added k = ${times} times a year (${COMPOUNDING_LABELS[raw.compounding].toLowerCase()})`,
      time,
      `Growth factor = (1 + ${q(r)} ÷ ${times})^(${times} × ${q(years)}) = ${q((1 + r / times) ** (times * years))}`,
      `A = ${m(result.principal)} × ${q((1 + r / times) ** (times * years))} = ${m(result.maturityAmount)}`,
      ...tail,
    ],
    note: "Banks may round each period's interest, so their maturity figure can differ by a little.",
  };
}

export function gstWorkings(raw: GstRaw): Workings | undefined {
  const { result } = evaluateGst(raw);
  if (!result) return undefined;
  const amount = n(raw.amount);
  const rate = n(raw.rate);
  const half = `Within one state the GST splits equally: CGST = SGST = ${m(result.gstAmount)} ÷ 2 = ${m(result.halfGst)}`;
  if (raw.mode === "add") {
    return {
      formula: ["GST = Amount × Rate ÷ 100", "Total = Amount + GST"],
      steps: [
        `GST = ${m(amount)} × ${q(rate)} ÷ 100 = ${m(result.gstAmount)}`,
        `Total = ${m(amount)} + ${m(result.gstAmount)} = ${m(result.grossAmount)}`,
        half,
      ],
    };
  }
  return {
    formula: [
      "Amount without GST = Amount with GST × 100 ÷ (100 + Rate)",
      "GST = Amount with GST − Amount without GST",
    ],
    steps: [
      `Amount without GST = ${m(amount)} × 100 ÷ (100 + ${q(rate)}) = ${m(result.netAmount)}`,
      `GST = ${m(amount)} − ${m(result.netAmount)} = ${m(result.gstAmount)}`,
      half,
    ],
  };
}

export function percentageWorkings(raw: PercentageRaw): Workings | undefined {
  const { result } = evaluatePercentage(raw);
  if (!result) return undefined;
  const a = n(raw.a);
  const b = n(raw.b);
  const v = q(result.value);
  switch (raw.mode) {
    case "of":
      return {
        formula: ["Result = Y × X ÷ 100"],
        steps: [`Result = ${q(b)} × ${q(a)} ÷ 100 = ${v}`],
      };
    case "what-percent":
      return {
        formula: ["Percentage = X ÷ Y × 100"],
        steps: [`Percentage = ${q(a)} ÷ ${q(b)} × 100 = ${v}%`],
      };
    case "change":
      return {
        formula: ["% change = (New − Old) ÷ |Old| × 100"],
        steps: [
          `Difference = ${q(b)} − ${q(a)} = ${q(b - a)}`,
          `% change = ${q(b - a)} ÷ ${q(Math.abs(a))} × 100 = ${v}%`,
        ],
        note: "A positive answer is an increase and a negative answer is a decrease.",
      };
    case "increase":
      return {
        formula: ["New value = X × (1 + Y ÷ 100)"],
        steps: [
          `Multiplier = 1 + ${q(b)} ÷ 100 = ${q(1 + b / 100)}`,
          `New value = ${q(a)} × ${q(1 + b / 100)} = ${v}`,
        ],
      };
    case "decrease":
      return {
        formula: ["New value = X × (1 − Y ÷ 100)"],
        steps: [
          `Multiplier = 1 − ${q(b)} ÷ 100 = ${q(1 - b / 100)}`,
          `New value = ${q(a)} × ${q(1 - b / 100)} = ${v}`,
        ],
      };
  }
}

export function sipWorkings(raw: SipRaw): Workings | undefined {
  const { result } = evaluateSip(raw);
  if (!result) return undefined;
  const rate = n(raw.rate);
  const months = Math.round(result.years * 12);
  const i = rate / 12 / 100;
  const steps = [
    `Monthly rate i = ${q(rate)} ÷ 12 ÷ 100 = ${q(i)}`,
    `Number of months n = ${q(result.years)} years × 12 = ${months}`,
  ];
  if (i === 0)
    steps.push(
      `The return is 0%, so the value is just the money put in: ${m(result.monthly)} × ${months} = ${m(result.maturity)}`,
    );
  else {
    const growth = (1 + i) ** months;
    steps.push(
      `Growth over the period: (1 + i)^n = (1 + ${q(i)})^${months} = ${q(growth)}`,
      `Future value = ${m(result.monthly)} × (${q(growth)} − 1) ÷ ${q(i)} × (1 + ${q(i)}) = ${m(result.maturity)}`,
    );
  }
  steps.push(
    `Amount invested = ${m(result.monthly)} × ${months} = ${m(result.invested)}`,
    `Estimated returns = ${m(result.maturity)} − ${m(result.invested)} = ${m(result.returns)}`,
  );
  return {
    formula: [
      "Future value = P × ((1 + i)^n − 1) ÷ i × (1 + i)",
      "P = monthly amount, i = annual return ÷ 12 ÷ 100, n = number of months",
    ],
    steps,
    note: "Instalments are counted at the start of each month and the same return is assumed every year. Real investments go up and down, so this is an estimate.",
  };
}

export function lumpsumWorkings(raw: LumpsumRaw): Workings | undefined {
  const { result } = evaluateLumpsum(raw);
  if (!result) return undefined;
  const amount = n(raw.amount);
  const r = result.yearlyGrowthPercent / 100;
  return {
    formula: [
      "Future value = P × (1 + r)^t",
      "P = amount invested, r = yearly return as a fraction, t = years",
    ],
    steps: [
      `Rate r = ${q(result.yearlyGrowthPercent)} ÷ 100 = ${q(r)}`,
      `Growth factor = (1 + ${q(r)})^${q(result.years)} = ${q((1 + r) ** result.years)}`,
      `Future value = ${m(amount)} × ${q((1 + r) ** result.years)} = ${m(result.maturity)}`,
      `Estimated returns = ${m(result.maturity)} − ${m(amount)} = ${m(result.returns)}`,
    ],
    note: "The same return is assumed every year. Real investments go up and down, so this is an estimate.",
  };
}

export function compoundWorkings(raw: CompoundRaw): Workings | undefined {
  const { result } = evaluateCompound(raw);
  if (!result) return undefined;
  const rate = n(raw.rate);
  const years = n(raw.years);
  const times = Number(raw.compounding);
  const r = rate / 100;
  const factor = (1 + r / times) ** (times * years);
  return {
    formula: [
      "A = P × (1 + r ÷ k)^(k × t)",
      "Interest = A − P",
      "P = principal, r = yearly rate as a fraction, k = times interest is added each year, t = years",
    ],
    steps: [
      `Rate r = ${q(rate)} ÷ 100 = ${q(r)}`,
      `Interest is added k = ${times} times a year (${COMPOUNDING_CHOICES[raw.compounding].toLowerCase()})`,
      `Growth factor = (1 + ${q(r)} ÷ ${times})^(${times} × ${q(years)}) = ${q(factor)}`,
      `A = ${m(result.principal)} × ${q(factor)} = ${m(result.amount)}`,
      `Interest = ${m(result.amount)} − ${m(result.principal)} = ${m(result.interest)}`,
    ],
  };
}

export function simpleWorkings(raw: SimpleRaw): Workings | undefined {
  const { result } = evaluateSimple(raw);
  if (!result) return undefined;
  const rate = n(raw.rate);
  const time = n(raw.time);
  const conversion =
    raw.unit === "years"
      ? ""
      : `${q(time)} ${raw.unit} ÷ ${raw.unit === "months" ? 12 : 365} = `;
  return {
    formula: [
      "Interest = P × R × T ÷ 100",
      "Total = P + Interest",
      "P = principal, R = yearly rate in percent, T = time in years",
    ],
    steps: [
      `Time T = ${conversion}${q(result.years)} years`,
      `Interest = ${m(result.principal)} × ${q(rate)} × ${q(result.years)} ÷ 100 = ${m(result.interest)}`,
      `Total = ${m(result.principal)} + ${m(result.interest)} = ${m(result.amount)}`,
    ],
    note:
      raw.unit === "days" ? "Days are counted as 1/365 of a year." : undefined,
  };
}

export function rdWorkings(raw: RdRaw): Workings | undefined {
  const { result } = evaluateRd(raw);
  if (!result) return undefined;
  const monthly = n(raw.monthly);
  const rate = n(raw.rate);
  const i = rate / 400;
  const steps = [
    `Quarterly rate i = ${q(rate)} ÷ 400 = ${q(i)}`,
    `Number of quarters N = ${result.months} months ÷ 3 = ${q(result.months / 3)}`,
  ];
  if (i === 0)
    steps.push(
      `The rate is 0, so the maturity value is the sum deposited: ${m(monthly)} × ${result.months} = ${m(result.maturity)}`,
    );
  else {
    const top = (1 + i) ** (result.months / 3) - 1;
    const bottom = 1 - (1 + i) ** (-1 / 3);
    steps.push(
      `Numerator: (1 + i)^N − 1 = (1 + ${q(i)})^${q(result.months / 3)} − 1 = ${q(top)}`,
      `Denominator: 1 − (1 + i)^(−1/3) = ${q(bottom)}`,
      `Maturity value = ${m(monthly)} × ${q(top)} ÷ ${q(bottom)} = ${m(result.maturity)}`,
    );
  }
  steps.push(
    `Total deposited = ${m(monthly)} × ${result.months} = ${m(result.deposited)}`,
    `Interest = ${m(result.maturity)} − ${m(result.deposited)} = ${m(result.interest)}`,
  );
  return {
    formula: [
      "Maturity = R × ((1 + i)^N − 1) ÷ (1 − (1 + i)^(−1/3))",
      "R = monthly deposit, i = annual rate ÷ 400, N = months ÷ 3",
    ],
    steps,
    note: "Uses the usual Indian bank convention of interest compounded every quarter. A bank's own figure can differ by a small amount.",
  };
}

export function discountWorkings(raw: DiscountRaw): Workings | undefined {
  const { result } = evaluateDiscount(raw);
  if (!result) return undefined;
  const first = n(raw.first);
  const second = raw.second.trim() === "" ? 0 : n(raw.second);
  const steps = [
    `After the first discount: ${m(result.original)} × (1 − ${q(first)} ÷ 100) = ${m(result.original * (1 - first / 100))}`,
  ];
  if (second > 0)
    steps.push(
      `After the second discount: ${m(result.afterFirst ?? 0)} × (1 − ${q(second)} ÷ 100) = ${m(result.finalPrice)}`,
    );
  steps.push(
    `Amount saved = ${m(result.original)} − ${m(result.finalPrice)} = ${m(result.saved)}`,
    `Effective discount = ${m(result.saved)} ÷ ${m(result.original)} × 100 = ${pct(result.effectivePercent)}`,
  );
  return {
    formula: [
      second > 0
        ? "Final price = Price × (1 − first ÷ 100) × (1 − second ÷ 100)"
        : "Final price = Price × (1 − discount ÷ 100)",
    ],
    steps,
    note:
      second > 0
        ? `Two discounts do not simply add up: ${q(first)}% then ${q(second)}% is ${pct(calculateDiscount(result.original, first, second).effectivePercent)} in total, not ${pct(first + second)}.`
        : undefined,
  };
}

export function ageWorkings(raw: AgeRaw): Workings | undefined {
  const { result } = evaluateAge(raw);
  const born = parseDate(raw.born);
  const asOf = parseDate(raw.asOf);
  if (!result || !born || !asOf) return undefined;
  const { span } = result;
  const afterYears = addMonths(born, span.years * 12);
  const afterMonths = addMonths(born, result.totalMonths);
  return {
    formula: [
      "Age = Age-on date − Date of birth",
      "Counted as whole years first, then whole months, then the days left",
    ],
    steps: [
      `Date of birth: ${formatLong(born)} (a ${weekdayOf(born)}). Age on: ${formatLong(asOf)}`,
      `Whole years: ${span.years}, because ${formatLong(born)} + ${span.years} year${span.years === 1 ? "" : "s"} = ${formatLong(afterYears)}`,
      `Whole months after that: ${span.months}, which reaches ${formatLong(afterMonths)}`,
      `Days left to ${formatLong(asOf)}: ${span.days}`,
      `Total days = day number of ${formatLong(asOf)} − day number of ${formatLong(born)} = ${q(dayNumber(asOf))} − ${q(dayNumber(born))} = ${q(result.totalDays)}`,
      `Next birthday: ${formatLong(result.nextBirthday)}, in ${q(result.daysToBirthday)} day${result.daysToBirthday === 1 ? "" : "s"}`,
    ],
    note: "If you were born on 29 February, the birthday is counted as 28 February in years that are not leap years.",
  };
}

export function daysWorkings(
  raw: DaysRaw,
  includeEnd: boolean,
): Workings | undefined {
  const { result } = evaluateDays(raw, includeEnd);
  if (!result) return undefined;
  const { from, to } = result;
  const plain = calculateDays(from, to, false).totalDays;
  const steps = [
    `Earlier date: ${formatLong(from)}. Later date: ${formatLong(to)}${result.swapped ? " (the dates were swapped so the earlier one comes first)" : ""}`,
    `Days between = ${q(dayNumber(to))} − ${q(dayNumber(from))} = ${q(plain)}`,
  ];
  if (includeEnd)
    steps.push(
      `The end date is counted too, so add 1: ${q(plain)} + 1 = ${q(result.totalDays)}`,
    );
  steps.push(
    `In weeks: ${q(result.totalDays)} ÷ 7 = ${result.weeks} week${result.weeks === 1 ? "" : "s"} and ${result.extraDays} day${result.extraDays === 1 ? "" : "s"}`,
  );
  return {
    formula: [
      "Days = Later date − Earlier date",
      "Add 1 if the end date is counted",
    ],
    steps,
    note: "Dates are counted as whole calendar days, so time zones and daylight saving cannot change the answer.",
  };
}

const BASE_UNIT: Record<UnitCategory, string> = {
  length: "m",
  weight: "kg",
  temperature: "°C",
  area: "m²",
  volume: "L",
  speed: "m/s",
};

export function converterWorkings(
  category: UnitCategory,
  fromId: string,
  toId: string,
  raw: ConverterRaw,
): Workings | undefined {
  const { result } = evaluateConverter(category, fromId, raw);
  const from = findUnit(category, fromId);
  const to = findUnit(category, toId);
  if (!result || !from || !to) return undefined;
  const value = n(raw.value);
  const answer = convert(category, value, fromId, toId);
  if (category === "temperature") {
    const toC =
      fromId === "f"
        ? `(${q(value)} − 32) × 5 ÷ 9`
        : fromId === "k"
          ? `${q(value)} − 273.15`
          : `${q(value)}`;
    const celsius = convert(category, value, fromId, "c");
    const fromC =
      toId === "f"
        ? `${q(celsius)} × 9 ÷ 5 + 32`
        : toId === "k"
          ? `${q(celsius)} + 273.15`
          : `${q(celsius)}`;
    return {
      formula: [
        "°C = (°F − 32) × 5 ÷ 9",
        "°F = °C × 9 ÷ 5 + 32",
        "K = °C + 273.15",
      ],
      steps: [
        `To Celsius first: ${toC} = ${q(celsius)} °C`,
        `Then to ${to.symbol}: ${fromC} = ${q(answer)} ${to.symbol}`,
      ],
      note: "Temperatures use these formulas, not a single multiplier, because the scales start at different zero points.",
    };
  }
  const base = BASE_UNIT[category];
  const inBase = value * from.factor;
  return {
    formula: [
      "Result = Value × (size of the From unit ÷ size of the To unit)",
      `Both sizes are measured in the same base unit (${base})`,
    ],
    steps: [
      `1 ${from.symbol} = ${q(from.factor)} ${base}, and 1 ${to.symbol} = ${q(to.factor)} ${base}`,
      `Value in ${base}: ${q(value)} × ${q(from.factor)} = ${q(inBase)} ${base}`,
      `In ${to.symbol}: ${q(inBase)} ÷ ${q(to.factor)} = ${q(answer)} ${to.symbol}`,
    ],
    note: "The sizes are the exact definitions where one exists (for example 1 inch = 25.4 mm). Results show at most seven significant digits.",
  };
}
