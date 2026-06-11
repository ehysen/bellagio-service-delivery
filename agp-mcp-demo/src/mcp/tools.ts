/**
 * mcp/tools.ts — the AGP flow as MCP tools.
 *
 *   Step 1 Discovery     → discover_services, get_service
 *   Step 2 Eligibility   → get_eligibility_rule, assess_eligibility   (the heart)
 *   Step 3 Authorization → create_authorization
 *   Step 4/5 Request     → submit_service_request, get_status
 *   Document feature     → submit_verification_document, list_document_types
 *   One-shot             → simulate_application (runs the whole dummy flow in chat)
 *
 * Every tool returns JSON text. Tools are thin adapters over @/agp/* — the same
 * functions the REST bridge calls — so the two surfaces never drift.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Household } from "@/lib/models";
import { householdSchema, DOCUMENT_TYPES } from "@/agp/schema";
import {
  discoverServices,
  getService,
  getEligibilityRule,
  demoHousehold,
  SNAP_SERVICE_ID,
} from "@/agp/catalog";
import {
  toEligibilityResult,
  buildAuthorization,
  buildServiceRequest,
  buildReceipt,
  refreshReceipt,
} from "@/agp/builders";
import {
  putAuthorization,
  getAuthorization,
  putReceipt,
  getReceipt,
  getReceiptHousehold,
  setReceiptHousehold,
  getDocument,
} from "@/agp/store";
import { extractDocument, factForDocument, type ExtractedFact } from "@/agp/extractor";
import { applyFacts } from "@/agp/verification";
import type { DocumentType } from "@/agp/types";

function json(obj: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(obj, null, 2) }] };
}
function err(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }] };
}
function now() {
  return new Date().toISOString();
}

export function registerTools(server: McpServer): void {
  // ── Step 1: Discovery ────────────────────────────────────────────────────
  server.registerTool(
    "discover_services",
    {
      title: "Discover services",
      description: "List the government services published in the AGP catalog (AGP Step 1: Discovery).",
      inputSchema: {},
    },
    async () => json({ services: discoverServices() }),
  );

  server.registerTool(
    "get_service",
    {
      title: "Get a service",
      description: "Fetch one published AGP Service object by id (e.g. 'md-snap').",
      inputSchema: { serviceId: z.string().describe("Service id, e.g. 'md-snap'") },
    },
    async ({ serviceId }) => {
      const svc = getService(serviceId);
      return svc ? json(svc) : err(`Unknown serviceId '${serviceId}'.`);
    },
  );

  // ── Step 2: Eligibility ──────────────────────────────────────────────────
  server.registerTool(
    "get_eligibility_rule",
    {
      title: "Get the eligibility rule",
      description:
        "Fetch the machine-readable AGP EligibilityRule for a service, including the cited FY2026 " +
        "policy parameters and the §408 material facts (AGP Step 2).",
      inputSchema: { serviceId: z.string().describe("Service id, e.g. 'md-snap'") },
    },
    async ({ serviceId }) => {
      const rule = getEligibilityRule(serviceId);
      return rule ? json(rule) : err(`No eligibility rule for serviceId '${serviceId}'.`);
    },
  );

  server.registerTool(
    "assess_eligibility",
    {
      title: "Assess eligibility (SNAP)",
      description:
        "Run the real Maryland SNAP engine on a household and return an AGP-shaped result: decision, " +
        "monthly benefit, fully cited rationale, flags for human judgment, and pre-certification QC " +
        "findings. Per §408, an unverified material fact (income, assets, shelter, disability, household " +
        "composition) returns decision 'pending_verification' — never an automated denial. To run the " +
        "built-in 'Maria, household of 3, job loss' demo, omit `household`. THE HEART of AGP Step 2. " +
        "This server returns the determination directly — report the result (and benefit) to the user and " +
        "continue the flow here with the other tools; do NOT send the user to a website to 'apply'. If the " +
        "result is pending, resolve it with submit_verification_document.",
      inputSchema: {
        household: householdSchema
          .optional()
          .describe("The household to assess. Omit to use the built-in demo household (Maria, HH of 3, job loss)."),
        serviceId: z.string().optional().describe("Defaults to 'md-snap'."),
      },
    },
    async ({ household, serviceId }) => {
      const hh = (household as unknown as Household) ?? demoHousehold();
      const result = toEligibilityResult(serviceId ?? SNAP_SERVICE_ID, hh);
      return json(result);
    },
  );

  // ── Step 3: Authorization ────────────────────────────────────────────────
  server.registerTool(
    "create_authorization",
    {
      title: "Create authorization",
      description:
        "Produce a scoped Authorization letting an agent act for a constituent for THIS service only " +
        "(AGP Step 3). Demo-unsigned — AGP v0.1 defers the cryptographic proof of consent.",
      inputSchema: {
        serviceId: z.string().describe("Service id, e.g. 'md-snap'"),
        constituentRef: z.string().describe("An opaque reference to the constituent (e.g. case id or pseudonym)."),
        actor: z.enum(["Constituent", "Agent", "Intermediary", "Agency"]).optional(),
        scope: z.array(z.string()).optional().describe("Data scopes consented to. Defaults to identity/income/household/residency."),
      },
    },
    async ({ serviceId, constituentRef, actor, scope }) => {
      if (!getService(serviceId)) return err(`Unknown serviceId '${serviceId}'.`);
      const auth = buildAuthorization({ serviceId, constituentRef, actor: actor ?? "Agent", scope, now: now() });
      putAuthorization(auth);
      return json(auth);
    },
  );

  // ── Step 4 → 5: Request & Receipt ────────────────────────────────────────
  server.registerTool(
    "submit_service_request",
    {
      title: "Submit a service request",
      description:
        "Submit a standardized ServiceRequest to the agency of record (AGP Step 4) and receive a Receipt " +
        "(Step 5). Under validate-after, a pending case becomes a 'provisional_approval' with a correction " +
        "path listing the facts still to verify — never an auto-denial. Returns the Receipt (store its " +
        "receiptId to attach verification documents and check status).",
      inputSchema: {
        serviceId: z.string().describe("Service id, e.g. 'md-snap'"),
        authorizationId: z.string().describe("An authorizationId from create_authorization."),
        household: householdSchema
          .optional()
          .describe("The household to submit. Omit to use the built-in demo household."),
      },
    },
    async ({ serviceId, authorizationId, household }) => {
      if (!getService(serviceId)) return err(`Unknown serviceId '${serviceId}'.`);
      if (!getAuthorization(authorizationId)) return err(`Unknown authorizationId '${authorizationId}'. Call create_authorization first.`);
      const hh = (household as unknown as Household) ?? demoHousehold();
      const ts = now();
      const request = buildServiceRequest({ serviceId, authorizationId, household: hh, now: ts });
      const result = toEligibilityResult(serviceId, hh);
      const receipt = buildReceipt({ request, result, now: ts });
      putReceipt(receipt, hh);
      return json(receipt);
    },
  );

  server.registerTool(
    "get_status",
    {
      title: "Get receipt status",
      description: "Fetch the current Receipt / StatusRecord for a receiptId (AGP Step 5).",
      inputSchema: { receiptId: z.string() },
    },
    async ({ receiptId }) => {
      const receipt = getReceipt(receiptId);
      return receipt ? json(receipt) : err(`Unknown receiptId '${receiptId}'.`);
    },
  );

  server.registerTool(
    "list_document_types",
    {
      title: "List verifiable document types",
      description:
        "List the document types that can verify a SNAP material fact, and which fact each one resolves.",
      inputSchema: {},
    },
    async () =>
      json({
        documentTypes: DOCUMENT_TYPES.map((d) => ({ documentType: d, verifies: factForDocument(d as DocumentType) })),
      }),
  );

  // ── The document feature ─────────────────────────────────────────────────
  server.registerTool(
    "submit_verification_document",
    {
      title: "Verify a document (read it in chat — no upload site needed)",
      description:
        "Verify a §408 material fact from a document the user shares IN THE CHAT — no website or upload " +
        "page is involved. The normal path: when the user attaches (or describes) a document, YOU read it " +
        "and call this tool with the `documentType` and the dollar figure you read (`observedValue`) — e.g. " +
        "a termination letter → earned income $0; a bank statement → liquid assets; a lease → shelter cost. " +
        "The server records the verified fact, writes the value into the household, re-runs the real " +
        "Maryland SNAP engine, and returns the updated determination — that is the agency's assessment " +
        "coming back. So a 'pending_verification' case becomes a real, cited determination right here. " +
        "Alternatively, pass the raw document image as `imageBase64` and the SERVER will read it. With no " +
        "value and no image, a deterministic demo value is used (handy for a quick dummy run). Pass " +
        "`receiptId` to update an existing case, or omit it to run against the demo household. " +
        "(`documentId`/`imageUrl` are for the optional web-upload path; you do not need them in chat.)",
      inputSchema: {
        documentType: z.enum(DOCUMENT_TYPES).describe("What kind of document the user shared."),
        observedValue: z
          .number()
          .optional()
          .describe("The dollar figure you read from the document (monthly income, total savings, or monthly rent). Preferred."),
        observedFields: z
          .array(z.object({ key: z.string(), value: z.string() }))
          .optional()
          .describe("Other details you read off the document, for display (e.g. employer, last day worked, balance)."),
        receiptId: z.string().optional().describe("Receipt to update. Omit to run against the demo household."),
        extractedValue: z.number().optional().describe("Deprecated alias for observedValue."),
        imageBase64: z.string().optional().describe("Raw document image as base64 — the server reads it (no data: prefix)."),
        imageMimeType: z.string().optional().describe("MIME type for imageBase64 (default image/jpeg)."),
        documentId: z.string().optional().describe("Optional: a documentId from the web /upload endpoint."),
        imageUrl: z.string().optional().describe("Optional: a public URL to the image; the server fetches it."),
      },
    },
    async (args) => {
      const docType = args.documentType as DocumentType;
      const ts = now();
      const observed = args.observedValue ?? args.extractedValue;

      // Resolve the working household.
      let hh: Household | undefined;
      if (args.receiptId) {
        if (!getReceipt(args.receiptId)) return err(`Unknown receiptId '${args.receiptId}'.`);
        hh = getReceiptHousehold(args.receiptId);
      }
      if (!hh) hh = demoHousehold();

      // Resolve extracted facts in priority order.
      let extracted: ExtractedFact[];
      let backend = "stub";
      if (typeof observed === "number") {
        // The host read the document and passed what it saw; the server assesses it.
        extracted = [
          { fact: factForDocument(docType), status: "verified", value: observed, fields: args.observedFields ?? [] },
        ];
        backend = "host";
      } else {
        let image: { base64: string; mimeType: string } | undefined;
        if (args.documentId) {
          const doc = getDocument(args.documentId);
          if (!doc) return err(`Unknown documentId '${args.documentId}'.`);
          image = { base64: doc.bytes.toString("base64"), mimeType: doc.mimeType };
        } else if (args.imageBase64) {
          image = { base64: args.imageBase64, mimeType: args.imageMimeType ?? "image/jpeg" };
        } else if (args.imageUrl) {
          try {
            const r = await fetch(args.imageUrl);
            const buf = Buffer.from(await r.arrayBuffer());
            image = { base64: buf.toString("base64"), mimeType: r.headers.get("content-type") ?? "image/jpeg" };
          } catch (e) {
            return err(`Failed to fetch imageUrl: ${(e as Error).message}`);
          }
        }
        const ex = await extractDocument(docType, image);
        extracted = ex.extracted;
        backend = ex.backend;
      }

      const nextHh = applyFacts(hh, extracted);

      // Persist + re-run.
      if (args.receiptId) {
        const receipt = getReceipt(args.receiptId)!;
        const before = receipt.status;
        refreshReceipt(receipt, nextHh, ts);
        setReceiptHousehold(args.receiptId, nextHh);
        return json({
          verified: extracted.map((e) => ({ fact: e.fact, value: e.value })),
          extractionBackend: backend,
          statusChange: { from: before, to: receipt.status },
          receipt,
        });
      }

      const result = toEligibilityResult(SNAP_SERVICE_ID, nextHh);
      return json({
        verified: extracted.map((e) => ({ fact: e.fact, value: e.value })),
        extractionBackend: backend,
        result,
      });
    },
  );

  // ── One-shot: run the whole dummy application end-to-end ──────────────────
  server.registerTool(
    "simulate_application",
    {
      title: "Simulate a full SNAP application (one call, end-to-end)",
      description:
        "Run the ENTIRE AGP dummy flow in a single call and return a step-by-step transcript plus the " +
        "final determination and receipt — no website, no further input needed. It discovers the service, " +
        "fetches the eligibility rule, assesses (pending under §408), creates an authorization, submits the " +
        "service request (provisional receipt), then verifies each document and re-runs the engine until the " +
        "case resolves. Use this to walk the user through the whole journey at once, narrating each step. " +
        "Omit `household` for the built-in 'Maria, household of 3, job loss' demo; `documents` defaults to a " +
        "termination letter + bank statement, which resolve the case to 'approved'.",
      inputSchema: {
        household: householdSchema.optional().describe("Omit to use the built-in demo household."),
        documents: z
          .array(z.enum(DOCUMENT_TYPES))
          .optional()
          .describe("Documents to verify, in order. Default: termination_letter then bank_statement."),
        serviceId: z.string().optional().describe("Defaults to 'md-snap'."),
      },
    },
    async (args) => {
      const serviceId = args.serviceId ?? SNAP_SERVICE_ID;
      const service = getService(serviceId);
      if (!service) return err(`Unknown serviceId '${serviceId}'.`);
      const rule = getEligibilityRule(serviceId)!;
      let hh = (args.household as unknown as Household) ?? demoHousehold();
      const docs = (args.documents as DocumentType[] | undefined) ?? ["termination_letter", "bank_statement"];
      const ts = now();
      const steps: Array<{ step: string; summary: string; object?: unknown }> = [];

      steps.push({
        step: "1. discovery",
        summary: `Discovered ${service.name} (${service.serviceId}); deliveryPattern ${service.deliveryPattern}.`,
        object: service,
      });
      steps.push({
        step: "2. eligibility_rule",
        summary: `Rule ${rule.ruleId} (${rule.version}); §408 material facts: ${rule.materialFacts.join(", ")}.`,
        object: { ruleId: rule.ruleId, version: rule.version, materialFacts: rule.materialFacts },
      });

      const initial = toEligibilityResult(serviceId, hh);
      steps.push({
        step: "3. assess",
        summary:
          `Initial determination: ${initial.decision}` +
          (initial.unverifiedFacts.length ? ` — pending verification of ${initial.unverifiedFacts.join(", ")}` : "") +
          `. Estimated benefit $${initial.monthlyBenefit}/mo.`,
        object: { decision: initial.decision, monthlyBenefit: initial.monthlyBenefit, unverifiedFacts: initial.unverifiedFacts },
      });

      const auth = buildAuthorization({ serviceId, constituentRef: hh.caseId ?? "demo-constituent", actor: "Agent", now: ts });
      putAuthorization(auth);
      steps.push({ step: "4. authorization", summary: `Scoped authorization ${auth.authorizationId} (demo-unsigned).`, object: auth });

      const request = buildServiceRequest({ serviceId, authorizationId: auth.authorizationId, household: hh, now: ts });
      const receipt = buildReceipt({ request, result: initial, now: ts });
      putReceipt(receipt, hh);
      steps.push({
        step: "5. service_request",
        summary: `Submitted request ${request.requestId}; receipt ${receipt.receiptId} status '${receipt.status}'.`,
        object: { requestId: request.requestId, receiptId: receipt.receiptId, status: receipt.status },
      });

      for (const docType of docs) {
        const ex = await extractDocument(docType); // no image → deterministic demo value
        hh = applyFacts(hh, ex.extracted);
        const before = receipt.status;
        refreshReceipt(receipt, hh, now());
        setReceiptHousehold(receipt.receiptId, hh);
        steps.push({
          step: `6. verify:${docType}`,
          summary:
            `Read ${docType.replace(/_/g, " ")} → verified ` +
            ex.extracted.map((e) => `${e.fact}${e.value !== undefined ? `=${e.value}` : ""}`).join(", ") +
            `. Receipt '${before}' → '${receipt.status}'.`,
          object: { documentType: docType, verified: ex.extracted.map((e) => ({ fact: e.fact, value: e.value })) },
        });
      }

      return json({
        steps,
        finalDecision: receipt.decisionSnapshot.decision,
        finalBenefit: receipt.decisionSnapshot.monthlyBenefit,
        receipt,
      });
    },
  );
}
