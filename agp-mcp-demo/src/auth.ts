/**
 * auth.ts — a single bearer-token gate for /mcp, /api, and /upload.
 *
 * This is DEMO-GRADE access control, not the AGP cryptographic Authorization
 * proof (which AGP v0.1 explicitly defers). If AGP_BEARER_TOKEN is unset the
 * server runs open and warns once on boot.
 */
import type { Request, Response, NextFunction } from "express";
import { config } from "@/config";

let warned = false;

export function bearerAuth(req: Request, res: Response, next: NextFunction): void {
  if (!config.bearerToken) {
    if (!warned) {
      console.warn(
        "⚠️  AGP_BEARER_TOKEN is unset — running in OPEN demo mode (no auth on /mcp, /api, /upload). " +
          "Set AGP_BEARER_TOKEN before exposing this server publicly.",
      );
      warned = true;
    }
    next();
    return;
  }

  const header = req.header("authorization") ?? "";
  const expected = `Bearer ${config.bearerToken}`;
  if (header === expected) {
    next();
    return;
  }
  res.status(401).json({ error: "Unauthorized — provide 'Authorization: Bearer <AGP_BEARER_TOKEN>'." });
}
