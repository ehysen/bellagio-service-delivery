# Demo documents — SNAP "after a job loss" eligibility flow

**Fictional** documents that drive the validate-after path: the engine returns
`pending_verification` until the §408 material facts are proven, then resolves to a real
determination. Two personas are included:

- **Maria Hernandez** — the canonical happy path (unprefixed files). HH of 3, job loss →
  **Approved · $785/mo**.
- **James Okafor** — the BBCE teaching case (`james-*` files). HH of 3, RIF + an **$8,383** bank
  balance (severance) → **still Approved · $785/mo**, because a $0-income household is categorically
  eligible and the asset test is bypassed.

Maria's figures are matched to the deterministic stub in `src/agp/extractor.ts`, so her demo lands on
the same answer whether real Claude vision reads the docs (`ANTHROPIC_API_KEY` set) or the offline
stub runs. James requires vision (or passing `extractedValue`) — see his section below.

## Maria Hernandez — happy path (Approved $785)

| File | Document type (`documentType`) | Verifies (`VerificationFact`) | Value read | Effect |
|---|---|---|---|---|
| `termination-letter.*` | `termination_letter` | `earnedIncome` | **$0** (no ongoing wages) | resolves the income gate |
| `bank-statement.*` | `bank_statement` | `liquidAssets` | **$320.14** (≤ $3,000 limit) | resolves the asset gate |
| `proof-of-rent.*` | `lease` | `shelterCost` | **$1,450** (monthly rent) | satisfies the residency requirement; documents shelter cost |

> **The proof of rent is optional for Maria.** Only `earnedIncome` and `liquidAssets` are marked
> unverified, so those two gate her case (`engine.ts:37`). `shelterCost` is already attested at
> $1,450 and isn't blocking. The lease maps to the AGP Service's `residency` requirement
> (`catalog.ts` `requires: [...,"residency"]`) and fully documents shelter cost — submit it to show a
> completely paper-backed case, but it isn't needed to reach Approved $785.

> On "unemployment slip": the flow's income proof is a **termination letter** — it verifies that
> *earned* income has gone to **$0**. A literal unemployment-benefit award is *unearned* income and
> is not a supported document type, so the termination letter is the document the engine consumes.

## James Okafor — the BBCE case (high savings, still Approved $785)

A second persona that demonstrates a subtle, correct behavior: **a large bank balance does not
disqualify a zero-income household.** James was laid off in a reduction in force and received an
$8,000 severance, so he has **$8,383.28** in the bank — well over the $3,000 asset limit. But because
his *ongoing* earned income is $0, the household is categorically eligible (BBCE), which **bypasses
the asset test entirely** (`engine.ts:87`). The determination's rationale prints *"Asset test
bypassed under BBCE."*

| File | Document type | Verifies | Value read | Effect |
|---|---|---|---|---|
| `james-rif-letter.*` | `termination_letter` | `earnedIncome` | **$0** (severance is a one-time lump sum, *not* ongoing income) | resolves the income gate |
| `james-bank-statement.*` | `bank_statement` | `liquidAssets` | **$8,383.28** (over the limit — but bypassed) | resolves the asset gate; does **not** deny |
| `james-okafor.household.json` | — | — | — | the household to assess (HH3, income & assets unverified) |

**Running James end-to-end.** The MCP tools and the web console default to *Maria* unless you pass a
custom household. Drive James by passing his JSON:

```
assess_eligibility            { "household": <contents of james-okafor.household.json> }
  → pending_verification (unverified: earnedIncome, liquidAssets), provisional $785
create_authorization          { "serviceId": "md-snap", "constituentRef": "demo-james" }
submit_service_request        { "serviceId": "md-snap", "authorizationId": "...", "household": <james json> }
  → provisional_approval receipt (store its receiptId)
submit_verification_document  { "receiptId": "...", "documentType": "termination_letter", "extractedValue": 0 }
submit_verification_document  { "receiptId": "...", "documentType": "bank_statement",    "extractedValue": 8383.28 }
  → status flips to approved, $785 — with "asset test bypassed (BBCE)" in the rationale
```

> Passing `extractedValue` is the reliable path (it skips OCR). To exercise real vision instead,
> upload `james-bank-statement.png` via `POST /upload` to get a `documentId`, or attach the image in
> chat — with no `ANTHROPIC_API_KEY` the stub would return Maria's $320.14, so for James use
> `extractedValue` or run with vision enabled.

## Formats

Each document is provided three ways:

- **`.png`** — 1275×1650 (8.5×11 @ 150 DPI). **Use this for the upload / "snap a photo" flow** —
  it's what the file picker and the Claude-vision path read.
- **`.pdf`** — print it, then photograph it for a true "snap a document" demo.
- **`.html`** — the editable source (change names/amounts, then re-render — see below).

## Using them in the demo

**Web console** (`http://localhost:3000/`): at step 5, instead of "use sample," choose the file
picker (desktop) or camera (mobile) and pick `termination-letter.png`, then `bank-statement.png`.
The case flips pending → approved $785.

**MCP / chat client:** attach the PNG and call `submit_verification_document` with
`documentType: "termination_letter"`, then `"bank_statement"`. Or upload via `POST /upload` first
to get a `documentId`.

```bash
curl -F documentType=termination_letter -F file=@termination-letter.png http://localhost:3000/upload
curl -F documentType=bank_statement     -F file=@bank-statement.png     http://localhost:3000/upload
curl -F documentType=lease              -F file=@proof-of-rent.png       http://localhost:3000/upload
```

## Re-rendering after edits

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
  --print-to-pdf=termination-letter.pdf --user-data-dir="$(mktemp -d)" \
  "file://$PWD/termination-letter.html"
pdftoppm -png -r 150 -singlefile termination-letter.pdf termination-letter
```

## Other supported document types (not built here)

The catalog also accepts `pay_stub` (→ `earnedIncome`), `utility_bill` (→ `utilityStatus`), and
`photo_id` (→ `identity`). Ask if you want matching demo documents for any of these.
