# Prompt kit — generate your own SNAP demo documents

Hand these prompts to any capable LLM (Claude, ChatGPT, Gemini) — or a colleague — to produce
demo documents that flow correctly through the AGP / Maryland SNAP eligibility demo. Each prompt
outputs **one self-contained HTML file**; render it to PNG/PDF with the pipeline at the bottom and
upload the PNG into the flow.

> ⚠️ **Everything generated here is FICTIONAL and for demonstration only.** Use `.example` domains,
> obviously-fake account/routing numbers, and a `SAMPLE — DEMONSTRATION ONLY` marker. Never
> reproduce a real person's data or mimic a real government credential.

---

## 1. The contract — what every document MUST satisfy

The demo's reader (`src/agp/extractor.ts`) pulls **one figure** off each document and writes it into
the household as a verified §408 fact. The document must state that figure **unambiguously, in a
clearly-labeled field**, or vision may misread it. Use the *exact* `documentType` string.

| `documentType` | Verifies (fact) | The ONE figure to show | How to phrase it on the doc |
|---|---|---|---|
| `termination_letter` | `earnedIncome` | ongoing **monthly earned income** ($) — a termination implies **$0** | "Ongoing monthly earned income: **$0.00** — no continuing wages" |
| `pay_stub` | `earnedIncome` | ongoing **monthly earned income** ($) | "Gross monthly pay: **$X**" (or "final paycheck — no ongoing wages" for $0) |
| `bank_statement` | `liquidAssets` | **total liquid balance** ($) | "Ending balance: **$X**" + "Total liquid funds on deposit: **$X**" |
| `lease` | `shelterCost` | **monthly rent** ($) | "Monthly rent: **$X**" |
| `utility_bill` | `utilityStatus` | (none — type only) | show it's a **heating/cooling** utility (gas & electric) |
| `photo_id` | `identity` | (none — name only) | show the cardholder **name**; mark `SPECIMEN` |

The only valid `documentType` values are exactly:
`termination_letter`, `pay_stub`, `bank_statement`, `lease`, `utility_bill`, `photo_id`.

---

## 2. Define your persona (fill this in once, reuse across docs)

```
FULL_NAME      = e.g. "James Okafor"
ADDRESS        = street, Baltimore, MD ZIP   e.g. "812 Edmondson Ave, Apt 2, Baltimore, MD 21223"
HOUSEHOLD_SIZE = e.g. 4   (count adults + children)
MEMBER_AGES    = e.g. "37 (applicant), 35, 10, 6"
EMPLOYER       = e.g. "Harborline Logistics LLC"   (for income docs)
BANK           = e.g. "Chesapeake Community Bank"
LANDLORD       = e.g. "Edmondson Village Apartments"
— amounts (set these to hit the outcome you want — see §3) —
MONTHLY_EARNED = e.g. 0          (ongoing earned income after the event)
LIQUID_ASSETS  = e.g. 540.00     (total in all accounts)
MONTHLY_RENT   = e.g. 1325.00
UTILITIES      = heating/cooling (gas & electric), tenant-paid
```

**Keep the persona internally consistent across documents** — the same name and address everywhere,
and cross-reference amounts (e.g. the rent on the lease should also appear as a rent debit on the
bank statement; the employer on the termination letter should match a payroll deposit on the bank
statement). The provided "Maria Hernandez" set in this folder is the worked example.

---

## 3. Pick the outcome you want to demo

The engine decides the result from the **numbers**, not the paper. Set the persona amounts to land
the outcome you want. Thresholds are FY2026 Maryland and depend on household size (full tables in §6).

| Outcome | How to set it up |
|---|---|
| **Approved** (job-loss story) | `MONTHLY_EARNED = 0`, `LIQUID_ASSETS` ≤ a few thousand. Gross income $0 ≤ 200% FPL → categorically eligible (BBCE) → approved at the max allotment for the household size (HH3 = $785/mo). |
| **Pending verification** | This is the *starting* state — just don't submit the income/asset docs yet. §408 holds the case as pending (never denied). Submitting the docs resolves it. |
| **Ineligible / Denied** | Use a **`pay_stub` with high ongoing wages** above the 200% FPL gross limit for the size (HH3 > **$4,442/mo**, HH4 > **$5,360/mo**). That fails the gross-income test (no BBCE save) → **Ineligible $0**. Pair with a `bank_statement` over **$3,000** to also fail the asset test. |

> 🔑 **A high bank balance ALONE never causes a denial.** When income is low, the household is
> categorically eligible (BBCE), which **bypasses the asset test** entirely. The asset test only
> bites when income is *already* over the 200% FPL limit. So a "denial" story must be driven by a
> **pay stub with high income**, not by the bank statement.

---

## 4. The prompts

Paste the **system preamble** plus **one document block**, with your persona values substituted in.

### System preamble (prepend to every document prompt)

```
You are generating a FICTIONAL sample document for a government-benefits software DEMO. It must look
like a realistic, professional, single-page US business document, but be clearly illustrative:
use .example email domains, obviously-fake account/ID numbers, and include a small footer line
"SAMPLE — DEMONSTRATION ONLY · not a real document".

Output ONE complete, self-contained HTML file and nothing else: <!doctype html> … </html>, with all
CSS inline in a <style> block, sized for US Letter via `@page { size: letter; margin: 0; }` and a
`.page` wrapper of width 8.5in / min-height 11in with ~0.8in padding. Use system fonts only
(Helvetica/Arial or Georgia). No external images, scripts, or web fonts.

Critically: state the one key figure in a clearly-LABELED field in large, legible text, so an OCR/
vision reader can extract it without ambiguity.
```

### A. Termination letter  → `termination_letter` (earnedIncome = $0)

```
Document: a termination / separation letter on the letterhead of {{EMPLOYER}} (HR department,
a Baltimore, MD business address).
Addressed to {{FULL_NAME}}, {{ADDRESS}}, dated about two weeks before the last day worked.
It states the position is eliminated in a workforce reduction (not performance), gives a LAST DAY
WORKED date, says the final paycheck covers wages through that date, NO severance, and explicitly:
"You will have no ongoing wages, scheduled hours, or continuing earned income after your last day."
Include a "Separation Summary" box with rows: Employer, Employee, Position, Last day worked,
Reason, Severance (None), and "Ongoing monthly earned income: $0.00". Close with an HR manager's
signature. Mention the employee may file for unemployment insurance with the Maryland Dept. of Labor.
```

### B. Pay stub  → `pay_stub` (earnedIncome = a dollar amount)

```
Document: an earnings statement / pay stub from {{EMPLOYER}} for employee {{FULL_NAME}}, a recent
pay period in 2026. Show employer, employee, pay period dates, pay date, hourly rate or salary,
hours, and an earnings table. State the GROSS MONTHLY EARNED INCOME clearly as "${{MONTHLY_EARNED}}"
in a labeled summary line (if the pay period is biweekly, also show the monthly equivalent so it is
unambiguous). Include typical deductions (taxes, etc.) and a net pay line. Realistic but fictional.
[For a $0 "final paycheck" variant: make it the LAST paycheck and add "Final paycheck — no ongoing
wages after this period," with "Ongoing monthly earned income: $0.00".]
```

### C. Bank statement  → `bank_statement` (liquidAssets = balance)

```
Document: a monthly checking-account statement from {{BANK}} (NCUA/FDIC line, fake routing/account
numbers) for {{FULL_NAME}}, {{ADDRESS}}, statement period a recent month in 2026.
Show a summary row (Beginning balance, Deposits & credits, Withdrawals & debits, ENDING BALANCE) and
a transaction ledger with a running balance that arrives EXACTLY at the ending balance.
The ENDING BALANCE must equal ${{LIQUID_ASSETS}} and be shown prominently. Add a footer line:
"Total liquid funds on deposit: ${{LIQUID_ASSETS}}. No other accounts held by this member."
Make the ledger realistic: a payroll deposit from {{EMPLOYER}}, a rent debit to {{LANDLORD}} for
${{MONTHLY_RENT}}, a utility bill, and grocery/pharmacy debits — all consistent with the persona.
```

### D. Proof of rent / lease  → `lease` (shelterCost = monthly rent)

```
Document: a "Verification of Residence & Monthly Rent" letter from {{LANDLORD}} (property manager,
Baltimore MD), confirming {{FULL_NAME}} is the current leaseholder of {{ADDRESS}}.
State the MONTHLY RENT prominently as "${{MONTHLY_RENT}}" in a labeled "Tenancy & Rent Summary" box
with rows: Tenant, Premises, Occupants ({{HOUSEHOLD_SIZE}}), Lease term (12-month), Monthly rent,
"Utilities included in rent: None — tenant pays gas & electric", "Rental subsidy: None", and account
status "Current". Add a short ledger of the last 3 monthly rent payments at ${{MONTHLY_RENT}} each.
Close with the property manager's signature.
```

### E. Utility bill  → `utility_bill` (utilityStatus = heating/cooling)

```
Document: a monthly utility bill from "Baltimore Gas & Electric" (fictional account number) for
{{FULL_NAME}} at {{ADDRESS}}. It must clearly cover BOTH gas (heating) AND electric (cooling) service
— label a "Service type: Heating & Cooling (gas + electric)" line — for a recent 2026 billing period.
Show charges, due date, and amount due. The exact dollar amount is not used by the engine; the point
is to establish a heating/cooling utility responsibility.
```

### F. Photo ID  → `photo_id` (identity = name)  ⚠️ specimen only

```
Document: a GENERIC, clearly-fictional identification CARD mockup that establishes the cardholder's
NAME only — do NOT replicate any real state's driver's license or any government credential layout,
seals, or holograms. Use a neutral made-up issuer (e.g. "Demo Identity Services"), a grey silhouette
placeholder instead of a photo, the name {{FULL_NAME}}, {{ADDRESS}}, a fake card number and dates,
and a large diagonal "SPECIMEN — SAMPLE, NOT A VALID ID" watermark across the card. Card-proportioned
on the page.
```

### One-shot: a whole persona at once

```
[System preamble above.] Generate a coherent FICTIONAL persona for a Maryland SNAP demo, then output
SIX separate complete HTML files (clearly separated, each labeled with its documentType): a
termination_letter, pay_stub, bank_statement, lease (proof of rent), utility_bill, and photo_id.
Persona: {{FULL_NAME}}, {{ADDRESS}}, household of {{HOUSEHOLD_SIZE}} (ages {{MEMBER_AGES}}), employer
{{EMPLOYER}}, bank {{BANK}}, landlord {{LANDLORD}}. Amounts: ongoing monthly earned income
${{MONTHLY_EARNED}}, liquid assets ${{LIQUID_ASSETS}}, monthly rent ${{MONTHLY_RENT}}, tenant pays
gas & electric. Keep names, addresses, and amounts consistent across all six documents (the rent and
the payroll deposit must appear on the bank statement). Follow the labeled-figure rule for each.
```

---

## 5. Render & upload

After the LLM gives you `something.html`:

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
  --print-to-pdf=something.pdf --user-data-dir="$(mktemp -d)" "file://$PWD/something.html"
pdftoppm -png -r 150 -singlefile something.pdf something          # → something.png
```

Upload the PNG (use the matching documentType):

```bash
curl -F documentType=bank_statement -F file=@something.png http://localhost:3000/upload
```

…or attach the PNG in an MCP client and call `submit_verification_document` with that `documentType`.
With `ANTHROPIC_API_KEY` set the server reads the image with Claude vision; with no key it uses a
deterministic stub (so generated images only matter when vision is on).

---

## 6. Reference — FY2026 Maryland thresholds (from `src/lib/policy/parameters.ts`)

Used by the engine to decide the outcome. "FPL" bands are monthly, by household size (HH).

| HH | Max allotment | Gross 130% | Net 100% | BBCE 200% |
|---|---|---|---|---|
| 1 | $298 | $1,696 | $1,305 | $2,610 |
| 2 | $546 | $2,292 | $1,763 | $3,526 |
| 3 | $785 | $2,888 | $2,221 | $4,442 |
| 4 | $994 | $3,483 | $2,680 | $5,360 |
| 5 | $1,183 | $4,079 | $3,138 | $6,276 |
| 6 | $1,421 | $4,675 | $3,596 | $7,192 |

- **Asset limit:** $3,000 (standard) / $4,500 (elderly age ≥60 or disabled) — **bypassed under BBCE**.
- **BBCE:** gross ≤ 200% FPL ⇒ categorically eligible ⇒ asset test + 130% gross test bypassed; net test still applies.
- **Benefit** = max allotment − 30% of net income (minimum $24 for eligible 1–2 person households).
- **Deductions:** 20% earned-income deduction; standard deduction $209 (HH1–3); excess-shelter cap
  $744 (uncapped if elderly/disabled); standard utility allowance $572 (heating/cooling).
- **Expedited (7-day):** gross < $150 AND liquid assets ≤ $100 (or gross+assets < rent+utilities).
