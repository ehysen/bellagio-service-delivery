/**
 * rest/upload.ts — POST /upload: receive a snapped document photo (multipart),
 * extract the §408 fact it proves, and return both the documentId (for the MCP
 * tool) and the extracted facts (for the browser app to feed into assessment).
 */
import multer from "multer";
import type { Request, Response } from "express";
import { DOCUMENT_TYPES } from "@/agp/schema";
import type { DocumentType } from "@/agp/types";
import { extractDocument } from "@/agp/extractor";
import { putDocument } from "@/agp/store";

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB — phone photos
}).single("file");

export async function uploadHandler(req: Request, res: Response): Promise<void> {
  const docType = String(req.body?.documentType ?? "") as DocumentType;
  if (!DOCUMENT_TYPES.includes(docType)) {
    res.status(400).json({ error: `documentType must be one of: ${DOCUMENT_TYPES.join(", ")}` });
    return;
  }

  const file = (req as Request & { file?: Express.Multer.File }).file;
  let documentId: string | undefined;
  let image: { base64: string; mimeType: string } | undefined;
  if (file) {
    const stored = putDocument({ bytes: file.buffer, mimeType: file.mimetype, documentType: docType });
    documentId = stored.documentId;
    image = { base64: file.buffer.toString("base64"), mimeType: file.mimetype };
  }

  const ex = await extractDocument(docType, image);
  res.json({
    documentId,
    documentType: docType,
    extractionBackend: ex.backend,
    verifiedFacts: ex.extracted,
    extractedFields: ex.extracted.flatMap((e) => e.fields),
  });
}
