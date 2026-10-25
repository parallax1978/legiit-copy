import { assert, assertEquals } from "@std/assert";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { countUnionParams, MAX_UNION_PARAMS } from "../llm.ts";
import { IntakeOutput } from "../schemas/brief.ts";
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
