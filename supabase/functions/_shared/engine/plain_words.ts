/**
 * The type of word (docs/04 rule 40, the owner's tell 23). Selling copy uses the short word for the thing: buy, not
 * purchase; show, not demonstrate; need, not require. The long words and their short ones come from the US
 * government's plain-language list ("Simple words and phrases", public domain), the Hemingway app's simpler
 * alternatives and the masters' own swaps; the report words are the abstract nouns of a slide or a report that never
 * belong in a sentence to one reader. The detector counts them in a short piece and the tell edit swaps them.
 */

/**
 * [the long word or phrase, the short one or ones], lowercase; a phrase matches as written, a word with its plain
 * inflections (-s, -es, -d, -ed, -ing). The second block came from the research of the plain-language lists
 * (plainlanguage.gov, the Hemingway app's "simpler alternative" list, Zinsser's clutter pairs, Ogilvy's 1982 memo);
 * words with an everyday sense of their own (address, content, data, results, research, process, option, select,
 * however, previous) and the trade's metric names (search volume, difficulty score: the metric_name tell reads those)
 * are left out on purpose, because a word that is right in good copy must never count against it.
 */
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
  ["enquiry", "a call or an email"], ["inquiry", "a call or an email"], ["commercial", "paying or for sale"],
  // from the plain-language research
  ["a number of", "some"], ["abundance", "plenty"], ["accelerate", "speed up"], ["accompany", "go with"], ["accrue", "add up"],
  ["accumulate", "pile up"], ["acquire", "get or buy"], ["adversely impact", "hurt"], ["afford an opportunity", "let"], ["aforementioned", "cut it"],
  ["alleviate", "ease"], ["along the lines of", "like"], ["already existing", "existing"], ["an absence of", "no"], ["and/or", "or"],
  ["approximate", "about"], ["as a means of", "to"], ["as a result of", "because of"], ["as of yet", "yet"], ["as yet", "yet"],
  ["at no charge", "free"], ["at no cost", "free"], ["at the present time", "now"], ["at this point in time", "now"], ["at this time", "now"],
  ["attain", "reach"], ["attributable to", "because of"], ["be advised", "cut it"], ["because of the fact that", "because"], ["beneficial", "helpful"],
  ["by means of", "by"], ["caveat", "warning"], ["close proximity", "near"], ["complimentary", "free"], ["comprehend", "understand"],
  ["deem", "think"], ["despatch", "send"], ["dispatch", "send"], ["detrimental", "harmful"], ["documentation", "papers"],
  ["due to the fact that", "because"], ["duration", "how long"], ["during the period", "during"], ["each and every", "each"], ["economical", "cheap"],
  ["erroneous", "wrong"], ["excessive", "too much"], ["expenditure", "spending"], ["expiration", "end"], ["factual evidence", "facts"],
  ["first and foremost", "first"], ["for a period of", "for"], ["for the purpose of", "to"], ["forfeit", "lose"], ["formulate", "plan"],
  ["free of charge", "free"], ["fundamental", "basic"], ["gratis", "free"], ["has the ability to", "can"], ["honest truth", "the truth"],
  ["if and when", "if"], ["in a timely manner", "on time"], ["in all likelihood", "probably"], ["in excess of", "more than"], ["in light of the fact that", "because"],
  ["in many cases", "often"], ["in order that", "so"], ["in relation to", "about"], ["in some instances", "sometimes"], ["in spite of the fact that", "although"],
  ["in terms of", "cut it"], ["in the amount of", "for"], ["in the event of", "if"], ["in the process of", "cut it"], ["initially", "at first"],
  ["innovative", "new"], ["is able to", "can"], ["is applicable to", "applies to"], ["is responsible for", "handles"], ["it is essential", "you must"],
  ["next-generation", "new"], ["no-cost", "free"], ["not later than", "by"], ["on a regular basis", "every week (say when)"], ["on the contrary", "but"],
  ["owing to the fact that", "because"], ["particulars", "details"], ["per annum", "a year"], ["personnel", "people"], ["persons", "people"],
  ["peruse", "read"], ["point in time", "time"], ["presently", "now"], ["promptly", "at once"], ["provided that", "if"],
  ["put simply", "cut it"], ["readily apparent", "clear"], ["reconceptualize", "rethink"], ["referred to as", "called"], ["reimburse", "pay back"],
  ["relative to", "about"], ["residence", "home"], ["should you wish", "if you want"], ["successfully complete", "finish"], ["supplementary", "extra"],
  ["take action to", "act"], ["the majority of", "most"], ["this day and age", "today"], ["time period", "time"], ["utilise", "use"],
  ["various different", "different"], ["whether or not", "whether"], ["with regard to", "about"], ["with respect to", "about"], ["with the possible exception of", "except"],
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
