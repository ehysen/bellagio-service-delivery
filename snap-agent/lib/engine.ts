/**
 * engine.ts — orchestrates the rules modules into a single Determination.
 *
 * Guardrails baked in here:
 *   - Every step appends a cited RationaleStep (no citation -> it doesn't ship).
 *   - Unverified material inputs (§408) -> decision "pending_verification",
 *     NEVER an automated denial.
 *   - Judgment-heavy items are returned as Flags for a human to resolve.
 */
import type {
  Household,
  Determination,
  RationaleStep,
  Flag,
  Decision,
  VerificationFact,
} from "@/lib/models";
import { assessHousehold } from "@/lib/rules/household";
import { computeIncome } from "@/lib/rules/income";
import { assessCategorical } from "@/lib/rules/categorical";
import { computeDeductions } from "@/lib/rules/deductions";
import { applyIncomeTests } from "@/lib/rules/income_tests";
import { computeAllotment } from "@/lib/rules/allotment";
import { screenExpedited } from "@/lib/rules/expedited";
import { ASSET_LIMIT_STANDARD, ASSET_LIMIT_ELDERLY_DISABLED } from "@/lib/policy/parameters";

/** Facts that, if present and marked unverified, block a final determination (§408). */
const MATERIAL_FACTS: VerificationFact[] = [
  "earnedIncome",
  "unearnedIncome",
  "shelterCost",
  "liquidAssets",
  "disability",
  "householdComposition",
];

function unverifiedMaterialFacts(hh: Household): VerificationFact[] {
  const v = hh.verification ?? {};
  return MATERIAL_FACTS.filter((f) => v[f] === "unverified");
}

export function determine(hh: Household): Determination {
  const rationale: RationaleStep[] = [];
  const flags: Flag[] = [];

  // §100 — household composition.
  const house = assessHousehold(hh);
  rationale.push(...house.rationale);
  flags.push(...house.flags);

  // §210/§211 — income.
  const income = computeIncome(hh);
  rationale.push(...income.rationale);
  flags.push(...income.flags);

  // §115 — categorical eligibility (BBCE).
  const cat = assessCategorical(hh, house.size, income.grossIncome);
  rationale.push(...cat.rationale);
  flags.push(...cat.flags);

  // §212/§213/§214/§600 — deductions and net income.
  const ded = computeDeductions(
    hh,
    house.size,
    house.hasElderlyOrDisabled,
    income.countableEarned,
    income.grossIncome,
  );
  rationale.push(...ded.rationale);
  flags.push(...ded.flags);

  // §409/§600 — income tests.
  const tests = applyIncomeTests(
    house.size,
    income.grossIncome,
    ded.netIncome,
    house.hasElderlyOrDisabled,
    cat.categoricallyEligible,
  );
  rationale.push(...tests.rationale);

  // §115 — asset test (bypassed under BBCE).
  const assetLimit = house.hasElderlyOrDisabled
    ? ASSET_LIMIT_ELDERLY_DISABLED
    : ASSET_LIMIT_STANDARD;
  let passesAssetTest = true;
  if (cat.assetTestBypassed) {
    rationale.push({
      step: "asset_test",
      label: "Asset test",
      value: "bypassed",
      reason: "Asset test bypassed under broad-based categorical eligibility (BBCE).",
      citation: "MD-FSP §115",
    });
  } else {
    const assets = hh.liquidAssets ?? 0;
    passesAssetTest = assets <= assetLimit;
    rationale.push({
      step: "asset_test",
      label: "Asset test",
      value: passesAssetTest,
      reason: `Liquid assets $${assets} ${passesAssetTest ? "≤" : ">"} limit $${assetLimit} (${
        house.hasElderlyOrDisabled ? "elderly/disabled" : "standard"
      }).`,
      citation: "MD-FSP §115 (asset limits)",
    });
  }

  // §401 — expedited screening (independent of final eligibility).
  const exp = screenExpedited(hh, income.grossIncome);
  rationale.push(...exp.rationale);
  flags.push(...exp.flags);

  // Provisional eligibility.
  const eligible = tests.passesGrossTest && tests.passesNetTest && passesAssetTest;

  // §600/§411/§412 — benefit.
  const allot = computeAllotment(house.size, ded.netIncome, eligible, hh.applicationDay);
  rationale.push(...allot.rationale);

  // §408 — verification gate. Unverified material inputs never produce a denial.
  const unverified = unverifiedMaterialFacts(hh);
  let decision: Decision;
  if (unverified.length > 0) {
    decision = "pending_verification";
    flags.push({
      code: "verification_required",
      severity: "blocking",
      message:
        `Pending verification — human review required. Unverified material inputs: ${unverified.join(", ")}. ` +
        "No denial may be issued until these are verified per §408.",
      citation: "MD-FSP §408 Verification",
    });
    rationale.push({
      step: "verification_gate",
      label: "Verification gate (§408)",
      value: "pending",
      reason:
        `Determination held as PENDING VERIFICATION because material inputs are unverified (${unverified.join(", ")}). ` +
        "The engine never auto-denies on unverified data.",
      citation: "MD-FSP §408 Verification",
    });
  } else {
    decision = eligible ? "eligible" : "ineligible";
  }

  return {
    caseId: hh.caseId,
    decision,
    monthlyBenefit: decision === "ineligible" ? 0 : allot.monthlyBenefit,
    ongoingMonthlyBenefit: decision === "ineligible" ? 0 : allot.ongoingMonthlyBenefit,
    expeditedEligible: exp.expeditedEligible,
    rationale,
    flags,
    computation: {
      householdSize: house.size,
      hasElderlyOrDisabled: house.hasElderlyOrDisabled,
      grossIncome: income.grossIncome,
      countableEarned: income.countableEarned,
      countableUnearned: income.countableUnearned,
      earnedIncomeDeduction: ded.earnedIncomeDeduction,
      standardDeduction: ded.standardDeduction,
      dependentCareDeduction: ded.dependentCareDeduction,
      medicalDeduction: ded.medicalDeduction,
      childSupportDeduction: ded.childSupportDeduction,
      adjustedIncome: ded.adjustedIncome,
      shelterCost: hh.shelterCost ?? 0,
      utilityAllowance: ded.utilityAllowance,
      excessShelterDeduction: ded.excessShelterDeduction,
      netIncome: ded.netIncome,
      grossIncomeLimit: tests.grossIncomeLimit,
      netIncomeLimit: tests.netIncomeLimit,
      bbceGrossLimit: cat.bbceGrossLimit,
      passesGrossTest: tests.passesGrossTest,
      passesNetTest: tests.passesNetTest,
      categoricallyEligible: cat.categoricallyEligible,
      assetLimit,
      passesAssetTest,
    },
  };
}
