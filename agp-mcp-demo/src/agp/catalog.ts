/**
 * agp/catalog.ts — the AGP Service catalog + EligibilityRule for the demo.
 *
 * One service: Maryland SNAP (FSP), FY2026, validate-after. The EligibilityRule
 * echoes the cited policy parameters from the vendored engine's parameters.ts —
 * single source of truth, no duplicated numbers.
 */
import type { Service, EligibilityRule, DocumentType } from "@/agp/types";
import type { Household, VerificationFact } from "@/lib/models";
import {
  POLICY_META,
  MAX_ALLOTMENT,
  MINIMUM_BENEFIT,
  GROSS_INCOME_LIMIT_130,
  NET_INCOME_LIMIT_100,
  BBCE_GROSS_LIMIT_200,
  ASSET_LIMIT_STANDARD,
  ASSET_LIMIT_ELDERLY_DISABLED,
  UTILITY_ALLOWANCE,
  STANDARD_DEDUCTION,
  EARNED_INCOME_DEDUCTION_RATE,
} from "@/lib/policy/parameters";

export const SNAP_SERVICE_ID = "md-snap";
export const SNAP_RULE_ID = "md-snap-rule";

/** §408 material facts — must match engine.ts MATERIAL_FACTS. */
export const MATERIAL_FACTS: VerificationFact[] = [
  "earnedIncome",
  "unearnedIncome",
  "shelterCost",
  "liquidAssets",
  "disability",
  "householdComposition",
];

const SUPPORTED_DOCS: DocumentType[] = [
  "termination_letter",
  "pay_stub",
  "bank_statement",
  "lease",
  "utility_bill",
  "photo_id",
];

export const SNAP_SERVICE: Service = {
  type: "Service",
  serviceId: SNAP_SERVICE_ID,
  name: "Maryland Food Supplement Program (SNAP)",
  agencyOfRecord: "Maryland Department of Human Services (MD DHS)",
  jurisdiction: "US-MD",
  description:
    "Monthly food assistance benefit. Supports a validate-after path for households " +
    "with a recent income loss: provisionally proceed on attested attributes, verify after.",
  channels: ["agp", "web", "in-person", "phone"],
  requires: ["identity", "householdSize", "income", "residency"],
  eligibilityRuleId: SNAP_RULE_ID,
  deliveryPattern: "validate-after",
  supportedDocumentTypes: SUPPORTED_DOCS,
  status: "active",
};

export const SNAP_ELIGIBILITY_RULE: EligibilityRule = {
  type: "EligibilityRule",
  ruleId: SNAP_RULE_ID,
  serviceId: SNAP_SERVICE_ID,
  version: POLICY_META.fiscalYear,
  summary:
    "Net income within 100% FPL and gross income within 130% FPL (or 200% under broad-based " +
    "categorical eligibility), assets within the §115 limit, benefit = max allotment − 30% of net " +
    "income. Per §408, any unverified MATERIAL fact (income, assets, shelter, disability, household " +
    "composition) holds the case as PENDING VERIFICATION — never an automated denial.",
  materialFacts: MATERIAL_FACTS,
  policyParameters: {
    jurisdiction: POLICY_META.jurisdiction,
    fiscalYear: POLICY_META.fiscalYear,
    effective: POLICY_META.effective,
    sources: POLICY_META.sources,
    maxAllotmentBySize: MAX_ALLOTMENT,
    minimumBenefit: MINIMUM_BENEFIT,
    grossIncomeLimit130: GROSS_INCOME_LIMIT_130,
    netIncomeLimit100: NET_INCOME_LIMIT_100,
    bbceGrossLimit200: BBCE_GROSS_LIMIT_200,
    assetLimitStandard: ASSET_LIMIT_STANDARD,
    assetLimitElderlyDisabled: ASSET_LIMIT_ELDERLY_DISABLED,
    utilityAllowance: UTILITY_ALLOWANCE,
    standardDeductionBySize: STANDARD_DEDUCTION,
    earnedIncomeDeductionRate: EARNED_INCOME_DEDUCTION_RATE,
  },
  citations: [
    "MD-FSP §409/§600 (income tests)",
    "MD-FSP §115 (categorical eligibility / asset limits)",
    "MD-FSP §212/§213/§214/§600 (deductions)",
    "MD-FSP §408 (verification gate)",
    "USDA FNS FY2026 SNAP COLA memo",
  ],
};

export function discoverServices(): Service[] {
  return [SNAP_SERVICE];
}

export function getService(serviceId: string): Service | undefined {
  return serviceId === SNAP_SERVICE_ID ? SNAP_SERVICE : undefined;
}

export function getEligibilityRule(serviceId: string): EligibilityRule | undefined {
  return serviceId === SNAP_SERVICE_ID ? SNAP_ELIGIBILITY_RULE : undefined;
}

/**
 * The canonical demo household: "Maria", household of 3, recent job loss.
 * earnedIncome and liquidAssets start UNVERIFIED, so the engine returns
 * pending_verification (the §408 gate). Snapping a termination letter verifies
 * income (= $0); snapping a bank statement verifies assets (≤ $3,000); once both
 * resolve, the case becomes a real determination at the HH-3 max allotment.
 */
export function demoHousehold(): Household {
  return {
    caseId: "demo-maria",
    members: [
      { id: "maria", age: 34, earnedIncome: 0, unearnedIncome: 0 },
      { id: "child-1", age: 8 },
      { id: "child-2", age: 5 },
    ],
    shelterCost: 1450,
    utilityStatus: "heating_cooling",
    liquidAssets: 320,
    verification: {
      earnedIncome: "unverified",
      liquidAssets: "unverified",
    },
  };
}
