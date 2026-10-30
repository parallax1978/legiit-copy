import type { FormatSpec } from "../spec.ts";

/**
 * One named person posting to the people who follow him, about the thing that bothers them, in the words they use
 * with a friend (docs/04 Section 9, Organic social; rules 38 to 40). The lead-in makes him feel the moment he
 * recognizes and says the promise; the main points make the turn, name the product in one plain sentence, prove it
 * the way a friend would and give him the feeling of having it; the CTA says what to do and what he gets; the first
 * comment carries the link and the one-line offer. Every example a writer could copy comes from another trade.
 */
export const organic_social: FormatSpec = {
  id: "organic_social",
  name: "Organic social post",
  family: "social",
  description: "One named person posting to the people who follow him, about the thing that bothers them, in the words they use with a friend: a lead-in that makes him feel the moment he recognizes and says the promise, main points that make the turn and name the product in one plain sentence, a CTA as verb, object, location, and the link in a comment.",
  length_band_words: [60, 400],
  sections: [
    {
      id: "lead_in",
      name: "Lead-in: five lines to earn \"see more\"",
      job: "Stop him with the moment he recognizes, said in his own words so he feels it, and by line three tell him what you promise. He does not yet know the product exists; it is not in these lines.",
      band_words: [20, 70],
      must: [
        "line one: one plain sentence a cold reader understands, built on one fact or one moment from his world (the verbatims, the plain facts of his work, a ledger number) with one opening move from Section 3; about twelve words, under 140 characters; words a ten-year-old knows",
        "line two pays line one off at once: what it cost him, what it felt like, or the proof with its ledger tag",
        "line three: the promise as a picture of his life with the result, said as a sentence of its own with him in it, with its reason or a ledger number beside it; never the product, its work or its words",
        "a feeling the research holds (the resident emotion, the forces, a verbatim) in these lines, said as the thing itself",
      ],
      must_not: [
        "line one telling the reader his own history or habit as a fact ('You paid...', 'You've paid...'); a mistake is named so he convicts himself (a question he answers, an If, someone else, 'we')",
        "a tool, score, list or export as the subject that says, rates, hides, hands or leaves him something (a person reads, picks, pays and decides)",
        "line one ending on a verdict about itself ('It never...', ', and it never...')",
        "a slogan line, a tagline, a reframe ('X feels like Y. It's Z.'), a windup ('Here's the part...'), a teaser that withholds nothing specific, or a one-line paragraph that lands a maxim or a credential",
        "the product named, used or pointed at ('it', 'this tool', its own terms): the main points introduce it (rule 38)",
        "a metric's name, a term from his tool, an abbreviation or any word a cold reader would stop and ask about (rule 40)",
        "a rhetorical pain question ('Tired of...?'); a question he answers about his own work is a move, not this",
        "\"Hey everyone\"; a title, a credential or a company as line one; three ideas; a number about the product's own output as the hook",
        "six words in a row from an example in the standard",
      ],
      block_types: ["hook", "paragraph"],
    },
    {
      id: "main",
      name: "Main points",
      job: "The turn and the proof, the way he would hear them from a friend who found the answer: what the speaker saw or found, the product in one plain sentence with its name, how it works in a breath, one thing he can check, one run with its numbers when the ledger holds one, and the feeling of having it. One idea, carried as a story, a lesson or an opinion from the speaker's own work, with the sales intent inside it.",
      band_words: [30, 280],
      must: [
        "the turn: what the speaker saw, found or built, as a cause (a discovery, a failed fix), in one or two sentences",
        "the product introduced in one plain sentence with its name before anything else about it: what it is and what it does for him, in his words, all of it the promise needs (what it finds, decides and makes for him); that sentence is the first sentence about the product in the post and survives every later edit (rule 38)",
        "how it works in at most two short sentences, as what it decides or makes for him with what he already knows (rule 1)",
        "proof the way a friend would give it: one thing he can check in seconds with what he has at hand, and the speaker's own run or a documented case with its numbers when the story inventory or the ledger holds one, each right after the claim it proves",
        "one idea; each paragraph adds one new thing and carries a feeling (rule 39); every paragraph stands on its own, with no line pointing back to the lead-in, which is chosen later from three",
        "words a ten-year-old knows, sentences short, one long one where the feeling needs it (rule 40)",
      ],
      must_not: [
        "a metric's name, a term from his tool, a technical input explained (a count, a score, a data source), or the product's own labels (decision names, plan names, credits, groups, the steps of its process)",
        "a lesson in how his trade works (he is a professional: name what the product does with what he already knows, never explain ranking, bidding, pricing or his market to him)",
        "a list or count of the product's steps; a manual procedure for him; the reader sent to do by hand, or to hire or pay someone for, what the product does itself (it does the work; say so)",
        "a sentence selling a column, score or report his current tool already shows as this product's own (say what this product does with it); a detail about a named tool that its ledger row does not hold",
        "a founder, credential or company line (the post already carries his name, rule 8); the speaker's own business, or what he gains or loses from the reader's choice",
        "two sentences built on one frame ('Whether X sits in... Whether Y sits in...'); a pair of short sentences that land a moral; a slogan, a maxim or a moral in parentheses; a line that announces the body is coming",
        "a paragraph that informs and makes him feel nothing (rule 39)",
        "the lead-in's point said again; the cost the hook named said again; what arrives first (the CTA says it once); a second call to action; a pointer to a proof he cannot open from the post or the first comment",
        "three ideas; emojis; hashtags; bold-label-colon bullets; a listicle of tips",
      ],
      block_types: ["paragraph", "bullets"],
    },
    {
      id: "cta",
      name: "CTA as verb, object, location",
      job: "One plain sentence: what to do, where (\"link in the first comment\"), and what it gets him; when the post has no first comment, the CTA carries the one-line offer",
      band_words: [4, 25],
      must: ["verb, object, location", "what the click gets him (the trial and its price, or the first thing he sees), said once"],
      must_not: ["\"Thoughts?\"", "a link in the post body", "two CTAs", "pointing to a first comment the post does not have", "the promise or the hook said again", "asking for likes, shares or tags", "how long anything takes (rule 18)"],
      block_types: ["cta"],
    },
    {
      id: "first_comment",
      name: "First comment with the link",
      job: "The link and the one-line offer (the price, the trial and the action): the post's one statement of it",
      band_words: [3, 30],
      must: ["the link"],
      must_not: ["a second offer", "the guarantee's mechanics, the plan's terms or credit counts (they stay on the page that takes payment)"],
      optional: true,
      block_types: ["cta", "paragraph"],
    },
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
