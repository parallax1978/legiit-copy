/**
 * The manner a piece is written in: one master's way in, shape of proof and voice (docs/04 Section 12). The user
 * chooses one on the piece, or the engine picks the family's default. The structure of the case (the moment, the
 * cost, the discovery, the product as the answer, the proof, the ask) is the same under every manner; the manner
 * decides how the piece gets in, what the proof looks like and whose exemplar leads. The three openings of a short
 * piece are three ways in: the manner's and two companions with different lead types, and the cold read picks.
 */
import type { FormatSpec } from "../formats/spec.ts";
import type { LeadType } from "../schemas/common.ts";

export const MANNER_IDS = ["halbert", "carlton", "hopkins", "schwartz", "bencivenga", "sugarman", "ogilvy", "caples", "collier", "makepeace", "palmer", "fladlien", "brunson", "aagaard", "harmon", "dubin", "settle"] as const;
export type MannerId = (typeof MANNER_IDS)[number];

export interface Manner {
  id: MannerId;
  /** the master's name as the exemplars carry it */
  master: string;
  /** the way in, the proof and the voice, in the writer's words */
  move: string;
  /** the way in alone, for an opening written in this manner on a piece written in another */
  way_in: string;
  /** the lead type this way in takes (Section 3) */
  lead_type: LeadType;
  /** two other manners for the other two openings, with lead types unlike this one's */
  companions: [MannerId, MannerId];
}

export const MANNERS: Record<MannerId, Manner> = {
  halbert: {
    id: "halbert", master: "Halbert", lead_type: "story", companions: ["hopkins", "schwartz"],
    way_in: "a letter from one person: a day, a place, a dollar figure, what happened and what it cost, and why he is writing",
    move: "A story, told like a letter from one person: a day, a place, a dollar figure, what happened and what it cost; the reason the speaker is writing; the product arrives as the thing he found or built after the loss, named in one plain sentence; the deal said once, with the reason it is this good; a P.S. that adds a fact. The voice is a man talking across a table, contractions and all.",
  },
  carlton: {
    id: "carlton", master: "Carlton", lead_type: "proclamation", companions: ["hopkins", "bencivenga"],
    way_in: "the event: a thing that happened at a named time, with the clock on it and the number off the speaker's own records, then a flat claim he would argue with",
    move: "The event: a thing that happened at a named time, with the clock on it and the numbers counted off the speaker's own records; a flat claim he would argue with, then the proof that settles it; the old way told as a day in his life; no moral at the end, just what to do and what he risks (nothing).",
  },
  hopkins: {
    id: "hopkins", master: "Hopkins", lead_type: "problem_solution", companions: ["halbert", "carlton"],
    way_in: "a test he runs on himself in the first lines, on what he has open right now, and what he will find",
    move: "A test the reader runs on himself in the first lines, on what he has open right now, with what he will find; the reason why it keeps happening to him, plainly; the product as the thing that changes what he just saw; the numbers from the speaker's own count; the test again at the close.",
  },
  schwartz: {
    id: "schwartz", master: "Schwartz", lead_type: "secret", companions: ["bencivenga", "halbert"],
    way_in: "the want he already has, in his words, aimed at the thing he does not know that explains why the usual way fails him",
    move: "The want he already has, named in his words in the first line, aimed at a new mechanism: the thing he does not know that explains why the usual way fails him, then the product as the mechanism's name; the product is never introduced before the mechanism; the proof shows the mechanism working once.",
  },
  bencivenga: {
    id: "bencivenga", master: "Bencivenga", lead_type: "promise", companions: ["carlton", "schwartz"],
    way_in: "the speaker's own count first, with the number and the average, and the promise made only as large as it",
    move: "Proof first: the speaker's own files, counts and tests, said with the number and the average; his stake said plainly (what he checked himself, what he will not claim); the promise made only as large as the proof under it; the risk carried by the seller; one easy step.",
  },
  sugarman: {
    id: "sugarman", master: "Sugarman", lead_type: "secret", companions: ["halbert", "bencivenga"],
    way_in: "a short first sentence that makes him read the second, the day it went wrong told in small pieces",
    move: "The slide: a short first sentence that makes him read the second, each line pulling the next, the day it went wrong told in small pieces; the product in one plain sentence; the one case that failed left in so the rest is believed; the specifics in the open and nothing held back for a reveal.",
  },
  ogilvy: {
    id: "ogilvy", master: "Ogilvy", lead_type: "promise", companions: ["hopkins", "carlton"],
    way_in: "the one specific that says it all, in the first line, as a fact with no adjective",
    move: "The fact and the big idea: the one specific that says it all, in the first line, with the product named plainly; facts told as facts, in the reader's words, with no adjectives; the big idea carried through every line; a reason to act that is true.",
  },
  caples: {
    id: "caples", master: "Caples", lead_type: "promise", companions: ["halbert", "schwartz"],
    way_in: "a specific result with its time, told as what changed and what did not, with his self-interest and the news in the first line",
    move: "The tested headline: a specific result with its time, told as what changed and what did not; self-interest, news and a number in the first line; the body paying off exactly what the first line promised, nothing else; the deal in plain words.",
  },
  collier: {
    id: "collier", master: "Collier", lead_type: "problem_solution", companions: ["halbert", "ogilvy"],
    way_in: "where his mind already is: the night he dreads, the call he cannot answer, in the words he would use",
    move: "Start where the reader's mind already is: the night he dreads, the call he cannot answer, in the words he would use; the want he already has said back to him; the product as the natural next thought, in one plain sentence; the count from last season; a real reason the window closes.",
  },
  makepeace: {
    id: "makepeace", master: "Makepeace", lead_type: "proclamation", companions: ["bencivenga", "halbert"],
    way_in: "the thing he already fears or resents, named in his words in the first line, with its date and its source, and the reason it is happening",
    move: "The threat first: the thing he already fears or resents, named in his words in the first line, with its date and its source; the reason it is happening, told plainly by someone who has been inside it; the product as what the speaker built against it; proof right behind every claim, from his own files, the failures left in; the promise no bigger than the proof under it. The voice is urgent and specific, never loud.",
  },
  palmer: {
    id: "palmer", master: "Palmer", lead_type: "secret", companions: ["bencivenga", "carlton"],
    way_in: "a warning with a date on it, from a speaker who says what his record is and what he is not sure of, then the fact the reader has not been told",
    move: "The warning with a date on it, from a speaker who says what his record is and what he is not sure of; the thing the reader has not been told, laid out as a chain of facts he can check himself; the advice he can use before any product is named; the product as the way to be ready, in one plain sentence, after the case is complete; the voice calm and reasoned, with the alarm in the facts, not in the words.",
  },
  fladlien: {
    id: "fladlien", master: "Fladlien", lead_type: "promise", companions: ["halbert", "schwartz"],
    way_in: "the promise of what he will have by the end, with the time it takes and the even if that names his reason to doubt it",
    move: "The promise first: what he will have by the end, the time it takes and the even if that names his doubt; one piece of the method taught whole, so he can use it tonight before he buys; the product as what does that piece from then on; the offer as a stack, each part answering one objection, then the part that pays; a guarantee he earns by doing the work; a deadline kept. The voice is a teacher who sells by teaching.",
  },
  brunson: {
    id: "brunson", master: "Brunson", lead_type: "story", companions: ["bencivenga", "hopkins"],
    way_in: "where he was, the wall he hit and the moment he saw it differently, told the way a friend tells you what happened to him",
    move: "The epiphany bridge: where he was, the wall he hit, the moment he saw it differently, and the new way told as a different thing, never a better version of the old one; the product in one plain sentence, then the offer read out piece by piece, each piece with what it does for him; the count from his own list; the ask in the buyer's words, a yes and a no. The voice is a friend telling you what happened to him.",
  },
  aagaard: {
    id: "aagaard", master: "Aagaard", lead_type: "offer", companions: ["hopkins", "caples"],
    way_in: "what the click gets, in the words of the thing he clicked, with the button in his own first person finishing the headline",
    move: "What the click gets, in the words of the thing he clicked; the button in his own first person, finishing the headline; beside it the lines that settle what happens next: who it is for, what arrives first, when, what it costs; the proof is the thing itself spelled out item by item, so the claim is never larger than the list; nothing on the page he did not come for. The voice is plain and exact, no adjective in it.",
  },
  harmon: {
    id: "harmon", master: "Harmon Brothers", lead_type: "proclamation", companions: ["hopkins", "halbert"],
    way_in: "the blunt line nobody says out loud about the problem, said flat over one picture that is absurd and on message, then the stand-in that shows why it works",
    move: "The blunt line: the thing nobody says out loud about the problem, said flat over one absurd picture that sells; one stand-in carries the mechanism, so he sees why it works; the demonstration on camera, real and a bit extreme; every joke carries a selling point, lands deadpan and never on the buyer; the product in one plain sentence; the price and the guarantee said straight at the end, with the first picture back.",
  },
  dubin: {
    id: "dubin", master: "Dubin", lead_type: "offer", companions: ["carlton", "hopkins"],
    way_in: "the offer and the price in the first breath, from the man who makes it, with his shop behind him",
    move: "The offer and the price in the first breath, from the man who makes it, with his shop behind him; each objection the viewer has taken in turn and put down with one dry line, no joke that does not sell; nothing claimed that is not in frame, the thing working once, the wall, the box; the product named in one plain sentence; a flat close with one step.",
  },
  settle: {
    id: "settle", master: "Settle", lead_type: "story", companions: ["ogilvy", "hopkins"],
    way_in: "a reader's question, or the speaker's own interest said straight, answered from what he does himself",
    move: "A daily note: line one is a reader's question, or the speaker's own interest said straight; the proof is his own practice, what he does and what it got him, with the year and the count, never what others say; one opinion stated as a rule; a one-line bridge to the product, named plainly, then one bare link; a P.S. only when it sells nothing. The voice is blunt and unhurried and does not mind who leaves.",
  },
};

/**
 * The format's own default when the user leaves the manner blank: the master the research ranked first for that
 * exact format (research/format-masters). A format not listed here takes its family's default.
 */
export const DEFAULT_MANNER_BY_FORMAT: Partial<Record<FormatSpec["id"], MannerId>> = {
  sales_letter: "makepeace",
  vsl_long: "palmer",
  webinar_package: "fladlien",
  upsell: "brunson",
  order_bump: "brunson",
  optin: "aagaard",
  vsl_short: "harmon",
  youtube_ad: "harmon",
};

/** The family's default manner when the user leaves it blank and the format has no default of its own. */
export const DEFAULT_MANNER_BY_FAMILY: Record<FormatSpec["family"], MannerId> = {
  social: "halbert",
  email: "halbert",
  ad: "caples",
  video: "carlton",
  message: "sugarman",
  page: "schwartz",
  commerce: "ogilvy",
  audio: "halbert",
};

export function isMannerId(x: unknown): x is MannerId {
  return typeof x === "string" && (MANNER_IDS as readonly string[]).includes(x);
}

/** The manner for a piece: the user's when given, else the format's default, else the family's. */
export function pickManner(spec: FormatSpec, chosen: unknown): { manner: Manner; chosenBy: "user" | "engine" } {
  if (isMannerId(chosen)) return { manner: MANNERS[chosen], chosenBy: "user" };
  return { manner: MANNERS[DEFAULT_MANNER_BY_FORMAT[spec.id] ?? DEFAULT_MANNER_BY_FAMILY[spec.family]], chosenBy: "engine" };
}

/** The three openings as three ways in: the manner's, then its two companions; their lead types differ. */
export function openingManners(manner: Manner): [Manner, Manner, Manner] {
  return [manner, MANNERS[manner.companions[0]], MANNERS[manner.companions[1]]];
}
