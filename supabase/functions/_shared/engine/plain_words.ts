/**
 * The type of word (docs/04 rule 40, the owner's tell 23). Selling copy uses the short word for the thing: buy, not
 * purchase; show, not demonstrate; need, not require. The long words and their short ones come from the US
 * government's plain-language list ("Simple words and phrases", public domain), the Hemingway app's simpler
 * alternatives and the masters' own swaps; the report words are the abstract nouns of a slide or a report that never
 * belong in a sentence to one reader. The detector counts them in a short piece and the tell edit swaps them.
 */

/** [the long word or phrase, the short one or ones], lowercase; a phrase matches as written. */
export const PLAIN_WORDS: readonly (readonly [string, string])[] = [
  ["accomplish", "do"], ["accordingly", "so"], ["accurate", "right"], ["additional", "more"], ["adjacent to", "next to"],
  ["advantageous", "helpful"], ["advise", "tell"], ["aggregate", "total"], ["allocate", "give"], ["anticipate", "expect"],
  ["apparent", "clear"], ["approximately", "about"], ["ascertain", "find out"], ["assistance", "help"], ["assist", "help"],
  ["attempt", "try"], ["authorize", "let"], ["capability", "ability"], ["cease", "stop"], ["commence", "start"],
  ["compensate", "pay"], ["comply with", "follow"], ["component", "part"], ["comprise", "make up"], ["concerning", "about"],
  ["consequently", "so"], ["consolidate", "combine"], ["constitutes", "is"], ["currently", "now"], ["demonstrate", "show"],
  ["depart", "leave"], ["designate", "name"], ["desire", "want"], ["determine", "decide or find out"], ["disclose", "show"],
  ["discontinue", "stop"], ["disseminate", "send out"], ["eliminate", "cut"], ["employ", "use"], ["encounter", "meet"],
  ["endeavor", "try"], ["endeavour", "try"], ["ensure", "make sure"], ["equitable", "fair"], ["equivalent", "equal"],
  ["establish", "set up or show"], ["evident", "clear"], ["exhibit", "show"], ["expedite", "speed up"], ["expend", "spend"],
  ["expertise", "skill"], ["facilitate", "help"], ["feasible", "workable"], ["finalize", "finish"], ["frequently", "often"],
  ["furnish", "give"], ["identical", "the same"], ["identify", "find or name"], ["immediately", "at once"],
  ["implement", "carry out"], ["in accordance with", "under"], ["in addition", "also"], ["in an effort to", "to"],
  ["in lieu of", "instead of"], ["in order to", "to"], ["in regard to", "about"], ["in the event that", "if"],
  ["in the near future", "soon"], ["inception", "start"], ["indicate", "show"], ["indication", "sign"], ["initial", "first"],
  ["initiate", "start"], ["interface with", "work with"], ["interpret", "read"], ["limited number", "few"], ["locate", "find"],
  ["magnitude", "size"], ["maintain", "keep"], ["majority", "most"], ["maximum", "most"], ["methodology", "method"],
  ["minimize", "cut"], ["minimum", "least"], ["modify", "change"], ["monitor", "watch"], ["necessitate", "need"],
  ["notify", "tell"], ["numerous", "many"], ["objective", "aim"], ["obtain", "get"], ["operate", "run"], ["optimum", "best"],
  ["optimal", "best"], ["parameters", "limits"], ["participate", "take part"], ["perform", "do"], ["permit", "let"],
  ["pertaining to", "about"], ["possess", "have"], ["practicable", "practical"], ["preclude", "prevent"],
  ["prior to", "before"], ["prioritize", "rank"], ["procure", "buy"],
  ["proficiency", "skill"], ["promulgate", "publish"], ["provide", "give"], ["purchase", "buy"], ["regarding", "about"],
  ["relocate", "move"], ["remainder", "rest"], ["remuneration", "pay"], ["render", "make"], ["represents", "is"],
  ["request", "ask"], ["require", "need"], ["requirement", "need"], ["reside", "live"], ["retain", "keep"],
  ["solicit", "ask for"], ["state-of-the-art", "latest"], ["strategize", "plan"],
  ["subsequent", "later"], ["subsequently", "then"], ["substantial", "large"], ["sufficient", "enough"], ["terminate", "end"],
  ["therefore", "so"], ["transmit", "send"], ["transpire", "happen"], ["until such time as", "until"], ["utilization", "use"],
  ["utilize", "use"], ["validate", "confirm"], ["viable", "workable"], ["whereas", "since"], ["with reference to", "about"],
  ["with the exception of", "except for"], ["witnessed", "saw"], ["enquiries", "calls or emails"], ["inquiries", "calls or emails"],
  ["enquiry", "a call or an email"], ["inquiry", "a call or an email"], ["commercial", "paying or for sale"], ["advertisers", "people who pay for ads"],
] as const;

/** Abstract words of a report or a slide: never in a sentence to one reader; the concrete thing goes in their place. */
export const REPORT_WORDS: readonly string[] = [
  "solution", "solutions", "strategy", "strategic", "strategies", "insight", "insights", "metric", "metrics", "performance",
  "deliverable", "deliverables", "functionality", "implementation", "methodology", "framework", "stakeholder", "stakeholders",
  "bandwidth", "actionable", "empower", "empowers", "empowering", "streamline", "streamlined", "holistic", "engagement",
  "capabilities", "efficiencies", "initiative", "initiatives", "outcome", "outcomes", "objectives", "visibility", "alignment",
  "optimization", "optimisation", "workflow", "workflows", "enablement", "monetize", "monetization", "scalability", "touchpoint", "touchpoints",
] as const;

/** The table as a prompt reads it: one line per pair. */
export function plainWordsText(): string {
  return PLAIN_WORDS.map(([w, p]) => `${w}: ${p}`).join("; ");
}

export function reportWordsText(): string {
  return REPORT_WORDS.join(", ");
}
