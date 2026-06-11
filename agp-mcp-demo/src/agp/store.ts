/**
 * agp/store.ts — demo-grade in-memory stores for Authorizations, Receipts, and
 * uploaded documents. State is lost on restart, which is fine for a demo (and
 * consistent with the in-process MCP session map).
 */
import { randomUUID } from "node:crypto";
import type { Authorization, Receipt, DocumentType } from "@/agp/types";
import type { Household } from "@/lib/models";

export interface StoredDocument {
  documentId: string;
  documentType?: DocumentType;
  /** Raw image bytes (from /upload). */
  bytes: Buffer;
  mimeType: string;
}

const authorizations = new Map<string, Authorization>();
const receipts = new Map<string, Receipt>();
const documents = new Map<string, StoredDocument>();
/** The working household behind each receipt, so document uploads can re-run it. */
const receiptHouseholds = new Map<string, Household>();

export function id(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function putAuthorization(a: Authorization): void {
  authorizations.set(a.authorizationId, a);
}
export function getAuthorization(authorizationId: string): Authorization | undefined {
  return authorizations.get(authorizationId);
}

export function putReceipt(r: Receipt, household: Household): void {
  receipts.set(r.receiptId, r);
  receiptHouseholds.set(r.receiptId, household);
}
export function getReceipt(receiptId: string): Receipt | undefined {
  return receipts.get(receiptId);
}
export function getReceiptHousehold(receiptId: string): Household | undefined {
  return receiptHouseholds.get(receiptId);
}
export function setReceiptHousehold(receiptId: string, household: Household): void {
  receiptHouseholds.set(receiptId, household);
}

export function putDocument(doc: Omit<StoredDocument, "documentId">): StoredDocument {
  const documentId = id("doc");
  const stored: StoredDocument = { documentId, ...doc };
  documents.set(documentId, stored);
  return stored;
}
export function getDocument(documentId: string): StoredDocument | undefined {
  return documents.get(documentId);
}
