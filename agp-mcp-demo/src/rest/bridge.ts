/**
 * rest/bridge.ts — a thin REST mirror of the MCP tools, for the browser app.
 *
 * Browsers can't speak MCP, so these endpoints expose the same @/agp/* core the
 * MCP tools use. Field names match the EligibilityResult / Receipt types, so the
 * forked frontend reads them directly.
 */
import { Router } from "express";
import type { Household } from "@/lib/models";
import { householdSchema } from "@/agp/schema";
import {
  discoverServices,
  getService,
  getEligibilityRule,
  demoHousehold,
  SNAP_SERVICE,
  SNAP_ELIGIBILITY_RULE,
  SNAP_SERVICE_ID,
} from "@/agp/catalog";
import {
  toEligibilityResult,
  buildAuthorization,
  buildServiceRequest,
  buildReceipt,
} from "@/agp/builders";
import { putAuthorization, putReceipt, getReceipt } from "@/agp/store";
import { applyFacts } from "@/agp/verification";
import type { ExtractedFact } from "@/agp/extractor";

const router = Router();
const now = () => new Date().toISOString();

/** Resolve a household from the request body (or the demo) and apply verified facts. */
function resolveHousehold(body: any): Household {
  let hh: Household;
  if (body?.household) {
    const parsed = householdSchema.safeParse(body.household);
    hh = (parsed.success ? parsed.data : body.household) as unknown as Household;
  } else {
    hh = demoHousehold();
  }
  const verifiedFacts = (body?.verifiedFacts ?? []) as ExtractedFact[];
  return verifiedFacts.length ? applyFacts(hh, verifiedFacts) : hh;
}

router.get("/services", (_req, res) => {
  res.json({ services: discoverServices() });
});

router.get("/eligibility-rule", (req, res) => {
  const rule = getEligibilityRule(String(req.query.serviceId ?? SNAP_SERVICE_ID));
  if (!rule) return res.status(404).json({ error: "Unknown serviceId" });
  res.json(rule);
});

router.post("/assess-eligibility", (req, res) => {
  const serviceId = req.body?.serviceId ?? SNAP_SERVICE_ID;
  if (!getService(serviceId)) return res.status(404).json({ error: "Unknown serviceId" });
  const hh = resolveHousehold(req.body);
  const result = toEligibilityResult(serviceId, hh);
  res.json({ ...result, agpObjects: { service: SNAP_SERVICE, eligibilityRule: SNAP_ELIGIBILITY_RULE } });
});

router.post("/service-request", (req, res) => {
  const serviceId = req.body?.serviceId ?? SNAP_SERVICE_ID;
  if (!getService(serviceId)) return res.status(404).json({ error: "Unknown serviceId" });
  const hh = resolveHousehold(req.body);
  const ts = now();

  // Auto-create a scoped authorization for the demo (Step 3 is implicit here).
  const auth = buildAuthorization({
    serviceId,
    constituentRef: hh.caseId ?? "demo-constituent",
    actor: "Agent",
    now: ts,
  });
  putAuthorization(auth);

  const request = buildServiceRequest({ serviceId, authorizationId: auth.authorizationId, household: hh, now: ts });
  const result = toEligibilityResult(serviceId, hh);
  const receipt = buildReceipt({ request, result, now: ts });
  putReceipt(receipt, hh);

  res.json({ authorization: auth, serviceRequest: request, receipt, statusUrl: `/api/status/${receipt.receiptId}` });
});

router.get("/status/:receiptId", (req, res) => {
  const receipt = getReceipt(req.params.receiptId);
  if (!receipt) return res.status(404).json({ error: "Unknown receiptId" });
  res.json(receipt);
});

export default router;
