# Deliverable C — Cost Comparison

> One-time build cost and per-case operating cost are reported **separately**, and retained human
> oversight is netted in. The agent side is computed from **actual token usage logged during the build**
> (see `build_log.json`), priced at current Claude API rates — not invented.

## Current Claude API pricing (per 1M tokens)

| Model | Input | Output |
|---|---|---|
| Opus 4.8 (`claude-opus-4-8`) | $5.00 | $25.00 |
| Sonnet 4.6 (`claude-sonnet-4-6`) | $3.00 | $15.00 |
| Haiku 4.5 (`claude-haiku-4-5`) | $1.00 | $5.00 |

## (1) Software cost — build & change

| Item | Traditional system integrator | Agent-built (this PoC) |
|---|---|---|
| Initial build / IES modernization | $80,000,000 – $205,000,000 (FL ACCESS); MN $90,000,000 | **$2.46** in tokens + 0.14 agent-hours (spec → green) |
| 5-yr operating contract (reference) | $157,000,000 (KY/Deloitte) | n/a (runs as a stateless function) |
| One policy change | $1,600,000 emergency + $4,200,000 additional; ~$2,000,000/state quoted; weeks-to-months | **$0.33** in tokens; minutes (re-ingest drill) |
| Federal cost share | ~90% dev / ~75% M&O | same federal-share rules apply |

**Headline:** a policy change that the incumbent vendor prices at $1,600,000+ and
delivers in weeks-to-months is reproduced here for **$0.33 in tokens** in minutes.
That is a fraction of one percent of the vendor change cost. (This is a translation/QC accelerator, **not**
a replacement for the state's system of record — see guardrails.)

## (2) Per-task operating cost — human vs. agent

| Component | Human caseworker | Agent |
|---|---|---|
| Determination + benefit calc | $33.75/case (45 min @ $45.00/hr) | **0.000¢** (deterministic code — no tokens) |
| Cited determination notice (optional LLM) | included above | 0.323¢/case |
| Retained human oversight (review of flags) | — | $1.50/case |
| **Total per case** | **$33.75** | **$1.50** |

> Reference: USDA FY2016 per-case state administrative expense ≈ $348 (dated/conservative;
> today's figure is higher).

**The honest strong claim:** the determination + QC engine is **compiled logic**, so its marginal
per-case cost is effectively zero tokens — the cost is the one-time translation (above) plus whatever
human oversight the state retains by design. Even adding a per-case LLM-generated cited notice keeps the
agent's per-case cost in the **single-digit cents**, against $33.75+ of caseworker time for the
same rules computation. **Human oversight is not removed** — it is redirected from rote calculation to the
judgment-heavy items the engine flags.
