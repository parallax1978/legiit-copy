/**
 * The owner's three points on the social post (generation ec6d0be4): the copy got wrong what the product does (a
 * backlink check as the mechanism, its terms used before it was introduced, the reader sent to pay a writer for pages
 * the product writes), it used a pointless namedrop, and it told the reader how long he would wait. Each is a rule in
 * the standard, a row in the owner's list, a line in the social spec and a change in the prompts that pick, write and
 * review the argument.
 */
import { assert, assertEquals } from "@std/assert";
import { FORMATS } from "../formats/index.ts";
import { ARGUMENT_SELECTION, COPY_CHIEF_RUBRIC, FORMAT_SPECS, LEAD_SELECTION, OWNER_TELLS, PROOF_PLACEMENT, RULES } from "../prompts/standard.ts";
import argumentPrompt from "../prompts/argument.v18.ts";
import { credentialJob, draftPrompt } from "../prompts/draft.v16.ts";
import { tellEditPrompt } from "../prompts/tell_edit.v14.ts";
import { editorialPrompt } from "../prompts/editorial.v17.ts";
import { revisePrompt } from "../prompts/revise.v16.ts";
import { factualPrompt } from "../prompts/factual.v14.ts";
import offerPrompt from "../prompts/offer.v16.ts";
import intakePrompt from "../prompts/intake.v14.ts";
import researchPrompt from "../prompts/research.v11.ts";

const social = FORMATS.organic_social;
const section = (id: string) => social.sections.find((s) => s.id === id)!;

Deno.test("what the product does: said in the reader's words, introduced plainly, all of it the promise needs, never sent elsewhere", () => {
  assert(RULES.includes("38. Introduce the product the first time in one plain sentence a friend would use"));
  assert(RULES.includes("never send the reader to do by hand, or to hire or pay someone for, what the product does itself"));
  assert(RULES.includes("It is never the technical input the product computes"));
  assert(ARGUMENT_SELECTION.includes("The mechanism is what the product does for the reader, said as he would say it to a friend"));
  assert(ARGUMENT_SELECTION.includes("a candidate whose mechanism is one scores at most 1 on C10"));
  // the argument step: the mechanism field, the search and C10
  assert(argumentPrompt.system.includes("mechanism: what the product does for the reader, in his words"));
  assert(argumentPrompt.system.includes("covering everything in the brief's deliverables the promise needs"));
  assert(!argumentPrompt.system.includes("the mechanism in the process (how the product produces the result, step by step"));
  assert(argumentPrompt.system.includes("at most 1 for a mechanism told as a technical input"));
  // the copy chief fails it in a short piece, and its directions never bring it back
  assert(COPY_CHIEF_RUBRIC.includes("the product named or used before it is introduced (rule 38)"));
  assert(COPY_CHIEF_RUBRIC.includes("the reader sent to do by hand or to hire or pay someone for what the product does (rule 38)"));
  assert(COPY_CHIEF_RUBRIC.includes("never sends the reader to do by hand or to hire or pay someone for what the product does"));
  // the social post
  assert(section("main").must.some((m) => m.startsWith("the product introduced in one plain sentence with its name")));
  assert(section("main").must_not.some((m) => m.includes("the reader sent to do by hand, or to hire or pay someone for, what the product does itself")));
});

Deno.test("the namedrop: never a sentence of its own or an argument about the speaker's business, never in a social post or a text ad", () => {
  assert(RULES.includes("never a namedrop: his title, his company or another business of his is said only when the reader needs it to believe the next line"));
  assert(RULES.includes("never in a social post or a text ad, which already carry his name"));
  assert(!LEAD_SELECTION.includes("a stake against the speaker's own interest"), "the hook's credential exception is gone");
  assert(!LEAD_SELECTION.includes("the speaker's own interest said first"), "the speaker's own interest is no longer a move");
  assert(LEAD_SELECTION.includes("a credential is said only where rule 8 allows it"));
  assert(COPY_CHIEF_RUBRIC.includes("or any namedrop (rule 8)"));
  // the social post carries no founder line
  const all = social.sections.flatMap((s) => [s.job, ...s.must]);
  assert(all.every((t) => !/founder line|founder's line/.test(t)), "no must asks for a founder line");
  assert(section("main").must_not.some((m) => m.startsWith("a founder, credential or company line")));
  assert(FORMAT_SPECS.includes("a founder, credential or company line;"));
  // the leads job and the research no longer bring one in
  const v14 = "x The product's name waits for the body, and so does the speaker's credential unless it is the surprise the hook turns on. y";
  assertEquals(credentialJob(v14), "x The product's name and the speaker's credential wait for the body, and a credential goes only where rule 8 allows it. y");
  assertEquals(credentialJob("a sections call"), "a sections call");
  assertEquals(draftPrompt.version, 16);
  assert(!researchPrompt.system.includes("any stake he holds against his own interest"));
});

Deno.test("the timeframe: a time is said only when it is a reason to act, never a wait the reader sits through", () => {
  assert(RULES.includes("how long something takes is said only when the time is itself a reason to act (seconds, today), never a wait the reader has to sit through"));
  assert(RULES.includes("what arrives (and when, only when the time is a reason to act, rule 18)"));
  assert(PROOF_PLACEMENT.includes("and how soon only when the time is a reason to act, rule 18"));
  assert(!PROOF_PLACEMENT.includes("what arrives when stand there alone"));
  assert(COPY_CHIEF_RUBRIC.includes("or a wait the reader would sit through said to get him to act (rule 18)"));
  const cta = section("cta");
  assert(cta.must_not.includes("how long anything takes (rule 18)"));
  assert(cta.must.every((m) => !/\bwhen\b|how long|how soon/.test(m)), cta.must.join(" | "));
  // no format asks a call to action for the wait; the order form and the thank-you page tell a buyer who has already paid
  for (const spec of Object.values(FORMATS)) {
    if (spec.id === "order_form" || spec.id === "thank_you") continue;
    for (const s of spec.sections) for (const t of [s.job, ...s.must]) assert(!/first and when|arrives when|when its first part arrives/.test(t), `${spec.id}.${s.id}: ${t}`);
  }
});

Deno.test("the owner's list carries the three points as tells 18 to 21, and every writer and reviewer reads them", () => {
  for (const t of ["| 18 | The product named or used by its own terms before the reader is told what it is", "| 19 | The product's own work sent elsewhere", "| 20 | A namedrop", "| 21 | A wait the reader would sit through"]) assert(OWNER_TELLS.includes(t), t);
  for (const [name, system] of [["draft", draftPrompt.system], ["revise", revisePrompt.system], ["tell_edit", tellEditPrompt.system], ["editorial", editorialPrompt.system], ["factual", factualPrompt.system], ["offer", offerPrompt.system], ["intake", intakePrompt.system]] as const) {
    assert(system.includes("| 20 | A namedrop"), name);
    assert(system.includes("| 21 | A wait the reader would sit through"), name);
  }
  assert(tellEditPrompt.system.includes(`"other", any other tell above, the owner's tells 18 to 21 included`));
  assert(editorialPrompt.system.includes("Read every draft for Section 7.1 tells 18 to 21"));
  // no em dash in anything the owner's points added (tell 11's own example is the one em dash in the list)
  const rows = OWNER_TELLS.slice(OWNER_TELLS.indexOf("| 18 |"), OWNER_TELLS.indexOf("Tells 14 to 17 are read"));
  const added = [rows, RULES.slice(RULES.indexOf("38. ")), ARGUMENT_SELECTION, argumentPrompt.system.slice(0, argumentPrompt.system.indexOf("---")), editorialPrompt.system.slice(0, editorialPrompt.system.indexOf("## 6."))];
  for (const t of added) assert(t.length > 0 && !/[\u2013\u2014]/.test(t), t.slice(0, 80));
});
