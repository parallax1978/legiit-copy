/**
 * The masters' rebuild: the copy guard (an example in the standard is studied, never reproduced), and the prompt
 * versions that carry the masters' hooks (docs/04 Section 3) to the drafter, the tell edit, the copy chief, the reviser,
 * the cold read and the research step, with no prompt left teaching the reader's own history as a hook.
 */
import { assert, assertEquals } from "@std/assert";
import type { Block, Section } from "../schemas/draft.ts";
import { FORMATS } from "../formats/index.ts";
import { analyzeDraft, exemplarCopies, exemplarSources, TELLS } from "../tells.ts";
import { assembleDraft } from "../draft/assemble.ts";
import { editableUnits, unitFindings } from "../draft/tell_edit.ts";
import { LEAD_SELECTION, OWNER_TELLS, RULES } from "../prompts/standard.ts";
import argumentPrompt from "../prompts/argument.v15.ts";
import { draftPrompt, leadsJob } from "../prompts/draft.v14.ts";
import { tellEditPrompt, cadenceNote } from "../prompts/tell_edit.v11.ts";
import { editorialPrompt } from "../prompts/editorial.v14.ts";
import { revisePrompt } from "../prompts/revise.v13.ts";
import { coldReadPrompt } from "../prompts/cold_read.v2.ts";
import researchPrompt from "../prompts/research.v9.ts";
import { factualPrompt } from "../prompts/factual.v12.ts";
import offerPrompt from "../prompts/offer.v13.ts";
import intakePrompt from "../prompts/intake.v11.ts";

const blk = (id: string, text: string, type: Block["type"] = "paragraph"): Block => ({ id, type, text, items: null, meta: null });
const sec = (section_id: string, blocks: Block[]): Section => ({ section_id, title: null, blocks });

Deno.test("copy guard: six words in a row from an example in the standard fail the piece; near misses do not", () => {
  // the examples are the quoted lines of Section 3's hooks paragraph: the masters' openings and the owner's rejected lines
  const sources = exemplarSources();
  for (const s of ["They Laughed When I Sat Down At the Piano", "Any man who owns a cow loses a calf once in a while.", "You paid a writer for a page your keyword tool scored as easy."]) assert(sources.includes(s), s);
  assert(sources.every((s) => !/never the subject|no reframe|no teaser/.test(s)), "rule text is never taken for an example");

  assertEquals(exemplarCopies("They laughed when I sat down at the estimate table.").map((c) => c.words), ["they laughed when i sat down at the"]);
  assertEquals(exemplarCopies("They laughed when I sat."), [], "five words in a row");
  assertEquals(exemplarCopies("Do you know what it is you want to do?"), [], "a run of common words");

  const post = (lead: string, main = "I quote every roof in person.") => analyzeDraft([sec("lead_in", [blk("h", lead, "hook")]), sec("main", [blk("m", main)])], FORMATS.organic_social);
  const r = post("Any man who owns a cow loses a calf once in a while, and every roofer loses a bid.");
  const f = r.flags.find((x) => x.tell === "copied_exemplar")!;
  assertEquals([f.tier, f.count], [0, 1]);
  assert(r.hard_fail && r.hard_fail_reasons.includes("tier0:copied_exemplar x1"), r.hard_fail_reasons.join("; "));
  assert(!post("Every roofer in this county loses a bid now and then.").flags.some((x) => x.tell === "copied_exemplar"));
  // a testimonial is the customer's own words
  const quoted = analyzeDraft([sec("main", [blk("t", "They laughed when I sat down at the piano, and then I played.", "testimonial")])], FORMATS.sales_letter);
  assert(!quoted.flags.some((x) => x.tell === "copied_exemplar"));
  const rule = TELLS.find((x) => x.name === "copied_exemplar")!;
  assert(rule.tier === 0 && rule.regex === null && !rule.owner);
});

Deno.test("copy guard: the tell edit gets a copied example as a line to say in the speaker's own words", () => {
  const spec = FORMATS.organic_social;
  const draft = assembleDraft({ spec, sections: [sec("lead_in", [blk("lead_in-1", "I quote every roof in person.", "hook")]), sec("main", [blk("main-1", "Any man who owns a cow loses a calf once in a while, and roofers lose bids.")]), sec("cta", [blk("cta-1", "Call the number in the first comment.", "cta")])], leads: null, chosenLeadId: null, needsSource: [], keepOrder: true });
  const found = unitFindings(editableUnits(draft, spec), spec, []).filter((f) => f.tell === "copied_exemplar");
  assertEquals(found.map((f) => f.ref), ["main-1"]);
  assert(found[0].example.includes("say it in the speaker's own words"), found[0].example);
});

Deno.test("prompts: the masters' hooks reach every step that writes, reviews or plans copy, in new versions", () => {
  assertEquals([argumentPrompt.version, draftPrompt.version, tellEditPrompt.version, revisePrompt.version, editorialPrompt.version, factualPrompt.version, offerPrompt.version, researchPrompt.version, intakePrompt.version, coldReadPrompt.version], [15, 14, 11, 13, 14, 12, 13, 9, 11, 2]);
  // Section 3: fact first, three facts, the moves, line one and line two, the four shapes
  for (const t of ["A hook is found in the facts, not phrased.", "three different facts and three different opening moves", "The masters' opening moves, by the lead type they serve:", "Line two pays it off at once", "A hook never tells the reader his own history or habit as a fact", "unless the credential is the surprise the hook turns on", "A hook never says what the reader's current tool does"]) assert(LEAD_SELECTION.includes(t), t);
  for (const [name, system] of [["argument", argumentPrompt.system], ["draft", draftPrompt.system], ["editorial", editorialPrompt.system], ["research", researchPrompt.system]] as const) assert(system.includes("The masters' opening moves"), name);
  // Section 7.1 rows 14 to 17 reach every writer
  for (const [name, system] of [["draft", draftPrompt.system], ["revise", revisePrompt.system], ["tell_edit", tellEditPrompt.system], ["editorial", editorialPrompt.system], ["factual", factualPrompt.system]] as const) {
    assert(system.includes("| 14 | The reader's own history or habit told to him as a fact in line one"), name);
    assert(system.includes("Tells 14 to 17 are read on each piece's opening only"), name);
  }
  // the body rules
  for (const t of ["34. Each paragraph answers the question the one before it left", "35. Reinforce, never repeat.", "36. One promise, several reasons.", "37. Every paragraph carries a specific"]) assert(RULES.includes(t), t);
  // no prompt still teaches the reader's own history as the hook (the nine places the rejected shape came from)
  const all = { argument: argumentPrompt.system, draft: draftPrompt.system, tell_edit: tellEditPrompt.system, revise: revisePrompt.system, editorial: editorialPrompt.system, factual: factualPrompt.system, offer: offerPrompt.system, research: researchPrompt.system, intake: intakePrompt.system, cold_read: coldReadPrompt.system };
  for (const [name, system] of Object.entries(all)) {
    for (const t of ["as something that happened to them", "as one concrete thing that happened to the reader", "pages you paid for that never earned back what they cost", "The page you paid a writer for never earned back what it cost.", "quotes you sent that nobody chased", "The score does not look at your site."]) assert(!system.includes(t), `${name}: ${t}`);
  }
  assert(!OWNER_TELLS.includes("I've wired houses here for twenty years"), "the credential example is described, never a sentence to copy");
});

Deno.test("prompts: the drafter's leads job is the masters' hook, for a hook and for a long lead", () => {
  const hookV1 = `Each lead is a hook: inside the section's band; line one says the reader's problem plainly, in words the reader would use, with a concrete thing from the reader's world (the tool, the task, the money or the hours) and what it costs them; it states the claim directly: no reframe that presents one thing as another, no "Here's the..." windup, no teaser that withholds nothing specific; read aloud, it is a sentence the speaker would say to one reader across a table, not a line for a poster; a number about the product's own output is proof for the next line, never the hook; one claim a skeptic would doubt; ends on an open loop that the body pays off; the speaker's credentials and the product's name wait for the body; ledger tags on every fact.`;
  const longV1 = `Each lead: inside the section's band; cut from the top (the first sentence is already inside the story or the claim); the speaker identified by word 150; one claim a skeptic would doubt; the mechanism named at most, never explained; ends on an open loop that the body pays off; ledger tags on every fact.`;
  const hook = leadsJob(`before\n${hookV1}\nafter`);
  assert(!hook.includes(hookV1) && hook.includes("Write it from facts, not phrasing.") && hook.includes("three different facts with three different opening moves") && hook.startsWith("before\n") && hook.endsWith("\nafter"));
  const long = leadsJob(longV1);
  assert(long.includes("the three leads stand on three different facts") && long.includes("Section 7.1, tells 14 to 17"));
  assertEquals(leadsJob("a sections call has no leads job"), "a sections call has no leads job");
  assert(draftPrompt.system.includes("a hook never recounts it as something the reader did"));
});

Deno.test("prompts: the tell edit, copy chief, reviser, cold read and research carry their part of the masters' hooks", () => {
  for (const t of [`"Could you say today what your books showed in March?"`, "is rewritten, keeping its facts and tags, as one of the moves in Section 3", "is rewritten with a person as the subject", `"A menu is a promise." becomes "The kitchen cooks every dish to order."`, "never break the opening's first two lines"]) assert(tellEditPrompt.system.includes(t), t);
  assertEquals(cadenceNote("CADENCE: x. Break one or two long sentences in two and let one run long; never add words to do it."), "CADENCE: x. Break one or two long sentences in the main points in two and let one run long; leave the opening's first two lines as they are, never make a clause that says what something cost or how it ended a sentence of its own, and never add words to do it.");
  assert(editorialPrompt.system.includes("read line one before anything else and name its opening move to yourself"));
  assert(editorialPrompt.system.includes("Such a line is never in DO NOT TOUCH."));
  assert(revisePrompt.system.includes("## Hooks (docs/04 Section 3)\n\nHooks. Where the opening line is the whole lead"));
  assert(coldReadPrompt.system.includes("reads as an ad written about you"));
  for (const t of ["read each competitor's own documentation", "Hunt for the facts a hook can stand on", "any stake he holds against his own interest"]) assert(researchPrompt.system.includes(t), t);
});
