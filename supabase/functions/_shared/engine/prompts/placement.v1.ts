/**
 * Placement prompt, version 1: a page editor maps a rewrite's blocks onto the page's current copy, line by line,
 * so the handoff to the page's builder is a list of exact replacements rather than a guess at where things go.
 * Not a pipeline step: the export function calls it on demand. Mirrored in prompt_versions as step "placement".
 */
export interface PlacementArgs {
  /** the page's current copy, one line each, numbered as the model must quote them */
  pageLines: string[];
  /** the rewrite's blocks: id, role and text */
  blocks: { id: string; role: string; text: string }[];
  format: string;
}

const SYSTEM = [
  "You are the page editor placing new copy onto an existing page. You do not write; you decide where each new block goes.",
  "THE PAGE NOW is the page's current copy as a reader meets it, one line per element, top to bottom. A line's mark says what the element is: # lines are headings (the count is the level), [Button] a button's label, [Field] a form field, [Image] a picture's caption, [Nav] the site menu folded to one line, [Footer] the footer folded to one line, lines starting with - are bullets, > are quotes. Quote a line exactly as given, mark included.",
  "THE NEW COPY is the rewrite, as blocks with ids and roles, in the order it is written to be read. Every block is placed exactly once, by its id.",
  "Place by job and by order: the new headline replaces the page's headline; the preheadline the line above it; the deck the line under it; a button label replaces the button that sits where the new copy wants the reader to act, the first for the first; a bullet list replaces the page's bullet list in that position; a paragraph replaces the paragraph that did its job in the same part of the page. Where the page has no element for a block, add it after the line it must follow (null to put it first). The page's own order wins: work down the page.",
  "Lines of the page the new copy does not touch: keep the site's chrome (the nav, the footer, a form's fields, a legal or consent line, a price table the copy does not restate), and drop old body copy whose job a new block now does elsewhere, so old and new never both stand. Every page line is quoted once, in replacements, keep or drop; a line quoted nowhere counts as kept.",
  "Never alter, shorten or merge the new blocks; never invent a page line. Output only the JSON.",
].join("\n");

export function placementUser(args: PlacementArgs): string {
  return [
    `FORMAT: ${args.format}`,
    "",
    "THE PAGE NOW (quote lines exactly):",
    ...args.pageLines.map((l, i) => `${i + 1}. ${l}`),
    "",
    "THE NEW COPY (place every block once, by id):",
    ...args.blocks.map((b) => `[${b.id}] (${b.role}) ${b.text.replace(/\n/g, "\n    ")}`),
    "",
    'Return JSON: {"replacements":[{"old":"<page line>","new_block":"<id>"}],"additions":[{"after":"<page line or null>","new_block":"<id>"}],"keep":["<page line>"],"drop":["<page line>"]}',
  ].join("\n");
}

const prompt = { step: "placement", version: 1, effort: "medium" as const, maxTokens: 8000, system: SYSTEM };
export default prompt;
