/**
 * agp/verification.ts — apply extracted facts to a Household.
 *
 * Clones the household, flips verification[fact] -> "verified", and writes the
 * extracted numeric value into the right field. Callers then re-run the engine
 * so a previously pending_verification case can become a real determination.
 *
 * Convention: extracted earned income is written to the single primary earner
 * (members[0]) — the demo households are single-earner, matching the AGP
 * "SNAP after a job loss" worked example.
 */
import type { Household, UtilityStatus } from "@/lib/models";
import type { ExtractedFact } from "@/agp/extractor";

export function applyFacts(hh: Household, facts: ExtractedFact[]): Household {
  // Deep-ish clone (members array + verification map are the mutable bits).
  const next: Household = {
    ...hh,
    members: hh.members.map((m) => ({ ...m })),
    verification: { ...(hh.verification ?? {}) },
  };

  for (const f of facts) {
    next.verification![f.fact] = "verified";
    if (f.value === undefined) continue;

    switch (f.fact) {
      case "earnedIncome":
        if (next.members.length > 0) next.members[0].earnedIncome = f.value;
        break;
      case "unearnedIncome":
        if (next.members.length > 0) next.members[0].unearnedIncome = f.value;
        break;
      case "liquidAssets":
        next.liquidAssets = f.value;
        break;
      case "shelterCost":
        next.shelterCost = f.value;
        break;
      default:
        // identity / utilityStatus etc. — verification flag only, no numeric write.
        break;
    }
  }
  return next;
}

/** Optional helper to set utility status explicitly (utility-bill upload). */
export function setUtilityStatus(hh: Household, status: UtilityStatus): Household {
  return { ...hh, utilityStatus: status, verification: { ...(hh.verification ?? {}), utilityStatus: "verified" } };
}
