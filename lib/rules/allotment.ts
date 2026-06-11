/**
 * §600 Benefit calculation / §411 Proration Tables / §412 Prorating Initial Allotment
 *
 * Benefit = max allotment − round(30% × net income).
 *   - If eligible but the result is below the $24 minimum (1–2 person HH), pay $24.
 *   - First month is prorated from the application date (§411/§412).
 *   - A prorated initial allotment under $10 is not issued (federal rule).
 */
import type { RationaleStep } from "@/lib/models";
import {
  maxAllotment,
  HOUSEHOLD_CONTRIBUTION_RATE,
  MINIMUM_BENEFIT,
} from "@/lib/policy/parameters";

export interface AllotmentFacts {
  ongoingMonthlyBenefit: number;
  monthlyBenefit: number; // prorated for the first month if applicationDay given
  prorated: boolean;
  rationale: RationaleStep[];
}

export function computeAllotment(
  size: number,
  netIncome: number,
  eligible: boolean,
  applicationDay?: number,
  daysInMonth = 30,
): AllotmentFacts {
  const rationale: RationaleStep[] = [];

  if (!eligible) {
    return { ongoingMonthlyBenefit: 0, monthlyBenefit: 0, prorated: false, rationale };
  }

  const maxA = maxAllotment(size);
  const contribution = Math.round(HOUSEHOLD_CONTRIBUTION_RATE * netIncome);
  let ongoing = Math.max(0, maxA - contribution);

  rationale.push({
    step: "benefit_calc",
    label: "Benefit calculation",
    value: ongoing,
    reason:
      `Max allotment for ${size} = $${maxA}; minus 30% of net income (round(0.30 × $${netIncome}) = $${contribution}) ` +
      `= $${ongoing}.`,
    citation: "MD-FSP §600 (allotment = max − 30% net)",
  });

  // Minimum benefit for eligible 1–2 person households.
  if (size <= 2 && ongoing < MINIMUM_BENEFIT) {
    rationale.push({
      step: "minimum_benefit",
      label: "Minimum benefit applied",
      value: MINIMUM_BENEFIT,
      reason: `Computed benefit $${ongoing} is below the $${MINIMUM_BENEFIT} minimum for a 1–2 person household; minimum applies.`,
      citation: "MD-FSP §600 (minimum benefit $24)",
    });
    ongoing = MINIMUM_BENEFIT;
  }

  // Proration of the first month.
  let monthly = ongoing;
  let prorated = false;
  if (applicationDay && applicationDay >= 1 && applicationDay <= daysInMonth) {
    prorated = true;
    const daysRemaining = daysInMonth - applicationDay + 1;
    const factor = daysRemaining / daysInMonth;
    let proratedBenefit = Math.floor(ongoing * factor);
    rationale.push({
      step: "proration",
      label: "First-month proration",
      value: proratedBenefit,
      reason:
        `Application on day ${applicationDay}: ${daysRemaining} of ${daysInMonth} days covered ` +
        `(factor ${factor.toFixed(4)}). Prorated first-month benefit = floor($${ongoing} × ${factor.toFixed(4)}) = $${proratedBenefit}.`,
      citation: "MD-FSP §411 Proration Tables; §412 Prorating Initial Allotment",
    });
    if (proratedBenefit < 10) {
      rationale.push({
        step: "proration_min",
        label: "Prorated allotment under $10",
        value: 0,
        reason: `Prorated initial allotment $${proratedBenefit} is under $10 and is not issued for the first month.`,
        citation: "MD-FSP §412 (prorated < $10 not issued)",
      });
      proratedBenefit = 0;
    }
    monthly = proratedBenefit;
  }

  return { ongoingMonthlyBenefit: ongoing, monthlyBenefit: monthly, prorated, rationale };
}
