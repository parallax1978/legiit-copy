import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import type { Block, Section } from "../schemas/draft.ts";
import { MechanicalReport } from "../schemas/review.ts";
import { FORMATS } from "../formats/index.ts";
import type { FormatSpec } from "../formats/spec.ts";
import type { StepContext } from "../steps/types.ts";
import { flagsFromReport, mechanicalStep, sectionsFromBlocks } from "../steps/mechanical.ts";

let n = 0;
function block(type: Block["type"], text: string, items: string[] | null = null): Block {
  return { id: `b${++n}`, type, text, items, meta: null };
}
function section(section_id: string, blocks: Block[]): Section {
  return { section_id, title: null, blocks };
}
function ctx(blocks: unknown, format: FormatSpec): StepContext {
  return {
    latestDraft: blocks === null ? null : { id: "d1", version: 1, blocks, markdown: "", origin: "system" },
    format,
    progress: () => Promise.resolve(),
  } as unknown as StepContext;
}

const CLEAN_EMAIL: Section[] = [
  section("subject", [block("subject", "the Tuesday order sheet")]),
  section("hook", [block("paragraph", "Her dog opened the box before she did.")]),
  section("body", [block("paragraph", "We refunded her on the spot and sent a second jar. The March batch sold out in 9 days, so the April run is 40 jars bigger.")]),
  section("cta", [block("cta", "Open the April order sheet; it closes Friday at 9pm.")]),
  section("signoff", [block("signoff", "Gary")]),
];

Deno.test("mechanical step returns a parsed report, no flags and no hard fail on clean copy", async () => {
  const res = await mechanicalStep(ctx(CLEAN_EMAIL, FORMATS.email_single));
  const report = MechanicalReport.parse(res.output);
  assertEquals(report.hard_fail, false);
  assertEquals(res.effects?.mechanicalHardFail, false);
  assertEquals(res.effects?.flags, []);
  assert(res.summary.startsWith("Mechanical CLEAN"));
  assertEquals(res.model, undefined, "no model call");
});

Deno.test("mechanical step maps tiers to severities and gate failures to format_gate flags", async () => {
  const draft: Section[] = [
    section("hook", [block("paragraph", "That's why we built the April sheet.")]),
    section("body", [block("bullets", "", ["**Speed:** the sheet opens in seconds", "**Accuracy:** every jar counted"])]),
    section("cta", [block("cta", "Open the sheet"), block("button", "Open the sheet")]),
  ];
  const res = await mechanicalStep(ctx(draft, FORMATS.email_single));
  const report = MechanicalReport.parse(res.output);
  assert(report.hard_fail);
  assertEquals(res.effects?.mechanicalHardFail, true);
  const flags = res.effects?.flags ?? [];
  const fatal = flags.find((f) => f.kind === "bold_label_colon");
  assert(fatal && fatal.severity === "fatal" && fatal.source === "mechanical" && fatal.rule === "04-copy-standard §7");
  assert(fatal.quote && fatal.quote.includes("**Speed:**"));
  assertEquals(fatal.suggestedRewrite, null, "a tell's fix is guidance, never a line to paste");
  assert(fatal.issue.includes("Fix: A sentence with the claim and its carrier."));
  const medium = flags.find((f) => f.kind === "thats_why_we_built");
  assertEquals(medium?.severity, "medium");
  const gate = flags.find((f) => f.kind === "format_gate");
  assert(gate && gate.severity === "high" && gate.issue.includes("email.links<=1") && gate.rule === "04-copy-standard §9");
  assert(res.summary.startsWith("Mechanical HARD FAIL"));
});

Deno.test("Tier 2 flags are low severity; Tier 3 alone produces no draft flag", () => {
  const base: Omit<MechanicalReport, "flags"> = { tell_score_per_300: 0, hard_fail: false, hard_fail_reasons: [], fk_grade: 6, ari_grade: null, cadence_cv: 0.8, cadence_flag: false, and_then_count: 0, format_gate_failures: [], word_count: 400 };
  const alone = flagsFromReport({ ...base, flags: [{ tier: 3, tell: "marketing_vocab", weight: 1, count: 2, examples: ["unlock"], fix: "cut" }] });
  assertEquals(alone, []);
  const mixed = flagsFromReport({ ...base, flags: [{ tier: 2, tell: "rule_of_three", weight: 2, count: 1, examples: ["a, b, and c."], fix: "break it" }, { tier: 3, tell: "marketing_vocab", weight: 1, count: 2, examples: ["unlock"], fix: "cut" }] });
  assertEquals(mixed.map((f) => [f.kind, f.severity]), [["rule_of_three", "low"], ["marketing_vocab", "low"]]);
  const cadence = flagsFromReport({ ...base, cadence_flag: true, cadence_cv: 0.5, and_then_count: 3, flags: [] });
  assertEquals(cadence.map((f) => f.kind), ["cadence_flat", "and_then_beat"]);
});

Deno.test("draft blocks may be Section[] or {sections}; garbage throws; a missing draft rejects", async () => {
  assertEquals(sectionsFromBlocks(CLEAN_EMAIL).length, CLEAN_EMAIL.length);
  assertEquals(sectionsFromBlocks({ sections: CLEAN_EMAIL }).length, CLEAN_EMAIL.length);
  assertThrows(() => sectionsFromBlocks({ nope: true }), Error, "not Section[]");
  await assertRejects(() => mechanicalStep(ctx(null, FORMATS.email_single)), Error, "no draft");
});
