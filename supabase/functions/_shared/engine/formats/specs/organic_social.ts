import type { FormatSpec } from "../spec.ts";

export const organic_social: FormatSpec = {
  id: "organic_social",
  name: "Organic social post",
  family: "social",
  description: "Five lines to earn \"see more\", then the main points and a CTA as verb, object, location. One idea, a sales intent inside the story or opinion, the link in a comment.",
  length_band_words: [60, 400],
  sections: [
    { id: "lead_in", name: "Lead-in: five lines to earn \"see more\"", job: "Hook then rehook in five short lines before the fold", band_words: [20, 70], must: ["hook in line one: the reader's problem as something that happened to them, said plainly and concretely with only the details the research holds (pages paid for that never earned back what they cost), never in a survey's wording", "a concrete thing from the reader's world and what it costs them", "rehook before the fold: the promise as a sentence of its own, the reader as its subject and the result they get as its object (the rankings, the customers, the money), every result the promise names said in it, never a how-to sentence about the method"], must_not: ["\"Hey everyone\"", "a rhetorical pain question", "three ideas", "a number about the product's own output as the hook (it is the proof in the next line)", "the speaker's credentials or the product's name in line one", "a reframe that presents one thing as another (\"X feels like Y. It's Z.\")", "a windup (\"Here's the part...\")", "a teaser that withholds nothing specific", "a line the main points already say (the lead-in states the point; the main points carry it forward with new facts)", "a one-line paragraph that lands a maxim, a slogan or a credential instead of a concrete thing"], block_types: ["hook", "paragraph"] },
    { id: "main", name: "Main points", job: "One idea carried as a story or an opinion with the sales intent inside it", band_words: [30, 280], must: ["one idea", "sales intent inside the story or opinion", "proof within two sentences of any claim", "the product's internals in one sentence at most, said as the result the reader gets from them"], must_not: ["a list or count of the product's steps (say what the reader gets from them)", "a sentence selling a column, score or report the reader's current tool already shows as this product's own (say what this product does with it; the reason-why it carries stays)", "a detail about a named tool that its ledger row does not hold (say what it leaves the reader to do, never what it fails to measure)", "what arrives first (the first result and when), which the CTA says once", "a second call to action", "a pointer to a proof the reader cannot open from the post or the first comment", "the lead-in's point said again (carry it forward with new facts)", "three ideas", "emojis", "hashtags", "bold-label-colon bullets", "a listicle of tips"], block_types: ["paragraph", "bullets"] },
    { id: "cta", name: "CTA as verb, object, location", job: "Tell them what to do, with what, where (\"comment GUIDE\", \"link in the first comment\"); when the post has no first comment, the CTA carries the one-line offer", band_words: [4, 25], must: ["verb, object, location", "what the click gets them, in the promise's terms, with what arrives first"], must_not: ["\"Thoughts?\"", "a link in the post body", "two CTAs", "pointing to a first comment the post does not have"], block_types: ["cta"] },
    { id: "first_comment", name: "First comment with the link", job: "The link and the one-line offer (the price, the trial and the action): the post's one statement of it", band_words: [3, 30], must: ["the link"], must_not: ["a second offer", "the guarantee's mechanics, the plan's terms or credit counts (they stay on the page that takes payment)"], optional: true, block_types: ["cta", "paragraph"] },
  ],
  draft_order: ["cta", "first_comment", "main", "lead_in"],
  lead_variants: 3,
  lead_section_id: "lead_in",
  skim_path_block_types: ["hook", "cta"],
  hard_gates: ["organic_social.body_urls==0", "organic_social.cta_count>=1", "organic_social.first_comment_words<=40", "page.no_markdown_headings"],
  cadence_floor_cv: 0.5,
  allow_markdown_headings: false,
  allow_caps: true,
  standard_section: "Organic social",
};
