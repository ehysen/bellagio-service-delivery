/**
 * §212 Deductions / §213 Determining Deductions / §214 Utility Allowances / §600
 *
 * The SNAP deduction ladder, in order:
 *   1. 20% earned income deduction (§212).
 *   2. Standard deduction by household size (§600).
 *   3. Dependent care deduction — actual cost (§212/§213).
 *   4. Medical deduction — out-of-pocket > $35/mo, elderly/disabled only (§213/§600).
 *   5. Child support paid deduction — legally obligated amount (§212).
 *   6. Excess shelter deduction = (shelter + utility allowance) − 50% of adjusted
 *      income, capped at $744 unless an elderly/disabled member is present (§600).
 */
import type { Household, RationaleStep, Flag } from "@/lib/models";
import {
  EARNED_INCOME_DEDUCTION_RATE,
  standardDeduction,
  UTILITY_ALLOWANCE,
  EXCESS_SHELTER_CAP,
  SHELTER_INCOME_THRESHOLD_RATE,
  HOMELESS_SHELTER_DEDUCTION,
} from "@/lib/policy/parameters";

/** Out-of-pocket medical expense threshold for elderly/disabled members (§213). */
export const MEDICAL_EXPENSE_THRESHOLD = 35;

export interface DeductionFacts {
  earnedIncomeDeduction: number;
  standardDeduction: number;
  dependentCareDeduction: number;
  medicalDeduction: number;
  childSupportDeduction: number;
  utilityAllowance: number;
  adjustedIncome: number; // gross minus all non-shelter deductions
  excessShelterDeduction: number;
  netIncome: number;
  rationale: RationaleStep[];
  flags: Flag[];
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeDeductions(
  hh: Household,
  size: number,
  hasElderlyOrDisabled: boolean,
  countableEarned: number,
  grossIncome: number,
): DeductionFacts {
  const rationale: RationaleStep[] = [];
  const flags: Flag[] = [];

  // 1. Earned income deduction (20%).
  const earnedIncomeDeduction = round2(countableEarned * EARNED_INCOME_DEDUCTION_RATE);
  rationale.push({
    step: "earned_income_deduction",
    label: "Earned income deduction (20%)",
    value: earnedIncomeDeduction,
    reason: `20% of $${countableEarned} earned income = $${earnedIncomeDeduction}. Statutory work-expense allowance.`,
    citation: "MD-FSP §212; FY2026 COLA (20% statutory)",
  });

  // 2. Standard deduction by size.
  const stdDed = standardDeduction(size);
  rationale.push({
    step: "standard_deduction",
    label: "Standard deduction",
    value: stdDed,
    reason: `Standard deduction for a household of ${size} = $${stdDed}.`,
    citation: "MD-FSP §600 Standards for Income and Deductions",
  });

  // 3. Dependent care.
  const dependentCareDeduction = round2(hh.dependentCare ?? 0);
  if (dependentCareDeduction > 0) {
    rationale.push({
      step: "dependent_care_deduction",
      label: "Dependent care deduction",
      value: dependentCareDeduction,
      reason: `Actual out-of-pocket dependent care cost of $${dependentCareDeduction} deducted.`,
      citation: "MD-FSP §212; §213",
    });
  }

  // 4. Medical deduction (elderly/disabled only, amount over $35).
  let medicalDeduction = 0;
  const medical = hh.medicalExpenses ?? 0;
  if (hasElderlyOrDisabled && medical > MEDICAL_EXPENSE_THRESHOLD) {
    medicalDeduction = round2(medical - MEDICAL_EXPENSE_THRESHOLD);
    rationale.push({
      step: "medical_deduction",
      label: "Medical expense deduction",
      value: medicalDeduction,
      reason:
        `Elderly/disabled member: out-of-pocket medical $${medical} minus $${MEDICAL_EXPENSE_THRESHOLD} ` +
        `threshold = $${medicalDeduction}.`,
      citation: "MD-FSP §213; §600 (medical > $35, elderly/disabled)",
    });
  } else if (medical > 0 && !hasElderlyOrDisabled) {
    flags.push({
      code: "medical_not_deductible",
      severity: "info",
      message:
        "Medical expenses reported but no elderly/disabled member — medical deduction is not allowed. Confirm member status.",
      citation: "MD-FSP §213",
    });
  }

  // 5. Child support paid (legally obligated).
  const childSupportDeduction = round2(hh.childSupportPaid ?? 0);
  if (childSupportDeduction > 0) {
    rationale.push({
      step: "child_support_deduction",
      label: "Child support paid deduction",
      value: childSupportDeduction,
      reason: `Legally-obligated child support paid out of $${childSupportDeduction} deducted.`,
      citation: "MD-FSP §212 (child support paid)",
    });
  }

  // Adjusted income (before shelter).
  const adjustedIncome = round2(
    Math.max(
      0,
      grossIncome -
        earnedIncomeDeduction -
        stdDed -
        dependentCareDeduction -
        medicalDeduction -
        childSupportDeduction,
    ),
  );
  rationale.push({
    step: "adjusted_income",
    label: "Adjusted income (before shelter)",
    value: adjustedIncome,
    reason:
      `Gross $${grossIncome} minus earned ($${earnedIncomeDeduction}), standard ($${stdDed}), ` +
      `dependent care ($${dependentCareDeduction}), medical ($${medicalDeduction}), child support ` +
      `($${childSupportDeduction}) = $${adjustedIncome}.`,
    citation: "MD-FSP §213; §600",
  });

  // 6. Excess shelter deduction.
  const utilityAllowance = UTILITY_ALLOWANCE[hh.utilityStatus] ?? 0;
  let excessShelterDeduction = 0;

  if (hh.homeless) {
    // Homeless households take the flat homeless shelter deduction.
    excessShelterDeduction = HOMELESS_SHELTER_DEDUCTION;
    rationale.push({
      step: "excess_shelter_deduction",
      label: "Homeless shelter deduction",
      value: excessShelterDeduction,
      reason: `Homeless household: flat homeless shelter deduction of $${HOMELESS_SHELTER_DEDUCTION}.`,
      citation: "MD-FSP §600 (homeless shelter deduction)",
    });
  } else {
    const totalShelter = round2((hh.shelterCost ?? 0) + utilityAllowance);
    const threshold = round2(adjustedIncome * SHELTER_INCOME_THRESHOLD_RATE);
    const rawExcess = round2(Math.max(0, totalShelter - threshold));
    const capped = !hasElderlyOrDisabled && rawExcess > EXCESS_SHELTER_CAP;
    excessShelterDeduction = capped ? EXCESS_SHELTER_CAP : rawExcess;
    rationale.push({
      step: "excess_shelter_deduction",
      label: "Excess shelter deduction",
      value: excessShelterDeduction,
      reason:
        `Shelter $${hh.shelterCost ?? 0} + utility allowance $${utilityAllowance} = $${totalShelter}; ` +
        `minus 50% of adjusted income ($${threshold}) = $${rawExcess}. ` +
        (hasElderlyOrDisabled
          ? "Uncapped (elderly/disabled member present)."
          : capped
            ? `Capped at $${EXCESS_SHELTER_CAP}.`
            : `Below the $${EXCESS_SHELTER_CAP} cap.`),
      citation: `MD-FSP §213; §214 (utility allowance); §600 (cap $${EXCESS_SHELTER_CAP})`,
    });
  }

  const netIncome = round2(Math.max(0, adjustedIncome - excessShelterDeduction));
  rationale.push({
    step: "net_income",
    label: "Net monthly income",
    value: netIncome,
    reason: `Adjusted income $${adjustedIncome} minus excess shelter $${excessShelterDeduction} = $${netIncome}.`,
    citation: "MD-FSP §213; §600",
  });

  return {
    earnedIncomeDeduction,
    standardDeduction: stdDed,
    dependentCareDeduction,
    medicalDeduction,
    childSupportDeduction,
    utilityAllowance,
    adjustedIncome,
    excessShelterDeduction,
    netIncome,
    rationale,
    flags,
  };
}
