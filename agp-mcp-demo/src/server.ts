/**
 * server.ts — one Express app, three faces:
 *   /mcp      MCP Streamable HTTP endpoint (for Claude / ChatGPT)
 *   /api/*    REST bridge mirroring the tools (for the browser app)
 *   /upload   document-photo upload (multipart) → documentId + extracted facts
 *   /         the forked clickable frontend (static public/)
 *
 * The Streamable HTTP block follows the @modelcontextprotocol/sdk v1.x pattern:
 * a per-session transport map keyed by the mcp-session-id header, a fresh
 * McpServer built on initialize, GET = SSE stream, DELETE = teardown.
 */
import express from "express";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { config, setObservedBaseUrl } from "@/config";
import { bearerAuth } from "@/auth";
import { buildServer } from "@/mcp/buildServer";
import bridgeRouter from "@/rest/bridge";
import { uploadMiddleware, uploadHandler } from "@/rest/upload";
import { getCertificate } from "@/agp/store";
import { certificateHtml } from "@/agp/certificate-html";

const app = express();
app.set("trust proxy", true); // honor X-Forwarded-Proto/Host behind Render/Fly/etc.
app.use(express.json({ limit: "16mb" })); // base64 images can be large

// Learn our public base URL from inbound requests (for certificate links).
app.use((req, _res, next) => {
  const host = req.get("host");
  if (host) setObservedBaseUrl(`${req.protocol}://${host}`);
  next();
});

// Unauthenticated health check.
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "agp-snap-demo", extractor: config.extractorMode });
});

// Bearer gate for the protected surfaces.
app.use("/mcp", bearerAuth);
app.use("/api", bearerAuth);
app.use("/upload", bearerAuth);

// ── MCP Streamable HTTP ─────────────────────────────────────────────────────
const transports: Record<string, StreamableHTTPServerTransport> = {};

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        transports[sid] = transport;
      },
    });
    transport.onclose = () => {
      if (transport.sessionId) delete transports[transport.sessionId];
    };
    const server = buildServer();
    await server.connect(transport);
  } else {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request: no valid session ID provided." },
      id: null,
    });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

const handleSessionRequest = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing mcp-session-id.");
    return;
  }
  await transports[sessionId].handleRequest(req, res);
};
app.get("/mcp", handleSessionRequest);
app.delete("/mcp", handleSessionRequest);

// ── Upload + REST bridge + static frontend ─────────────────────────────────
app.post("/upload", uploadMiddleware, uploadHandler);
app.use("/api", bridgeRouter);

// Openable Certificate of Eligibility (unauthenticated, demo). Served as HTML.
app.get("/certificate/:id", (req, res) => {
  const cert = getCertificate(req.params.id);
  if (!cert) {
    res.status(404).type("html").send("<h1>Certificate not found</h1><p>It may have expired (the demo keeps state in memory and resets on restart).</p>");
    return;
  }
  res.type("html").send(certificateHtml(cert));
});

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
app.use(express.static(publicDir));

app.listen(config.port, () => {
  console.log(`AGP SNAP demo listening on http://localhost:${config.port}`);
  console.log(`  • MCP (Streamable HTTP): POST/GET/DELETE /mcp`);
  console.log(`  • REST bridge:           /api/*`);
  console.log(`  • Document upload:       POST /upload`);
  console.log(`  • Web console:           http://localhost:${config.port}/`);
  console.log(`  • Extractor mode:        ${config.extractorMode}`);
  if (!config.bearerToken) console.log(`  • Auth:                  OPEN (set AGP_BEARER_TOKEN to require a token)`);
});
