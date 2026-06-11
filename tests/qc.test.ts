import { describe, it, expect } from "vitest";
import { runPrecertQC } from "@/lib/qc/precert_checks";
import type { Household } from "@/lib/models";

const base = (over: Partial<Household>): Household => ({
  members: [{ id: "m1", age: 40, earnedIncome: 1000 }],
  utilityStatus: "heating_cooling",
  shelterCost: 800,
  verification: { shelterCost: "verified" },
  ...over,
});

describe("Pre-certification QC checker — deliberately-broken cases", () => {
  it("flags claimed expenses exceeding earned income with no unearned income", () => {
    const hh = base({
      members: [{ id: "m1", age: 40, earnedIncome: 300 }],
      shelterCost: 1500,
      utilityStatus: "heating_cooling",
    });
    const codes = runPrecertQC({ household: hh }).map((f) => f.code);
    expect(codes).toContain("expenses_exceed_earned_income");
  });

  it("flags a homeless household that still claims a shelter expense", () => {
    const hh = base({ homeless: true, shelterCost: 600, utilityStatus: "heating_cooling" });
    const codes = runPrecertQC({ household: hh }).map((f) => f.code);
    expect(codes).toContain("homeless_with_shelter_expense");
  });

  it("flags elderly/disabled with no medical detail", () => {
    const hh = base({
      members: [{ id: "m1", age: 70, elderly: true, unearnedIncome: 1100 }],
      medicalExpenses: 0,
    });
    const codes = runPrecertQC({ household: hh }).map((f) => f.code);
    expect(codes).toContain("elderly_disabled_no_medical");
  });

  it("flags disability status with no associated unearned income", () => {
    const hh = base({
      members: [{ id: "m1", age: 45, disabled: true, earnedIncome: 500 }],
    });
    const codes = runPrecertQC({ household: hh }).map((f) => f.code);
    expect(codes).toContain("disability_without_unearned_income");
  });

  it("flags a shelter deduction taken without verified underlying documentation", () => {
    const hh = base({
      members: [{ id: "m1", age: 40, earnedIncome: 1000 }],
      shelterCost: 900,
      utilityStatus: "heating_cooling",
      verification: { shelterCost: "unverified" },
    });
    const codes = runPrecertQC({ household: hh }).map((f) => f.code);
    expect(codes).toContain("shelter_deduction_unsupported");
  });

  it("flags a delta between the stated benefit and the independent recomputation", () => {
    const hh = base({
      members: [{ id: "m1", age: 34, earnedIncome: 1200 }],
      shelterCost: 900,
      utilityStatus: "heating_cooling",
      verification: { shelterCost: "verified" },
    });
    // Engine recomputes 296; stating 350 should trip a high-severity delta.
    const findings = runPrecertQC({ household: hh, statedBenefit: 350 });
    const delta = findings.find((f) => f.code === "benefit_recomputation_delta");
    expect(delta).toBeDefined();
    expect(delta!.severity).toBe("high");
  });

  it("produces no findings for a clean, fully-documented case", () => {
    const hh = base({
      members: [{ id: "m1", age: 34, earnedIncome: 1200 }],
      shelterCost: 900,
      utilityStatus: "heating_cooling",
      verification: { shelterCost: "verified" },
    });
    const findings = runPrecertQC({ household: hh, statedBenefit: 296 });
    expect(findings).toHaveLength(0);
  });
});
