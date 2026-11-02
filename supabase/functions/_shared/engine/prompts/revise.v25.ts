/**
 * Revise prompt, version 25: version 24's messages with the writer's words of draft v25 and the shape of this one
 * (docs/04 Section 13) in the stable material, so a revision keeps the piece's drawn rhythm instead of evening it out.
 */
import { revisePrompt as revisePrev, type ReviseArgs } from "./revise.v24.ts";
import { REVISION_V21 } from "./revise.v21.ts";
import { NEVER, WRITER, withShape, writerTells } from "./draft.v25.ts";
import { shapeTextForDraft } from "../draft/shape.ts";
import type { PromptModule } from "./types.ts";

export type { ReviseArgs };

const SYSTEM = [WRITER, "", REVISION_V21, "", NEVER, "", writerTells()].join("\n");

export const revisePrompt: PromptModule<ReviseArgs> = {
  ...revisePrev,
  version: 25,
  system: SYSTEM,
  user: (ctx, args) => withShape(revisePrev.user(ctx, args), shapeTextForDraft(ctx.generation.id, ctx.format, args.draft.sections)),
};
