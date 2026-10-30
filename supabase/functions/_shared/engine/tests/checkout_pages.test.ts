/**
 * The checkout specs (upsell, order form, order bump, thank-you page) rebuilt from the masters' format research and
 * the owner's verdicts of 30 October ("technical and not emotional", "WTF is a difficulty number?", "What is it?",
 * a lecture on his own trade, nothing like the masters): each section's job says what the part does for the buyer,
 * the opening feels before it informs, the body uses plain words, the add-on or the next thing is introduced in one
 * plain sentence, an empty proof slot never invents, confesses or asks, the record of the sale opens the page (never
 * a thank-you that closes the loop, a scene of his day or a teaser), the buyer's own voice acts at the button, and no
 * must pushes a namedrop, a wait or a metric's name. The register is the drafter's: short plain text, examples from
 * another trade.
 */
import { assert, assertEquals } from "@std/assert";
import { FORMATS } from "../formats/index.ts";
import { planDraft } from "../draft/plan.ts";

const CHECKOUT = [FORMATS.upsell, FORMATS.order_form, FORMATS.order_bump, FORMATS.thank_you] as const;
type Spec = (typeof CHECKOUT)[number];
const section = (spec: Spec, id: string) => {
  const s = spec.sections.find((x) => x.id === id);
  assert(s, `${spec.id}: no section ${id}`);
  return s;
};
const texts = (spec: Spec) => [spec.description, ...spec.sections.flatMap((s) => [s.name, s.job, ...s.must, ...s.must_not])];
const has = (list: readonly string[], part: string) => list.some((m) => m.includes(part));

Deno.test("checkout: the writer-facing text is short and plain, from another trade, with no dashes", () => {
  for (const spec of CHECKOUT) {
    for (const t of texts(spec)) {
      assert(!/[–—]/.test(t), `${spec.id}: dash in "${t}"`);
      assert(!/backlink|Legiit|SEO|keyword|search volume|difficulty|ranking/i.test(t), `${spec.id}: the owner's trade in "${t}"`);
    }
    for (const s of spec.sections) {
      assert(s.job.split(/(?<=[.!?])\s+/).length <= 5 && s.job.length <= 400, `${spec.id}.${s.id}: job too long`);
      assert(s.must.length <= 6 && s.must_not.length <= 9, `${spec.id}.${s.id}: ${s.must.length} musts, ${s.must_not.length} must-nots`);
      for (const m of s.must) assert(m.length <= 280, `${spec.id}.${s.id}: must too long: ${m}`);
      for (const m of s.must_not) assert(m.length <= 200, `${spec.id}.${s.id}: must-not too long: ${m}`);
    }
  }
  // the upsell and the bump never say a wait; the order form and the thank-you page say delivery as a fact, never as a push
  for (const spec of [FORMATS.upsell, FORMATS.order_bump]) for (const t of texts(spec)) assert(!/how long|arrives when|within \d+ minutes/i.test(t), `${spec.id}: a wait in "${t}"`);
  for (const spec of [FORMATS.order_form, FORMATS.thank_you]) {
    const t = texts(spec).join(" | ");
    assert(t.includes("fact of delivery") && /never as a reason to act|never a push|here the time is the fact of delivery/.test(t), spec.id);
  }
});

Deno.test("checkout: the opening feels first, the body uses plain words, and the thing is introduced in one plain sentence", () => {
  for (const [spec, opening, body, product] of [
    [FORMATS.upsell, "bridge", "offer", "offer"],
    [FORMATS.order_form, "acceptance", "delivery", null],
    [FORMATS.order_bump, "body", "body", "body"],
    [FORMATS.thank_you, "confirmation", "bridge", "bridge"],
  ] as const) {
    assert(section(spec, opening).must.some((m) => /rule 39/.test(m)), `${spec.id}.${opening}: no feeling must`);
    assert(section(spec, body).must.some((m) => /rule 40/.test(m)), `${spec.id}.${body}: no plain-words must`);
    if (product) assert(section(spec, product).must.some((m) => /rule 38/.test(m) && /one plain sentence/.test(m)), `${spec.id}.${product}: no plain introduction`);
  }
  assert(section(FORMATS.upsell, "confirmation").must.some((m) => /rule 39/.test(m)));
  // no must asks for a credential, a founder line or a metric's name; the bans sit in the must-nots
  for (const spec of CHECKOUT) for (const s of spec.sections) for (const m of s.must) assert(!/credential|founder|namedrop|score/i.test(m), `${spec.id}.${s.id}: ${m}`);
  assert(has(section(FORMATS.upsell, "offer").must_not, "a lesson in his trade"));
  assert(has(section(FORMATS.upsell, "bridge").must_not, "a lesson in how his trade works"));
  assert(has(section(FORMATS.order_bump, "body").must_not, "a lesson in his trade"));
  assert(has(section(FORMATS.thank_you, "bridge").must_not, "a lesson in his trade"));
  assert(has(section(FORMATS.thank_you, "bridge").must_not, "a credential line about the host as its own sentence"));
  // the product is never pointed at before its plain sentence
  assert(has(section(FORMATS.upsell, "confirmation").must_not, "pointed at"));
  assert(has(section(FORMATS.upsell, "offer").must_not, "pointed at"));
  assert(has(section(FORMATS.thank_you, "bridge").must_not, "pointed at"));
});

Deno.test("checkout: an empty proof slot never invents, confesses or asks", () => {
  const proof = section(FORMATS.upsell, "proof");
  assert(proof.optional && proof.job.includes("With no result on file"));
  assert(has(proof.must_not, "asks for proof to be added") && has(proof.must_not, "a testimonial the ledger does not hold"));
  const t = section(FORMATS.order_form, "testimonial");
  assert(t.optional && t.job.includes("the slot is left out") && has(t.must_not, "says there are none"));
  const bridge = section(FORMATS.thank_you, "bridge");
  assert(bridge.optional && bridge.job.includes("the page ends on the instruction") && has(bridge.must_not, "an invented offer, or a line that says there is none"));
  // reasons, values and counts are offer-block and ledger facts
  assert(section(FORMATS.upsell, "reason_here").must[0].includes("the order is open and the card is on file"));
  assert(has(section(FORMATS.upsell, "stack_price").must_not, "former-price row"));
  assert(has(section(FORMATS.order_bump, "body").must_not, "a $257 value") && has(section(FORMATS.order_bump, "body").must_not, "63% choose this"));
  assert(has(section(FORMATS.order_form, "price_block").must_not, "a strikethrough price with no former-price row"));
  assert(has(section(FORMATS.order_form, "trust").must_not, "a count of customers with no ledger count"));
  assert(has(section(FORMATS.thank_you, "bridge").must_not, "a count of people ahead or a sold-out line with no ledger row"));
});

Deno.test("checkout: the record opens the page, the buyer's voice acts, the No is plain", () => {
  const conf = section(FORMATS.upsell, "confirmation");
  assert(conf.must.some((m) => /record of the sale/.test(m) && /tell 14/.test(m)));
  for (const s of ["your order is complete", "congratulations", "a teaser that withholds the offer"]) assert(has(conf.must_not, s), s);
  const bridge = section(FORMATS.upsell, "bridge");
  for (const s of ["a scene of his day invented for him", "action-taker", "Let me ask you a question"]) assert(has(bridge.must_not, s), s);
  assert(has(section(FORMATS.upsell, "offer").must, "one offer on the page"));
  assert(has(section(FORMATS.upsell, "offer").must_not, "two options or a menu"));
  assert(section(FORMATS.upsell, "yes_button").must[0].startsWith("first person"));
  assert(section(FORMATS.upsell, "no_link").must[0].includes("near the Yes button") && has(section(FORMATS.upsell, "no_link").must_not, "a shaming decline"));
  const acc = section(FORMATS.order_form, "acceptance");
  assert(acc.must[0].startsWith("first person") && has(acc.must_not, "\"Checkout\"") && acc.must_not.includes("a question"));
  const button = section(FORMATS.order_form, "button");
  for (const s of ["\"Submit\"", "\"Submit Order\"", "\"Continue\" alone", "\"your\" in the button"]) assert(button.must_not.includes(s), s);
  const fields = section(FORMATS.order_form, "fields");
  assert(has(fields.must_not, "a password or an account before payment") && has(fields.must_not, "a company, fax or re-type field"));
  assert(has(section(FORMATS.order_form, "trust").must_not, "label-and-colon lines"));
  const box = section(FORMATS.order_bump, "checkbox_line");
  assert(!/\[thing\]|\$X/.test(box.job), box.job);
  for (const s of ["a pre-checked box", "a second checkbox", "brackets or a placeholder in the line"]) assert(box.must_not.includes(s), s);
  assert(has(section(FORMATS.order_bump, "body").must_not, "a question the body answers itself"));
  const ty = section(FORMATS.thank_you, "confirmation");
  assert(has(ty.must_not, "\"Thank you!\" or \"Confirmation\" as the headline") && has(ty.must_not, "a celebration"));
  assert(has(section(FORMATS.thank_you, "instruction").must_not, "before the thing is delivered"));
  assert(section(FORMATS.thank_you, "bridge").must[0].includes("offer block"));
});

Deno.test("checkout: the structure and the draft plan", () => {
  const ids = (spec: Spec) => spec.sections.map((s) => s.id);
  assertEquals(ids(FORMATS.upsell), ["confirmation", "bridge", "offer", "proof", "reason_here", "stack_price", "guarantee", "yes_button", "no_link"]);
  assertEquals(FORMATS.upsell.draft_order, ["stack_price", "guarantee", "yes_button", "no_link", "reason_here", "offer", "proof", "bridge", "confirmation"]);
  assertEquals(ids(FORMATS.order_form), ["acceptance", "recap", "price_block", "options", "delivery", "guarantee", "deadline", "trust", "testimonial", "fields", "button"]);
  assert(FORMATS.order_form.hard_gates.includes("order_form.has_price"));
  assertEquals(ids(FORMATS.order_bump), ["checkbox_line", "body"]);
  assertEquals(ids(FORMATS.thank_you), ["confirmation", "instruction", "bridge"]);
  assert(section(FORMATS.thank_you, "bridge").optional && section(FORMATS.thank_you, "instruction").block_types?.includes("cta"));
  assertEquals(FORMATS.thank_you.length_band_words, [40, 250]);
  for (const spec of CHECKOUT) {
    const plan = planDraft(spec);
    assertEquals(plan.calls.length, 1, spec.id);
    assertEquals(plan.leadSectionId, null, spec.id);
    assertEquals(plan.calls[0].units.map((u) => u.id), spec.draft_order, spec.id);
  }
});
