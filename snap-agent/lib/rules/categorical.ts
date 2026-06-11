/**
 * §115 Categorical Eligibility (Broad-Based Categorical Eligibility / BBCE)
 *
 * Maryland confers BBCE on households with gross income at or below 200% FPL
 * (via receipt of a TANF-funded non-cash service). BBCE:
 *   - bypasses the asset test, and
 *   - bypasses the regular 130% gross income test (the 200% screen applies).
 * The household must still pass the NET income test to be eligible.
 */
import type { Household, RationaleStep, Flag } from "@/lib/models";
import { scaledLimit, BBCE_GROSS_LIMIT_200, BBCE_GROSS_LIMIT_200_ADDL } from "@/lib/policy/parameters";

export interface CategoricalFacts {
  categoricallyEligible: boolean;
  bbceGrossLimit: number;
  assetTestBypassed: boolean;
  grossTestBypassed: boolean;
  rationale: RationaleStep[];
  flags: Flag[];
}

export function assessCategorical(
  hh: Household,
  size: number,
  grossIncome: number,
): CategoricalFacts {
  const rationale: RationaleStep[] = [];
  const flags: Flag[] = [];

  const bbceGrossLimit = scaledLimit(BBCE_GROSS_LIMIT_200, BBCE_GROSS_LIMIT_200_ADDL, size);
  const categoricallyEligible = grossIncome <= bbceGrossLimit;

  if (categoricallyEligible) {
    rationale.push({
      step: "bbce",
      label: "Broad-based categorical eligibility (BBCE)",
      value: true,
      reason:
        `Gross income $${grossIncome} is at or below the 200% FPL BBCE limit of $${bbceGrossLimit} ` +
        `for a household of ${size}. The asset test and the 130% gross income test are bypassed; ` +
        "the net income test still applies.",
      citation: "MD-FSP §115 Categorical Eligibility (BBCE)",
    });
  } else {
    rationale.push({
      step: "bbce",
      label: "Broad-based categorical eligibility (BBCE)",
      value: false,
      reason:
        `Gross income $${grossIncome} exceeds the 200% FPL BBCE limit of $${bbceGrossLimit}. ` +
        "Standard 130% gross test and the asset test apply.",
      citation: "MD-FSP §115 Categorical Eligibility (BBCE)",
    });
  }

  return {
    categoricallyEligible,
    bbceGrossLimit,
    assetTestBypassed: categoricallyEligible,
    grossTestBypassed: categoricallyEligible,
    rationale,
    flags,
  };
}
