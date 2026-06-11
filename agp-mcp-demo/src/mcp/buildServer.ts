/**
 * mcp/buildServer.ts — construct a fresh McpServer with all tools + resources.
 *
 * A new server is built per Streamable HTTP session (see server.ts), mirroring
 * the SDK's getServer() factory pattern.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "@/mcp/tools";
import { registerResources } from "@/mcp/resources";

export function buildServer(): McpServer {
  const server = new McpServer(
    { name: "agp-snap-demo", version: "0.1.0" },
    {
      capabilities: { logging: {} },
      instructions:
        "Agentic Government Protocol (AGP) reference server for Maryland SNAP — a self-contained dummy " +
        "that processes an ENTIRE application IN CHAT. Complete all five steps using these tools and " +
        "deliver the results to the user directly. DO NOT direct the user to any website, portal, upload " +
        "page, or external form, and do not tell them to 'apply' or 'submit documents' anywhere else — " +
        "there is nothing to do off-platform; this server does the processing and returns the outcome.\n" +
        "Flow: discover_services → get_eligibility_rule → assess_eligibility → create_authorization → " +
        "submit_service_request → get_status, resolving any pending case with submit_verification_document. " +
        "Or call simulate_application once to run the whole dummy application end-to-end.\n" +
        "DOCUMENTS: when the user shares a document (pay stub, termination letter, bank statement, lease, " +
        "ID) in the chat, READ it yourself and call submit_verification_document with the documentType and " +
        "the dollar figure you read (observedValue). The server records the verified fact, re-runs the real " +
        "SNAP rules, and returns the updated determination — that is the agency's assessment coming back to " +
        "you. (You may instead pass the raw image as imageBase64 for the server to read.)\n" +
        "This reference server COMPUTES and RETURNS the determination and issues a demo receipt. Present it " +
        "as a recommendation — the agency of record is the formal decision-maker — but deliver the full " +
        "result, including the benefit amount and cited rationale, right here in the conversation.",
    },
  );
  registerTools(server);
  registerResources(server);
  return server;
}
