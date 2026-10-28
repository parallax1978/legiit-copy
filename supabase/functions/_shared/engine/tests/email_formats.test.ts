/**
 * The email formats rebuilt from the masters' email research: the single email, the sequence and the cold email. These
 * pin what the rebuild changed, so a later edit cannot quietly bring back what pushed the drafter toward AI copy: a
 * sequence role that names a position or invites an invented customer, an opening that tells the reader his own
 * history, a proof slot that invents, confesses or asks, a cold-email observation with no fact behind it, and an
 * example a drafter could copy from the standard or from the owner's own trade.
 */
import { assert, assertEquals } from "@std/assert";
import { FORMATS, SEQUENCE_ROLES } from "../formats/index.ts";
import type { FormatSpec } from "../formats/spec.ts";
import { exemplarCopies, ownerTellsIn } from "../tells.ts";
import { planDraft } from "../draft/plan.ts";

const EMAIL: FormatSpec[] = [FORMATS.email_single, FORMATS.email_sequence, FORMATS.cold_email];
const section = (spec: FormatSpec, id: string) => spec.sections.find((s) => s.id === id)!;
/** What the drafter is told to write (the description, each job and must), and everything it reads. */
const positive = (spec: FormatSpec) => [spec.description, ...spec.sections.flatMap((s) => [s.job, ...s.must])];
const everything = (spec: FormatSpec) => [...positive(spec), ...spec.sections.flatMap((s) => s.must_not)];

Deno.test("email specs: a sequence role names the email's job, never a position, a bare timing or a slot that invites invention", () => {
  assertEquals(Object.fromEntries(Object.entries(SEQUENCE_ROLES).map(([k, v]) => [k, v.length])), { welcome: 7, launch: 12, abandoned_cart: 3, post_purchase: 5, win_back: 3 });
  for (const r of Object.values(SEQUENCE_ROLES).flat()) {
    assert(!/_\d+$/.test(r), `${r}: a position, not a job`);
    assert(!/^\d+(?:_\d+)?_(?:minutes|hours)$/.test(r), `${r}: a timing with no job`);
    assert(!/customer_story|faq/.test(r), `${r}: invites a customer or a Q&A the ledger may not hold`);
  }
  // the drafter sees the token as the email's job, in the unit and its title
  const unit = planDraft(FORMATS.email_sequence, { roles: SEQUENCE_ROLES.launch }).calls.flatMap((c) => c.units).find((u) => u.item?.index === 6)!;
  assertEquals(unit.item?.role, "mid_cart_free_taste");
  assert(unit.title.includes("mid_cart_free_taste"), unit.title);
});

Deno.test("email specs: the opening starts on one fact in the speaker's world and bans the four rejected shapes", () => {
  for (const [spec, id, tells] of [[FORMATS.email_single, "hook", [14, 15, 16, 17]], [FORMATS.email_sequence, "hook", [14, 15, 16, 17]], [FORMATS.cold_email, "observation", [14, 17]]] as const) {
    const nots = section(spec, id).must_not.join(" | ");
    for (const n of tells) assert(nots.includes(`tell ${n}`), `${spec.id}.${id}: tell ${n}`);
  }
  for (const spec of [FORMATS.email_single, FORMATS.email_sequence]) assert(section(spec, "hook").must.some((m) => m.startsWith("one fact, picked first")), spec.id);
  // nothing the drafter is told to write asks for the reader's own history or a pile of nouns with no one in it
  for (const spec of EMAIL) {
    for (const t of positive(spec)) assert(!/something that happened to (?:them|the reader)|about the reader, not the sender|a concrete noun, number or scene/i.test(t), `${spec.id}: ${t}`);
  }
  // the cold email's reason to write is a fact the user gave, said as what the sender saw; with none, who he is and why
  const why = section(FORMATS.cold_email, "observation");
  assert(why.must.some((m) => m.includes("the who-and-why line when there is none")));
  assert(why.must_not.some((m) => m.startsWith("an observation, detail, name or number the user did not give")));
});

Deno.test("email specs: a proof slot never invents, confesses or asks, and the link rules agree with the gates", () => {
  for (const [spec, id] of [[FORMATS.email_single, "body"], [FORMATS.email_sequence, "body"], [FORMATS.cold_email, "problem_or_case"]] as const) {
    const nots = section(spec, id).must_not.join(" | ");
    assert(/missing/.test(nots), `${spec.id}.${id}: a confession is banned`);
    assert(/the ledger does not hold|with no ledger row/.test(nots), `${spec.id}.${id}: an invented result is banned`);
  }
  assert(section(FORMATS.email_sequence, "body").must.some((m) => m.startsWith("a proof email tells a documented customer's story only when the ledger holds one; with none, it is the free taste")));
  // one link per email: the P.S. and the reason to open the next never carry a second one
  for (const spec of [FORMATS.email_single, FORMATS.email_sequence]) {
    assert(spec.hard_gates.includes("email.links<=1"), spec.id);
    assert(section(spec, "cta").must.includes("exactly one link"), spec.id);
  }
  assert(section(FORMATS.email_single, "signoff").must_not.includes("a second link, in the P.S. or anywhere else"));
  assert(section(FORMATS.email_sequence, "next_open").must_not.includes("a second link"));
  // the cold email's limits follow the measured range (Gong: 50-100 words, subjects of 1-4 words)
  assertEquals(FORMATS.cold_email.hard_gates, ["cold_email.words<=100", "cold_email.subject_words<=4", "cold_email.email_one_links==0", "cold_email.questions<=1"]);
  assertEquals(section(FORMATS.cold_email, "subject").band_words, [1, 4]);
});

Deno.test("email specs: the text a drafter reads is not the standard's examples, has no dash, no owner's tell, and no example from the owner's trade", () => {
  for (const spec of EMAIL) {
    for (const t of everything(spec)) {
      assertEquals(exemplarCopies(t), [], `${spec.id}: ${t}`);
      assert(!/[–—]|--/.test(t), `${spec.id}: a dash in "${t}"`);
      assert(!/\b(?:seo|serp|keywords?|rankings?|backlinks?|legiit)\b/i.test(t), `${spec.id}: an example from the owner's trade in "${t}"`);
    }
    for (const t of positive(spec)) assertEquals(ownerTellsIn(t, []), 0, `${spec.id}: ${t}`);
  }
});
