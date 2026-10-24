import type { FormatSpec } from "../spec.ts";

export const organic_social: FormatSpec = {
  id: "organic_social",
  name: "Organic social post",
  family: "social",
  description: "Five lines to earn \"see more\", then the main points and a CTA as verb, object, location. One idea, a sales intent inside the story or opinion, the link in a comment.",
  length_band_words: [60, 400],
  sections: [
    { id: "lead_in", name: "Lead-in: five lines to earn \"see more\"", job: "Hook then rehook in five short lines before the fold", band_words: [20, 70], must: ["hook in line one", "rehook before the fold", "a concrete specific"], must_not: ["\"Hey everyone\"", "a rhetorical pain question", "three ideas"], block_types: ["hook", "paragraph"] },
    { id: "main", name: "Main points", job: "One idea carried as a story or an opinion with the sales intent inside it", band_words: [30, 280], must: ["one idea", "sales intent inside the story or opinion", "proof within two sentences of any claim"], must_not: ["three ideas", "emoji bullets", "bold-label-colon bullets", "a listicle of tips"], block_types: ["paragraph", "bullets"] },
    { id: "cta", name: "CTA as verb, object, location", job: "Tell them what to do, with what, where (\"comment GUIDE\", \"link in the first comment\")", band_words: [4, 25], must: ["verb, object, location"], must_not: ["\"Thoughts?\"", "a link in the post body", "two CTAs"], block_types: ["cta"] },
    { id: "first_comment", name: "First comment with the link", job: "The link and one line restating the offer", band_words: [3, 30], must: ["the link"], must_not: ["a second offer"], optional: true, block_types: ["cta", "paragraph"] },
  ],
  draft_order: ["cta", "first_comment", "main", "lead_in"],
  lead_variants: 0,
  skim_path_block_types: ["hook", "cta"],
  hard_gates: ["organic_social.body_urls==0", "organic_social.cta_count>=1", "page.no_markdown_headings"],
  cadence_floor_cv: 0.7,
  allow_emoji_bullets: false,
  allow_markdown_headings: false,
  allow_caps: true,
  standard_section: "Organic social",
};
