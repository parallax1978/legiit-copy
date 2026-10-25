import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { countUnionParams, jsonOnlyInstruction, MAX_UNION_PARAMS, promptJsonSchema } from "../llm.ts";
import { ClaimRowInput, IntakeOutput } from "../schemas/brief.ts";
import { ArgumentOutput } from "../schemas/argument.ts";

Deno.test("intake schema exceeds the native structured-output union limit and will use the JSON fallback", () => {
  const f = zodOutputFormat(IntakeOutput) as unknown as { schema?: unknown };
  assert(countUnionParams(f.schema ?? f) > MAX_UNION_PARAMS);
});
Deno.test("argument schema stays within the native limit", () => {
  const f = zodOutputFormat(ArgumentOutput) as unknown as { schema?: unknown };
  assert(countUnionParams(f.schema ?? f) <= MAX_UNION_PARAMS);
});
Deno.test("countUnionParams counts type arrays and anyOf", () => {
  assertEquals(countUnionParams({ type: "object", properties: { a: { type: ["string", "null"] }, b: { anyOf: [{ type: "string" }, { type: "number" }] }, c: { type: "string" } } }), 2);
});

Deno.test("prompt-described schema: ledger rows require only the identifying keys; defaults are optional and visible", () => {
  const js = promptJsonSchema(IntakeOutput) as { $schema?: unknown; required: string[]; properties: { claims: { items: { required: string[]; properties: Record<string, { default?: unknown }> } } } };
  assertEquals(js.$schema, undefined);
  assertEquals(js.required, ["brief", "claims", "config", "questions"]);
  const row = js.properties.claims.items;
  assertEquals(row.required, ["claim_text", "claim_type", "role", "status"]);
  assertEquals(row.properties.flag.default, null);
  assertEquals(row.properties.evidence.default, {});
  assertEquals(row.properties.story_claim.default, false);
  const text = jsonOnlyInstruction(js);
  assertStringIncludes(text, "compact JSON");
  assertStringIncludes(text, "leave it out entirely");
});

Deno.test("ClaimRowInput fills omitted keys so consumers see the complete row", () => {
  const row = ClaimRowInput.parse({ claim_text: "$49/mo", claim_type: "price_discount", role: "offer_term", status: "unverified", evidence: { quote: "$49/mo" } });
  assertEquals(row.evidence, { source_ref: null, quote: "$49/mo", endpoint: null, population: null, dose: null, duration: null, effect_size: null });
  assertEquals([row.evidence_grade, row.flag, row.earnings_context, row.guarantee_terms, row.former_price, row.scarcity, row.deadline, row.trial_terms], [null, null, null, null, null, null, null, null]);
  assertEquals([row.material_connection, row.story_claim, row.establishment_signal], [false, false, false]);
  assertEquals(row.precision, null);
  const sdk = zodOutputFormat(IntakeOutput) as unknown as { schema?: unknown };
  assert(sdk.schema, "the SDK still compiles the schema for the native path");
});
