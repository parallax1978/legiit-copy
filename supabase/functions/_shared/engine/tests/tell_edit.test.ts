import { assert, assertEquals } from "@std/assert";
import type { Block, DraftOutput, Section } from "../schemas/draft.ts";
import { DraftOutput as DraftOutputSchema } from "../schemas/draft.ts";
import { TellEditCall, TellEditOutput, TellEditPartial } from "../schemas/tell_edit.ts";
import { FORMATS } from "../formats/index.ts";
import { initialSteps, nextSteps } from "../pipeline.ts";
import { STEP_DEFAULTS, STEP_NAMES } from "../config.ts";
import { STEPS } from "../steps/index.ts";
import { applyEdits, backstopUnits, editableUnits, groupUnits, guardEdit, rebuildDraft, removeEmojis, removeHashtags, renderUnits, replaceEmDashes, stripNeverTells, syncChosenLead, type EditUnit } from "../draft/tell_edit.ts";
import { assembleDraft, provisionalLeadSection } from "../draft/assemble.ts";
import { runTellEdit, TELL_EDIT_CALL_ESTIMATE_MS } from "../steps/tell_edit.ts";
import { tellEditPrompt, type TellEditArgs } from "../prompts/tell_edit.v2.ts";
import type { callStep } from "../draft/step_util.ts";
import type { StepContext } from "../steps/types.ts";

const A = "0f1e2d3c-4b5a-4968-8778-695a4b3c2d1e";
const B = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const blk = (id: string, text: string, type: Block["type"] = "paragraph", items: string[] | null = null): Block => ({ id, type, text, items, meta: null });
const sec = (section_id: string, blocks: Block[]): Section => ({ section_id, title: null, blocks });

// ---------------------------------------------------------------- the pipeline

Deno.test("pipeline: every draft and every revision passes the tell edit before the cold read", () => {
  assert(STEP_NAMES.includes("tell_edit"));
  assertEquals(STEP_DEFAULTS.tell_edit.effort, "high");
  assert(STEPS.tell_edit, "registered");
  const order = initialSteps({ hasActiveResearch: true, hasApprovedOffer: true });
  assertEquals(order.slice(0, 4), ["argument", "draft", "tell_edit", "cold_read"]);
  const s = { hasActiveResearch: true, hasApprovedOffer: true, completed: [], revisionCycles: 0 };
  assertEquals(nextSteps("draft", s), ["tell_edit"]);
  assertEquals(nextSteps("tell_edit", s), ["cold_read"]);
  assertEquals(nextSteps("revise", s), ["tell_edit"]);
});

// ---------------------------------------------------------------- the backstop

Deno.test("em dashes: a pair becomes parentheses, a single one a comma; leading and trailing dashes go; ranges stay", () => {
  assertEquals(replaceEmDashes("The jar — the big one — ships Monday."), "The jar (the big one) ships Monday.");
  assertEquals(replaceEmDashes("It works — fast."), "It works, fast.");
  assertEquals(replaceEmDashes("It works—fast."), "It works, fast.");
  assertEquals(replaceEmDashes("— Chris"), "Chris");
  assertEquals(replaceEmDashes("Wait for it —"), "Wait for it");
  assertEquals(replaceEmDashes("It ships – today. Pages 3–5 cover it."), "It ships, today. Pages 3–5 cover it.");
  assertEquals(replaceEmDashes("It rose--slowly."), "It rose, slowly.");
  assertEquals(replaceEmDashes("Then -- fast."), "Then, fast.");
  assertEquals(replaceEmDashes("It rose--slowly, then -- fast."), "It rose (slowly, then) fast.", "two in one sentence are a pair");
  assertEquals(replaceEmDashes("A fact [[L:" + A + "]] — and another."), "A fact [[L:" + A + "]], and another.");
  assertEquals(replaceEmDashes("Dear Friend,"), "Dear Friend,", "a greeting comma is not a dash");
  assertEquals(replaceEmDashes("Open 9 am – 5 pm, Monday – Friday."), "Open 9 am–5 pm, Monday–Friday.", "a range keeps an unspaced en dash");
  assertEquals(replaceEmDashes("Plans run $29 – $49 a month. Pages 3—5 cover it. Open 9--5."), "Plans run $29–$49 a month. Pages 3–5 cover it. Open 9–5.");
  assertEquals(replaceEmDashes("Read https://example.com/guides/seo--basics — it is short."), "Read https://example.com/guides/seo--basics, it is short.", "a link stays whole");
  assertEquals(replaceEmDashes(`He said—"stop."`), `He said "stop."`);
  assertEquals(replaceEmDashes("Vous hésitez ? Oui — prêt : 30 jours !"), "Vous hésitez ? Oui, prêt : 30 jours !", "only the dash's seam changes");
});

Deno.test("emojis go, sequences and keycaps included; ©, ® and ™ stay", () => {
  assertEquals(removeEmojis("✅ Syncs your sales"), "Syncs your sales");
  assertEquals(removeEmojis("Done by Friday 🚀🚀"), "Done by Friday");
  assertEquals(removeEmojis("Team 👩‍💻 ready ✨."), "Team ready.");
  assertEquals(removeEmojis("1️⃣ Pick a keyword"), "1. Pick a keyword");
  assertEquals(removeEmojis("Top 1️⃣0️⃣ tools and tip 🔟."), "Top 10 tools and tip 10.");
  assertEquals(removeEmojis("Rated ★★★★☆ from 1,200 reviews. Hold A♠ K♠."), "Rated ★★★★☆ from 1,200 reviews. Hold A♠ K♠.", "stars and suits are not emoji");
  assertEquals(removeEmojis("- ✅ Syncs your sales"), "- Syncs your sales", "a list marker keeps its space");
  assertEquals(removeEmojis("#️⃣ Step one"), "Step one");
  assertEquals(removeEmojis("Legiit® and Legiit Copy™ © 2026"), "Legiit® and Legiit Copy™ © 2026");
  assertEquals(removeEmojis("✓ Ships Monday"), "Ships Monday");
});

Deno.test("hashtags: a run at the end of a line goes, an inline one keeps its word, #1 and C# stay", () => {
  assertEquals(removeHashtags("Great tips for your site #SEO #growth"), "Great tips for your site");
  assertEquals(removeHashtags("Post it with #SEO and #marketing."), "Post it with SEO and marketing.");
  assertEquals(removeHashtags("We are the #1 marketplace for C# devs."), "We are the #1 marketplace for C# devs.");
  assertEquals(removeHashtags("See example.com/#pricing"), "See example.com/#pricing");
  assertEquals(stripNeverTells("Ship it — today. ✅ #win"), "Ship it, today.");
  assertEquals(removeHashtags("Proudly serving #Austin"), "Proudly serving Austin", "a single tag ending a sentence keeps its word");
  assertEquals(removeHashtags("Proudly serving #Austin."), "Proudly serving Austin.");
  assertEquals(removeHashtags("I use it for every client #ad #sponsored"), "I use it for every client (Ad) (Sponsored)", "a disclosure stays, as plain words");
  assertEquals(removeHashtags("Jump to [the order form](#order). Brand color #FF5733."), "Jump to [the order form](#order). Brand color #FF5733.");
  assertEquals(stripNeverTells("Big news #🚀launch"), "Big news launch", "emojis go before hashtags, so no tag survives");
});

// ---------------------------------------------------------------- the guards

Deno.test("guards: an edit keeps every ledger tag, number, quotation and link, and stays close in length", () => {
  assertEquals(guardEdit(`Here's the kicker: it costs $1 [[L:${A}]].`, `It costs $1 [[L:${A}]].`), null);
  assert(guardEdit(`It costs $1 [[L:${A}]].`, "It costs $1."), "dropped tag");
  assert(guardEdit(`It costs $1 [[L:${A}]].`, `It costs one dollar [[L:${A}]].`), "changed number");
  assert(guardEdit("12 groups went in.", "Twelve groups went in."), "a number written out is a changed number");
  assert(guardEdit(`One buyer said "it is a robust tool".`, "One buyer said it is a strong tool."), "a quotation lost its words");
  assertEquals(guardEdit(`One buyer said "it is slow — painfully slow".`, `One buyer said "it is slow, painfully slow".`), null, "punctuation inside a quote may change");
  assert(guardEdit("See https://legiit.com/keywords now.", "See the site now."), "link dropped");
  assert(guardEdit("Short line.", "Short line that the editor turned into a much longer sentence with many, many words that were never there at all, on and on."), "too long");
  assertEquals(guardEdit("Two questions decide it. Your keyword tool answers neither.", "Two questions decide it: can your site beat the pages ranking now, and does the searcher buy? Your keyword tool answers neither."), null, "naming the specific a teaser withheld is the owner's fix");
  assert(guardEdit("A fact [[NEEDS SOURCE]].", "A fact."), "NEEDS SOURCE dropped");
  assert(guardEdit("A fact.", "A fact [[L:bad id]]."), "malformed tag");
  assert(guardEdit(`Used by 4,000 agencies [[L:${A}]], it cuts research by 30% [[L:${B}]].`, `It cuts research by 30% [[L:${A}]] and 4,000 agencies use it [[L:${B}]].`), "a tag moved to the other fact");
  assertEquals(guardEdit(`Used by 4,000 agencies [[L:${A}]].`, `4,000 agencies use it [[L:${A}]].`), null, "rephrasing around a tagged fact is fine");
  assert(guardEdit("It ranks a page in 14 days [[NEEDS SOURCE]]. It costs less.", "It ranks a page in 14 days. It costs less [[NEEDS SOURCE]]."), "the mark moved to another claim");
  for (const [b, a] of [["Save 50% today", "Save $50 today"], ["only $1,299", "only €1,299"], ["Was $99, now $49", "Was $49, now $99"], ["Results in 30 days", "Results in 30 hours"], ["three days and two calls", "two days and one call"], ["Tuesday, March 3", "Thursday, May 3"], ["Write to support@legiit.com", "Write to help@legiit.com"], ["Visit go.legiit.com", "Visit app.legiit.com"]]) {
    assert(guardEdit(b, a), `${b} -> ${a}`);
  }
});

Deno.test("applyEdits: exact or tolerant spans, in order; refused edits are reported with a reason", () => {
  const units: EditUnit[] = [
    { ref: "body-1", owner: "section", ownerId: "body", blockIndex: 0, item: null, type: "paragraph", text: `Here's the kicker: it's worth noting the trial costs $1 [[L:${A}]].` },
    { ref: "list-1::1", owner: "section", ownerId: "list", blockIndex: 0, item: 0, type: "bullets", text: "Navigate towards the pages you can win." },
  ];
  const r = applyEdits(units, [
    { ref: "body-1", before: "Here's the kicker: ", after: "", tell: "windup" },
    { ref: "body-1", before: "it’s worth noting the trial", after: "The trial", tell: "worth noting" },
    { ref: "[list-1::1]", before: "Navigate towards", after: "Go to", tell: "ai words" },
    { ref: "list-1::1", before: "missing span", after: "x", tell: "x" },
    { ref: "nope-9", before: "x", after: "y", tell: "x" },
    { ref: "body-1", before: `costs $1 [[L:${A}]]`, after: "costs $1", tell: "drops a tag" },
  ]);
  assertEquals(r.units[0].text, `The trial costs $1 [[L:${A}]].`);
  assertEquals(r.units[1].text, "Go to the pages you can win.");
  assertEquals(r.applied.length, 3);
  assertEquals(r.rejected.map((x) => x.reason.split(" ")[0]), ["the", "no", "a"]);
});

// ---------------------------------------------------------------- units and rebuild

function socialDraft(chosen: string | null): DraftOutput {
  const spec = FORMATS.organic_social;
  const leads = [
    { id: "lead-a", lead_type: "promise" as const, reader_hypothesis: "r1", blocks: [blk("lead-a-1", "Here's the part the score hides.", "hook")] },
    { id: "lead-b", lead_type: "secret" as const, reader_hypothesis: "r2", blocks: [blk("lead-b-1", "Sorting by difficulty feels like research. It's where bad content gets made.", "hook")] },
    { id: "lead-c", lead_type: "proclamation" as const, reader_hypothesis: "r3", blocks: [blk("lead-c-1", "You paid a writer for a page that never ranked.", "hook")] },
  ];
  const leadSection = chosen ? { section_id: "lead_in", title: null, blocks: leads.find((l) => l.id === chosen)!.blocks.map((b) => ({ ...b, meta: { lead_id: chosen, lead_type: "secret" } })) } : provisionalLeadSection("lead_in", null, leads);
  return assembleDraft({ spec, sections: [leadSection, sec("main", [blk("main-1", `It reads the pages that rank — then checks your links [[L:${A}]].`), blk("main-2", "", "bullets", ["Unlock the list ✅", "Build only the winners"])]), sec("cta", [blk("cta-1", "Comment PLAN and I'll send the link. #SEO", "cta")])], leads, chosenLeadId: chosen, needsSource: [], keepOrder: true });
}

Deno.test("units: with three leads the leads are edited and the lead section is rebuilt from them", () => {
  const d = socialDraft(null);
  const units = editableUnits(d, FORMATS.organic_social);
  const refs = units.map((u) => u.ref);
  assert(!refs.some((r) => r.startsWith("lead_in")), "the provisional lead section is not edited directly");
  assert(refs.includes("lead-a-1") && refs.includes("lead-b-1") && refs.includes("lead-c-1"));
  assert(refs.includes("main-2::1") && refs.includes("main-2::2"), "bullet items are their own texts");
  const text = renderUnits(units, d);
  assert(text.includes("=== alternative opening lead-b (secret) ===") && text.includes("[main-2::1] (bullets item 1) Unlock the list ✅"));

  const edited = units.map((u) => (u.ref === "lead-a-1" ? { ...u, text: "Your keyword list never says which page can win." } : u));
  const rebuilt = rebuildDraft(d, edited, FORMATS.organic_social);
  DraftOutputSchema.parse(rebuilt);
  assertEquals(rebuilt.sections.find((s) => s.section_id === "lead_in")!.blocks[0].text, "Your keyword list never says which page can win.", "the provisional lead follows lead-a");
  assertEquals(rebuilt.leads![0].blocks[0].text, "Your keyword list never says which page can win.");
});

Deno.test("units: after the pick the chosen lead's edit lands in the lead section too", () => {
  const d = socialDraft("lead-b");
  const units = editableUnits(d, FORMATS.organic_social).map((u) => (u.ref === "lead-b-1" ? { ...u, text: "Sorting by difficulty is guessing." } : u));
  const rebuilt = rebuildDraft(d, units, FORMATS.organic_social);
  const lead = rebuilt.sections.find((s) => s.section_id === "lead_in")!.blocks[0];
  assertEquals(lead.text, "Sorting by difficulty is guessing.");
  assertEquals(lead.meta?.lead_id, "lead-b");
  assertEquals(rebuilt.chosen_lead_id, "lead-b");
});

Deno.test("backstop over units, and an emptied windup block is dropped", () => {
  const d = socialDraft(null);
  const units = editableUnits(d, FORMATS.organic_social);
  const b = backstopUnits(units);
  assertEquals(b.units.find((u) => u.ref === "main-1")!.text, `It reads the pages that rank, then checks your links [[L:${A}]].`);
  assertEquals(b.units.find((u) => u.ref === "main-2::1")!.text, "Unlock the list");
  assertEquals(b.units.find((u) => u.ref === "cta-1")!.text, "Comment PLAN and I'll send the link.");
  assertEquals(b.edits.length, 3);
  const emptied = b.units.map((u) => (u.ref === "main-1" ? { ...u, text: "" } : u));
  const rebuilt = rebuildDraft(d, emptied, FORMATS.organic_social);
  assertEquals(rebuilt.sections.find((s) => s.section_id === "main")!.blocks.map((x) => x.id), ["main-2"]);
});

Deno.test("groups: a long piece is split at section boundaries, never inside one", () => {
  const units: EditUnit[] = Array.from({ length: 6 }, (_, i) => ({ ref: `s${i}-1`, owner: "section" as const, ownerId: `s${i}`, blockIndex: 0, item: null, type: "paragraph" as const, text: Array.from({ length: 700 }, () => "word").join(" ") }));
  const g = groupUnits(units, 1800);
  assertEquals(g.map((x) => x.length), [2, 2, 2]);
  assertEquals(groupUnits(units.slice(0, 1), 1800).length, 1);
});

// ---------------------------------------------------------------- the step, with a fake editor

function ctxFor(draft: DraftOutput, over: Partial<StepContext> = {}): StepContext & { saves: unknown[] } {
  const saves: unknown[] = [];
  const ctx = {
    db: {} as StepContext["db"],
    generation: { id: "gen-1", workspace_id: "ws-1", options: {} } as unknown as StepContext["generation"],
    offer: { id: "off-1", name: "Legiit Keywords" } as unknown as StepContext["offer"],
    brief: null,
    claims: [],
    config: null,
    questions: [],
    variant: null,
    dossier: null,
    voice: null,
    format: FORMATS.organic_social,
    angles: [],
    winningAngle: null,
    drafts: [],
    latestDraft: { id: "d-1", version: 4, origin: "system", blocks: draft } as unknown as StepContext["latestDraft"],
    stepOutputs: {},
    revisionCycles: 0,
    attempt: 1,
    promptVersions: {},
    progress: async () => {},
    partial: null,
    savePartial: (p: unknown) => {
      saves.push(structuredClone(p));
      return Promise.resolve();
    },
    timeBudgetMs: 300_000,
    startedAt: Date.now(),
    ...over,
  } as StepContext & { saves: unknown[] };
  ctx.saves = saves;
  return ctx;
}

function editor(reply: (args: TellEditArgs) => TellEditCall, seen: TellEditArgs[] = []): typeof callStep {
  return ((_ctx, step, _mod, args, schema) => {
    assertEquals(step, "tell_edit");
    seen.push(args as unknown as TellEditArgs);
    return Promise.resolve({ output: schema.parse(reply(args as unknown as TellEditArgs)), text: "", model: "fake-model", usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, web_searches: 0 }, costUsd: 0, latencyMs: 0, stopReason: "end_turn", requestId: null, sources: [] });
  }) as typeof callStep;
}

Deno.test("tell edit step: applies the editor's edits, backstops the rest, writes a new version and reports what changed", async () => {
  const seen: TellEditArgs[] = [];
  const ctx = ctxFor(socialDraft(null));
  const res = await runTellEdit(ctx, {
    call: editor(() => ({
      edits: [
        { ref: "lead-a-1", before: "Here's the part the score hides.", after: "The score never looks at the pages that rank.", tell: "Here's the windup" },
        { ref: "lead-b-1", before: "Sorting by difficulty feels like research. It's where bad content gets made.", after: "Sorting by difficulty is guessing, and you pay a writer for the guess.", tell: "disguise frame" },
        { ref: "main-2::1", before: "Unlock the list", after: "Get the list", tell: "unlock" },
      ],
      what_changed: ["Cut the \"Here's the part\" windup", "Replaced a disguise frame with a plain claim", "Swapped \"unlock\" for \"get\""],
      already_clean: false,
    }), seen),
  });
  const out = TellEditOutput.parse(res.output);
  assert(out.new_version);
  assertEquals(out.edits.filter((e) => e.by === "editor").length, 3);
  assert(out.edits.some((e) => e.by === "backstop"), "the em dash, emoji and hashtag the editor left are fixed in code");
  assert(out.owner_tells_before > out.owner_tells_after, `${out.owner_tells_before} -> ${out.owner_tells_after}`);
  assertEquals(out.owner_tells_after, 0);
  assert(out.what_changed.length >= 3 && out.what_changed.length <= 6);
  const draft = res.effects!.newDraft!.blocks as DraftOutput;
  assertEquals(res.effects!.newDraft!.label, "AI tells removed");
  assertEquals(draft.leads![1].blocks[0].text, "Sorting by difficulty is guessing, and you pay a writer for the guess.");
  assert(!JSON.stringify(draft).includes("—") && !JSON.stringify(draft).includes("✅") && !JSON.stringify(draft).includes("#SEO"));
  assert(seen[0].findings.some((f) => f.ref === "lead-b-1" && f.tell === "disguise_frame"), "the checker's findings reach the editor");
  assert(tellEditPrompt.user(ctx, seen[0]).includes("[lead-b-1] (hook)"));
});

Deno.test("tell edit step: clean copy comes back unchanged with no new version", async () => {
  const spec = FORMATS.organic_social;
  const clean = assembleDraft({ spec, sections: [sec("lead_in", [blk("lead_in-1", "You paid a writer for a page that never ranked.", "hook")]), sec("main", [blk("main-1", `It reads the pages that rank and checks your links [[L:${A}]].`)]), sec("cta", [blk("cta-1", "Comment PLAN and I'll send the link.", "cta")])], leads: null, chosenLeadId: null, needsSource: [], keepOrder: true });
  const res = await runTellEdit(ctxFor(clean), { call: editor(() => ({ edits: [], what_changed: [], already_clean: true })) });
  const out = TellEditOutput.parse(res.output);
  assertEquals(out.new_version, false);
  assertEquals(out.already_clean, true);
  assertEquals(res.effects, undefined);
});

Deno.test("tell edit step: edits the guards refuse are asked for once more, with the reasons", async () => {
  let calls = 0;
  const ctx = ctxFor(socialDraft(null));
  const res = await runTellEdit(ctx, {
    call: editor((args) => {
      calls++;
      if (calls === 1) {
        return { edits: [
          { ref: "main-1", before: `It reads the pages that rank — then checks your links [[L:${A}]].`, after: "It reads the pages that rank, then checks your links.", tell: "em dash" },
          { ref: "lead-c-1", before: "never ranked", after: "ranked nowhere in 12 months", tell: "x" },
        ], what_changed: ["Removed an em dash"], already_clean: false };
      }
      assert(args.retryNote?.includes("ledger tag"), args.retryNote ?? "");
      return { edits: [{ ref: "main-1", before: "— then", after: ", then", tell: "em dash" }], what_changed: ["Removed an em dash"], already_clean: false };
    }),
  });
  assertEquals(calls, 2);
  const out = TellEditOutput.parse(res.output);
  assertEquals(out.rejected.length, 2);
  const main = (res.effects!.newDraft!.blocks as DraftOutput).sections.find((s) => s.section_id === "main")!.blocks[0].text;
  assertEquals(main, `It reads the pages that rank, then checks your links [[L:${A}]].`);
});

Deno.test("tell edit step: a long piece edits part by part, checkpoints, and resumes from the checkpoint", async () => {
  const spec = FORMATS.sales_letter;
  const long = (n: number) => Array.from({ length: n }, (_, i) => `Sentence ${i} towards the goal.`).join(" ");
  const draft = assembleDraft({ spec, sections: [sec("lead", [blk("lead-1", long(260))]), sec("problem_mechanism", [blk("problem_mechanism-1", long(260))]), sec("solution_mechanism", [blk("solution_mechanism-1", long(260))])], leads: null, chosenLeadId: null, needsSource: [], keepOrder: true });
  let clock = 0;
  const reply = (args: TellEditArgs) => ({ edits: args.units.map((u) => ({ ref: u.ref, before: "Sentence 0 towards", after: "Sentence 0 toward", tell: "towards" })), what_changed: ["Changed \"towards\" to \"toward\""], already_clean: false });
  const ctx = ctxFor(draft, { format: spec, timeBudgetMs: TELL_EDIT_CALL_ESTIMATE_MS + 10_000, startedAt: 0 });
  const first = await runTellEdit(ctx, { call: editor(reply), now: () => (clock += 60_000) });
  assert(first.continueLater, "the second part does not fit in this invocation");
  const p = TellEditPartial.parse(first.output);
  assertEquals(p.groups_done, [0]);
  const second = await runTellEdit(ctxFor(draft, { format: spec, partial: p, startedAt: Date.now() }), { call: editor(reply) });
  const out = TellEditOutput.parse(second.output);
  assert(out.new_version);
  assertEquals(out.edits.filter((e) => e.by === "editor").length, 3, "one edit per section across both invocations");
  const text = JSON.stringify(second.effects!.newDraft!.blocks);
  assert(!text.includes("Sentence 0 towards"));
});

// ---------------------------------------------------------------- the rules reach every prompt that writes copy

import { draftPrompt } from "../prompts/draft.v7.ts";
import { revisePrompt } from "../prompts/revise.v6.ts";
import { editorialPrompt } from "../prompts/editorial.v7.ts";
import { factualPrompt } from "../prompts/factual.v5.ts";
import offerPrompt from "../prompts/offer.v6.ts";
import intakePrompt from "../prompts/intake.v4.ts";
import { OWNER_TELLS, RULES, LEAD_SELECTION } from "../prompts/standard.ts";

Deno.test("prompts: the owner's list is in the system text of every step that writes or rewrites a buyer's words", () => {
  for (const [name, system] of [["draft", draftPrompt.system], ["revise", revisePrompt.system], ["tell_edit", tellEditPrompt.system], ["editorial", editorialPrompt.system], ["factual", factualPrompt.system], ["offer", offerPrompt.system], ["intake", intakePrompt.system]] as const) {
    assert(system.includes("### 7.1 The owner's tells and words"), `${name} lacks the owner's list`);
    assert(system.includes("The disguise frame"), name);
  }
  assert(OWNER_TELLS.includes("towards") && OWNER_TELLS.includes("The rule that matters most"));
  assert(!draftPrompt.system.includes(`fragments, "Here's why", "P.S."`), "Here's why is no longer a non-tell");
  assert(!draftPrompt.system.includes("emoji bullets unless the format allows them"));
  assert(draftPrompt.system.includes("no emojis, no hashtags, no em dashes, in any format"));
  assert(RULES.includes("28. The tells and words in Section 7.1 stay out of every piece"));
  assert(RULES.includes("22. Never ask a question and answer it yourself"));
  assert(LEAD_SELECTION.includes("no reframe that presents one thing as another"));
  assert(editorialPrompt.system.includes("two or more of them in the piece, or any em dash, emoji or hashtag, fail Gate D"));
  assert(factualPrompt.system.includes("it follows Section 7.1"));
  for (const t of ["My rule:", "in my view", "the same filler in other words", "built to be quoted"]) assert(OWNER_TELLS.includes(t), t);
  for (const t of ["A label or a count is a windup too", "read its last line on its own", "whatever a voice profile or default in the request says"]) assert(tellEditPrompt.system.includes(t), t);
  assertEquals([draftPrompt.version, revisePrompt.version, editorialPrompt.version, factualPrompt.version, tellEditPrompt.version, offerPrompt.version, intakePrompt.version], [7, 6, 7, 5, 2, 6, 4]);
});

Deno.test("applyEdits: testimonials, quotations and names keep their words; seams only; sentence starts get their capital", () => {
  const unit = (ref: string, text: string, type: Block["type"] = "paragraph"): EditUnit => ({ ref, owner: "section", ownerId: "s", blockIndex: 0, item: null, type, text });
  const r = applyEdits([
    unit("t-1", "This report is a game-changer for my agency. Sam Ortiz, Ortiz SEO", "testimonial"),
    unit("q-1", `One buyer said "it is a robust, game-changing tool for any team" [[L:${A}]].`),
    unit("n-1", "Dr. Sarah Chen runs the audit. It is genuinely short."),
    unit("w-1", "Here's the kicker: the trial is free. Most tools guess. Here's the thing: our report reads the pages."),
    unit("f-1", "Vous hésitez ? Il est prêt : 30 jours d'essai ! Honnêtement, c'est simple."),
  ], [
    { ref: "t-1", before: "is a game-changer for", after: "made a difference for", tell: "corporate filler" },
    { ref: "q-1", before: "robust, game-changing", after: "solid", tell: "ai words" },
    { ref: "n-1", before: "Dr. Sarah Chen runs", after: "Dr. Susan Chen runs", tell: "x" },
    { ref: "n-1", before: "It is genuinely short.", after: "It is short.", tell: "genuinely" },
    { ref: "w-1", before: "Here's the kicker: ", after: "", tell: "windup" },
    { ref: "w-1", before: "Here's the thing: ", after: "", tell: "windup" },
    { ref: "f-1", before: "Honnêtement, c'est simple.", after: "C'est simple.", tell: "x" },
  ]);
  const by = (ref: string) => r.units.find((u) => u.ref === ref)!.text;
  assertEquals(by("t-1"), "This report is a game-changer for my agency. Sam Ortiz, Ortiz SEO", "a testimonial is never edited");
  assert(by("q-1").includes("robust, game-changing"), "a quotation keeps its words even when the span starts inside it");
  assertEquals(by("n-1"), "Dr. Sarah Chen runs the audit. It is short.");
  assertEquals(by("w-1"), "The trial is free. Most tools guess. Our report reads the pages.");
  assertEquals(by("f-1"), "Vous hésitez ? Il est prêt : 30 jours d'essai ! C'est simple.", "untouched text keeps its own spacing");
  assertEquals(r.rejected.map((x) => x.ref), ["t-1", "q-1", "n-1"]);
});

Deno.test("a lone dash span never lands on a hyphen; a line break matches only a line break", () => {
  const units: EditUnit[] = [{ ref: "p-1", owner: "section", ownerId: "s", blockIndex: 0, item: null, type: "paragraph", text: "Book a follow-up call—it takes 10 minutes." }];
  const r = applyEdits(units, [{ ref: "p-1", before: " — ", after: ", ", tell: "em dash" }]);
  assertEquals(r.units[0].text, "Book a follow-up call—it takes 10 minutes.", "not applied to the hyphen in follow-up");
  assertEquals(r.rejected.length, 1);
});

Deno.test("rebuild keeps the runner-up leads' NEEDS SOURCE lines and follows a rewritten opening", () => {
  const d0 = socialDraft("lead-b");
  const d = { ...d0, needs_source: ["You paid a writer for a page that never ranked."] };
  const units = editableUnits(d, FORMATS.organic_social).map((u) => (u.ref === "main-1" ? { ...u, text: "It reads the pages that rank and checks your links." } : u));
  assertEquals(rebuildDraft(d, units, FORMATS.organic_social).needs_source, ["You paid a writer for a page that never ranked."], "lead-c's line is still in the piece");
  const rewritten = { ...d0, sections: d0.sections.map((s) => (s.section_id === "lead_in" ? { ...s, blocks: s.blocks.map((b) => ({ ...b, text: "A new opening the user wrote." })) } : s)) };
  const synced = syncChosenLead(rewritten, FORMATS.organic_social);
  assertEquals(synced.leads!.find((l) => l.id === "lead-b")!.blocks[0].text, "A new opening the user wrote.");
  const rebuilt = rebuildDraft(synced, editableUnits(synced, FORMATS.organic_social), FORMATS.organic_social);
  assertEquals(rebuilt.sections.find((s) => s.section_id === "lead_in")!.blocks[0].text, "A new opening the user wrote.", "the user's rewrite is not reverted");
});

Deno.test("tell edit step: an edit naming a text outside the part is refused with its reason, not dropped", async () => {
  const res = await runTellEdit(ctxFor(socialDraft(null)), { call: editor(() => ({ edits: [{ ref: "nowhere-9", before: "x", after: "y", tell: "x" }, { ref: "main-2::0", before: "Unlock", after: "Get", tell: "unlock" }], what_changed: ["Swapped unlock"], already_clean: false })) });
  const out = TellEditOutput.parse(res.output);
  assert(out.rejected.length >= 2 && out.rejected.every((x) => x.reason.startsWith("no text in this part has the reference")), JSON.stringify(out.rejected));
  assert(!out.what_changed.includes("Swapped unlock"), "a summary line whose edits all failed is not reported as a change");
});

Deno.test("applyEdits: a Title Case line can lose its owner words; a name the piece uses stays protected there; a crosshead may go", () => {
  const unit = (ref: string, text: string, type: Block["type"] = "paragraph"): EditUnit => ({ ref, owner: "section", ownerId: "s", blockIndex: 0, item: null, type, text });
  const units = [
    unit("h-1", "Unlock Seamless SEO Rankings For Every Local Shop", "headline"),
    unit("h-2", "How Legiit Writes Pages That Rank Every Week", "headline"),
    unit("p-1", "Legiit writes the page and Sam Ortiz checks it before it ships."),
    unit("c-1", "The Plan", "crosshead"),
  ];
  const r = applyEdits(units, [
    { ref: "h-1", before: "Unlock Seamless SEO Rankings", after: "Get SEO Rankings", tell: "ai words" },
    { ref: "h-2", before: "How Legiit Writes", after: "How We Write", tell: "test: a known name dropped" },
    { ref: "c-1", before: "The Plan", after: "", tell: "formatting the text does not need" },
  ], ["Legiit"]);
  assertEquals(r.units[0].text, "Get SEO Rankings For Every Local Shop");
  assertEquals(r.rejected.map((x) => x.ref), ["h-2"]);
  assert(/name/.test(r.rejected[0].reason), r.rejected[0].reason);
  assertEquals(r.units[3].text, "");
});

Deno.test("guardEdit: the count of a count windup may go; a counted fact may not", () => {
  assertEquals(guardEdit("So for any keyword, I'd ask two things. Can my site beat these pages, and is the searcher a buyer?", "So for any keyword, I'd check whether my site can beat these pages and whether the searcher is a buyer."), null);
  assertEquals(guardEdit("Two questions decide it.", ""), null);
  assert(guardEdit("Setup takes three steps.", "Setup is quick."));
  assert(guardEdit("We audited two sites.", "We audited the sites."));
});
