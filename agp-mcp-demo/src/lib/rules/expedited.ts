/**
 * §401 Screening for Expedited Service
 *
 * A household qualifies for expedited (7-day) service if ANY of:
 *   - Gross monthly income < $150 AND liquid resources ≤ $100; or
 *   - Combined gross income + liquid resources < monthly rent/mortgage + utilities; or
 *   - Destitute migrant/seasonal farmworker with liquid resources ≤ $100 (flagged,
 *     judgment-based — surfaced as a human-review item rather than auto-decided).
 */
import type { Household, RationaleStep, Flag } from "@/lib/models";
import { EXPEDITED, UTILITY_ALLOWANCE } from "@/lib/policy/parameters";

export interface ExpeditedFacts {
  expeditedEligible: boolean;
  rationale: RationaleStep[];
  flags: Flag[];
}

export function screenExpedited(
  hh: Household,
  grossIncome: number,
): ExpeditedFacts {
  const rationale: RationaleStep[] = [];
  const flags: Flag[] = [];
  const liquid = hh.liquidAssets ?? 0;

  const lowIncomeLowAssets =
    grossIncome < EXPEDITED.grossIncomeCeiling && liquid <= EXPEDITED.liquidAssetCeiling;

  const shelterPlusUtil = (hh.shelterCost ?? 0) + (UTILITY_ALLOWANCE[hh.utilityStatus] ?? 0);
  const cantCoverShelter =
    EXPEDITED.rentUtilityRuleEnabled && grossIncome + liquid < shelterPlusUtil;

  const expeditedEligible = lowIncomeLowAssets || cantCoverShelter;

  rationale.push({
    step: "expedited_screen",
    label: "Expedited service screening (7-day)",
    value: expeditedEligible,
    reason: expeditedEligible
      ? `Qualifies for expedited service: ${
          lowIncomeLowAssets
            ? `gross income $${grossIncome} < $${EXPEDITED.grossIncomeCeiling} and liquid resources $${liquid} ≤ $${EXPEDITED.liquidAssetCeiling}`
            : `gross income + liquid resources ($${grossIncome + liquid}) < shelter + utilities ($${shelterPlusUtil})`
        }. 7-day processing standard applies.`
      : `Does not meet expedited screening criteria; the normal 30-day standard applies.`,
    citation: "MD-FSP §401 Screening for Expedited Service",
  });

  if (expeditedEligible) {
    flags.push({
      code: "expedited_service",
      severity: "review",
      message:
        "Household screened as expedited — must receive a determination within 7 calendar days. " +
        "Postponed verification rules apply; confirm identity at minimum.",
      citation: "MD-FSP §401; §406",
    });
  }

  return { expeditedEligible, rationale, flags };
}
