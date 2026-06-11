/**
 * §100 Household Composition  (+ federal elderly/disabled definitions)
 *
 * Determines who is in the SNAP household and whether any member is elderly
 * (age >= 60) or disabled — a flag that unlocks the uncapped shelter deduction,
 * the gross-test exemption, and the medical-expense deduction downstream.
 */
import type { Household, Member, RationaleStep, Flag } from "@/lib/models";
import { ELDERLY_AGE } from "@/lib/policy/parameters";

export interface HouseholdFacts {
  size: number;
  hasElderlyOrDisabled: boolean;
  rationale: RationaleStep[];
  flags: Flag[];
}

export function isElderly(m: Member): boolean {
  return m.elderly === true || m.age >= ELDERLY_AGE;
}

export function isDisabled(m: Member): boolean {
  return m.disabled === true;
}

export function assessHousehold(hh: Household): HouseholdFacts {
  const rationale: RationaleStep[] = [];
  const flags: Flag[] = [];

  const size = hh.members.length;
  const elderlyOrDisabled = hh.members.some((m) => isElderly(m) || isDisabled(m));

  rationale.push({
    step: "household_size",
    label: "Household size",
    value: size,
    reason: `Counted ${size} member(s) in the SNAP household unit.`,
    citation: "MD-FSP §100 Household Composition",
  });

  if (elderlyOrDisabled) {
    rationale.push({
      step: "elderly_disabled",
      label: "Elderly/disabled member present",
      value: true,
      reason:
        "At least one member is elderly (age ≥ 60) or disabled. This exempts the household " +
        "from the gross income test, uncaps the excess shelter deduction, and allows a medical deduction.",
      citation: "MD-FSP §100; §409 (gross-test exemption); §600 (shelter cap)",
    });
  }

  // Household composition is a judgment-heavy area: flag for human confirmation
  // when membership could be contested (e.g., boarders, separate purchase/prepare).
  flags.push({
    code: "household_composition_review",
    severity: "info",
    message:
      "Confirm household composition (who purchases and prepares food together, boarders, " +
      "ineligible members). Composition disputes require human judgment.",
    citation: "MD-FSP §100",
  });

  return { size, hasElderlyOrDisabled: elderlyOrDisabled, rationale, flags };
}
