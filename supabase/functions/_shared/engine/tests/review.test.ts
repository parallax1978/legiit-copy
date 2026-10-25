/** Unit tests for the review half: editorial flags, factual discipline, revision reconciliation, DO NOT TOUCH, ship. */
import { assert, assertEquals, assertThrows } from "@std/assert";
import type { Block, Section } from "../schemas/draft.ts";
import type { EditorialVerdict, FactualOutput, MechanicalReport, RevisionOutput } from "../schemas/review.ts";
import { verifyDoNotTouch } from "../draft/ledger.ts";
import { diffBlocks, droppedReferenceFlags, editorialFlags, factualFlags, introducesDecorativeHedge, pendingFactualFlags, postProcessFactual, reconcileRevision, revisionQuotes, userAttention, validateEditorial } from "../draft/review.ts";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";

const blk = (id: string, text: string, type: Block["type"] = "paragraph", items: string[] | null = null): Block => ({ id, type, text, items, meta: null });
const sec = (section_id: string, blocks: Block[], title: string | null = null): Section => ({ section_id, title, blocks });

const before: Section[] = [
  sec("headline", [blk("headline-1", "The 4-hour audit", "headline")]),
  sec("body", [
    blk("body-1", `I'm Dana. I ran 212 audits [[L:${A}]] last year and most of them took a week.`),
    blk("body-2", "The usual fix is a bigger spreadsheet. It fails because the data arrives after the meeting."),
    blk("body-3", `Our pull happens the night before, which is why the audit takes 4 hours [[L:${B}]].`),
  ]),
  sec("close", [blk("close-1", "Click the button and the first report lands in your inbox in two minutes.", "cta"), blk("close-2", "Start my audit", "button")]),
];

const verdict = (over: Partial<EditorialVerdict> = {}): EditorialVerdict => ({
  verdict: "REVISE",
  reject_gate: null,
  prediction: "unsure",
  prediction_reason: "the proof is thin",
  argument_readback: { sells: "audit", to: "ops leads", promise: "4 hours", because: "night-before pull", matches_memo: true },
  skim_readback: "an audit for some price",
  what_works: [{ quote: "Click the button and the first report lands in your inbox in two minutes.", why: "literal CTA" }],
  one_thing: { quote: "The usual fix is a bigger spreadsheet.", fails: "Gate C: no verbatim behind the reader's state", do: "Quote the verbatim about spreadsheets" },
  secondary_notes: [{ quote: "most of them took a week", fails: "precision below the ledger", do: "state the ledger figure" }],
  do_not_touch: ["Click the button and the first report lands in your inbox in two minutes.", "Start my audit"],
  testable_disputes: ["headline with the number vs without"],
  calibration: { argument: 2, proof: 1, pacing: 2, offer: 2, specificity: 1, reader_focus: 2, rhythm: 2 },
  sentence_job_audit: { untagged_sentences: [], paragraphs_without_claim_or_proof: [] },
  ...over,
});

// ---------------------------------------------------------------- editorial

Deno.test("editorial flags: fatal on REJECT, high on REVISE, secondary medium; prediction carried", () => {
  const revise = editorialFlags(verdict());
  assertEquals(revise.map((f) => [f.severity, f.kind]), [["high", "one_thing"], ["medium", "secondary"]]);
  assertEquals(revise[0].quote, "The usual fix is a bigger spreadsheet.");
  const reject = editorialFlags(verdict({ verdict: "REJECT", reject_gate: "B" }));
  assertEquals(reject[0].severity, "fatal");
  assertEquals(reject[0].kind, "one_thing:gate_B");
  const approve = editorialFlags(verdict({ verdict: "APPROVE", one_thing: null, secondary_notes: [] }));
  assertEquals(approve, []);
});

Deno.test("validateEditorial: REJECT needs its gate and the one thing; APPROVE may have none", () => {
  assertEquals(validateEditorial(verdict()), []);
  assert(validateEditorial(verdict({ verdict: "REJECT" })).some((p) => /gate/.test(p)));
  assert(validateEditorial(verdict({ one_thing: null })).some((p) => /ONE THING/.test(p)));
  assert(validateEditorial(verdict({ reject_gate: "A" })).some((p) => /not REJECT/.test(p)));
  assertEquals(validateEditorial(verdict({ verdict: "APPROVE", one_thing: null })), []);
  assert(validateEditorial(verdict({ prediction_reason: " " })).length > 0);
});

// ---------------------------------------------------------------- factual

const flag = (over: Partial<FactualOutput["flags"][number]> = {}): FactualOutput["flags"][number] => ({
  quote: `I ran 212 audits [[L:${A}]] last year`,
  rule: "§8.2 grade C",
  issue: "overstates",
  suggested_rewrite: `I ran 212 audits [[L:${A}]] last year, in the clients' own data`,
  severity: "medium",
  claim_type: "statistic",
  claim_id: A,
  test: 2,
  fabrication: false,
  ...over,
});

Deno.test("decorative hedges: added ones are caught, pre-existing ones are not", () => {
  assert(introducesDecorativeHedge("It cuts the audit to 4 hours.", "It may cut the audit to 4 hours."));
  assert(introducesDecorativeHedge("It cuts the audit to 4 hours.", "It cuts the audit to 4 hours. Results may vary."));
  assert(introducesDecorativeHedge("It cuts the audit.", "It cuts the audit. Individual results differ."));
  assert(!introducesDecorativeHedge("It may cut the audit to 4 hours.", "It may cut the audit to 4 hours, in our 12 client tests."));
  assert(!introducesDecorativeHedge("x", "In a 12-week trial of 84 adults, glucose fell 11 mg/dL. We did not run our own trial."));
  assert(!introducesDecorativeHedge("x", null));
});

Deno.test("postProcessFactual enforces the reviewer's discipline", () => {
  const claims = [{ id: A, user_decision: "keep" }, { id: B, user_decision: null }];
  const out: FactualOutput = {
    flags: [
      flag(), // A decided keep → dropped
      flag({ claim_id: B, quote: `takes 4 hours [[L:${B}]]`, suggested_rewrite: `takes 4 hours [[L:${B}]] in our last 12 audits` }), // kept
      flag({ claim_id: null, quote: "most of them took a week", suggested_rewrite: "most of them may have taken a week" }), // hedge → violation
      flag({ claim_id: null, quote: "the data arrives late", suggested_rewrite: null }), // no rewrite → dropped
      flag({ claim_id: null, quote: "A Harvard study found 73% improved", fabrication: true, severity: "medium", suggested_rewrite: null, test: 10 }), // fabrication stays, fatal
      flag({ claim_id: "not-a-claim", quote: `212 audits [[L:${A}]]`, fabrication: true, suggested_rewrite: "212 audits" }), // cites a kept ledger row → not a fabrication, and not re-flagged: unknown claim id nulled, cited A is "keep"
      flag({ claim_id: null, quote: `212 audits [[L:${A}]] in ${B.slice(0, 4)}`, fabrication: true, suggested_rewrite: "212 audits" }), // same, by citation alone
    ],
    consistency_check: { ok: true, mismatches: [] },
    needs_source: [],
  };
  const pp = postProcessFactual(out, claims);
  assertEquals(pp.output.flags.length, 2);
  assertEquals(pp.output.flags[0].claim_id, B);
  assertEquals(pp.output.flags[1].fabrication, true);
  assertEquals(pp.output.flags[1].severity, "fatal");
  assertEquals(pp.dropped.map((d) => d.why), ["user decided to keep this claim", "rewrite added a decorative hedge", "a flag with no rewrite is rejected", "user decided to keep this claim", "user decided to keep this claim"]);
  assertEquals(pp.violations.length, 2);

  const fx = factualFlags(pp.output);
  assertEquals(fx.map((f) => f.kind), ["test_2:statistic", "fabrication"]);
  assertEquals(fx[0].claimId, B);
  assertEquals(fx[1].severity, "fatal");

  assertEquals(pendingFactualFlags(out, claims).length, 6, "revise ignores only flags on claims the user kept");
  assertEquals(pendingFactualFlags(null, claims), []);
});

Deno.test("dropped ledger rows: citing one is a fabrication-level flag, caught by the model or added in code", () => {
  const claims = [{ id: A, claim_type: "statistic", user_decision: "drop" }, { id: B, claim_type: "guarantee", user_decision: null }];
  // the model flagged the line as a mere overstatement, citing the dropped row → upgraded to fabrication
  const pp = postProcessFactual({ flags: [flag({ claim_id: null, quote: `I ran 212 audits [[L:${A}]] last year`, severity: "medium", suggested_rewrite: "I ran many audits" })], consistency_check: { ok: true, mismatches: [] }, needs_source: [] }, claims);
  assertEquals(pp.output.flags.length, 1);
  assertEquals(pp.output.flags[0].fabrication, true);
  assertEquals(pp.output.flags[0].severity, "fatal");
  assertEquals(pp.output.flags[0].claim_id, A);
  assert(/dropped/.test(pp.output.flags[0].rule));
  // a model flag keyed to the dropped row by claim_id is upgraded the same way
  const byId = postProcessFactual({ flags: [flag({ claim_id: A, quote: "212 audits last year", suggested_rewrite: "x" })], consistency_check: { ok: true, mismatches: [] }, needs_source: [] }, claims);
  assertEquals(byId.output.flags[0].fabrication, true);

  // code-side sweep: the sentence citing A in body-1 is already covered by the model's fragment quote → nothing added
  assertEquals(droppedReferenceFlags(before, claims, pp.output.flags), []);
  // without the model's flag the sweep adds one fatal flag for that sentence and nothing for the usable row B
  const added = droppedReferenceFlags(before, claims, []);
  assertEquals(added.length, 1);
  assertEquals(added[0].quote, `I ran 212 audits [[L:${A}]] last year and most of them took a week.`);
  assertEquals(added[0].claim_id, A);
  assertEquals(added[0].claim_type, "statistic");
  assertEquals(added[0].test, 10);
  assert(added[0].fabrication && added[0].severity === "fatal" && added[0].suggested_rewrite === null);
  assertEquals(droppedReferenceFlags(before, [{ id: B, claim_type: "guarantee", user_decision: "keep" }], []), []);
  // the revise step still receives it (fabrications are never filtered by a keep decision)
  assertEquals(pendingFactualFlags({ flags: added, consistency_check: { ok: true, mismatches: [] }, needs_source: [] }, claims).length, 1);
});

// ---------------------------------------------------------------- revision

Deno.test("verifyDoNotTouch: survives normalization, reports violations and unverifiable quotes", () => {
  const after = before.map((s) => (s.section_id === "close" ? sec("close", [blk("close-1", "Click the button and the first report lands in your inbox in two minutes.", "cta"), blk("close-2", "Begin my audit", "button")]) : s));
  const r = verifyDoNotTouch(["“Click the button and the first report lands in your inbox in two minutes.”", "Start my audit", "A line that was never there"], before, after);
  assert(!r.ok);
  assertEquals(r.violated, ["Start my audit"]);
  assertEquals(r.unverifiable, ["A line that was never there"]);
  assert(verifyDoNotTouch([`I ran 212 audits last year`], before, before).ok, "ledger tags do not break matching");
});

Deno.test("reconcileRevision keeps referenced edits, reverts unreferenced ones, restores unreferenced deletions, flags DO NOT TOUCH", () => {
  const v = verdict();
  const quotes = revisionQuotes({ editorial: v, factual: [], mechanical: null, coldRead: null });
  const revision: RevisionOutput = {
    sections: [
      sec("headline", [blk("headline-1", "The 4-hour audit, every Monday", "headline")]), // unreferenced → revert
      sec("body", [
        blk("body-1", `I'm Dana. I ran 212 audits [[L:${A}]] last year and 180 of them took a week.`), // referenced by the secondary note
        blk("body-2", `"We keep adding tabs," one client told us [[L:${B}]]. The tabs fail because the data arrives after the meeting.`), // referenced by the one thing
        // body-3 deleted, unreferenced → restored
      ]),
      sec("close", [blk("close-1", "Click the button and the first report lands in your inbox in two minutes.", "cta"), blk("close-2", "Start my audit", "button")]),
    ],
    changes: [{ block_id: "body-2", before: "x", after: "y", reason: "one thing", source: "editorial" }],
    untouched_confirmed: v.do_not_touch,
  };
  const r = reconcileRevision(before, revision, quotes, v.do_not_touch);
  assertEquals(r.reverted, ["headline-1", "body-3"]);
  assertEquals(r.sections[0].blocks[0].text, "The 4-hour audit");
  assertEquals(r.sections[1].blocks.map((b) => b.id), ["body-1", "body-2", "body-3"]);
  assert(r.sections[1].blocks[0].text.includes("180 of them"));
  assert(r.sections[1].blocks[1].text.startsWith('"We keep adding tabs,"'));
  assertEquals(r.changed, ["body-1", "body-2"]);
  assertEquals(r.removed, []);
  assert(r.doNotTouch.ok);

  // a declared change on an unquoted block is allowed
  const declared: RevisionOutput = { ...revision, changes: [{ block_id: "headline-1", before: "", after: "", reason: "chief asked", source: "editorial" }] };
  const r2 = reconcileRevision(before, declared, quotes, v.do_not_touch);
  assertEquals(r2.sections[0].blocks[0].text, "The 4-hour audit, every Monday");

  // DO NOT TOUCH broken inside a referenced block
  const dntQuotes = revisionQuotes({ editorial: verdict({ secondary_notes: [{ quote: "Start my audit", fails: "x", do: "y" }] }), factual: [], mechanical: null, coldRead: null });
  const broken: RevisionOutput = { ...revision, sections: revision.sections.map((s) => (s.section_id === "close" ? sec("close", [s.blocks[0], blk("close-2", "Begin", "button")]) : s)) };
  const r3 = reconcileRevision(before, broken, dntQuotes, v.do_not_touch);
  assert(!r3.doNotTouch.ok);
  assertEquals(r3.doNotTouch.violated, ["Start my audit"]);

  // the section set may not change
  assertThrows(() => reconcileRevision(before, { ...revision, sections: revision.sections.slice(1) }, quotes, []), Error, "section set");
});

Deno.test("revisionQuotes gathers every note source; diffBlocks reports changed, added, removed", () => {
  const mech: MechanicalReport = {
    tell_score_per_300: 7,
    flags: [
      { tier: 1, tell: "designed to", weight: 4, count: 1, examples: ["designed to help busy founders"], fix: "say what it does" },
      { tier: 3, tell: "journey", weight: 1, count: 1, examples: ["your journey"], fix: "cut" },
    ],
    hard_fail: true,
    hard_fail_reasons: ["bracket placeholder: [Product Name]"],
    fk_grade: 7,
    cadence_cv: 0.5,
    cadence_flag: true,
    and_then_count: 0,
    format_gate_failures: [],
    word_count: 900,
  };
  const q = revisionQuotes({
    editorial: verdict(),
    factual: [flag()],
    mechanical: mech,
    coldRead: { skim_readback: { what_sold: "", to_whom: "", price: "", why_believe: "" }, attention_drop_line: "The usual fix", disbelieved_claim: null, promise_one_sentence: "", lead_pick: null },
  });
  assertEquals(q, ["The usual fix is a bigger spreadsheet.", "most of them took a week", `I ran 212 audits [[L:${A}]] last year`, "designed to help busy founders", "bracket placeholder: [Product Name]", "The usual fix"]);

  const d = diffBlocks(before, [sec("headline", [blk("headline-1", "New", "headline"), blk("headline-2", "Deck", "deck")]), sec("body", before[1].blocks.slice(0, 2)), before[2]]);
  assertEquals(d, { changed: ["headline-1"], added: ["headline-2"], removed: ["body-3"] });
});

// ---------------------------------------------------------------- ship

Deno.test("userAttention lists pending fatal/high flags, NEEDS SOURCE lines and open questions, deduplicated", () => {
  const items = userAttention({
    editorial: verdict({ verdict: "REJECT", reject_gate: "C" }),
    factual: null,
    mechanical: null,
    pendingFlags: [
      { source: "editorial", severity: "fatal", quote: "The usual fix", issue: "Gate C" },
      { source: "factual", severity: "medium", quote: "x", issue: "ignored: medium" },
      { source: "factual", severity: "high", quote: "73%", issue: "no ledger row" },
      { source: "factual", severity: "high", quote: "73%", issue: "no ledger row" },
    ],
    needsSource: ["Cuts the audit to 4 hours [[NEEDS SOURCE]]."],
    openQuestions: ["What is the refund window?"],
  });
  assertEquals(items.length, 4);
  assert(items[0].startsWith("Fix first (copy chief)"));
  assert(items[1].startsWith("Fix first (fact check"));
  assert(items[2].startsWith("Needs a source:"));
  assert(items[3].startsWith("Unanswered question:"));

  const fallback = userAttention({
    editorial: verdict({ verdict: "REJECT", reject_gate: "C" }),
    factual: { flags: [flag({ fabrication: true, severity: "fatal", quote: "Harvard found 73%" })], consistency_check: { ok: true, mismatches: [] }, needs_source: [] },
    mechanical: { tell_score_per_300: 0, flags: [], hard_fail: true, hard_fail_reasons: ["placeholder"], fk_grade: null, cadence_cv: null, cadence_flag: false, and_then_count: 0, format_gate_failures: [], word_count: 1 },
    pendingFlags: [],
    needsSource: [],
    openQuestions: [],
  });
  assertEquals(fallback.length, 3, "without stored flags the step outputs stand in");
  assert(fallback[0].startsWith("Fix first (copy chief, the claims)"));
  assert(fallback[1].includes("invented fact"));
  assert(fallback[2].includes("Fix first (tell check)"));
});
