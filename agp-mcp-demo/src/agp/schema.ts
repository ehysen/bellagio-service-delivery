/**
 * agp/schema.ts — zod schema for the engine's Household, shared by the MCP tools
 * (as a raw inputSchema shape) and the REST bridge (for validation).
 */
import { z } from "zod";

export const VERIFICATION_FACTS = [
  "identity",
  "earnedIncome",
  "unearnedIncome",
  "shelterCost",
  "utilityStatus",
  "medicalExpenses",
  "dependentCare",
  "childSupportPaid",
  "liquidAssets",
  "disability",
  "householdComposition",
] as const;

export const DOCUMENT_TYPES = [
  "termination_letter",
  "pay_stub",
  "bank_statement",
  "lease",
  "utility_bill",
  "photo_id",
] as const;

export const memberSchema = z.object({
  id: z.string(),
  age: z.number(),
  elderly: z.boolean().optional(),
  disabled: z.boolean().optional(),
  earnedIncome: z.number().optional(),
  unearnedIncome: z.number().optional(),
  selfEmployment: z.boolean().optional(),
});

export const utilityStatusSchema = z.enum(["heating_cooling", "limited", "phone_only", "none"]);
export const verificationStatusSchema = z.enum(["verified", "unverified", "not_required"]);
export const verificationFactSchema = z.enum(VERIFICATION_FACTS);

export const householdSchema = z.object({
  caseId: z.string().optional(),
  members: z.array(memberSchema).min(1),
  shelterCost: z.number().optional(),
  homeless: z.boolean().optional(),
  utilityStatus: utilityStatusSchema.default("none"),
  dependentCare: z.number().optional(),
  medicalExpenses: z.number().optional(),
  childSupportPaid: z.number().optional(),
  liquidAssets: z.number().optional(),
  applicationDay: z.number().optional(),
  verification: z.record(verificationFactSchema, verificationStatusSchema).optional(),
});

export type HouseholdInput = z.infer<typeof householdSchema>;
