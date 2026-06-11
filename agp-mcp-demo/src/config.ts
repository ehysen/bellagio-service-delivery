/**
 * config.ts — environment parsing for the AGP MCP demo.
 *
 * Everything has a safe default so the server runs with zero configuration:
 * the extractor degrades to a deterministic stub and auth is open (with a loud
 * warning). Set AGP_BEARER_TOKEN + ANTHROPIC_API_KEY for a hardened, real-vision
 * deployment.
 */

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export type ExtractorMode = "auto" | "vision" | "stub";

export interface Config {
  port: number;
  bearerToken?: string;
  extractorMode: ExtractorMode;
  visionModel: string;
  visionBaseUrl?: string;
  anthropicApiKey?: string;
  openRouterApiKey?: string;
}

export const config: Config = {
  port: Number(env("PORT") ?? 3000),
  bearerToken: env("AGP_BEARER_TOKEN"),
  extractorMode: (env("AGP_EXTRACTOR") as ExtractorMode) ?? "auto",
  visionModel: env("AGP_VISION_MODEL") ?? "claude-opus-4-8",
  visionBaseUrl: env("AGP_VISION_BASEURL"),
  anthropicApiKey: env("ANTHROPIC_API_KEY"),
  openRouterApiKey: env("OPENROUTER_API_KEY"),
};

/**
 * Public base URL — used to build openable certificate links. Prefer an explicit
 * PUBLIC_BASE_URL env; otherwise auto-learn it from the first inbound request's
 * Host header (see the middleware in server.ts), falling back to localhost.
 */
const FIXED_BASE_URL = env("PUBLIC_BASE_URL");
let observedBaseUrl: string | undefined = FIXED_BASE_URL;

export function setObservedBaseUrl(url: string): void {
  if (!FIXED_BASE_URL) observedBaseUrl = url;
}
export function getBaseUrl(): string {
  return observedBaseUrl ?? `http://localhost:${config.port}`;
}

/** Resolve whether real vision extraction is possible given keys + mode. */
export function visionEnabled(): boolean {
  if (config.extractorMode === "stub") return false;
  const hasKey = Boolean(config.anthropicApiKey ?? config.openRouterApiKey);
  if (config.extractorMode === "vision") return hasKey;
  // "auto": vision when a key exists, else stub.
  return hasKey;
}
