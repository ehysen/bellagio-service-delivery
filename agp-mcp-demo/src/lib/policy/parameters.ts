/**
 * AUTHORITATIVE POLICY PARAMETERS — FY2026 (effective Oct 1 2025 – Sep 30 2026)
 *
 * Source hierarchy (per the build brief data-quality rule):
 *   1. USDA FNS FY2026 COLA memo (federal allotments, deductions, caps).
 *   2. Maryland DHS §600 "Standards for Income and Deductions" (SEPT 2025) and
 *      the Maryland "Income Guidelines as of October 2025" table — the
 *      authoritative MD dollar figures, verified against the published document.
 *   3. Maryland §214 "Utility Allowances" for SUA/LUA/telephone standards.
 *
 * If a third-party source disagrees with the above, the USDA memo / MD §600 win.
 * Every constant below carries the section it implements so the Translation
 * Report can map section -> parameter -> rule -> test.
 *
 * Verified figures (HH1): gross 130% = $1,696, net 100% = $1,305,
 * BBCE 200% = $2,610, max allotment = $298 — confirmed against the Maryland
 * "Income Guidelines as of October 2025 (Effective 10/01/2025)" document.
 */

export const POLICY_META = {
  jurisdiction: "Maryland Food Supplement Program (FSP/SNAP)",
  fiscalYear: "FY2026",
  effective: "2025-10-01",
  expires: "2026-09-30",
  region: "48 contiguous states + DC",
  sources: [
    "USDA FNS FY2026 SNAP COLA memo (eff. 2025-10-01)",
    "MD-FSP §600 Standards for Income and Deductions (SEPT 2025)",
    "MD DHS Income Guidelines as of October 2025 (Eff. 10/01/2025)",
    "MD-FSP §214 Utility Allowances (SEPT 2025)",
  ],
} as const;

/** Maximum monthly allotment by household size. §600 / USDA COLA. */
export const MAX_ALLOTMENT: Record<number, number> = {
  1: 298,
  2: 546,
  3: 785,
  4: 994,
  5: 1183,
  6: 1421,
  7: 1571,
  8: 1789,
};
/** Each additional person beyond 8. §600 / USDA COLA. */
export const MAX_ALLOTMENT_ADDL = 218;

/** Minimum benefit for eligible 1–2 person households. §600 / USDA COLA. */
export const MINIMUM_BENEFIT = 24;

/**
 * Standard deduction by household size. §600 / USDA COLA.
 * HH 1–3 = $209; 4 = $223; 5 = $261; 6+ = $299.
 */
export const STANDARD_DEDUCTION: Record<number, number> = {
  1: 209,
  2: 209,
  3: 209,
  4: 223,
  5: 261,
  6: 299,
};
export function standardDeduction(size: number): number {
  if (size <= 3) return 209;
  if (size === 4) return 223;
  if (size === 5) return 261;
  return 299; // 6 or more
}

/** Earned income deduction — statutory 20%. §212 / §600. */
export const EARNED_INCOME_DEDUCTION_RATE = 0.2;

/** Household contribution toward food — 30% of net income. §600 / allotment calc. */
export const HOUSEHOLD_CONTRIBUTION_RATE = 0.3;

/** Excess shelter deduction cap (uncapped if elderly/disabled member). §600. */
export const EXCESS_SHELTER_CAP = 744;

/** Shelter deduction uses 50% of adjusted income as the threshold. §213 / §600. */
export const SHELTER_INCOME_THRESHOLD_RATE = 0.5;

/** Maximum homeless household shelter deduction. §600 / USDA COLA. */
export const HOMELESS_SHELTER_DEDUCTION = 198.99;

/**
 * Maryland Standard Utility Allowances — §214 (eff. 10/01/2025).
 * SUA (heating/cooling) = $572; LUA (limited) = $350; Telephone = $40.
 * NOTE: the SUA/LUA values are mandatory standards in Maryland; verify the
 * exact figures against the live §214 PDF before production use.
 */
export const UTILITY_ALLOWANCE = {
  heating_cooling: 572, // Standard Utility Allowance (SUA)
  limited: 350, // Limited Utility Allowance (LUA)
  phone_only: 40, // Telephone standard
  none: 0,
} as const;

/**
 * Gross monthly income limit = 130% FPL, by household size.
 * MD Income Guidelines (Eff. 10/01/2025). +$596 per additional person.
 */
export const GROSS_INCOME_LIMIT_130: Record<number, number> = {
  1: 1696,
  2: 2292,
  3: 2888,
  4: 3483,
  5: 4079,
  6: 4675,
  7: 5271,
  8: 5867,
};
export const GROSS_INCOME_LIMIT_130_ADDL = 596;

/**
 * Net monthly income limit = 100% FPL, by household size.
 * MD Income Guidelines (Eff. 10/01/2025). +$459 per additional person.
 */
export const NET_INCOME_LIMIT_100: Record<number, number> = {
  1: 1305,
  2: 1763,
  3: 2221,
  4: 2680,
  5: 3138,
  6: 3596,
  7: 4055,
  8: 4513,
};
export const NET_INCOME_LIMIT_100_ADDL = 459;

/**
 * BBCE gross income limit = 200% FPL, by household size. §115.
 * MD Income Guidelines (Eff. 10/01/2025). +$918 per additional person.
 */
export const BBCE_GROSS_LIMIT_200: Record<number, number> = {
  1: 2610,
  2: 3526,
  3: 4442,
  4: 5360,
  5: 6276,
  6: 7192,
  7: 8110,
  8: 9026,
};
export const BBCE_GROSS_LIMIT_200_ADDL = 918;

/** Asset limits. §115. Bypassed under BBCE. */
export const ASSET_LIMIT_STANDARD = 3000;
export const ASSET_LIMIT_ELDERLY_DISABLED = 4500;

/** Age at which a member is "elderly" for SNAP. Federal rule. */
export const ELDERLY_AGE = 60;

/** Expedited screening thresholds. §401. */
export const EXPEDITED = {
  /** Gross monthly income below this AND liquid assets at/below assetCeiling. */
  grossIncomeCeiling: 150,
  liquidAssetCeiling: 100,
  /** OR combined gross income + liquid assets less than rent + utilities. */
  rentUtilityRuleEnabled: true,
  /** OR destitute migrant/seasonal farmworker (flagged, judgment-based). */
} as const;

/** Helper: scale a by-size table beyond size 8 with the additional-person step. */
export function scaledLimit(
  table: Record<number, number>,
  addlStep: number,
  size: number,
): number {
  if (size <= 8) return table[size];
  return table[8] + (size - 8) * addlStep;
}

export function maxAllotment(size: number): number {
  if (size <= 8) return MAX_ALLOTMENT[size];
  return MAX_ALLOTMENT[8] + (size - 8) * MAX_ALLOTMENT_ADDL;
}
