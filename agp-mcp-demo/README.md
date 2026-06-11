# AGP MCP Demo — Maryland SNAP eligibility, over MCP

A working **reference MCP server** for the **Agentic Government Protocol (AGP)** — the
"one working reference MCP server (simple benefit lookup)" called for in the Bellagio
*Service Delivery of the Future* worksheet (Initiative 2, *Agent-Ready Governance Standard*).

It runs AGP's own worked example — **"SNAP after a job loss"** — end-to-end, backed by the
**real, tested Maryland Food Supplement Program (FSP/SNAP) rules engine** (FY2026, eff. Oct 1
2025), vendored from `ehysen/bellagio-service-delivery`. The agent recommends; **the agency of
record decides**; unverified facts return *"pending verification"*, never an automated denial
(the §408 / "validate-after" gate).

The headline feature: **snap a photo of a document** (termination letter, bank statement, …) and
watch a `pending_verification` case resolve into a real, cited determination.

> This is decision-support and a translation/QC accelerator — **not** a replacement for a state's
> system of record, and not legal advice. Dollar figures are FY2026; documents are illustrative.

---

## One service, three faces

A single Node/TS service (Express) exposes:

| Face | Path | For |
|---|---|---|
| **MCP (Streamable HTTP)** | `POST/GET/DELETE /mcp` | Claude / ChatGPT and other MCP clients |
| **REST bridge** | `/api/*` | the browser console (browsers can't speak MCP) |
| **Document upload** | `POST /upload` | snapped photos → `documentId` + extracted facts |
| **Web console** | `/` (static) | the clickable demo (forked from the MVP) |

All three call one shared core (`src/agp/*`) that wraps the vendored engine
(`determine()` + `runPrecertQC()`), so the MCP and browser paths never drift.

The five AGP steps map to MCP tools:

```
Discovery     → discover_services, get_service
Eligibility   → get_eligibility_rule, assess_eligibility   ← the heart (runs the real engine)
Authorization → create_authorization
Request/Receipt → submit_service_request, get_status
Document feature → submit_verification_document, list_document_types
Outcome (approved) → issue_certificate_of_eligibility, confirm_benefit_disbursement
One-shot      → simulate_application   ← runs the whole dummy application in a single call
```

Once a case is **approved**, the server issues the full outcome — a **Certificate of Eligibility**
(an openable HTML document at `/certificate/:id`, with program, benefit, effective date, 12-month
certification period, and cited legal basis) and a **benefit-disbursement confirmation** (amount, the
EBT card it loads to, first + recurring dates). Both are stamped **DEMONSTRATION ONLY** — no legal
effect, no funds move. `simulate_application` produces all of it in one call.

**The agent completes the entire journey in chat** — discovery through receipt, including
"uploading" documents. There is no website step; the server itself computes and returns the
determination (see *Driving it from an agent* below).

Plus resources: `agp://service/md-snap`, `agp://eligibility-rule/md-snap`,
`agp://policy-parameters/md-snap-fy2026`.

---

## Run it

```bash
npm install
npm start            # http://localhost:3000  (set PORT to change)
```

- **Web console:** open `http://localhost:3000/` and click through the six steps. Step 3 runs the
  engine live (→ provisional/pending); step 5 lets you snap two documents (camera on mobile, file
  picker on desktop, or "use sample") and watch it flip to **Approved · $785/mo**.
- **Offline / flaky network:** append `?mock=1` to the URL to run the click-through against
  built-in fixtures.
- **No configuration required.** With no `ANTHROPIC_API_KEY`, document extraction uses a
  deterministic stub, so the full demo works offline. Auth is open unless `AGP_BEARER_TOKEN` is set
  (the server warns on boot). See `.env.example`.

### Connect from Claude / ChatGPT

The MCP endpoint is **Streamable HTTP** at `/mcp`. Point any MCP client that supports remote
(Streamable HTTP) servers at it:

```
URL:    http://localhost:3000/mcp        (or your deployed https URL)
Header: Authorization: Bearer <AGP_BEARER_TOKEN>   (only if you set one)
```

- **ChatGPT / Claude connectors** require a public **HTTPS** URL — expose the local server with a
  tunnel (`ngrok http 3000`) or deploy it (below), and set `AGP_BEARER_TOKEN`.
- **Local MCP clients** (e.g. via `mcp-remote`) can hit `http://localhost:3000/mcp` directly.

Then ask the model, e.g.:

> *"Run the full SNAP application for the demo household and walk me through each step."*
> (the agent calls `simulate_application` and narrates discovery → eligibility → authorization →
> request → document verification → approved receipt — entirely in chat)

or step through it yourself:

> *"Discover the services, then assess SNAP eligibility for the demo household. It'll come back
> pending — I'll share my termination letter and bank statement; read them and finalize it, then
> give me the receipt."* Attach the document images (or just describe them) and the agent reads
> them, calls `submit_verification_document`, and the case resolves to **approved** — no website.

### Driving it from an agent (how documents work in chat)

The whole flow happens **in the conversation** — the agent never sends you to a portal. For
verification documents, MCP tool inputs are JSON (there's no native image-attachment parameter), so:

- **Primary path — the host reads, the server assesses.** You attach (or describe) a document; the
  model (Claude/ChatGPT is multimodal) reads it and calls `submit_verification_document` with the
  `documentType` and the figure it read (`observedValue` — e.g. income `0` from a termination
  letter, `320` from a bank statement). The **server** writes that into the household, re-runs the
  **real Maryland SNAP engine**, and returns the updated determination. That's the agency's
  assessment coming back to you, in chat.
- **Server-reads-the-image path.** The model can instead pass the raw image as `imageBase64`; with
  `ANTHROPIC_API_KEY` set, the server reads it with Claude vision. Whether a given host forwards the
  bytes varies, so this is the secondary path.
- **Fallback.** `submit_verification_document` with just a `documentType` uses a deterministic demo
  value — handy for a no-friction dummy run.

The `simulate_application` tool wraps all of this into one call (it verifies the default documents
with demo values and returns the full transcript), for when you just want to see the whole thing.

### Real document vision (optional)

Set `ANTHROPIC_API_KEY` to have the server read uploaded photos with Claude
(`claude-opus-4-8`, vision) instead of the stub. Or route the same SDK through OpenRouter by setting
`AGP_VISION_BASEURL=https://openrouter.ai/api/v1` and `OPENROUTER_API_KEY`. Extraction always falls
back to the stub if the call fails — the demo never hard-fails.

---

## How a document resolves the case (the document → fact map)

Each document type maps to the **real engine `VerificationFact`** it proves:

| Document | Verifies | Effect |
|---|---|---|
| **Termination letter** / pay stub | `earnedIncome` (§408 material) | job loss → income $0; resolves the income gate |
| **Bank statement** | `liquidAssets` (§408 material) | the asset test (≤ $3,000 standard) |
| Lease | `shelterCost` | tunes the excess-shelter deduction |
| Utility bill | `utilityStatus` | tunes the utility allowance |
| Photo ID | `identity` | identity check |

The demo household ("Maria", HH of 3, job loss) starts with **income and assets unverified** → the
engine returns `pending_verification`. Verify the termination letter (income = $0) → still pending
(assets). Verify the bank statement (assets) → both §408 facts resolved → **eligible** at the HH-3
max allotment ($785/mo).

In chat, the agent supplies what it read off the document via `observedValue` (see *Driving it from
an agent* above); the browser console / `POST /upload` path (`documentId`, real photo) is the same
mechanism for the web demo. `submit_verification_document` accepts, in priority order: `observedValue`
(host-read; preferred), `documentId` (from `/upload`), inline `imageBase64` (server reads it),
`imageUrl`, or — with none of those — a deterministic demo value.

---

## Verify

```bash
npm run typecheck          # clean
npm start                  # boots; logs the four endpoints
curl localhost:3000/health # {"ok":true,...}
```

**MCP path** (with the SDK client, or `npx @modelcontextprotocol/inspector`): connect to `/mcp`.
One-shot — `simulate_application` (no args) → a step-by-step transcript ending **approved $785**.
Stepwise — `assess_eligibility` (no args) → `pending_verification` ($785, unverified: earnedIncome,
liquidAssets); `create_authorization` → `submit_service_request` → a `provisional_approval` receipt;
`submit_verification_document` with `{documentType:"termination_letter", observedValue:0}` then
`{documentType:"bank_statement", observedValue:320}` → status flips to **approved**. (Omitting
`observedValue` falls back to a demo value, so `{documentType:"termination_letter"}` alone also works.)

**Browser path:** open `/`, click through; step 3 shows pending, step 5's two snaps flip it to
approved $785, step 6 issues the receipt. The benefit number comes from the engine — never
hardcoded.

---

## Layout

```
agp-mcp-demo/
  src/
    server.ts            # Express: /mcp (Streamable HTTP) + /api + /upload + static
    config.ts  auth.ts   # env + bearer gate
    mcp/   buildServer.ts  tools.ts  resources.ts
    agp/   types.ts  catalog.ts  builders.ts  store.ts  extractor.ts  verification.ts  schema.ts
    rest/  bridge.ts  upload.ts
    lib/   ← the Maryland SNAP engine, vendored verbatim from bellagio-service-delivery
  public/index.html      # the forked clickable console
```

The `lib/` engine is copied unmodified; `determine()`, `runPrecertQC()`, and the cited
`policy/parameters.ts` are reused byte-for-byte.

---

## Deploy (stable HTTPS URL)

For a fixed URL that survives restarts (instead of a tunnel), deploy the container. The repo ships a
`Dockerfile`, `.dockerignore`, and a Render `render.yaml`. The platform injects `PORT`; the server
reads it. Default `AGP_EXTRACTOR=stub` means it runs with **no secrets**.

> **Stateful:** the MCP session map lives in process memory, so deploy to a **single long-running
> host** (Render / Railway / Fly.io) — **not** a serverless platform (Vercel/Lambda cold starts lose
> the session map). The MCP SDK is pinned to the `1.x` line (`^1.19.0`); a future `2.x` changes the
> import paths in `src/server.ts`.

**Render (Blueprint, Git-connected):**
1. Push this folder to a GitHub repo (it must contain `render.yaml` at its root — or set `rootDir`).
2. Render → **New → Blueprint** → pick the repo. It reads `render.yaml` and creates the web service.
3. (Optional) In the service's **Environment**, add `AGP_BEARER_TOKEN` (secret) to require auth, and
   `ANTHROPIC_API_KEY` + `AGP_EXTRACTOR=auto` for real Claude-vision document reading.
4. Your MCP endpoint is `https://<service>.onrender.com/mcp`.
   - *Free tier caveat:* the service **spins down after ~15 min idle**; the first request then cold-starts
     (~30–60s) and a connector may time out once before it wakes. Paid tier or a cron ping avoids this.

**Railway / Fly.io (deploy from this folder, no GitHub needed):** both build the `Dockerfile` directly.
- Fly: `fly launch` (detects the Dockerfile) → `fly deploy` → `https://<app>.fly.dev/mcp`.
- Railway: `railway up` → set a domain → `https://<app>.up.railway.app/mcp`.

Whichever host: set `AGP_BEARER_TOKEN` and use the HTTPS URL (with the `/mcp` path) in the connector.

## Limitations

The engine computes the rules-driven portion of a SNAP determination. It does not conduct
interviews, resolve contested household composition, compute net self-employment income, or make
disability determinations — those are flagged for human judgment. The Maryland SUA values and the QC
catch-rate are stated modeling assumptions; verify against the live §214 PDF before any real use.
The Authorization here is demo-unsigned — AGP v0.1 defers the cryptographic proof of consent to a
companion layer.
