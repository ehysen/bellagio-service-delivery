/**
 * agp/types.ts — AGP v0.1 process objects, as TypeScript interfaces.
 *
 * These WRAP (do not replace) the bellagio engine's domain types. The engine
 * computes the eligibility determination; AGP's job is to carry that through a
 * standard flow — Service → EligibilityRule → Authorization → ServiceRequest →
 * Receipt — that an agent (Claude/ChatGPT) can speak over MCP.
 *
 * Spec mapping (ehysen/agentic-government-protocol, content.js "concepts"/"flow"):
 *   Service          — a published government service + what it requires.
 *   EligibilityRule  — the machine-readable rule the agency owns.
 *   Authorization    — a scoped, constituent-granted permission (demo-unsigned).
 *   ServiceRequest   — the standardized request the agent submits.
 *   Receipt          — the agency's standardized response + audit trail + recourse.
 */
import type {
  Household,
  Determination,
  RationaleStep,
  Flag,
  QCFinding,
  VerificationFact,
} from "@/lib/models";

/** The four AGP actors. */
export type Actor = "Constituent" | "Agent" | "Intermediary" | "Agency";

/** Document types this demo can verify a §408 material fact from. */
export type DocumentType =
  | "termination_letter"
  | "pay_stub"
  | "bank_statement"
  | "lease"
  | "utility_bill"
  | "photo_id";

/** AGP Step 1 — a published service (mirrors the spec's illustrative Service sketch). */
export interface Service {
  type: "Service";
  serviceId: string;
  name: string;
  agencyOfRecord: string;
  jurisdiction: string;
  description: string;
  channels: string[];
  requires: string[];
  eligibilityRuleId: string;
  /** AGP "validate-after": provision provisionally, verify later. */
  deliveryPattern: "validate-after" | "validate-before";
  supportedDocumentTypes: DocumentType[];
  status: "active";
}

/** AGP Step 2 — the machine-readable rule the agency owns. */
export interface EligibilityRule {
  type: "EligibilityRule";
  ruleId: string;
  serviceId: string;
  version: string;
  /** Plain-language summary of the gate + tests the engine applies. */
  summary: string;
  /** §408 material facts that, if unverified, hold the case as pending. */
  materialFacts: VerificationFact[];
  /** Cited FY2026 policy parameters, echoed from the engine's parameters.ts. */
  policyParameters: Record<string, unknown>;
  citations: string[];
}

/** AGP Step 2 result — the determination, AGP-shaped (wraps the engine output). */
export interface EligibilityResult {
  type: "EligibilityResult";
  serviceId: string;
  decision: Determination["decision"];
  monthlyBenefit: number;
  ongoingMonthlyBenefit: number;
  expeditedEligible: boolean;
  rationale: RationaleStep[];
  flags: Flag[];
  qcFindings: QCFinding[];
  /** Material facts still unverified — what the constituent must resolve. */
  unverifiedFacts: VerificationFact[];
  computation: Determination["computation"];
}

/** AGP Step 3 — scoped, constituent-granted permission. Demo-unsigned. */
export interface Authorization {
  type: "Authorization";
  authorizationId: string;
  serviceId: string;
  actor: Actor;
  constituentRef: string;
  scope: string[];
  issuedAt: string;
  proof: { type: "demo-unsigned"; note: string };
}

/** AGP Step 4 — the standardized request the agent submits. */
export interface ServiceRequest {
  type: "ServiceRequest";
  requestId: string;
  serviceId: string;
  authorizationId: string;
  household: Household;
  submittedAt: string;
}

export interface AuditEntry {
  at: string;
  event: string;
  detail?: string;
}

export type ReceiptStatus =
  | "provisional_approval" // engine "pending_verification" under validate-after
  | "approved"
  | "denied"
  | "needs_human_review";

/** AGP Step 5 — the agency's standardized response + audit trail + recourse. */
export interface Receipt {
  type: "Receipt";
  receiptId: string;
  requestId: string;
  serviceId: string;
  status: ReceiptStatus;
  decisionSnapshot: EligibilityResult;
  auditTrail: AuditEntry[];
  correctionPath: {
    description: string;
    requiredFacts: VerificationFact[];
    howTo: string;
  };
  createdAt: string;
  updatedAt: string;
}
