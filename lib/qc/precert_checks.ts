/**
 * Pre-certification QC checker (§408 Verification + payment-error heuristics).
 *
 * Runs on a COMPLETED case before certification and replicates the class of
 * checks that catch real SNAP payment errors — the events the impact model
 * (Deliverable B) monetizes. Findings are surfaced BEFORE certification with a
 * severity and the §408 verification gap they expose.
 */
import type { Household, Determination, QCFinding } from "@/lib/models";
import { determine } from "@/lib/engine";
import { isDisabled } from "@/lib/rules/household";

export interface QCInput {
  household: Household;
  /** The benefit stated on the case being certified (for recomputation delta). */
  statedBenefit?: number;
  /** Optional precomputed determination; recomputed if omitted. */
  determination?: Determination;
}

export function runPrecertQC(input: QCInput): QCFinding[] {
  const { household: hh } = input;
  const det = input.determination ?? determine(hh);
  const findings: QCFinding[] = [];

  const earned = hh.members.reduce((s, m) => s + (m.earnedIncome ?? 0), 0);
  const unearned = hh.members.reduce((s, m) => s + (m.unearnedIncome ?? 0), 0);
  const grossIncome = earned + unearned;
  // Out-of-pocket obligations the household claims to pay (not the SUA standard).
  const outOfPocket =
    (hh.shelterCost ?? 0) +
    (hh.dependentCare ?? 0) +
    (hh.medicalExpenses ?? 0) +
    (hh.childSupportPaid ?? 0);
  const liquid = hh.liquidAssets ?? 0;

  // 1. Out-of-pocket obligations exceed gross income by a gap that liquid assets
  //    cannot explain — an income under-reporting signal ("how is this paid for?").
  //    (Shelter routinely exceeds income for eligible households; the unexplained
  //    GAP, net of assets, is the discriminating signal — not the raw comparison.)
  const gap = outOfPocket - grossIncome;
  if (outOfPocket > 0 && gap > 0 && liquid < gap) {
    findings.push({
      code: "expenses_exceed_earned_income",
      severity: "high",
      message:
        `Claimed out-of-pocket obligations ($${outOfPocket}/mo) exceed gross income ($${grossIncome}/mo) by ` +
        `$${gap.toFixed(2)}, more than reported liquid assets ($${liquid}) can cover. Possible income ` +
        "under-reporting — verify income sources before certification.",
      citation: "MD-FSP §408 (income verification)",
      dollarDelta: det.ongoingMonthlyBenefit,
    });
  }

  // 2. Marked unsheltered but a shelter/utility expense is claimed.
  if (hh.homeless && ((hh.shelterCost ?? 0) > 0 || hh.utilityStatus !== "none")) {
    findings.push({
      code: "homeless_with_shelter_expense",
      severity: "medium",
      message:
        `Household is marked homeless/unsheltered but claims a shelter cost ($${hh.shelterCost ?? 0}) ` +
        `or utility status "${hh.utilityStatus}". Reconcile housing status with claimed expenses.`,
      citation: "MD-FSP §408; §600 (homeless shelter deduction)",
    });
  }

  // 3. Elderly/disabled present but no medical-expense detail captured.
  if (det.computation.hasElderlyOrDisabled && (hh.medicalExpenses ?? 0) === 0) {
    findings.push({
      code: "elderly_disabled_no_medical",
      severity: "low",
      message:
        "Elderly/disabled member present but no medical-expense detail captured. A missed medical deduction " +
        "can understate benefits — confirm whether out-of-pocket medical costs exist.",
      citation: "MD-FSP §213; §408",
    });
  }

  // 4. Disability status present but no associated unearned income (e.g., SSDI/SSI).
  const anyDisabled = hh.members.some((m) => isDisabled(m));
  if (anyDisabled && unearned === 0) {
    findings.push({
      code: "disability_without_unearned_income",
      severity: "medium",
      message:
        "A member is marked disabled but the case shows no associated unearned income (SSDI/SSI/VA). " +
        "Verify disability benefits — a common source of unreported income.",
      citation: "MD-FSP §408; §210",
    });
  }

  // 5. Shelter deduction taken without underlying documentation.
  const shelterDed = det.computation.excessShelterDeduction;
  const shelterVerified = hh.verification?.shelterCost === "verified";
  if (shelterDed > 0 && !hh.homeless && ((hh.shelterCost ?? 0) === 0 || !shelterVerified)) {
    findings.push({
      code: "shelter_deduction_unsupported",
      severity: "medium",
      message:
        `An excess shelter deduction of $${shelterDed} was applied but underlying rent/mortgage ` +
        `($${hh.shelterCost ?? 0}) is ${(hh.shelterCost ?? 0) === 0 ? "missing" : "unverified"}. ` +
        "Require rent/mortgage and utility documentation before certification.",
      citation: "MD-FSP §408; §214",
    });
  }

  // 6. Benefit recomputation — flag any delta vs. the case's stated benefit.
  if (input.statedBenefit !== undefined) {
    const delta = input.statedBenefit - det.ongoingMonthlyBenefit;
    if (Math.abs(delta) >= 1) {
      findings.push({
        code: "benefit_recomputation_delta",
        severity: Math.abs(delta) >= 20 ? "high" : "medium",
        message:
          `Stated benefit $${input.statedBenefit} differs from independent recomputation ` +
          `$${det.ongoingMonthlyBenefit} by $${delta.toFixed(2)}. Reconcile before certification.`,
        citation: "MD-FSP §600 (independent benefit recomputation)",
        dollarDelta: Math.abs(delta),
      });
    }
  }

  return findings;
}
