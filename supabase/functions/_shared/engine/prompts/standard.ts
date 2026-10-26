/** AUTO-GENERATED from docs/04-copy-standard.md by tools/gen-standard.py. Do not edit by hand; edit the doc and regenerate. */

export const RULES = `## 1. The standard

Argument

1. Sell one thing to one reader on one promise with one reason to believe it. The promise is the reader's outcome in the reader's terms: the finished thing they get or the state they want. The product's category and internals (that it is AI, its steps, its reviews, its research) are reasons to believe, placed in the body; they never are the promise, the headline or the deck's opening unless the reader's own verbatims ask for them by name. Crossheads follow the same rule: each states what the reader gets, and the feature is its reason in the body; a run of crossheads naming what the product does is a feature list. Write the thesis first: "This draft exists to prove that [mechanism] is a different and superior way to get [promise] for [reader], and the proof is [carrier]."
2. Take the desire from the market's verbatims; every description of the reader's state maps to one.
3. The headline and lead are set by the diagnosed awareness state of the traffic segment, never by the format.
4. At sophistication stage 3 or higher the argument is a mechanism, stated in two parts (why the usual fixes fail, why this one works), in one step, with intuitive and empirical proof.
5. Find the big idea by search: the unused fact, the opposite of the category's idea, the mechanism in the process.
6. The lead contains one claim a skeptic would doubt.
7. Lead with the strongest claim the reader accepts without argument, then climb. Never violate an existing belief in the headline or deck.

Proof

8. Never make the claim bigger than the proof. Size the claim to the ledger grade; never draft around a missing carrier, and never announce one: a claim with no carrier is cut, not confessed. With no result proof on file, promise the deliverable the ledger covers, stated as what the reader gets, and let the mechanism carry it. A quality judgment the owner keeps (better, clearer, stronger copy than an alternative) is the owner's claim: the speaker states it in the first person as his call, at full strength, next to the way the reader can check it (a free trial, the guarantee); it never becomes a measured result (more sales, higher conversions, revenue) without the data.
9. Every claim carries its proof within two sentences. No proof box, no proof wall at the end.
10. Precision matches the evidence: 2,146 when the ledger holds 2,146, "about 2,000" when it holds about 2,000.
11. Every study, number, name, credential, quote, price and deadline carries a ledger ID.
12. At most one damaging admission per piece, and only when the brief holds one: a true, minor flaw that makes the promise easier to believe (a price, a look, a limit this reader does not care about), followed at once by the claim it licenses. Never admit the absence of proof, tests, results, customers or reviews; that is not an admission, it is a confession, and it is a Tier 0 tell.
13. Testimonials are documented people with a specific result, placed beside the claim they support. Never generate a testimonial, a composite or a narrator.

Offer

14. Design the offer before the brief: variant from the options sheet, every term a ledger row, a denominated guarantee, a deadline with a mechanism.
15. Write the order form first and read it first. The close, the order form and every email state the identical deal.
16. State the price once, after value, without apology, with its reframe and guarantee adjacent. A piece that does not take payment (a post, an ad, an email, a message) states the offer in one line (the price, the trial and the action) and leaves the full terms, the cancel mechanics and the refund policy to the page that takes the billing details.
17. Every discount, bonus value, deadline and scarcity figure has a reason-why and a ledger basis.
18. One call-to-action path: what to do, what happens after the click, what arrives when.

Voice

19. One named person talks to one reader; the reader knows who and why by word 150.
20. Write in the indicative. Hedges on supported claims are defects.
21. Use the market's words.
22. Ask a question only to answer it in the next line.
23. Read it aloud; rewrite any sentence you would not say across a table.
24. Every sentence does a job (claim, proof, mechanism, picture, transition, instruction, identification) or is cut.
25. Story carries a claim or a proof; beats join with "therefore" or "but," never "and then." A story is the client's documented story, a framed hypothetical, or a sourced public anecdote.
26. Close long and literally: what the reader gets by acting now, what they lose by waiting, what to do.
27. No summary paragraphs, no restated subject lines, no cheerful sign-offs.

Process

28. Draft in this order: offer block and order form; bullets and proof; body; three leads; headline last.
29. Write three leads on three reader hypotheses, cut each from the top, cold-read them on a different model, pick one, rewrite it.
30. Review against a control: beat, lose or unsure, with the one fatal defect. No additive score decides anything.
31. Log the prediction and the result, including refunds at 30 days.

---`;

export const ARGUMENT_SELECTION = `## 2. Argument selection

1. Generate twenty candidates per offer by search (the unused fact, the opposite of the category idea, the mechanism in the process), one line each: core desire [cluster, k] | promise | mechanism.
2. Compute C1-C3 per cluster (\`research/rubric/magnitude.py\`): urgency = share of verbatims with intensity or time-pressure markers, banded 0-3 at 10/25/50 percent; staying power = the higher of the duration-marker share banded at 10/30/50 and distinct years banded at 2/3/4; scope = prevalence banded at 5/15/30 percent. A share band needs the count behind it: band 1 needs two marked verbatims, band 2 three, band 3 five; a small cluster stays at the band its count supports, so three intense quotes in a cluster of six do not outrank seventeen quieter ones. Years and prevalence are counts already.
3. Gates, before any sum. Desire: C1+C2+C3 ≥ 4 of 9 with k ≥ 5 verbatims (fewer passes only as provisional). Proof: C9 ≥ 2, meaning the ledger holds a verifiable fact that covers the promise.
4. Score survivors on C4-C14. Weighted total = Σ weight × score, maximum 57.
5. Tie-break: C9, then C3, then C14. Still tied, present both.
A promise that restates the mechanism, or names the product's category or one of its steps, is a mechanism, not a promise: C5 and C11 score at most 1.

6. Output three finalists, each with the lead verbatim, the belief to displace, the mechanism mapped to ledger rows and the proof asset. Keep the two losers as body reasons and the next two lead tests.
7. A stated purpose. When the user states what the piece is for, each candidate carries its fit: named (its promise is the desire or big idea the purpose states, in the purpose's terms), serves (it advances the purpose's outcome by another desire) or none. The argument is chosen among the named survivors when there are any, else among those that serve; the rest are kept, ranked below, with the reason. Among named survivors the user has already chosen the desire, so C1-C3 do not rank one over another: they are ranked on C4-C14. A named or serving candidate passes the desire gate as provisional when the research is thin or silent on its cluster, so the user's steering is never failed by evidence alone; the proof gate still applies.

| # | Criterion | W | 0 | 1 | 2 | 3 |
|---|---|---|---|---|---|---|
| C1 | Urgency | 2 | computed | | | |
| C2 | Staying power | 2 | computed | | | |
| C3 | Scope | 2 | computed | | | |
| C4 | Awareness fit | 1 | Wrong state | Wrong segment | Fits with a caveat | Fits exactly |
| C5 | Right problem | 1 | A service complaint | A problem the product touches | The problem the cluster names | The cluster's own words and the product's strongest use |
| C6 | Timing evidence | 1 | None | One undated mention | Dated verbatims this year | A named event or dated cluster in 90 days |
| C7 | One sentence | 1 | Needs "and" | One long sentence | Twelve words or fewer | Eight words or fewer, no qualifier |
| C8 | Differentiation | 1 | Survives the logo swap | Differs by adjective | A claim nobody makes | A mechanism nobody names |
| C9 | Claim ≤ proof | 2 | No carrier | Testimonials only | A verifiable fact covers most of the promise | Claim and proof are the same object |
| C10 | Mechanism | 1 | None | Named, not explained | Two-part, one step | Two-part, one step, intuitive and empirical proof |
| C11 | Important, exciting, beneficial | 1 | Important to the writer | Beneficial but dull | Two of three | All three in the reader's terms |
| C12 | Inevitable conclusion | 2 | Does not lead to the product | Leads to the category | Leads to the product with a step | The product is the only conclusion |
| C13 | Durational power | 1 | Dies with a news hook | One season | A year | Survives a remail and a sequel |
| C14 | Second-sentence test (cold reader, headline and first sentence only) | 1 | Stops | Reads on, no question | Reads on with a question it can name | Repeats the promise in one sentence |

---`;

export const LEAD_SELECTION = `## 3. Lead selection by awareness level

Diagnose the state per traffic segment. If the verbatims never contain the category word, the market is not solution-aware.

| State | Traffic | Lead type | Opening move | Product named | Do not |
|---|---|---|---|---|---|
| Most aware | Returning buyers, branded search, cart | Offer | Product, price, deal, deadline in line one | Line one | Explain the problem |
| Product-aware | Retargeting, trial list, pricing page | Promise | The promise with the mechanism named; a new reason to act | First 100 words | Re-educate; story lead |
| Solution-aware | Category search, demo page, comparers | Promise, or Secret when known solutions are distrusted | Name the desire, show a solution is possible, then the mechanism | After the mechanism | Open with the product name |
| Problem-aware | Cold social, cold email, content traffic | Problem-Solution (direct) or Proclamation | Name the need in the reader's words; dramatize only until the next sentence is earned | After the turn | Lead with the solution; "Are you tired of..." |
| Unaware | Cold lists, skeptics | Story or Proclamation (indirect) | A scene, a dated event or an identification line with the big idea inside | After word 300 | Pitch in the first 300 words |

Direct leads: Offer, Promise, Problem-Solution. Indirect: Story, Proclamation, Secret; an indirect lead must be interesting on its own. Skeptical readers get an indirect lead even when aware. The lead is 300-600 words in long copy, ends on an open loop, names the mechanism at most, and identifies the speaker by word 150. Draft three leads of different type; cut from the top; cold-read; pick one and rewrite it.

---`;

export const PROOF_PLACEMENT = `## 4. Proof placement

1. Hunt proof before writing the lead; grade every item A-F (Section 8). A claim with no carrier is sized down.
2. Place proof where the doubt arises: a hint in the headline; the first carrier at the first big promise; every later claim followed by its carrier within two sentences; the admission just before the strongest claim; the guarantee after the price.
3. Strength order: demonstration; specific result with denominator; mechanism; process specifics; named authority with ledger ID; documented testimonial; case history; candor; exact social-proof counts. Vague social proof, adjective stacks and generic testimonials are cut.
4. By format: order form carries the guarantee and one buying-experience testimonial beside the button; email carries one claim and one carrier; VSL and webinar put the demonstration in the first third; in an ad the proof is the headline; upsell carries the mechanism plus one specific.
5. Testimonials carry name, place, number, time and one imperfection, sit beside the claim they support, and carry the typical result adjacent when they state a result.
6. B2B: engineers get specifications and precise nouns; finance gets the cost chain; ops and marketing get named customer proof.
7. New products: process specifics; mechanism as cause; the maker's logged result including failures; a beta cohort with denominator; a guarantee that costs the seller.

---`;

export const OFFER_PRESENTATION = `## 5. Offer presentation

Construction, before the brief: choose the variant from the options sheet (hard offer; bill-me or installments; free trial; money-back; charter window; premium-led; continuity; multi-unit) and record why; name the first visible win and its interval; aim a component or the guarantee at the biggest reason the buyer would fail; make the bundle uncomparable; denominate the guarantee; give the deadline a mechanism (bonus expiry, price-rise date, cohort start, capacity cap) or drop it; check the promise against the first-week experience.

Sequence: (1) transition that names the thing; (2) the core offer, named with outcome and interval, shown worth the price alone; (3) the value frame; (4) bonuses, each answering a named worry, dollar values only with a ledger basis; (5) the price, once, then the reframe, with per-day frames only when comparable and the full price disclosed, and price-drop rungs that are real reference prices; (6) the guarantee, denominated, as a sentence the buyer can repeat; (7) the reason to act now with its mechanism; (8) the CTA with high sidewalls; (9) objections after the first CTA, each with proof and the restated guarantee; (10) second CTA and P.S.

Must not: feature list as offer; fabricated stack values; apology at the price; a bolt-on "30-day money-back, no questions asked"; dateless urgency; evergreen timers by default; guilt-trip declines; two things sold at once; "investment in yourself," "incredible value."

---`;

export const COPY_CHIEF_RUBRIC = `## 6. Copy chief rubric

Posture: predict whether a skeptical stranger sends money and keeps it. Review against a control or the strongest competitor promotion. Stop at the first fatal defect. Never average.

Step 1, cold read, on a different model with no brief, memo or ledger. Read the skim path alone (headline, deck, crossheads, bold, captions, P.S., order form) and report what is sold, to whom, for how much, and why believe it. Then read the full draft once, fast; report where attention dropped, the one claim you disbelieve, and the promise in one sentence.

Step 2, gates in order; stop at the first failure.

Gate A, argument. Write "This sells [product] to [one reader] on the promise [one thing], and the reason to believe it is [mechanism/proof]." Fail if any slot is blank or plural, or if the readback does not match the argument memo.

Gate B, belief and lead. Fail if the headline or deck asserts anything the prospect does not yet accept; if the headline can be answered "no" or "so what"; if the lead opens with a pitch, a definition or a generic description of the reader's world; if the speaker is not identified by word 150; if the lead contains nothing a skeptic would doubt; if the product is named earlier than the awareness state allows; if the lead type does not match the awareness field.

Gate C, claims. Fail if any claim lacks a ledger entry at the ledger's precision; if a supported claim is hedged; if a headline promise is never paid off; if a description of the reader's state has no verbatim; if an objection is invented or a listed one unanswered; if the offer's numbers differ across assets; if the promise outruns the first-week experience or refund window.

Gate D, voice. Fail on the read-aloud test; assistant register; "we/our" in place of a named "I" to "you"; a "That's why we built" turn with no cause; a tell score at hard fail (Section 7).

Sentence-job audit alongside the gates: tag every sentence by job; list untagged sentences; flag paragraphs with no claim and no proof.

Step 3, verdict and calibration log. Record the seven observations (argument, proof, pacing, offer, specificity, reader focus, rhythm), the FK grade and the tell score; they never decide the verdict.

\`\`\`
VERDICT: REJECT at Gate N | REVISE | APPROVE for factual review
PREDICTION vs CONTROL: beat | lose | unsure, with one reason
ARGUMENT READBACK: "This sells ___ to ___ on the promise ___ because ___." (matches memo? Y/N)
SKIM-PATH READBACK: what the crossheads, bold and P.S. alone sell, and for how much
WHAT WORKS (2-3 items, quoted, kept on purpose)
THE ONE THING (the single defect most likely to kill response)
   Quote: "<exact line(s)>"
   Fails: <gate or rule, one sentence>
   Do: <direction; at most one example rewritten line>
SECONDARY NOTES (max 5; each quote / fails / do)
DO NOT TOUCH (lines the revise step may not "improve")
TESTABLE DISPUTES (taste, not rule: propose the one-variable A/B)
CALIBRATION LOG: seven observations, FK grade, tell score
\`\`\`

Reviewer instructions: start with what works, briefly. Quote, name the failure, give direction; one rewritten line per note; no wholesale rewrites; no style notes unless style is the defect. The revise step changes only referenced lines and honors DO NOT TOUCH. Rewrite passes run separately: strategy, style, passion and clarity, fewest words.

---`;

export const AI_TELL_CHECKLIST = `## 7. AI tell checklist

Score = sum of weights per 300 words (Tier 0 weight 10, Tier 1 weight 4 per hit, Tier 2 weight 2 per hit above the density allowance, Tier 3 weight 1 above its allowance and only when a Tier 1 or 2 flag exists; texts under 300 words are scored as 300). Review flag at 6; hard fail at 10, on any Tier 0 hit, or on any format hard gate. The ledger match is the primary detector; vocabulary is a tiebreaker. Thresholds were first measured on 107 Claude drafts and then recalibrated on 899 public human direct response documents (\`research/tells/human_calibration_report.md\`); the values below are the recalibrated ones. Density allowances use at least 500 words, so one hit in an SMS is never a density.

Tier 0, hard reject

| Tell | Example | Fix |
|---|---|---|
| Assistant residue | "Notes: swap in your product name." | Delete |
| Bracket placeholder | "[Product Name] helps [target audience]" | Fill from the ledger or stop |
| Unledgered authority, study, number, name or credential | "A Harvard study found 73% of..." | The ledger item, or cut the claim |
| "AI" in copy for a non-AI product | "our AI-powered approach" | Describe the mechanism |
| Proof confession: announcing that a test, result, proof or customer does not exist | "No blind test has been run, so I won't tell you it sells better." | Cut it. Make only the claims the ledger carries; absence of proof is never copy (rules 8 and 12). Zero hits in 871,661 words of human direct response |
| Markdown bold-label-colon bullets (\`**Label:**\`), markdown headings, or emoji bullets in email, video, message, social and audio formats | "**Speed:** get reports in minutes" | A sentence with the claim and its carrier. Plain-text "Label:" lines are human-normal (92% of human sales pages) and only count at Tier 3 above 3 per 1,000 words. Check-mark bullets on pages and commerce formats are allowed at one per 300 words |

Tier 1, weight 4

| Tell | Example | Fix |
|---|---|---|
| "That's why we built" | "That's why we built Reportly." | A reason-why turn: discovery, failed fixes, cause |
| "You're not alone" / "If that sounds familiar" | "If that sounds familiar, you're not alone." | A quoted verbatim from the research |
| "less than a cup of coffee" | "for less than your daily latte" | A comparable comparison with the full price stated |
| "In the next few minutes I'll show you exactly" / "Stay with me" | VSL opener | The interrupt tied to the promise |
| Summary closer | "In short, X gives you A, B and C." | The CTA and what happens after the click |
| Self-posed question header | "### Why only $49?" | A crosshead that states the answer |

Tier 2, weight 2 per hit above the allowance, per 1,000 words, by format profile (email = single email, sequence, cold email, SMS; social = organic social, TikTok/Reels; optin; page = every page, commerce, video and audio format; ads carry the page values): rule of three above 4 (email, social), 7 (page, ads), 11 (opt-in); trailing participles (", giving you...") above 2.0; hedges in body copy ("usually," "often," "may") above 2.0, testimonial and disclosure blocks excluded (hedges inside claim sentences are the factual review's job); "actually / exactly / every single" above 2.0 (4.0 for opt-in and social); anaphora triads and "No X. No Y. Just Z." above 1.5 (exempt in social); "designed to / built for / crafted / tailored" above 1.0; "cancel anytime / no contracts / no setup fees" beyond its first mention (the offer block states it once); negative parallelism ("It's not X. It's Y.") above 1.0, allowed when it corrects a belief the reader holds; "X. Not Y." clips above 2.0; "not just X but Y" above 1.0; generic emotion words as the only emotional content ("frustrated," "overwhelmed," "juggling") above 1.0 (replace with the consequence scene); "Imagine..." or a question opener with no specific on the next line, "Most X don't ... because A. They ... because B." and "No X. No Y. Just Z." as single lines: any hit.

Tier 3, weight 1, never alone: the 4o-era phrases ("game-changer," "Picture this," "Here's the kicker"), the vocabulary that still separates AI drafts ("seamless," "streamline," "cutting-edge," "state-of-the-art," "supercharge," "delve," "tapestry," "testament to," "landscape," "ever-evolving," "unparalleled," "in today's"), plain-text "Label:" lines above 3 per 1,000, and "rather than" above 6.67 per 1,000. Genre vocabulary human copy uses as much as AI does is no longer scored: "transform," "unlock," "elevate," "empower," "effortless," "journey," "next level," "revolutionary," "harness," "leverage," "robust," "holistic," "innovative," "peace of mind," "stress-free."

Argumentative tells, gate failures: no central argument; wrong awareness level; benefits with "so you can"; no mechanism; proof absent or dumped at the end; invented objections; generic specificity ("over 10 years," "award-winning," "up to 50%"); the obvious angle; prevention framing; a lead with nothing to disbelieve; a headline promise never paid off; a turn with no cause.

Tonal tells: "you may want to consider," "it's worth noting"; both-sides framing; no stance; "You deserve this"; apology at the pitch transition. Structural flag: sentence-length coefficient of variation under 0.70 in 300+ words for pages, commerce, video and audio formats, and under 0.50 for email, message and social formats (78% of long human emails sit under 0.70).

Not tells, never penalize: exclamation marks; ellipses; ALL-CAPS words; fragments; "Here's what / how / why"; "Dear Friend"; "P.S."; "not just X but Y" at human rates; em dashes (human email runs to 11.9 per 1,000 words; at or below 12 per 1,000 is never counted, and above it carries no weight either); superlatives with proof.

Overrides: Meta ads allow caps and three emoji bullets; opt-in and upsell blocks allow five plain bold lead-ins with no colon; VSL allows "keep watching" once; Google RSA headlines allow no caps and no exclamation marks. Meta ads have no human control yet (no public ad text could be collected), so they carry the page thresholds until one exists.

---`;

export const CLAIMS_AND_FACTUAL_REVIEW = `## 8. Claims taxonomy and factual review

### 8.1 Claims taxonomy

| Claim type | Substantiation | Required disclosure | Flag for the user's decision |
|---|---|---|---|
| Specific health benefit ("lowers fasting glucose 12% in 8 weeks") | RCT, clinically meaningful | Cite adjacent; say if ingredient-only | Disease claims for supplements; "cure/heal/eliminate" on Meta |
| Structure/function ("supports healthy blood sugar already in the normal range") | Competent and reliable evidence | DSHEA disclaimer on label and product page | Disease wording, lay symptoms, disease-study citations (21 CFR 101.93(g)) |
| Establishment ("clinically proven") | At least the level claimed | Study adjacent | Lab-coat imagery as proof; "clinically tested ingredient" alone |
| Results testimonial ("I lost 16 lbs") | Bona fide user; substantiation for the implied claim | Generally expected performance, adjacent, body type | Fabricated or AI-generated testimonials (16 CFR 465) |
| Experience testimonial | Real, honest | Material connection | Fabrication |
| Narrative ("I was skeptical, so I ordered one") | Narrator exists and did it, or framed hypothetical | Actor portrayal labeled | Composites; invented narrators |
| Expert endorsement | Real credentials, actual evaluation | Paid relationship | Overstated titles |
| Earnings ("$24,840 a week," "six figures," Porsche imagery) | Written substantiation; data on how many achieve it | Dates, percentage achieving, time and effort, typical result, expenses, "in immediate conjunction" (16 CFR 437.4(b)) | Undocumented figures; detached disclaimers |
| Opportunity characterization ("no experience needed," "risk-free," "only 50 spots") | Literally true | | Civil penalties only for 2021 Notice recipients; Section 5 for all |
| Track record, backtests | Audited, open and closed positions | CFTC 4.41 statement "in immediate proximity"; net with gross (SEC) | Past performance as the reader's future (Meta; FINRA 2210) |
| Price / discount ("normally $997, today $97") | Former price bona fide for a reasonably substantial period (16 CFR 233.1) | | Fictitious former prices and bonus values |
| "Free" | | All conditions "at the outset," including continuity | Cost recovered via shipping; hidden auto-enrollment |
| Guarantee | Full refund on request | Material conditions adjacent | Conditional presented as unconditional |
| Continuity / trial | | Material terms before billing info, express consent, simple cancel (ROSCA); California proximity and trial-end notice. These bind the page that takes the billing details; a post, ad, email or message that links to it states the price and trial in one line and is never flagged for the rest | Pre-checked consent; phone-only cancel |
| Scarcity / urgency | True and enforced | | Baseless timers; false low-stock (FTC 2022) |
| Comparative; vague superlative | Head-to-head data; none (puffery) | | |
| Ad identity | | "Ad"/"Advertisement" on native; accurate headers; postal address; opt-out | Deceptive subject lines; owned "independent" review sites |
| Audience language (Meta) | | | Second-person assertion of a personal attribute ("Do you have diabetes?") |

### 8.2 Permitted phrasing by evidence grade

The action is always "rewrite to the highest permitted form at this grade," never "append a disclaimer."

| Grade | Evidence | Permitted form | Forbidden |
|---|---|---|---|
| A | RCT on the finished product at the marketed dose | "In a 12-week placebo-controlled trial of 84 adults, those taking two capsules of [Product] daily saw fasting glucose fall an average of 11 mg/dL; placebo fell 2." Establishment language allowed | Extrapolating beyond the endpoint, population or duration measured |
| B | RCT on the ingredient at the same dose and form | "Each serving delivers 500 mg of [ingredient], the dose used in a 12-week randomized trial of 60 adults in which fasting glucose fell 11 mg/dL. We did not run our own trial." | "clinically tested ingredient" alone; "clinically proven [Product]"; a different extract or combination; a lower dose |
| C | Observational | "People who eat two servings of fatty fish a week have, in large population studies, about 15% lower rates of fatal heart disease. These studies show association, not cause." | Causal verbs; "proven" |
| D | Mechanistic, in vitro, animal | "In lab studies, [compound] blocked the enzyme that breaks down collagen. Whether that happens in people taking [Product] has not been tested." Or verbatim: "The evidence in support of this claim is inconclusive; additional research is necessary." | Present-tense human-outcome verbs; "scientifically formulated"; clinician or journal imagery as proof |
| E | Anecdote, testimonial, traditional use | "Ancient remedy used for centuries to aid digestion. There is no scientific evidence that it works." (second sentence as prominent as the first). A result testimonial carries the typical result beside it. | "Results not typical" as the only qualifier; a range instead of a central figure; completer-only averages |
| F | None | Ingredients and amounts, sourcing, manufacturing standard, taste, guarantee, price, delivery, who it is for | Any efficacy claim |

Earnings form: "Jen made $4,300 in her third month. Of the 1,912 people who joined between Jan 2024 and Jun 2025, 6% reached $4,000 in any month; the median member made $210 in their first 90 days, working about 5 hours a week. Ad spend is not included."

Decorative hedges, never a qualification: "may," "might," "could," "helps," "supports," "promotes," "promising," "preliminary," "Results not typical," "Individual results may vary." Hedges that count: "the evidence is inconclusive," "additional research is necessary," "there is no scientific evidence that it works," "supportive but not conclusive research shows," a stated n, duration, dose, population and average effect. A counted hedge sits in the same sentence or immediately adjacent at the same prominence, and nothing in the same section re-asserts the full claim.

### 8.3 Factual-review procedure

Output per flag: \`line → rule (cited) → rewritten line\`; a flag with no rewrite is rejected. The rewritten line resizes the claim to its carrier or cuts it; it never announces that a test, result, proof or customer is missing (rules 8 and 12; the proof confession is a Tier 0 tell). Tests in order: (1) ledger match for every number, study, credential, date, quote, name, price, deadline and quantity, with a visible \`[[NEEDS SOURCE]]\` where the ledger is silent; (2) strength match against the ledger grade, rewritten to the form in 8.2; (3) disease screen for supplements (disease name, lay symptom, drug substitution, disease-study citation, imagery); (4) testimonial pack (real person on file, bona fide user, typical result adjacent, connection disclosed); (5) earnings screen (documentation, dates, percentage, time and effort, expenses, typical result, adjacent); (6) track-record screen (4.41 statement, net with gross, no projection); (7) net impression on headline, lead and offer only, fixing the headline and never the footer; (8) cross-asset consistency with the offer block as source of truth (names, deliverables, price and plan, added costs, guarantee sentence, deadline, delivery promise, button verb); (9) channel pass (CAN-SPAM, TCPA and CTIA, Meta, Google, native labeling, California B&P 17602); (10) fabrication guard: any name, quote, statistic, study, credential, review or narrator not in the ledger is a hard fail. The reviewer may not add "may," "results vary" or generic disclaimers, delete specifics the ledger supports, or raise "could be seen as" concerns without a rule; it may add an evidence-state sentence from 8.2. Every flag is a decision for the user, never an action by the reviewer: the output shows the line, the rule and the suggested rewrite, and the user keeps the line, applies the rewrite or drops it. The single exception is the fabrication guard, which catches the engine inventing facts, not the user making claims.

### 8.4 Ledger row and per-offer config

Ledger row: claim text; type (8.1); role in the argument; evidence grade with endpoint, population, dose, duration and effect size; source; precision; typical result; dates, cohort and percentage for earnings claims; material-connection flags; guarantee terms and approver; former prices and component values with basis; scarcity numbers with an enforced flag; deadlines with mechanism; trial and continuity terms; story-claim rows; establishment-signal flag. Per-offer config: vertical; business-opportunity and Notice-recipient booleans; humor policy per format; greeting and edge tolerance; refund window and first-week experience.

---`;

export const FORMAT_SPECS = `## 9. Per-format specs

Sections in order, length band, musts and must-nots. Bands are starting values; the control overrides them.

Long-form sales letter. Headline and deck; lead; credibility lines; problem mechanism; solution mechanism and turn; build-up and reveal; proof block; offer and stack; price; guarantee; urgency; close with CTA three times; P.S. 3,000-8,000 words. Musts: benefits as claim, reason, proof, picture; the skim path sells alone; close at 15-25% of length. Must-nots: bio before the reader cares; proof wall at the end; mechanism explained in the lead; summary close.

Short landing page, product-aware. Headline matched to the ad; subhead with who and differentiator; CTA with the action in the button; three to five argued benefits with proof in line; proof strip; two objections with guarantee; repeated CTA. 150-600 words. Must-nots: problem education; story lead. B2B demo variant adds "here's what you'll get" and an indicated price; 300-750 words.

Opt-in page. Headline with number, timeframe or mechanism; three to six incomplete bullets; email-only form; button completing "I want..."; one proof line. 60-250 words. Must-nots: headline describing the artifact; "Submit"; "we will never spam you."

Upsell / OTO. One-line confirmation of the first decision; bridge to the next problem the purchase creates; the offer as the shortest path, mechanism in a sentence; the true reason it is only here; stack and price; one-line guarantee; Yes button stating the benefit; plain No link. 300-900 words or 3-5 minute video; 1x-3x the first purchase. Must-nots: re-selling the first product; "disappears forever"; resetting timers.

Order bump. Checkbox; bolded "Yes! Add [thing] for only $X"; two or three sentences: what it is, how it makes the main purchase work faster, why only here if true. 30-80 words; 20-40% of the main price. Must-nots: a same-priced bump; an unrelated product.

Order form and checkout. Acceptance statement; recap in the close's words; price, total and every added cost; what arrives and when; guarantee verbatim beside the button; deadline as a fact; trust block in the payment area; one buying-experience testimonial; options highest price first. Under 120 words outside the recap; eight fields or fewer. Must-nots: any bonus, price, tier or claim the close did not state; "Submit"; visible coupon field.

Thank-you page. Confirmation with where the thing is; one instruction for the next sixty seconds; bridge to one low-ticket offer tied to the magnet's promise. 80-250 words.

Single email. Subject written last from the body; hook line; one story or argument; one-sentence bridge; one link; sign-off; P.S. past 250 words. 30-80 words cart-close; 200-350 objection; 350-700 story. Musts: one reader, one idea, one link; greeting per voice profile; subject under 70 characters. Must-nots: subject restated as line one; three benefits with "so you can"; multiple links; "Not this. That."; "Let that sink in."

Sequences. Welcome 5-7: deliver and reframe; origin story; belief shift; proof story; objection email; direct offer. Launch 10-12: three prelaunch; open-cart; four mid-cart (biggest objection, customer story, FAQ, who this is not for); three close-day; post-close. Abandoned cart 3: 30-60 minutes, 24 hours, 48-72 hours, no discount first. Post-purchase 5: fast win; how to get the result; check-in; review request; next offer. Win-back 3: nine-word email with no links; what you missed; stay-or-go. Musts: every non-final email ends with a reason to open the next; every email sells. Must-not: an extended deadline.

Webinar package. Registration: the One Thing, three secrets. Reminders: morning-of, 60 minutes, 10 minutes. Presentation, about 90 minutes: two-agendas statement; five testimonials in five minutes; ruler goals; Epiphany Bridge; case study; three secrets, each with bridge, results, broken beliefs, restated belief; transition with the permission ask; stack; price within five minutes of the offer; guarantee matched to activation points; restack; urgency bonus; 30-minute countdown with live Q&A and closes between questions. Replay: five to seven emails over four days clustered at the deadline. Musts: offer, price, bonuses second-best to best, scarcity throughout, guarantee, objections cycled; 20-26 asks. Must-nots: teaching to completeness; apology transition; invented scarcity; an extended deadline.

Long VSL, warm or retargeted. Interrupt; promise with mechanism; credibility and bribe; dated demonstration; catalyst; short discovery story; the plan with logic per step; objections as personas; transition and stack with the button dropping at the price; price, guarantee, urgency, CTA repeated. No minute allocations; test the first 500 words. Must-nots: biography first; "our proven system"; price before value.

Short VSL, cold. Interrupt tied to the promise; promise, mechanism name and credibility in one breath; catalyst; three fascination-style benefits or a mini-demonstration; who it is for plus one disqualifier; next step; one real reason to act now. 3-7 minutes. Must-nots: stack; price unless the page sells.

Meta and Instagram ads. Primary text 50-150 characters before the fold, headline 27 characters (Instagram 125 and 40). Hook; one angle; one proof; one literal CTA; headline field restating the offer. Musts: 3-6 variations per ad set; describe the product or outcome, never the reader's attribute. Must-nots: "Are you tired of"; "Do you have [condition]"; "cure, heal, eliminate"; effortless-income claims.

YouTube ad script. 0-5s call-out and disqualifier; 5-15s stakes and one credibility line; 15-45s mechanism; 45s+ proof, offer, spoken and on-screen CTA, rehook, second CTA. Under 3 minutes. Must-nots: logo intro; "At [Brand], we"; improbable-result claims.

TikTok and Reels. 15-45 seconds, under 90 spoken words. Line one spoken and captioned (result-first, contrarian or POV); lines two to four show the discovery; one proof; CTA with location. Musts: proposition in the first 3 seconds; a real person on camera. Must-nots: "Hey everyone!"; feature tour.

Google responsive search ads. 15 headlines of 30 characters: 3-4 keyword, 3-4 benefit with number, 2-3 proof, 2 offer or risk reversal, 2 CTA; 4 descriptions of 90 characters, each a complete argument with CTA. Must-nots: one headline shape; repetition.

Advertorial and native landing page. FTC label above the headline ("Ad," "Advertisement," "Paid Advertisement"); editorial headline; byline and date; scene or surprising fact with no pitch for 150-300 words; the usual fixes widened; mechanism; proof; the turn in the same voice; offer and links repeated in the last third. 800-1,800 words cold; 400-700 retargeting. Listicle variant: number matching the items, reasons escalating problem, mechanism, proof, offer. Musts: label on both pages; narrator exists. Must-nots: brand before word 250; "Promoted" or no label; "stuns," "reveals," "you won't believe"; synthetic before/after.

Organic social. Five lines to earn "see more"; lead-in, main points, CTA; one idea; link in a comment; hook then rehook. Musts: a sales intent inside the story or opinion; CTA as verb, object, location. Must-nots: three ideas; "Thoughts?"; emoji bullets.

Product description. Name plus benefit tag; a lead in the buyer's words; three to five bullets translating features to situations; proof line; specs in a separate block. 60-150 words for consumables; 150-400 for considered purchases. Musts: phrases checked against the review corpus. Must-nots: "Elevate your [category] experience"; "crafted with care"; superlatives without the proof line.

SMS. [Brand]: [one-idea hook in second person with a stock, scarcity or newness fact] [offer with % and deadline] [link]. 75-115 characters; never above 240. Musts: STOP wording; 8 a.m. to 9 p.m. recipient time. Must-nots: jokes; dollar-off; no deadline; invented "almost gone."

Cold email. Line one, a verifiable observation about the reader; line two, the implied problem or a one-line case study with a number; line three, one question answerable in a word. 40-90 words; subject 1-3 words; no links in email one; follow-ups of one to three sentences, each with one new piece of relevance. Musts: persona-matched proof; tentative over assumptive; 0-1 questions. Must-nots: "I hope this email finds you well"; "I'd love to schedule a call"; "Thoughts?"

B2B pricing page. Value headline; plans as "Best for [persona]"; an offer that neutralizes a researched objection; proof at the decision point; FAQ headings phrased as the objection; three plans; anchor against the expensive alternative; value argument restated above the price. Must-nots: gated pricing without a stated reason; four or more plans; "Contact us" as the only CTA.

Podcast and audio read. Produced spot: 55-70 words; brand within five seconds; one CTA with the code. Host read: talking points, not a script; a "why I use it" moment; one mechanism; one proof; one objection; code and URL said twice, last.

Open, no spec yet: downsell, application and call-booking page, quiz funnel, webinar invitation emails, cancellation flow, UGC video script, X thread, replay page.

---`;

export const VOICE_CAPTURE = `## 10. Voice capture

From three to ten samples of the client's own writing, selling copy preferred:

1. Measure sentence-length mean and deviation; share of sentences under six and over thirty words; fragment rate; Flesch-Kincaid grade; paragraph length; first-word class of each paragraph.
2. Extract greeting and sign-off; an idiom bank of 20-40 phrases; a dead-word list; humor type and rate; edge tolerance; formatting habits; pronoun ratio; stance markers; how they name the enemy.
3. Record three verbatim exemplar paragraphs: a lead, a proof passage, a close.
4. Build the story inventory: documented events, dates, numbers, named people and failures, each with a ledger row. This is the part of voice that cannot be imitated.
5. Set the readability band from the audience (consumer grade 5-8; B2B marketing, ops and executive 6-8; finance and legal up to 9-12; engineering plain syntax with precise nouns), then let the sample override it.
6. Write the profile as parameters, never adjectives.
7. Validate: generate 500 words in the profile, re-measure against step 1, and have the client mark every line they would not have written. Adjust the profile, never the draft.
8. Never penalize caps, fragments, exclamation marks or ellipses; human direct response uses all four at rates far above AI drafts.`;

export const STANDARD = { RULES, ARGUMENT_SELECTION, LEAD_SELECTION, PROOF_PLACEMENT, OFFER_PRESENTATION, COPY_CHIEF_RUBRIC, AI_TELL_CHECKLIST, CLAIMS_AND_FACTUAL_REVIEW, FORMAT_SPECS, VOICE_CAPTURE } as const;
export const STANDARD_TITLES: Record<string, string> = {
  "RULES": "The standard",
  "ARGUMENT_SELECTION": "Argument selection",
  "LEAD_SELECTION": "Lead selection by awareness level",
  "PROOF_PLACEMENT": "Proof placement",
  "OFFER_PRESENTATION": "Offer presentation",
  "COPY_CHIEF_RUBRIC": "Copy chief rubric",
  "AI_TELL_CHECKLIST": "AI tell checklist",
  "CLAIMS_AND_FACTUAL_REVIEW": "Claims taxonomy and factual review",
  "FORMAT_SPECS": "Per-format specs",
  "VOICE_CAPTURE": "Voice capture"
};
