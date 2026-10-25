import { assertEquals } from "@std/assert";
import { carryPriorResearch } from "../steps/research.ts";
import type { Dossier, ResearchCollect } from "../schemas/research.ts";

const v = (id: string, text: string, source_type: "review" | "competitor_promo" = "review") => ({ id, text, source_url: `https://x.test/${id}`, source_type, speaker_role: null, tags: [], desire_cluster: null, intensity_marker: false, duration_marker: false, date: null });
const collect: ResearchCollect = { cluster_vocabulary: ["speed"], verbatims: [v("V1", "“requires heavy editing”"), v("V2", "sounds like everyone else")], findings: [], sources: [{ url: "https://x.test/V1", kind: "review_site", title: null }] };
const prior = {
  verbatims: [v("V1", "\"requires heavy editing\""), v("V2", "I ran out of credits"), v("V3", "the blank page at 2 AM", "competitor_promo")],
  sources: [{ url: "https://x.test/V2", kind: "review_site", title: "Capterra" }],
} as unknown as Dossier;

Deno.test("carryPriorResearch: prior verbatims this run did not collect again are kept, under ids that cannot collide, with their sources", () => {
  const out = carryPriorResearch(collect, prior);
  assertEquals(out.verbatims.map((x) => `${x.id}:${x.text}`), ["V1:“requires heavy editing”", "V2:sounds like everyone else", "P1:I ran out of credits", "P2:the blank page at 2 AM"]);
  assertEquals(out.sources.map((s) => s.url).sort(), ["https://x.test/V1", "https://x.test/V2"]);
  assertEquals(carryPriorResearch(collect, null), collect);
  assertEquals(carryPriorResearch(collect, { ...prior, verbatims: [] }), collect);
});
