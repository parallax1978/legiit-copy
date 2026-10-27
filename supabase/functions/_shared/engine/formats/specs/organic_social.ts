import type { FormatSpec } from "../spec.ts";

export const organic_social: FormatSpec = {
  id: "organic_social",
  name: "Organic social post",
  family: "social",
  description: "Five lines to earn \"see more\", then the main points and a CTA as verb, object, location. One idea, a sales intent inside the story or opinion, the link in a comment.",
  length_band_words: [60, 400],
  sections: [
    { id: "lead_in", name: "Lead-in: five lines to earn \"see more\"", job: "Hook then rehook in five short lines before the fold", band_words: [20, 70], must: ["hook in line one: the reader's problem said plainly, in the reader's words", "a concrete thing from the reader's world and what it costs them", "rehook before the fold"], must_not: ["\"Hey everyone\"", "a rhetorical pain question", "three ideas", "a number about the product's own output as the hook (it is the proof in the next line)", "the speaker's credentials or the product's name in line one", "a reframe that presents one thing as another (\"X feels like Y. It's Z.\")", "a windup (\"Here's the part...\")", "a teaser that withholds nothing specific", "a phrase or point the main points already make (the lead-in sets them up; it never says their lines first)"], block_types: ["hook", "paragraph"] },
    { id: "main", name: "Main points", job: "One idea carried as a story or an opinion with the sales intent inside it", band_words: [30, 280], must: ["one idea", "sales intent inside the story or opinion", "proof within two sentences of any claim"], must_not: ["a list or count of the product's steps (say what the reader gets from them)", "three ideas", "emojis", "hashtags", "bold-label-colon bullets", "a listicle of tips"], block_types: ["paragraph", "bullets"] },
    { id: "cta", name: "CTA as verb, object, location", job: "Tell them what to do, with what, where (\"comment GUIDE\", \"link in the first comment\")", band_words: [4, 25], must: ["verb, object, location"], must_not: ["\"Thoughts?\"", "a link in the post body", "two CTAs"], block_types: ["cta"] },
    { id: "first_comment", name: "First comment with the link", job: "The link and one line restating the offer", band_words: [3, 30], must: ["the link"], must_not: ["a second offer"], optional: true, block_types: ["cta", "paragraph"] },
  ],
  draft_order: ["cta", "first_comment", "main", "lead_in"],
  lead_variants: 3,
  lead_section_id: "lead_in",
  skim_path_block_types: ["hook", "cta"],
  hard_gates: ["organic_social.body_urls==0", "organic_social.cta_count>=1", "page.no_markdown_headings"],
  cadence_floor_cv: 0.5,
  allow_markdown_headings: false,
  allow_caps: true,
  standard_section: "Organic social",
};
