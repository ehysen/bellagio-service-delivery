/**
 * Deliverable C — Cost comparison.
 *
 *  (1) Software cost: traditional system-integrator build/change vs. this
 *      agent-built approach.
 *  (2) Per-task operating cost: human caseworker per case vs. agent token cost
 *      per case, computed from ACTUAL token usage logged during the demo build.
 *
 * Honesty rules (from the brief):
 *  - Separate one-time build cost from per-case operating cost.
 *  - Net out retained human oversight.
 *  - Compute the agent side from real token usage, not invented figures.
 */

/** Current Claude API pricing, $ per 1M tokens (verified via claude-api skill, 2026-06). */
export const API_PRICING = {
  "claude-opus-4-8": { input: 5.0, output: 25.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
} as const;

export type ModelId = keyof typeof API_PRICING;

/** Verified §6 software-cost benchmark inputs. */
export const SOFTWARE_BENCHMARKS = {
  iesModernizationLow: 80_000_000,
  iesModernizationHigh: 205_000_000, // Florida ACCESS since 2022
  minnesotaIes: 90_000_000,
  kentuckyOperating5yr: 157_000_000, // Kentucky/Deloitte 5-yr operating contract
  policyChangeEmergency: 1_600_000, // OBBBA emergency change, one state
  policyChangeAdditional: 4_200_000, // additional, same state
  vendorPerStateFixedFee: 2_000_000, // ~$2M/state quoted for core E&E changes
  fedShareDevelopment: 0.9, // ~90% federal cost share, eligibility-system dev
  fedShareOM: 0.75, // ~75% federal cost share, M&O
} as const;

/** Human caseworker per-case benchmark. */
export const HUMAN_BENCHMARKS = {
  perCaseAdminExpense: 348, // FY2016 USDA study (dated/conservative)
  // Illustrative breakdown for the per-task comparison.
  assumedFullyLoadedHourly: 45, // fully-loaded caseworker hourly cost
  assumedMinutesPerDetermination: 45, // determination + benefit calc portion
} as const;

export interface TokenUsage {
  model: ModelId;
  inputTokens: number;
  outputTokens: number;
}

export function tokenCostUSD(usage: TokenUsage): number {
  const p = API_PRICING[usage.model];
  return (usage.inputTokens / 1_000_000) * p.input + (usage.outputTokens / 1_000_000) * p.output;
}

export interface CostModelInputs {
  /** One-time build token usage (the agent translating the SOP -> tested code). */
  buildTokens: TokenUsage;
  /** Wall-clock build hours (spec -> green). */
  buildHours: number;
  /** Per-policy-change token usage (the re-ingest drill). */
  policyChangeTokens: TokenUsage;
  /**
   * Per-case agent token usage IF an LLM generates a cited determination notice
   * per case. The determination engine itself is deterministic code (≈$0/case).
   */
  perCaseNoticeTokens: TokenUsage;
  /** Cases processed during the demo run. */
  casesProcessed: number;
  /** Retained human oversight cost per case (review of flags), $. */
  retainedOversightPerCase: number;
}

export interface CostModelResult {
  software: {
    traditionalBuildLow: number;
    traditionalBuildHigh: number;
    traditionalPolicyChange: number;
    agentBuildTokenCost: number;
    agentBuildHours: number;
    agentPolicyChangeTokenCost: number;
  };
  perCase: {
    humanPerCase: number;
    agentDeterministicPerCase: number; // engine only — ~0 marginal
    agentNoticePerCaseCents: number; // optional LLM notice
    retainedOversightPerCase: number;
    agentTotalPerCase: number;
  };
  markdown: string;
}

export function runCostModel(inputs: CostModelInputs): CostModelResult {
  const s = SOFTWARE_BENCHMARKS;
  const h = HUMAN_BENCHMARKS;

  const agentBuildTokenCost = tokenCostUSD(inputs.buildTokens);
  const agentPolicyChangeTokenCost = tokenCostUSD(inputs.policyChangeTokens);
  const noticePerCase = tokenCostUSD(inputs.perCaseNoticeTokens);

  const humanPerCase =
    (h.assumedFullyLoadedHourly * h.assumedMinutesPerDetermination) / 60;
  const agentDeterministicPerCase = 0; // compiled TypeScript — fractions of a cent of CPU
  const agentTotalPerCase =
    agentDeterministicPerCase + noticePerCase + inputs.retainedOversightPerCase;

  const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  const usd2 = (n: number) => `$${n.toFixed(2)}`;
  const cents = (n: number) => `${(n * 100).toFixed(3)}¢`;

  const markdown = `# Deliverable C — Cost Comparison

> One-time build cost and per-case operating cost are reported **separately**, and retained human
> oversight is netted in. The agent side is computed from **actual token usage logged during the build**
> (see \`build_log.json\`), priced at current Claude API rates — not invented.

## Current Claude API pricing (per 1M tokens)

| Model | Input | Output |
|---|---|---|
| Opus 4.8 (\`claude-opus-4-8\`) | $${API_PRICING["claude-opus-4-8"].input.toFixed(2)} | $${API_PRICING["claude-opus-4-8"].output.toFixed(2)} |
| Sonnet 4.6 (\`claude-sonnet-4-6\`) | $${API_PRICING["claude-sonnet-4-6"].input.toFixed(2)} | $${API_PRICING["claude-sonnet-4-6"].output.toFixed(2)} |
| Haiku 4.5 (\`claude-haiku-4-5\`) | $${API_PRICING["claude-haiku-4-5"].input.toFixed(2)} | $${API_PRICING["claude-haiku-4-5"].output.toFixed(2)} |

## (1) Software cost — build & change

| Item | Traditional system integrator | Agent-built (this PoC) |
|---|---|---|
| Initial build / IES modernization | ${usd(s.iesModernizationLow)} – ${usd(s.iesModernizationHigh)} (FL ACCESS); MN ${usd(s.minnesotaIes)} | **${usd2(agentBuildTokenCost)}** in tokens + ${inputs.buildHours.toFixed(2)} agent-hours (spec → green) |
| 5-yr operating contract (reference) | ${usd(s.kentuckyOperating5yr)} (KY/Deloitte) | n/a (runs as a stateless function) |
| One policy change | ${usd(s.policyChangeEmergency)} emergency + ${usd(s.policyChangeAdditional)} additional; ~${usd(s.vendorPerStateFixedFee)}/state quoted; weeks-to-months | **${usd2(agentPolicyChangeTokenCost)}** in tokens; minutes (re-ingest drill) |
| Federal cost share | ~${(s.fedShareDevelopment * 100).toFixed(0)}% dev / ~${(s.fedShareOM * 100).toFixed(0)}% M&O | same federal-share rules apply |

**Headline:** a policy change that the incumbent vendor prices at ${usd(s.policyChangeEmergency)}+ and
delivers in weeks-to-months is reproduced here for **${usd2(agentPolicyChangeTokenCost)} in tokens** in minutes.
That is a fraction of one percent of the vendor change cost. (This is a translation/QC accelerator, **not**
a replacement for the state's system of record — see guardrails.)

## (2) Per-task operating cost — human vs. agent

| Component | Human caseworker | Agent |
|---|---|---|
| Determination + benefit calc | ${usd2(humanPerCase)}/case (${h.assumedMinutesPerDetermination} min @ ${usd2(h.assumedFullyLoadedHourly)}/hr) | **${cents(agentDeterministicPerCase)}** (deterministic code — no tokens) |
| Cited determination notice (optional LLM) | included above | ${cents(noticePerCase)}/case |
| Retained human oversight (review of flags) | — | ${usd2(inputs.retainedOversightPerCase)}/case |
| **Total per case** | **${usd2(humanPerCase)}** | **${usd2(agentTotalPerCase)}** |

> Reference: USDA FY2016 per-case state administrative expense ≈ ${usd(h.perCaseAdminExpense)} (dated/conservative;
> today's figure is higher).

**The honest strong claim:** the determination + QC engine is **compiled logic**, so its marginal
per-case cost is effectively zero tokens — the cost is the one-time translation (above) plus whatever
human oversight the state retains by design. Even adding a per-case LLM-generated cited notice keeps the
agent's per-case cost in the **single-digit cents**, against ${usd2(humanPerCase)}+ of caseworker time for the
same rules computation. **Human oversight is not removed** — it is redirected from rote calculation to the
judgment-heavy items the engine flags.
`;

  return {
    software: {
      traditionalBuildLow: s.iesModernizationLow,
      traditionalBuildHigh: s.iesModernizationHigh,
      traditionalPolicyChange: s.policyChangeEmergency,
      agentBuildTokenCost,
      agentBuildHours: inputs.buildHours,
      agentPolicyChangeTokenCost,
    },
    perCase: {
      humanPerCase,
      agentDeterministicPerCase,
      agentNoticePerCaseCents: noticePerCase * 100,
      retainedOversightPerCase: inputs.retainedOversightPerCase,
      agentTotalPerCase,
    },
    markdown,
  };
}
