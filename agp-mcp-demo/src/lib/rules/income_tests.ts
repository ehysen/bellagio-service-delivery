/**
 * §409 Income Eligibility / §600 — the gross (130% FPL) and net (100% FPL) tests.
 *
 * Gross test is waived for households with an elderly/disabled member and for
 * BBCE households (the 200% screen applies instead). Net test always applies.
 */
import type { RationaleStep } from "@/lib/models";
import {
  scaledLimit,
  GROSS_INCOME_LIMIT_130,
  GROSS_INCOME_LIMIT_130_ADDL,
  NET_INCOME_LIMIT_100,
  NET_INCOME_LIMIT_100_ADDL,
} from "@/lib/policy/parameters";

export interface IncomeTestFacts {
  grossIncomeLimit: number;
  netIncomeLimit: number;
  passesGrossTest: boolean;
  passesNetTest: boolean;
  grossTestWaived: boolean;
  rationale: RationaleStep[];
}

export function applyIncomeTests(
  size: number,
  grossIncome: number,
  netIncome: number,
  hasElderlyOrDisabled: boolean,
  categoricallyEligible: boolean,
): IncomeTestFacts {
  const rationale: RationaleStep[] = [];

  const grossIncomeLimit = scaledLimit(GROSS_INCOME_LIMIT_130, GROSS_INCOME_LIMIT_130_ADDL, size);
  const netIncomeLimit = scaledLimit(NET_INCOME_LIMIT_100, NET_INCOME_LIMIT_100_ADDL, size);

  const grossTestWaived = hasElderlyOrDisabled || categoricallyEligible;

  // Gross test (130% FPL).
  let passesGrossTest: boolean;
  if (grossTestWaived) {
    passesGrossTest = true;
    rationale.push({
      step: "gross_income_test",
      label: "Gross income test (130% FPL)",
      value: "waived",
      reason: hasElderlyOrDisabled
        ? "Gross income test waived — household has an elderly/disabled member."
        : "Gross income test waived — household is categorically eligible (BBCE); the 200% FPL screen applied instead.",
      citation: "MD-FSP §409; §115",
    });
  } else {
    passesGrossTest = grossIncome <= grossIncomeLimit;
    rationale.push({
      step: "gross_income_test",
      label: "Gross income test (130% FPL)",
      value: passesGrossTest,
      reason: `Gross income $${grossIncome} ${passesGrossTest ? "≤" : ">"} 130% FPL limit $${grossIncomeLimit} for a household of ${size}.`,
      citation: "MD-FSP §409 Income Eligibility; §600",
    });
  }

  // Net test (100% FPL) — always applies.
  const passesNetTest = netIncome <= netIncomeLimit;
  rationale.push({
    step: "net_income_test",
    label: "Net income test (100% FPL)",
    value: passesNetTest,
    reason: `Net income $${netIncome} ${passesNetTest ? "≤" : ">"} 100% FPL limit $${netIncomeLimit} for a household of ${size}.`,
    citation: "MD-FSP §409 Income Eligibility; §600",
  });

  return {
    grossIncomeLimit,
    netIncomeLimit,
    passesGrossTest,
    passesNetTest,
    grossTestWaived,
    rationale,
  };
}
