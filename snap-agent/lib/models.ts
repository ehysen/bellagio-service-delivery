/**
 * Core domain types for the SNAP Eligibility Agent.
 *
 * Every output the engine produces is traceable to a policy citation. The
 * `RationaleStep`, `Flag`, and `QCFinding` types are the auditability spine of
 * the demo: a determination is never just a number, it is a number plus an
 * ordered, cited explanation plus an explicit list of what a human must judge.
 */

/** A single household member. */
export interface Member {
  id: string;
  age: number;
  /** Elderly is age >= 60 per federal SNAP rule; stored for clarity/overrides. */
  elderly?: boolean;
  /** Receives/qualifies as disabled per SNAP definition (SSI/SSDI/VA etc.). */
  disabled?: boolean;
  /** Member's earned (wage/salary) income, monthly. */
  earnedIncome?: number;
  /** Member's unearned income (SSI, SSDI, TCA, child support received), monthly. */
  unearnedIncome?: number;
  /** True if any income figure for this member is self-employment. */
  selfEmployment?: boolean;
}

export type UtilityStatus =
  | "heating_cooling" // qualifies for full Standard Utility Allowance (SUA)
  | "limited" // non-heating utilities only -> Limited Utility Allowance (LUA)
  | "phone_only" // telephone standard only
  | "none"; // no utility costs

/** Verification state of a fact, per MD-FSP §408. */
export type VerificationStatus = "verified" | "unverified" | "not_required";

export interface Household {
  /** Optional case identifier for logging/QC. */
  caseId?: string;
  members: Member[];
  /** Monthly rent or mortgage (shelter) cost. */
  shelterCost?: number;
  /** True if the household has no fixed shelter cost (homeless/unsheltered). */
  homeless?: boolean;
  utilityStatus: UtilityStatus;
  /** Monthly out-of-pocket dependent (child/incapacitated adult) care cost. */
  dependentCare?: number;
  /** Monthly out-of-pocket medical expense for elderly/disabled members. */
  medicalExpenses?: number;
  /** Legally-obligated child support PAID out (a deduction, not income). */
  childSupportPaid?: number;
  /** Countable liquid assets (checking, savings, cash). */
  liquidAssets?: number;
  /** Application date — used for proration of the first month (§411/§412). */
  applicationDay?: number; // day-of-month 1..31
  /** Verification flags keyed by fact name, per §408. */
  verification?: Partial<Record<VerificationFact, VerificationStatus>>;
}

export type VerificationFact =
  | "identity"
  | "earnedIncome"
  | "unearnedIncome"
  | "shelterCost"
  | "utilityStatus"
  | "medicalExpenses"
  | "dependentCare"
  | "childSupportPaid"
  | "liquidAssets"
  | "disability"
  | "householdComposition";

/** One auditable step in the determination, always carrying a citation. */
export interface RationaleStep {
  /** Short machine key, e.g. "earned_income_deduction". */
  step: string;
  /** Human-readable label. */
  label: string;
  /** The value computed at this step (dollars, boolean, or descriptive). */
  value: number | string | boolean;
  /** Plain-language reason a caseworker can read. */
  reason: string;
  /** Exact policy source, e.g. "MD-FSP §212; FY2026 COLA". */
  citation: string;
}

export type FlagSeverity = "info" | "review" | "blocking";

/** Something requiring human judgment — the engine never resolves these itself. */
export interface Flag {
  code: string;
  severity: FlagSeverity;
  message: string;
  citation: string;
}

export type QCSeverity = "low" | "medium" | "high";

/** A discrepancy surfaced by the pre-certification QC layer (§408 + heuristics). */
export interface QCFinding {
  code: string;
  severity: QCSeverity;
  message: string;
  /** The §408 verification gap or policy basis for the check. */
  citation: string;
  /** Optional dollar exposure tied to the finding (for the impact model). */
  dollarDelta?: number;
}

export type Decision =
  | "eligible"
  | "ineligible"
  | "pending_verification" // §408 — never a denial
  | "needs_human_review";

export interface Determination {
  caseId?: string;
  decision: Decision;
  /** Final monthly benefit (after proration if first month), in dollars. */
  monthlyBenefit: number;
  /** Un-prorated ongoing monthly benefit, in dollars. */
  ongoingMonthlyBenefit: number;
  expeditedEligible: boolean;
  rationale: RationaleStep[];
  flags: Flag[];
  /** Intermediate figures, exposed for QC recomputation and the UI. */
  computation: {
    householdSize: number;
    hasElderlyOrDisabled: boolean;
    grossIncome: number;
    countableEarned: number;
    countableUnearned: number;
    earnedIncomeDeduction: number;
    standardDeduction: number;
    dependentCareDeduction: number;
    medicalDeduction: number;
    childSupportDeduction: number;
    adjustedIncome: number; // gross - (non-shelter deductions)
    shelterCost: number;
    utilityAllowance: number;
    excessShelterDeduction: number;
    netIncome: number;
    grossIncomeLimit: number;
    netIncomeLimit: number;
    bbceGrossLimit: number;
    passesGrossTest: boolean;
    passesNetTest: boolean;
    categoricallyEligible: boolean;
    assetLimit: number;
    passesAssetTest: boolean;
  };
}
