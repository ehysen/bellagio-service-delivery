# SNAP Eligibility Agent — Proof of Concept

A working demonstration that an AI agent can translate a state's published SNAP eligibility
policy into **auditable, citation-backed working code** — and that the result expedites
processing, reduces determination errors, and costs a fraction of the traditional
system-integrator path.

**Reference jurisdiction:** Maryland Food Supplement Program (FSP/SNAP), FY2026 federal rules
(effective Oct 1 2025 – Sep 30 2026).

> **Live demo:** a thin web console (enter a household → determination + benefit + cited rationale
> + QC flags) is deployed on Vercel. Run it locally with `npm run dev`.

---

## What we are — and are NOT — claiming

- The benefit-determination **math** is already automated in every modernized state's Integrated
  Eligibility System (Maryland runs MD THINK / "Maryland Benefits"). **We do not claim to invent
  eligibility automation.**
- What we **demonstrate** is three things the status quo does slowly and expensively:
  1. **Speed of translation** — published SOP → tested, traceable code in **minutes**, not the
     months-long vendor change cycle.
  2. **Error reduction at the point of determination** — a pre-certification QC layer that catches
     the discrepancies driving the national payment-error rate, *before* the case is certified.
  3. **Cost** — both the software build/maintenance cost and the per-case operating cost.
- **Human-in-the-loop is mandatory.** The agent never issues a final adverse action. It produces a
  determination, a benefit figure, a fully cited rationale, and a list of items flagged for human
  judgment. This is decision-support and QC — not autopilot. (The cautionary history — Indiana/IBM,
  Michigan MiDAS, Arkansas — is why.)

---

## The three demonstration deliverables

| Deliverable | Artifact | What it shows |
|---|---|---|
| **A** — PDF → working code, with provenance | [`translation_report.md`](./translation_report.md) | Every §section → the function that implements it → the test that proves it, plus the ingest→green wall-clock. |
| **B** — Public-benefit impact model | [`analysis/benefit_model.md`](./analysis/benefit_model.md) | Processing-time compression (30-day / 7-day standards) and error-rate reduction in dollars under the FY2028 OBBBA penalty regime. |
| **C** — Cost comparison | [`analysis/cost_model.md`](./analysis/cost_model.md) | System-integrator build/change vs. agent-built; human caseworker per-case vs. agent token cost per case (computed from real token usage in [`build_log.json`](./build_log.json)). |

Regenerate all four with `npm run report`.

**Deck-ready headline:** *From published SOP to tested, cited, working determination logic in ~8
minutes — at a fraction of one percent of the vendor change cost — with a QC layer that catches the
errors that now carry federal penalties.*

---

## Architecture

```
lib/
├── policy/parameters.ts   # FY2026 §600 / USDA COLA dollar figures, each cited
├── rules/                 # one module per policy area; each rule carries a citation
│   ├── household.ts       # §100 Household Composition
│   ├── categorical.ts     # §115 Categorical Eligibility (BBCE)
│   ├── income.ts          # §210/§211 Income / Excluded Income
│   ├── deductions.ts      # §212/§213/§214/§600 deduction ladder
│   ├── income_tests.ts    # §409/§600 130% gross & 100% net tests
│   ├── allotment.ts       # §600/§411/§412 benefit calc + proration
│   └── expedited.ts       # §401 expedited screening
├── engine.ts              # orchestrates rules → Determination (with §408 gate)
├── qc/precert_checks.ts   # §408 + heuristic pre-certification QC checker
├── analysis/              # Deliverable B & C models (pure functions)
├── fixtures/households.ts # known-answer households (hand-calculated)
└── models.ts              # Household, Determination, RationaleStep, Flag, QCFinding
app/                       # thin Next.js web console + /api/determine
tests/                     # vitest known-answer + QC suites
scripts/generate_report.ts # emits the three deliverables + build_log.json
```

---

## Run it

```bash
npm install
npm test          # known-answer + QC suites (falsifiable proof)
npm run report    # regenerate translation_report.md, build_log.json, analysis/*.md
npm run dev       # http://localhost:3000 — the determination console
```

### The falsifiable test harness

Eight known-answer households span: a clearly-eligible single earner, a gross-test failure, an
elderly/disabled household (uncapped shelter, gross-test exempt, medical deduction), a BBCE/categorical
case, an expedited-service case, a minimum-benefit case, a §408 pending-verification case, and a
first-month proration case. Each expected benefit is **hand-calculated against §600 FY2026 figures**
(arithmetic shown in `lib/fixtures/households.ts`) and asserted to the dollar.

---

## Data-quality rule

Dollar figures come **only** from the USDA FY2026 COLA memo and Maryland §600. Verified against the MD
DHS "Income Guidelines as of October 2025 (Eff. 10/01/2025)" document — gross HH1 = $1,696, net HH1 =
$1,305, BBCE 200% HH1 = $2,610, max allotment HH1 = $298. Several third-party blogs list FY2025 numbers
($975 / $204) mislabeled as FY2026; where a source disagrees with the USDA memo, the USDA memo wins. The
Maryland §214 Standard Utility Allowance ($572 SUA / $350 LUA / $40 phone, eff. 10/01/2025) is encoded as
a cited, configurable parameter — verify against the live §214 PDF before production use.

---

## Guardrails (enforced, not just stated)

- **Every determination ships with citations — or it doesn't ship.** `tests/engine.test.ts` asserts
  every `RationaleStep` carries a policy citation.
- **Unverified inputs → "pending verification — human review," never an auto-denial.** The §408 gate in
  `lib/engine.ts` blocks a denial whenever any material input is unverified.
- **No final adverse action is automated.** The agent recommends; a human decides.
- **Judgment-heavy areas are flagged to humans by design** — self-employment income, household-composition
  disputes, disability determinations, and questionable/unverified items become `Flag`s, not silent rulings.
- **Cost claims separate one-time build cost from per-case operating cost, and net out retained human
  oversight.** No apples-to-oranges headlines.
- This engine is a **translation-speed and QC/maintenance accelerator** — explicitly **not** a replacement
  for the state's system of record.

## Limitations

The engine computes the rules-driven portion of a determination. It does not conduct interviews, resolve
contested household composition, compute net self-employment income, or make disability determinations —
all of which it flags for human judgment. The Maryland SUA values should be re-verified against the live
§214 PDF, and the QC catch-rate in Deliverable B is a stated modeling assumption, not a measured outcome.
