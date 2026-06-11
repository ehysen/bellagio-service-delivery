/**
 * Known-answer households — the falsifiable core of the demo.
 *
 * Each expected benefit is hand-calculated against FY2026 §600 figures (see the
 * worked arithmetic in each `note`). The test harness asserts the engine matches
 * to the dollar. A green suite over published math is the proof.
 */
import type { Household, Decision } from "@/lib/models";

export interface KnownCase {
  name: string;
  scenario: string;
  household: Household;
  expected: {
    decision: Decision;
    /** Ongoing (un-prorated) monthly benefit. */
    ongoingMonthlyBenefit: number;
    /** Final monthly benefit (prorated if applicable). */
    monthlyBenefit?: number;
    expeditedEligible?: boolean;
    netIncome?: number;
  };
  /** The hand-calculation, for the Translation Report and auditors. */
  note: string;
}

const allVerified: Household["verification"] = {
  earnedIncome: "verified",
  unearnedIncome: "verified",
  shelterCost: "verified",
  liquidAssets: "verified",
  disability: "verified",
  householdComposition: "verified",
};

export const KNOWN_CASES: KnownCase[] = [
  {
    name: "single_earner_eligible",
    scenario: "Clearly-eligible single earner (HH1)",
    household: {
      caseId: "KC-01",
      members: [{ id: "m1", age: 34, earnedIncome: 1200 }],
      shelterCost: 900,
      utilityStatus: "heating_cooling",
      liquidAssets: 500,
      verification: allVerified,
    },
    expected: { decision: "eligible", ongoingMonthlyBenefit: 296, netIncome: 7 },
    note:
      "Earned 1200; 20% earned ded = 240; std ded (HH1) 209 → adjusted 751. " +
      "Shelter 900 + SUA 572 = 1472; minus 50%×751 (375.5) = 1096.5; capped at 744. " +
      "Net = 751 − 744 = 7. BBCE (gross ≤ 2610) bypasses gross/asset; net 7 ≤ 1305. " +
      "Benefit = 298 − round(0.30×7=2) = 296.",
  },
  {
    name: "gross_test_fail",
    scenario: "Household failing the gross income test (HH1, non-BBCE)",
    household: {
      caseId: "KC-02",
      members: [{ id: "m1", age: 40, earnedIncome: 2800 }],
      shelterCost: 800,
      utilityStatus: "heating_cooling",
      liquidAssets: 1000,
      verification: allVerified,
    },
    expected: { decision: "ineligible", ongoingMonthlyBenefit: 0 },
    note:
      "Gross 2800 > 200% FPL BBCE limit 2610 → no categorical eligibility. " +
      "Gross test: 2800 > 130% FPL limit 1696 (HH1) → fails. Ineligible, $0.",
  },
  {
    name: "elderly_disabled",
    scenario: "Elderly/disabled household — uncapped shelter, gross-test exempt, medical deduction (HH1)",
    household: {
      caseId: "KC-03",
      members: [{ id: "m1", age: 67, elderly: true, disabled: true, unearnedIncome: 1400 }],
      shelterCost: 1000,
      utilityStatus: "heating_cooling",
      medicalExpenses: 200,
      liquidAssets: 2000,
      verification: allVerified,
    },
    expected: { decision: "eligible", ongoingMonthlyBenefit: 298, netIncome: 0 },
    note:
      "Unearned 1400; std ded 209; medical (200−35)=165 → adjusted 1026. " +
      "Shelter 1000 + SUA 572 = 1572; minus 50%×1026 (513) = 1059; UNCAPPED (elderly/disabled). " +
      "Net = 1026 − 1059 = 0 (floored). Net 0 ≤ 1305. Benefit = 298 − 0 = 298 (max allotment).",
  },
  {
    name: "bbce_categorical",
    scenario: "BBCE case — over 130% gross but under 200%, saved by categorical eligibility (HH3)",
    household: {
      caseId: "KC-04",
      members: [
        { id: "m1", age: 38, earnedIncome: 3200 },
        { id: "m2", age: 36 },
        { id: "m3", age: 8 },
      ],
      shelterCost: 1200,
      utilityStatus: "heating_cooling",
      liquidAssets: 1500,
      verification: allVerified,
    },
    expected: { decision: "eligible", ongoingMonthlyBenefit: 259, netIncome: 1754.5 },
    note:
      "Gross 3200 > 130% limit 2888 (HH3) but ≤ 200% BBCE limit 4442 → categorically eligible " +
      "(gross + asset tests bypassed). 20% earned ded 640; std ded (HH3) 209 → adjusted 2351. " +
      "Shelter 1200 + SUA 572 = 1772; minus 50%×2351 (1175.5) = 596.5 (< 744 cap). " +
      "Net = 2351 − 596.5 = 1754.5 ≤ 2221. Benefit = 785 − round(0.30×1754.5=526.35→526) = 259.",
  },
  {
    name: "expedited_service",
    scenario: "Expedited-service case — 7-day standard (HH1)",
    household: {
      caseId: "KC-05",
      members: [{ id: "m1", age: 29, unearnedIncome: 120 }],
      shelterCost: 700,
      utilityStatus: "heating_cooling",
      liquidAssets: 50,
      verification: allVerified,
    },
    expected: {
      decision: "eligible",
      ongoingMonthlyBenefit: 298,
      expeditedEligible: true,
      netIncome: 0,
    },
    note:
      "Gross 120 < $150 AND liquid 50 ≤ $100 → expedited (§401), 7-day standard. " +
      "Std ded 209 → adjusted max(0,120−209)=0. Shelter 700 + SUA 572 = 1272; minus 50%×0 = 1272; " +
      "capped 744. Net 0. Benefit = 298 − 0 = 298.",
  },
  {
    name: "minimum_benefit",
    scenario: "Minimum-benefit case — eligible but computed benefit below $24 (HH2)",
    household: {
      caseId: "KC-06",
      members: [
        { id: "m1", age: 45, earnedIncome: 2449 },
        { id: "m2", age: 43 },
      ],
      utilityStatus: "none",
      liquidAssets: 800,
      verification: allVerified,
    },
    expected: { decision: "eligible", ongoingMonthlyBenefit: 24, netIncome: 1750.2 },
    note:
      "Earned 2449; 20% ded 489.8; std ded (HH2) 209 → adjusted/net 1750.2 (no shelter). " +
      "BBCE (≤ 3526) bypasses gross; net 1750.2 ≤ 1763. " +
      "Benefit = 546 − round(0.30×1750.2=525.06→525) = 21 → below $24 minimum → $24.",
  },
  {
    name: "pending_verification",
    scenario: "Unverified material input — §408 holds the case (never auto-denied)",
    household: {
      caseId: "KC-07",
      members: [{ id: "m1", age: 34, earnedIncome: 1200 }],
      shelterCost: 900,
      utilityStatus: "heating_cooling",
      liquidAssets: 500,
      verification: { ...allVerified, earnedIncome: "unverified" },
    },
    expected: { decision: "pending_verification", ongoingMonthlyBenefit: 296, monthlyBenefit: 296 },
    note:
      "Identical to KC-01 but earned income is UNVERIFIED. Per §408 the engine returns " +
      "'pending verification — human review' (never a denial) while still showing the provisional $296.",
  },
  {
    name: "first_month_proration",
    scenario: "First-month proration from application date (HH1, §411/§412)",
    household: {
      caseId: "KC-08",
      members: [{ id: "m1", age: 34, earnedIncome: 1200 }],
      shelterCost: 900,
      utilityStatus: "heating_cooling",
      liquidAssets: 500,
      applicationDay: 16,
      verification: allVerified,
    },
    expected: { decision: "eligible", ongoingMonthlyBenefit: 296, monthlyBenefit: 148 },
    note:
      "Same as KC-01 (ongoing 296) but application on day 16 of a 30-day month: " +
      "(30−16+1)/30 = 15/30 = 0.5 → floor(296×0.5) = 148 first-month benefit.",
  },
];
