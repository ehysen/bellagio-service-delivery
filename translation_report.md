# Deliverable A — Translation Report (PDF → working code, with provenance)

**Jurisdiction:** Maryland Food Supplement Program (FSP/SNAP)
**Parameters:** FY2026 (eff. 2025-10-01 – 2026-09-30), 48 contiguous states + DC
**Ingest → all tests green:** 8m 8s

Every rule cites its source section, and every section maps to the function that implements it
and the test that proves it. The dollar figures were verified against the Maryland DHS
"Income Guidelines as of October 2025 (Eff. 10/01/2025)" document and the USDA FY2026 COLA memo.

## Sources

- USDA FNS FY2026 SNAP COLA memo (eff. 2025-10-01)
- MD-FSP §600 Standards for Income and Deductions (SEPT 2025)
- MD DHS Income Guidelines as of October 2025 (Eff. 10/01/2025)
- MD-FSP §214 Utility Allowances (SEPT 2025)

## Section → Code → Test

| Policy section | Topic | Implementing code | Proving test |
|---|---|---|---|
| §100 | Household Composition | `lib/rules/household.ts → assessHousehold()` | tests/engine.test.ts (all cases: household_size, elderly/disabled) |
| §115 | Categorical Eligibility (BBCE) | `lib/rules/categorical.ts → assessCategorical()` | tests/engine.test.ts → bbce_categorical, minimum_benefit |
| §210 / §211 | Income / Excluded Income | `lib/rules/income.ts → computeIncome()` | tests/engine.test.ts → all cases (countable earned/unearned) |
| §212 / §213 | Deductions / Determining Deductions | `lib/rules/deductions.ts → computeDeductions()` | tests/engine.test.ts → single_earner_eligible, elderly_disabled |
| §214 | Utility Allowances (SUA/LUA) | `lib/policy/parameters.ts → UTILITY_ALLOWANCE; deductions.ts` | tests/engine.test.ts → shelter cases; qc shelter_deduction_unsupported |
| §401 | Screening for Expedited Service | `lib/rules/expedited.ts → screenExpedited()` | tests/engine.test.ts → expedited_service |
| §406 | Normal Processing Standards | `lib/analysis/benefit_model.ts (30-day standard)` | analysis/benefit_model.md (processing compression) |
| §408 | Verification (QC driver) | `lib/engine.ts verification gate; lib/qc/precert_checks.ts` | tests/engine.test.ts → pending_verification; tests/qc.test.ts (all) |
| §409 | Income Eligibility (130%/100%) | `lib/rules/income_tests.ts → applyIncomeTests()` | tests/engine.test.ts → gross_test_fail, bbce_categorical |
| §411 / §412 | Proration | `lib/rules/allotment.ts → computeAllotment() proration` | tests/engine.test.ts → first_month_proration |
| §600 | Standards for Income & Deductions (MD $) | `lib/policy/parameters.ts (all dollar tables)` | tests/engine.test.ts → every known-answer benefit |

## Known-answer results (falsifiable proof)

Each benefit is hand-calculated against §600 FY2026 figures (arithmetic in `lib/fixtures/households.ts`)
and asserted to the dollar by the test suite.

| Case | Scenario | Decision | Ongoing benefit | Matches hand-calc |
|---|---|---|---|---|
| KC-01 | Clearly-eligible single earner (HH1) | eligible | $296 | ✅ |
| KC-02 | Household failing the gross income test (HH1, non-BBCE) | ineligible | $0 | ✅ |
| KC-03 | Elderly/disabled household — uncapped shelter, gross-test exempt, medical deduction (HH1) | eligible | $298 | ✅ |
| KC-04 | BBCE case — over 130% gross but under 200%, saved by categorical eligibility (HH3) | eligible | $259 | ✅ |
| KC-05 | Expedited-service case — 7-day standard (HH1) | eligible | $298 | ✅ |
| KC-06 | Minimum-benefit case — eligible but computed benefit below $24 (HH2) | eligible | $24 | ✅ |
| KC-07 | Unverified material input — §408 holds the case (never auto-denied) | pending_verification | $296 | ✅ |
| KC-08 | First-month proration from application date (HH1, §411/§412) | eligible | $296 | ✅ |

> Run `npm test` to reproduce the green suite; run `npm run report` to regenerate this report,
> `build_log.json`, and the Deliverable B/C models.

## Guardrails (enforced in code)

- **Citations or it doesn't ship** — `tests/engine.test.ts` asserts every `RationaleStep` carries a citation.
- **Unverified inputs → "pending verification — human review", never an auto-denial** (§408 gate in `lib/engine.ts`).
- **No automated adverse action** — the engine recommends; judgment-heavy items (self-employment,
  household composition, disability) are returned as `Flag`s for a human to decide.
