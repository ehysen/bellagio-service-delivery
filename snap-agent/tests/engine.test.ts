import { describe, it, expect } from "vitest";
import { determine } from "@/lib/engine";
import { KNOWN_CASES } from "@/lib/fixtures/households";

describe("SNAP determination engine — known-answer households (FY2026 §600)", () => {
  for (const kc of KNOWN_CASES) {
    describe(`${kc.name} — ${kc.scenario}`, () => {
      const det = determine(kc.household);

      it("matches the expected decision", () => {
        expect(det.decision).toBe(kc.expected.decision);
      });

      it("matches the expected ongoing monthly benefit to the dollar", () => {
        expect(det.ongoingMonthlyBenefit).toBe(kc.expected.ongoingMonthlyBenefit);
      });

      if (kc.expected.monthlyBenefit !== undefined) {
        it("matches the expected (prorated) monthly benefit", () => {
          expect(det.monthlyBenefit).toBe(kc.expected.monthlyBenefit);
        });
      }

      if (kc.expected.netIncome !== undefined) {
        it("matches the expected net income", () => {
          expect(det.computation.netIncome).toBe(kc.expected.netIncome);
        });
      }

      if (kc.expected.expeditedEligible !== undefined) {
        it("matches the expected expedited screening result", () => {
          expect(det.expeditedEligible).toBe(kc.expected.expeditedEligible);
        });
      }

      it("ships a citation on every rationale step (no citation -> it doesn't ship)", () => {
        for (const step of det.rationale) {
          expect(step.citation, `step ${step.step} missing citation`).toBeTruthy();
        }
      });
    });
  }

  it("never auto-denies on unverified material input (§408 guardrail)", () => {
    const pending = KNOWN_CASES.find((c) => c.name === "pending_verification")!;
    const det = determine(pending.household);
    expect(det.decision).not.toBe("ineligible");
    expect(det.decision).toBe("pending_verification");
    expect(det.flags.some((f) => f.code === "verification_required")).toBe(true);
  });
});
