/**
 * mcp/resources.ts — read-only AGP objects exposed as MCP resources.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SNAP_SERVICE, SNAP_ELIGIBILITY_RULE } from "@/agp/catalog";

export function registerResources(server: McpServer): void {
  server.registerResource(
    "snap-service",
    "agp://service/md-snap",
    {
      title: "AGP Service — Maryland SNAP",
      description: "The published Service object for Maryland SNAP (validate-after).",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(SNAP_SERVICE, null, 2) }],
    }),
  );

  server.registerResource(
    "snap-eligibility-rule",
    "agp://eligibility-rule/md-snap",
    {
      title: "AGP EligibilityRule — Maryland SNAP (FY2026)",
      description: "The machine-readable eligibility rule + cited FY2026 policy parameters.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        { uri: uri.href, mimeType: "application/json", text: JSON.stringify(SNAP_ELIGIBILITY_RULE, null, 2) },
      ],
    }),
  );

  server.registerResource(
    "snap-policy-parameters",
    "agp://policy-parameters/md-snap-fy2026",
    {
      title: "Cited FY2026 SNAP policy parameters",
      description: "Dollar figures and limits, each traceable to MD-FSP §/USDA COLA sources.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(SNAP_ELIGIBILITY_RULE.policyParameters, null, 2),
        },
      ],
    }),
  );
}
