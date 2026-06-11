/**
 * agp/builders.ts — pure functions that turn engine output into AGP objects.
 *
 * This is the ONE place the vendored bellagio engine is invoked. Both the MCP
 * tools and the REST bridge call through here, so the two surfaces never drift.
 */
import { determine } from "@/lib/engine";
import { runPrecertQC } from "@/lib/qc/precert_checks";
import type { Household } from "@/lib/models";
import type {
  Actor,
  Authorization,
  EligibilityResult,
  Receipt,
  ReceiptStatus,
  ServiceRequest,
} from "@/agp/types";
import { MATERIAL_FACTS } from "@/agp/catalog";
import { id } from "@/agp/store";

/** Material facts currently marked "unverified" on the household. */
function unverifiedFacts(hh: Household): EligibilityResult["unverifiedFacts"] {
  const v = hh.verification ?? {};
  return MATERIAL_FACTS.filter((f) => v[f] === "unverified");
}

/** AGP Step 2 — run the real engine + QC and shape the result. */
export function toEligibilityResult(serviceId: string, hh: Household): EligibilityResult {
  const determination = determine(hh);
  const qcFindings = runPrecertQC({
    household: hh,
    determination,
    statedBenefit: determination.ongoingMonthlyBenefit,
  });
  return {
    type: "EligibilityResult",
    serviceId,
    decision: determination.decision,
    monthlyBenefit: determination.monthlyBenefit,
    ongoingMonthlyBenefit: determination.ongoingMonthlyBenefit,
    expeditedEligible: determination.expeditedEligible,
    rationale: determination.rationale,
    flags: determination.flags,
    qcFindings,
    unverifiedFacts: unverifiedFacts(hh),
    computation: determination.computation,
  };
}

/** AGP Step 3 — a scoped, demo-unsigned Authorization. */
export function buildAuthorization(args: {
  serviceId: string;
  actor: Actor;
  constituentRef: string;
  scope?: string[];
  now: string;
}): Authorization {
  return {
    type: "Authorization",
    authorizationId: id("auth"),
    serviceId: args.serviceId,
    actor: args.actor,
    constituentRef: args.constituentRef,
    scope: args.scope ?? ["identity", "income", "household", "residency"],
    issuedAt: args.now,
    proof: {
      type: "demo-unsigned",
      note: "Demo authorization. AGP v0.1 defers the cryptographic proof of consent to a companion layer.",
    },
  };
}

/** Map the engine decision onto an AGP Receipt status (validate-after honored). */
export function receiptStatusFor(decision: EligibilityResult["decision"]): ReceiptStatus {
  switch (decision) {
    case "pending_verification":
      return "provisional_approval"; // never an auto-denial
    case "eligible":
      return "approved";
    case "ineligible":
      return "denied";
    case "needs_human_review":
      return "needs_human_review";
  }
}

/** AGP Step 4→5 — build the Receipt/StatusRecord for a submitted request. */
export function buildReceipt(args: {
  request: ServiceRequest;
  result: EligibilityResult;
  now: string;
}): Receipt {
  const { request, result, now } = args;
  const status = receiptStatusFor(result.decision);
  return {
    type: "Receipt",
    receiptId: id("rcpt"),
    requestId: request.requestId,
    serviceId: request.serviceId,
    status,
    decisionSnapshot: result,
    auditTrail: [
      { at: now, event: "request_received", detail: `authorization ${request.authorizationId}` },
      { at: now, event: "determination_run", detail: `decision=${result.decision}` },
    ],
    correctionPath: {
      description:
        status === "provisional_approval"
          ? "Provisionally approved under validate-after. Verify the material facts below to finalize."
          : "If anything is wrong, submit a correction or appeal through MD DHS.",
      requiredFacts: result.unverifiedFacts,
      howTo: "Upload a supporting document (e.g. termination letter, bank statement) to verify each fact.",
    },
    createdAt: now,
    updatedAt: now,
  };
}

/** Re-run the determination on an existing Receipt and update it in place. */
export function refreshReceipt(receipt: Receipt, hh: Household, now: string): Receipt {
  const result = toEligibilityResult(receipt.serviceId, hh);
  const status = receiptStatusFor(result.decision);
  receipt.decisionSnapshot = result;
  receipt.status = status;
  receipt.correctionPath.requiredFacts = result.unverifiedFacts;
  receipt.auditTrail.push({ at: now, event: "re_determined", detail: `decision=${result.decision}` });
  receipt.updatedAt = now;
  return receipt;
}

export function buildServiceRequest(args: {
  serviceId: string;
  authorizationId: string;
  household: Household;
  now: string;
}): ServiceRequest {
  return {
    type: "ServiceRequest",
    requestId: id("req"),
    serviceId: args.serviceId,
    authorizationId: args.authorizationId,
    household: args.household,
    submittedAt: args.now,
  };
}
