import { assert, assertEquals } from "@std/assert";
import { FORMAT_IDS } from "../schemas/common.ts";
import { BlockType } from "../schemas/draft.ts";
import { FORMATS, listFormats, sectionBaseId, sectionItemIndex } from "../formats/index.ts";
import { GATE_METRICS, parseGate } from "../tells.ts";

const specs = listFormats();

Deno.test("every FORMAT_IDS entry has a spec whose id matches its key", () => {
  for (const id of FORMAT_IDS) {
    const spec = FORMATS[id];
    assert(spec, `missing spec for ${id}`);
    assertEquals(spec.id, id);
  }
  assertEquals(specs.length, FORMAT_IDS.length);
});

Deno.test("draft_order references only the spec's own section ids, each exactly once", () => {
  for (const spec of specs) {
    const ids = spec.sections.map((s) => s.id);
    assertEquals(new Set(ids).size, ids.length, `${spec.id}: duplicate section id`);
    for (const id of spec.draft_order) assert(ids.includes(id), `${spec.id}: draft_order names unknown section "${id}"`);
    assertEquals(new Set(spec.draft_order).size, spec.draft_order.length, `${spec.id}: draft_order repeats a section`);
    for (const id of ids) assert(spec.draft_order.includes(id), `${spec.id}: section "${id}" missing from draft_order`);
  }
});

Deno.test("section ids carry no item suffix (reserved for multi-item drafts)", () => {
  for (const spec of specs) {
    for (const s of spec.sections) {
      assertEquals(sectionBaseId(s.id), s.id, `${spec.id}: section id "${s.id}" looks like an item`);
      assertEquals(sectionItemIndex(s.id), 0);
    }
  }
  assertEquals(sectionBaseId("replay_email#5"), "replay_email");
  assertEquals(sectionItemIndex("primary_text#3"), 3);
});

Deno.test("section bands and length bands are ordered and block types are valid", () => {
  const types = new Set<string>(BlockType.options);
  for (const spec of specs) {
    assert(spec.length_band_words[0] <= spec.length_band_words[1], `${spec.id}: length band`);
    for (const s of spec.sections) {
      assert(s.band_words[0] <= s.band_words[1], `${spec.id}.${s.id}: band`);
      assert(s.must.length > 0 && s.must_not.length > 0, `${spec.id}.${s.id}: must and must_not`);
      for (const t of s.block_types ?? []) assert(types.has(t), `${spec.id}.${s.id}: unknown block type ${t}`);
    }
    for (const t of spec.skim_path_block_types) assert(types.has(t), `${spec.id}: unknown skim block type ${t}`);
    assert(spec.standard_section.length > 0);
  }
});

Deno.test("lead variants are 3 only for the four long formats", () => {
  const three = new Set(["sales_letter", "vsl_long", "advertorial", "webinar_package"]);
  for (const spec of specs) assertEquals(spec.lead_variants, three.has(spec.id) ? 3 : 0, spec.id);
});

Deno.test("markdown headings are disallowed everywhere; emoji bullets only in meta_ad", () => {
  for (const spec of specs) {
    assertEquals(spec.allow_markdown_headings, false, spec.id);
    assertEquals(spec.allow_emoji_bullets, spec.id === "meta_ad", spec.id);
  }
});

Deno.test("multi_item is declared for sequences, the webinar package, RSA and Meta ad sets", () => {
  assertEquals(FORMATS.email_sequence.multi_item?.item_name, "email");
  assert((FORMATS.email_sequence.multi_item?.item_roles ?? []).some((r) => r.startsWith("welcome:")));
  assert((FORMATS.email_sequence.multi_item?.item_roles ?? []).some((r) => r.startsWith("win_back:")));
  assertEquals(FORMATS.webinar_package.multi_item?.item_roles?.includes("replay_email"), true);
  assertEquals(FORMATS.google_rsa.multi_item?.min, 19);
  assertEquals(FORMATS.meta_ad.multi_item?.min, 3);
  assertEquals(FORMATS.meta_ad.multi_item?.max, 6);
  for (const spec of specs) {
    if (!spec.multi_item) continue;
    assert(spec.multi_item.min <= spec.multi_item.max, spec.id);
  }
});

Deno.test("every hard gate parses and names an implemented metric", () => {
  for (const spec of specs) {
    for (const raw of spec.hard_gates) {
      const g = parseGate(raw);
      assert(g, `${spec.id}: gate "${raw}" does not parse`);
      assert(GATE_METRICS[g.metric], `${spec.id}: gate "${raw}" names unknown metric ${g.metric}`);
    }
  }
});

Deno.test("platform limits are present where the platform fixes them", () => {
  assertEquals(FORMATS.sms.platform_limits?.chars, 240);
  assertEquals(FORMATS.google_rsa.platform_limits?.headline_chars, 30);
  assertEquals(FORMATS.google_rsa.platform_limits?.description_chars, 90);
  assertEquals(FORMATS.meta_ad.platform_limits?.primary_text_chars, 150);
  assertEquals(FORMATS.tiktok_reels.platform_limits?.spoken_words, 90);
});
