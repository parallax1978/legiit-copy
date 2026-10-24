/** Unit tests for the drafting half: section planning, lead selection, ledger checks, assembly, interrogation. */
import { assert, assertEquals, assertThrows } from "@std/assert";
import { sales_letter } from "../formats/specs/sales_letter.ts";
import { email_single } from "../formats/specs/email_single.ts";
import { describePlan, GROUP_OVERFLOW, GROUP_SOFT_LIMIT_WORDS, groupUnits, itemCount, itemShape, planDraft, sectionUnit } from "../draft/plan.ts";
import { email_sequence, SEQUENCE_ROLES } from "../formats/specs/email_sequence.ts";
import { meta_ad } from "../formats/specs/meta_ad.ts";
import { google_rsa } from "../formats/specs/google_rsa.ts";
import { webinar_package } from "../formats/specs/webinar_package.ts";
import { vsl_long } from "../formats/specs/vsl_long.ts";
import { DIRECT_LEADS, INDIRECT_LEADS, LEAD_IDS, leadTypesForAwareness, runnerUpLead } from "../draft/leads.ts";
import { collectLedgerRefs, droppedClaimIds, droppedLedgerRefs, interrogate, needsSourceLines, normalizeQuote, quoteAppears, readerText, targetAwareness, unknownLedgerRefs, usableClaims } from "../draft/ledger.ts";
import { applyLeadPick, assembleDraft, orderSections, provisionalLeadSection, parseStoredDraft, toDraftEffect } from "../draft/assemble.ts";
import { parseOptions } from "../draft/options.ts";
import { matchSections, normalizeLeads, validateLeads, validateSections } from "../steps/draft.ts";
import type { Block, Section } from "../schemas/draft.ts";
import type { Awareness } from "../schemas/common.ts";
import type { Dossier } from "../schemas/research.ts";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";
const GHOST = "99999999-9999-9999-9999-999999999999";

const blk = (id: string, text: string, type: Block["type"] = "paragraph", items: string[] | null = null): Block => ({ id, type, text, items, meta: null });
const sec = (section_id: string, blocks: Block[], title: string | null = null): Section => ({ section_id, title, blocks });

// ---------------------------------------------------------------- planning

Deno.test("sales letter plan: offer block first, grouped small sections, leads then headline last", () => {
  const plan = planDraft(sales_letter);
  const ids = plan.calls.flatMap((c) => c.units.map((u) => u.id));
  assertEquals(new Set(ids).size, ids.length, "every section planned once");
  assertEquals(new Set(ids), new Set(sales_letter.sections.map((s) => s.id)), "every section planned");
  assertEquals(plan.leadSectionId, "lead");
  assertEquals(plan.headlineSectionId, "headline");
  assertEquals(plan.calls[0].units.map((u) => u.id), ["offer", "price", "guarantee", "urgency"], "the offer block is one call and comes first");
  assertEquals(plan.calls[1].units.map((u) => u.id), ["close", "ps"], "a tiny P.S. rides with the close");
  assertEquals(plan.calls[2].units.map((u) => u.id), ["build_up"], "a section over the limit is drafted alone");
  const last = plan.calls.slice(-2);
  assertEquals(last.map((c) => c.kind), ["leads", "headline"]);
  assertEquals(last[0].units[0].id, "lead");
  assertEquals(last[0].maxWords, 600 * 3);
  const hard = Math.round(GROUP_SOFT_LIMIT_WORDS * (1 + GROUP_OVERFLOW));
  for (const c of plan.calls) if (c.kind === "sections" && c.units.length > 1) assert(c.maxWords <= hard, `${c.units.map((u) => u.id)} within ${hard}: ${c.maxWords}`);
  assertEquals(plan.calls.length, 7);
  assertEquals(describePlan(plan).length, 7);
});

Deno.test("email plan: one call, draft order kept, no leads, no separate headline", () => {
  const plan = planDraft(email_single);
  assertEquals(plan.calls.length, 1);
  assertEquals(plan.calls[0].kind, "sections");
  assertEquals(plan.calls[0].units.map((u) => u.id), email_single.draft_order);
  assertEquals(plan.leadSectionId, null);
  assertEquals(plan.headlineSectionId, null);
});

Deno.test("groupUnits: tiny sections attach to neighbours, oversize sections stand alone", () => {
  const u = (id: string, max: number) => sectionUnit({ id, name: id, job: "", band_words: [1, max], must: [], must_not: [] });
  const groups = groupUnits([u("a", 150), u("b", 1500), u("c", 100), u("d", 100), u("e", 700), u("f", 600)]);
  assertEquals(groups.map((g) => g.map((x) => x.id)), [["a"], ["b"], ["c", "d", "e"], ["f"]]);
});

Deno.test("item shape is derived from the spec: sequences and ad sets repeat every section, the webinar repeats replay emails, the RSA's items are blocks", () => {
  assertEquals(itemShape(email_sequence), { kind: "repeat_all" });
  assertEquals(itemShape(meta_ad), { kind: "repeat_all" });
  assertEquals(itemShape(webinar_package), { kind: "repeat_section", sectionId: "replay_email", fixedAssets: 5 });
  assertEquals(itemShape(google_rsa), { kind: "blocks" });
  assertEquals(itemShape(sales_letter), { kind: "none" });
});

Deno.test("email sequence: one call per email, sections suffixed #n in draft order, roles from the sequence type, count clamped", () => {
  const roles = SEQUENCE_ROLES.welcome;
  const plan = planDraft(email_sequence, { roles });
  assertEquals(plan.itemCount, roles.length);
  assertEquals(plan.calls.length, roles.length, "724-word emails never share a call");
  assertEquals(plan.calls[0].units.map((u) => u.id), email_sequence.draft_order.map((id) => `${id}#1`));
  assertEquals(plan.calls[2].units.map((u) => u.item?.role), email_sequence.draft_order.map(() => roles[2]));
  assertEquals(plan.calls[2].units[0].baseId, "cta");
  assertEquals(itemCount(email_sequence, 20, roles), 12);
  assertEquals(itemCount(email_sequence, 1, roles), 3);
  assertEquals(planDraft(email_sequence, { roles: SEQUENCE_ROLES.abandoned_cart }).itemCount, 3);
  assertEquals(planDraft(email_sequence, { itemCount: 4 }).itemCount, 4);
  assertEquals(plan.leadSectionId, null);
});

Deno.test("meta ad: three variations in one call; webinar: fixed assets once and replay_email ×5-7; RSA: one plain call", () => {
  const meta = planDraft(meta_ad);
  assertEquals(meta.itemCount, 3);
  assertEquals(meta.calls.length, 1);
  assertEquals(meta.calls[0].units.map((u) => u.id), [1, 2, 3].flatMap((n) => meta_ad.draft_order.map((id) => `${id}#${n}`)));
  assertEquals(planDraft(meta_ad, { itemCount: 6 }).itemCount, 6);

  const web = planDraft(webinar_package);
  const ids = web.calls.flatMap((c) => c.units.map((u) => u.id));
  assertEquals(ids.filter((id) => id.startsWith("replay_email")), ["replay_email#1", "replay_email#2", "replay_email#3", "replay_email#4", "replay_email#5"]);
  assertEquals(ids.filter((id) => !id.includes("#")).length, webinar_package.sections.length - 1, "every other asset once, unsuffixed");
  assertEquals(web.itemCount, 5);
  assertEquals(planDraft(webinar_package, { itemCount: 12 }).itemCount, 7);
  assertEquals(web.leadSectionId, null, "lead_variants 3 without a lead section: no lead loop");
  for (const c of web.calls) assert(c.units.length === 1 || c.maxWords <= Math.round(GROUP_SOFT_LIMIT_WORDS * (1 + GROUP_OVERFLOW)), c.units.map((u) => u.id).join(","));

  const rsa = planDraft(google_rsa);
  assertEquals(rsa.calls.length, 1);
  assertEquals(rsa.calls[0].units.map((u) => u.id), ["descriptions", "headlines"]);
  assertEquals(rsa.itemCount, 1);

  const vsl = planDraft(vsl_long);
  assertEquals(vsl.leadSectionId, null);
  assertEquals(vsl.calls.flatMap((c) => c.units.map((u) => u.id)), vsl_long.draft_order);
});

// ---------------------------------------------------------------- leads

Deno.test("lead types per awareness: three distinct types, unaware gets only indirect leads, most aware opens with the offer", () => {
  const states: Awareness[] = ["most_aware", "product_aware", "solution_aware", "problem_aware", "unaware", "unknown"];
  for (const s of states) {
    const t = leadTypesForAwareness(s);
    assertEquals(t.length, 3, s);
    assertEquals(new Set(t).size, 3, `${s} distinct`);
  }
  assertEquals(leadTypesForAwareness("most_aware")[0], "offer");
  assertEquals(leadTypesForAwareness("problem_aware")[0], "problem_solution");
  assert(leadTypesForAwareness("unaware").every((t) => INDIRECT_LEADS.includes(t)));
  assert(leadTypesForAwareness("product_aware").every((t) => t !== "story"), "product-aware never gets a story lead");
  assert(INDIRECT_LEADS.includes(leadTypesForAwareness("product_aware", true)[0]), "skeptics get an indirect lead first even when aware");
  assert(DIRECT_LEADS.includes(leadTypesForAwareness("product_aware")[0]));
});

Deno.test("runner-up lead is the first lead not chosen, in preference order", () => {
  const leads = LEAD_IDS.map((id, i) => ({ id, lead_type: leadTypesForAwareness("problem_aware")[i], reader_hypothesis: "r", blocks: [blk(`${id}-1`, "x")] }));
  assertEquals(runnerUpLead(leads, "lead-a"), "lead-b");
  assertEquals(runnerUpLead(leads, "lead-b"), "lead-a");
  assertEquals(runnerUpLead(leads, null), "lead-a");
  assertEquals(runnerUpLead(null, "lead-a"), null);
});

// ---------------------------------------------------------------- interrogation

const dossierWith = (segments: Dossier["awareness_by_segment"]): Dossier => ({
  verbatims: [],
  themes: [],
  competitor_table: [],
  logo_swap_result: "",
  awareness_by_segment: segments,
  sophistication: { stage: "3", evidence: "" },
  proof_inventory: [],
  objection_map: [],
  resident_emotion: { emotion: "", evidence: "", verbatim_ids: [] },
  story_inventory: [],
  speaker: { name: null, role: null, stake: null },
  forces: { push: "", pull: "", anxiety: "", habit: "", dominant: "push" },
  first_week_experience: null,
  refund_history: null,
  unsourced_hypotheses: [],
  sources: [],
});

const candidate = (proof: string[]) => ({
  id: "c1",
  core_desire: "d",
  cluster: "k",
  k: 7,
  promise: "p",
  mechanism: "m",
  big_idea: "b",
  lead_verbatim_id: null,
  belief_to_displace: "x",
  proof_asset: "the trial",
  proof_ledger_refs: proof,
  search_origin: "unused_fact",
});

Deno.test("pre-draft interrogation pauses without an argument, without proof on the winner, or with unknown awareness", () => {
  const noWinner = interrogate({ winner: null, awareness: "problem_aware", segment: null });
  assert(!noWinner.ok && /winning argument/i.test(noWinner.reason));
  const noProof = interrogate({ winner: { candidate: candidate([]), thesis: "t" }, awareness: "problem_aware", segment: null });
  assert(!noProof.ok && /proof/i.test(noProof.reason));
  const noThesis = interrogate({ winner: { candidate: candidate([A]), thesis: null }, awareness: "problem_aware", segment: null });
  assert(!noThesis.ok && /thesis/i.test(noThesis.reason));
  const unknown = interrogate({ winner: { candidate: candidate([A]), thesis: "t" }, awareness: "unknown", segment: "cold social" });
  assert(!unknown.ok && /awareness/i.test(unknown.reason) && unknown.reason.includes("cold social"));
  const ok = interrogate({ winner: { candidate: candidate([A]), thesis: null }, thesisFallback: "from the step output", awareness: "problem_aware", segment: null });
  assert(ok.ok);
  if (ok.ok) {
    assertEquals(ok.proofRefs, [A]);
    assertEquals(ok.thesis, "from the step output");
  }
});

Deno.test("dropped ledger rows never reach the writer: excluded from usable claims, unknown when cited, no proof when they carried the argument", () => {
  const claims = [
    { id: A, user_decision: "drop" as const },
    { id: B, user_decision: "keep" as const },
    { id: GHOST.replace(/9/g, "7"), user_decision: null },
  ];
  assertEquals(usableClaims(claims).map((c) => c.id), [B, GHOST.replace(/9/g, "7")]);
  assertEquals(droppedClaimIds(claims), new Set([A]));
  const sections = [sec("body", [blk("body-1", `212 audits [[L:${A}]] and sixty days [[L:${B}]]`)])];
  assertEquals(droppedLedgerRefs(sections, droppedClaimIds(claims)), [A]);
  assertEquals(unknownLedgerRefs(sections, new Set(usableClaims(claims).map((c) => c.id))), [A], "a dropped row is treated like an id the ledger never had");
  const usable = new Set(usableClaims(claims).map((c) => c.id));
  const paused = interrogate({ winner: { candidate: candidate([A]), thesis: "t" }, awareness: "problem_aware", segment: null, usableClaimIds: usable });
  assert(!paused.ok && /dropped/.test(paused.reason));
  const ok = interrogate({ winner: { candidate: candidate([A, B]), thesis: "t" }, awareness: "problem_aware", segment: null, usableClaimIds: usable });
  assert(ok.ok);
  if (ok.ok) assertEquals(ok.proofRefs, [B]);
});

Deno.test("target awareness: option override, then the traffic segment, then the first diagnosed segment", () => {
  const d = dossierWith([
    { traffic: "cold", label: "Cold social", awareness: "problem_aware", evidence: "" },
    { traffic: "retargeting", label: "Pricing page", awareness: "product_aware", evidence: "" },
  ]);
  assertEquals(targetAwareness(d, parseOptions({ awareness: "unaware" })).awareness, "unaware");
  assertEquals(targetAwareness(d, parseOptions({ traffic: "retargeting" })), { awareness: "product_aware", segment: "Pricing page", source: "dossier" });
  assertEquals(targetAwareness(d, parseOptions({ segment: "cold social" })).awareness, "problem_aware");
  assertEquals(targetAwareness(d, parseOptions({})).awareness, "problem_aware");
  assertEquals(targetAwareness(d, parseOptions({ traffic: "owned_list" })).awareness, "unknown", "a segment the dossier never diagnosed is unknown, not guessed");
  assertEquals(targetAwareness(null, parseOptions({})).awareness, "unknown");
  assertEquals(parseOptions({ traffic: "nonsense" }), {}, "invalid options fall back to defaults");
});

// ---------------------------------------------------------------- ledger checks

Deno.test("ledger refs, unknown refs, NEEDS SOURCE lines and reader text", () => {
  const sections = [
    sec("body", [blk("body-1", `Fasting glucose fell 11 mg/dL [[L:${A}]] in twelve weeks. About 2,000 members [[L:${B}]] renewed.`), blk("body-2", "", "bullets", [`Cuts the audit to 4 hours [[NEEDS SOURCE]].`, `Costs $49 [[L:${A}]].`])]),
    sec("close", [blk("close-1", `Harvard found 73% [[L:${GHOST}]] improved.`)]),
  ];
  assertEquals(collectLedgerRefs(sections), [A, B, GHOST]);
  assertEquals(unknownLedgerRefs(sections, new Set([A, B])), [GHOST]);
  assertEquals(needsSourceLines(sections), ["Cuts the audit to 4 hours [[NEEDS SOURCE]]."]);
  assertEquals(readerText(`fell 11 mg/dL [[L:${A}]] in twelve weeks [[NEEDS SOURCE]].`), "fell 11 mg/dL in twelve weeks.");
  assertEquals(normalizeQuote(`“Fasting glucose fell 11 mg/dL [[L:${A}]]  in twelve weeks.”`), "fasting glucose fell 11 mg/dl in twelve weeks");
  assert(quoteAppears("About 2,000 members renewed", sections));
  assert(!quoteAppears("About 3,000 members renewed", sections));
});

// ---------------------------------------------------------------- assembly

Deno.test("assembleDraft orders by the spec, computes skim path, refs, word count and merges NEEDS SOURCE", () => {
  const sections = [
    sec("close", [blk("close-1", "Click the button; the files arrive in two minutes.", "cta"), blk("close-2", "Start my audit", "button")]),
    sec("ps", [blk("ps-1", `P.S. The guarantee is 60 days [[L:${A}]].`, "ps")]),
    sec("headline", [blk("headline-1", `The 4-hour audit [[L:${A}]]`, "headline"), blk("headline-2", "Deck line", "deck")]),
    sec("lead", [blk("lead-1", "I am Dana and I run the audit team. Our last client lost 9 hours a week [[NEEDS SOURCE]].")]),
  ];
  const draft = assembleDraft({ spec: sales_letter, sections, leads: null, chosenLeadId: null, needsSource: ["our last client lost 9 hours a week [[NEEDS SOURCE]].", "No carrier for the 40% figure"] });
  assertEquals(draft.sections.map((s) => s.section_id), ["headline", "lead", "close", "ps"]);
  assertEquals(draft.skim_path, ["The 4-hour audit", "Deck line", "Click the button; the files arrive in two minutes.", "Start my audit", "P.S. The guarantee is 60 days."]);
  assertEquals(draft.ledger_refs_used, [A]);
  assertEquals(draft.needs_source, ["Our last client lost 9 hours a week [[NEEDS SOURCE]].", "No carrier for the 40% figure"], "text-detected first, model list merged without case duplicates");
  // headline 3 + deck 2 + lead 17 + cta 9 + button 3 + ps 6: tags and markers are not words
  assertEquals(draft.word_count, 3 + 2 + 17 + 9 + 3 + 6);
  assertEquals(draft.chosen_lead_id, null);
  assertEquals(draft.leads, null);
  const fx = toDraftEffect(draft, "system", "draft");
  assertEquals(fx.origin, "system");
  assert(fx.markdown.startsWith("# The 4-hour audit"));
  assertEquals(fx.wordCount, draft.word_count);
  assertEquals(parseStoredDraft(fx.blocks)?.format, "sales_letter");
  assertEquals(parseStoredDraft({ nope: true }), null);
  assertEquals(orderSections(sales_letter, [sec("zzz", []), sec("ps", [])]).map((s) => s.section_id), ["ps", "zzz"]);
  assertEquals(
    orderSections(email_sequence, [sec("subject#2", []), sec("body#1", []), sec("subject#1", []), sec("hook#2", [])]).map((s) => s.section_id),
    ["subject#1", "body#1", "subject#2", "hook#2"],
    "items ascending, spec order within an item",
  );
  assertEquals(orderSections(webinar_package, [sec("replay_email#2", []), sec("replay_email#1", []), sec("registration_cta", [])]).map((s) => s.section_id), ["registration_cta", "replay_email#1", "replay_email#2"]);
});

Deno.test("provisional lead, then the cold read's pick replaces it and keeps all three leads", () => {
  const types = leadTypesForAwareness("problem_aware");
  const leads = LEAD_IDS.map((id, i) => ({ id, lead_type: types[i], reader_hypothesis: `reader ${i}`, blocks: [blk(`${id}-1`, `Lead ${id} opening line with a doubt [[L:${A}]].`)] }));
  const sections = [sec("headline", [blk("headline-1", "H", "headline")]), provisionalLeadSection("lead", "Lead", leads), sec("close", [blk("close-1", "Buy", "cta")])];
  const draft = assembleDraft({ spec: sales_letter, sections, leads, chosenLeadId: null });
  assertEquals(draft.sections[1].blocks[0].meta?.provisional, "true");
  assertEquals(draft.sections[1].blocks[0].meta?.lead_id, "lead-a");

  const picked = applyLeadPick(draft, sales_letter, "lead", "lead-c");
  assertEquals(picked.chosen_lead_id, "lead-c");
  assertEquals(picked.sections[1].blocks[0].text, `Lead lead-c opening line with a doubt [[L:${A}]].`);
  assertEquals(picked.sections[1].blocks[0].meta?.lead_id, "lead-c");
  assertEquals(picked.sections[1].blocks[0].meta?.provisional, undefined);
  assertEquals(picked.leads?.length, 3, "leads kept for the challenger");
  assertEquals(picked.sections.map((s) => s.section_id), ["headline", "lead", "close"]);
  assertEquals(runnerUpLead(picked.leads, picked.chosen_lead_id), "lead-a");
  assertThrows(() => applyLeadPick(draft, sales_letter, "lead", "lead-z"));
});

// ---------------------------------------------------------------- model-output validation (code side)

Deno.test("matchSections renumbers block ids and maps by id or by position; validateSections catches ledger and type problems", () => {
  const plan = planDraft(sales_letter);
  const call = plan.calls[0]; // offer, price, guarantee, urgency
  const returned = [
    sec("price", [blk("x", "The price is $497 [[L:" + A + "]].", "price")]),
    sec("offer", [blk("y", "The thing", "crosshead"), blk("z", "What you get", "paragraph")]),
    sec("guarantee", [blk("g", `Sixty days [[L:${B}]].`, "guarantee")]),
    sec("urgency", []),
  ];
  const matched = matchSections(returned, call)!;
  assertEquals(matched.map((s) => s.section_id), ["offer", "price", "guarantee", "urgency"]);
  assertEquals(matched[0].blocks.map((b) => b.id), ["offer-1", "offer-2"]);
  assertEquals(validateSections(matched, call, new Set([A, B])), [], "urgency is optional so empty is fine");
  assertEquals(matchSections(returned.slice(0, 2), call), null, "wrong count");

  const byPosition = matchSections(returned.map((s, i) => ({ ...s, section_id: `wrong${i}` })), call)!;
  assertEquals(byPosition.map((s) => s.section_id), ["offer", "price", "guarantee", "urgency"]);

  // a repeated item whose suffix the model dropped is matched by base id and re-suffixed; blocks carry item meta
  const email3 = planDraft(email_sequence, { roles: SEQUENCE_ROLES.welcome }).calls[2];
  const bare = email3.units.map((u) => sec(u.baseId, [blk("x", "Line", u.spec.block_types?.[0] as Block["type"])])).reverse();
  const m3 = matchSections(bare, email3)!;
  assertEquals(m3.map((s) => s.section_id), email3.units.map((u) => u.id));
  assertEquals(m3[0].blocks[0].id, `${email3.units[0].id}-1`);
  assertEquals(m3[0].blocks[0].meta, { item: "3", role: SEQUENCE_ROLES.welcome[2] });

  const bad = matchSections([
    sec("offer", []),
    sec("price", [blk("p", `$497 [[L:${GHOST}]]`, "price")]),
    sec("guarantee", [blk("g", "Sixty days", "headline")]),
    sec("urgency", []),
  ], call)!;
  const problems = validateSections(bad, call, new Set([A]));
  assertEquals(problems.length, 3);
  assert(problems.some((p) => p.includes(GHOST)));
  assert(problems.some((p) => p.includes('"offer" came back empty')));
  assert(problems.some((p) => p.includes("block types")));
});

Deno.test("normalizeLeads assigns stable ids and types; validateLeads enforces three distinct leads with real ledger ids", () => {
  const types = leadTypesForAwareness("solution_aware");
  const raw = [
    { id: "one", lead_type: types[0], reader_hypothesis: "a", blocks: [blk("q", `Line [[L:${A}]]`)] },
    { id: "two", lead_type: types[1], reader_hypothesis: "b", blocks: [blk("r", "Line")] },
    { id: "three", lead_type: "story" as const, reader_hypothesis: "c", blocks: [blk("s", "Line")] },
  ];
  const leads = normalizeLeads(raw, types);
  assertEquals(leads.map((l) => l.id), [...LEAD_IDS]);
  assertEquals(leads[0].blocks[0].id, "lead-a-1");
  assertEquals(leads[2].lead_type, types[2], "a type outside the assignment is replaced by the assigned one");
  assertEquals(validateLeads(leads, types, new Set([A])), []);
  const dup = normalizeLeads(raw.map((l) => ({ ...l, lead_type: types[0] })), types);
  assert(validateLeads(dup, types, new Set([A])).some((p) => /different types/.test(p)));
  assert(validateLeads(leads.slice(0, 2), types, new Set([A])).some((p) => /three leads/.test(p)));
  assert(validateLeads(leads, types, new Set()).some((p) => p.includes(A)));
});
