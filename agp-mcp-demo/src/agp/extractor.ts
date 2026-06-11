/**
 * agp/extractor.ts — turn a document photo into a verified §408 fact.
 *
 * Each DocumentType maps to the real engine VerificationFact it proves and the
 * value it yields. Two backends behind one interface:
 *   - vision: the Claude API (@anthropic-ai/sdk) reads the image and returns JSON.
 *   - stub:   deterministic canonical values, so the demo runs with no API key.
 *
 * HOST-FORWARDING NUANCE: MCP tool inputs are JSON — there is no native image
 * channel into a tool call. When a user attaches a photo in Claude/ChatGPT chat,
 * the host model often OCRs it itself and calls submit_verification_document with
 * already-structured `extractedFacts`, rather than forwarding raw bytes. So the
 * tool also accepts pre-extracted facts (see mcp/tools.ts), and the host-
 * independent path is /upload → documentId → here. Lead demos with /upload.
 */
import type { DocumentType } from "@/agp/types";
import type { VerificationFact } from "@/lib/models";
import { config, visionEnabled } from "@/config";

/** A verified fact + the numeric value to write back into the household. */
export interface ExtractedFact {
  fact: VerificationFact;
  status: "verified";
  /** Dollar amount where the fact carries one (income, assets, rent). */
  value?: number;
  /** Human-readable fields surfaced to the UI ("Acme Retail, last day 2026-05-22"). */
  fields: { key: string; value: string }[];
}

export interface ExtractionResult {
  documentType: DocumentType;
  extracted: ExtractedFact[];
  backend: "vision" | "stub";
}

/** Which engine fact each document type proves. */
const DOC_TO_FACT: Record<DocumentType, VerificationFact> = {
  termination_letter: "earnedIncome",
  pay_stub: "earnedIncome",
  bank_statement: "liquidAssets",
  lease: "shelterCost",
  utility_bill: "utilityStatus",
  photo_id: "identity",
};

export function factForDocument(docType: DocumentType): VerificationFact {
  return DOC_TO_FACT[docType];
}

/** Deterministic stub values — keep the happy-path demo eligible. */
function stubExtract(docType: DocumentType): ExtractedFact[] {
  switch (docType) {
    case "termination_letter":
      return [
        {
          fact: "earnedIncome",
          status: "verified",
          value: 0,
          fields: [
            { key: "employer", value: "Acme Retail LLC" },
            { key: "lastDayWorked", value: "2026-05-22" },
            { key: "reason", value: "position eliminated" },
          ],
        },
      ];
    case "pay_stub":
      return [
        {
          fact: "earnedIncome",
          status: "verified",
          value: 0,
          fields: [{ key: "ytdNote", value: "final paycheck — no ongoing wages" }],
        },
      ];
    case "bank_statement":
      return [
        {
          fact: "liquidAssets",
          status: "verified",
          value: 320,
          fields: [
            { key: "institution", value: "First State Credit Union" },
            { key: "balance", value: "$320.14" },
          ],
        },
      ];
    case "lease":
      return [
        {
          fact: "shelterCost",
          status: "verified",
          value: 1450,
          fields: [{ key: "monthlyRent", value: "$1,450" }],
        },
      ];
    case "utility_bill":
      return [{ fact: "utilityStatus", status: "verified", fields: [{ key: "type", value: "heating/cooling" }] }];
    case "photo_id":
      return [{ fact: "identity", status: "verified", fields: [{ key: "name", value: "Maria (verified)" }] }];
  }
}

const VISION_PROMPT = (docType: DocumentType) =>
  `You are a SNAP eligibility document reader. This image is a ${docType.replace(/_/g, " ")}.\n` +
  `Extract the single figure relevant to SNAP eligibility and return ONLY JSON matching this shape:\n` +
  `{ "value": <number|null>, "fields": [ { "key": "<label>", "value": "<text>" } ] }\n` +
  `Rules: for a termination_letter or pay_stub, "value" is the household's ongoing MONTHLY EARNED ` +
  `income in dollars (a termination letter implies 0). For a bank_statement, "value" is the total ` +
  `liquid balance in dollars. For a lease, "value" is the monthly rent. For a utility_bill or ` +
  `photo_id, "value" may be null. Include 2-3 human-readable fields you read off the document.`;

async function visionExtract(
  docType: DocumentType,
  image: { base64: string; mimeType: string },
): Promise<ExtractedFact[]> {
  // Lazy import so the process starts even if @anthropic-ai/sdk is absent.
  const mod = await import("@anthropic-ai/sdk").catch(() => null);
  if (!mod) throw new Error("@anthropic-ai/sdk not installed");
  const Anthropic = mod.default;

  const useOpenRouter = Boolean(config.visionBaseUrl && config.openRouterApiKey);
  const client = new Anthropic({
    apiKey: (useOpenRouter ? config.openRouterApiKey : config.anthropicApiKey) ?? "",
    ...(useOpenRouter ? { baseURL: config.visionBaseUrl } : {}),
  });

  const resp = await client.messages.create({
    model: config.visionModel,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: image.mimeType as any, data: image.base64 },
          },
          { type: "text", text: VISION_PROMPT(docType) },
        ],
      },
    ],
  });

  const textBlock = resp.content.find((b: any) => b.type === "text") as { text?: string } | undefined;
  const text = textBlock?.text ?? "{}";
  const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  const fact = DOC_TO_FACT[docType];
  const value = typeof json.value === "number" ? json.value : undefined;
  const fields = Array.isArray(json.fields) ? json.fields : [];
  return [{ fact, status: "verified", value, fields }];
}

/**
 * Extract verified facts from a document. Falls back to the deterministic stub
 * when vision is disabled or the API call fails — the demo must never hard-fail.
 */
export async function extractDocument(
  docType: DocumentType,
  image?: { base64: string; mimeType: string },
): Promise<ExtractionResult> {
  if (image && visionEnabled()) {
    try {
      const extracted = await visionExtract(docType, image);
      return { documentType: docType, extracted, backend: "vision" };
    } catch (err) {
      console.warn(`vision extraction failed (${(err as Error).message}); falling back to stub.`);
    }
  }
  return { documentType: docType, extracted: stubExtract(docType), backend: "stub" };
}
