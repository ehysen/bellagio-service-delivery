/**
 * §210 Income / §211 Excluded Income
 *
 * Produces countable earned and unearned income. Self-employment income is
 * counted but ALWAYS flagged for human review — net self-employment computation
 * (cost of doing business, capitalization) is judgment-heavy by design.
 */
import type { Household, RationaleStep, Flag } from "@/lib/models";

export interface IncomeFacts {
  countableEarned: number;
  countableUnearned: number;
  grossIncome: number;
  rationale: RationaleStep[];
  flags: Flag[];
}

export function computeIncome(hh: Household): IncomeFacts {
  const rationale: RationaleStep[] = [];
  const flags: Flag[] = [];

  let earned = 0;
  let unearned = 0;
  let hasSelfEmployment = false;

  for (const m of hh.members) {
    earned += m.earnedIncome ?? 0;
    unearned += m.unearnedIncome ?? 0;
    if (m.selfEmployment && (m.earnedIncome ?? 0) > 0) hasSelfEmployment = true;
  }

  rationale.push({
    step: "countable_earned",
    label: "Countable earned income",
    value: earned,
    reason: `Summed gross earned (wage/salary/self-employment) income across members: $${earned}/mo.`,
    citation: "MD-FSP §210 Income",
  });

  rationale.push({
    step: "countable_unearned",
    label: "Countable unearned income",
    value: unearned,
    reason:
      `Summed countable unearned income (SSI/SSDI, TCA, child support received, etc.): $${unearned}/mo. ` +
      "Excluded income types per §211 are not counted.",
    citation: "MD-FSP §210; §211 Excluded Income",
  });

  if (hasSelfEmployment) {
    flags.push({
      code: "self_employment_income",
      severity: "review",
      message:
        "Self-employment income present. Net self-employment income (gross receipts minus allowable " +
        "cost of doing business) requires human computation and verification.",
      citation: "MD-FSP §210 (self-employment)",
    });
  }

  return {
    countableEarned: earned,
    countableUnearned: unearned,
    grossIncome: earned + unearned,
    rationale,
    flags,
  };
}
