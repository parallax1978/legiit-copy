/**
 * The manner a piece is written in: one master's way in, shape of proof and voice (docs/04 Section 12). The user
 * chooses one on the piece, or the engine picks the family's default. The structure of the case (the moment, the
 * cost, the discovery, the product as the answer, the proof, the ask) is the same under every manner; the manner
 * decides how the piece gets in, what the proof looks like and whose exemplar leads. The three openings of a short
 * piece are three ways in: the manner's and two companions with different lead types, and the cold read picks.
 */
import type { FormatSpec } from "../formats/spec.ts";
import type { LeadType } from "../schemas/common.ts";

export const MANNER_IDS = ["halbert", "carlton", "hopkins", "schwartz", "bencivenga", "sugarman", "ogilvy", "caples", "collier"] as const;
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
};

/** The family's default manner when the user leaves it blank. */
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

/** The manner for a piece: the user's when given, else the family's default. */
export function pickManner(spec: FormatSpec, chosen: unknown): { manner: Manner; chosenBy: "user" | "engine" } {
  if (isMannerId(chosen)) return { manner: MANNERS[chosen], chosenBy: "user" };
  return { manner: MANNERS[DEFAULT_MANNER_BY_FAMILY[spec.family]], chosenBy: "engine" };
}

/** The three openings as three ways in: the manner's, then its two companions; their lead types differ. */
export function openingManners(manner: Manner): [Manner, Manner, Manner] {
  return [manner, MANNERS[manner.companions[0]], MANNERS[manner.companions[1]]];
}
