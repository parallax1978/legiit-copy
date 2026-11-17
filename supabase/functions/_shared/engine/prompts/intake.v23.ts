/**
 * Intake prompt, version 23: version 22's messages, and a retry note on a call whose answer did not fit the output
 * shape. The Niche Edits offer lost its whole brief to one malformed field: the brief call's answer failed
 * validation, nothing recorded why, and the offer went back to an empty draft.
 */
import prev from "./intake.v22.ts";
import type { PromptModule } from "./types.ts";

export * from "./intake.v22.ts";

type PrevArgs = Parameters<typeof prev.user>[1];
export type IntakeArgs = PrevArgs & {
  /** the previous answer's problems with the output shape, named field by field */
  retryNote?: string | null;
};

export function shapeRetryNote(issues: string[]): string {
  return `Your previous answer did not fit the required JSON shape. Fix exactly these fields and return the whole object again, nothing else: ${issues.join("; ")}. A number field holds a number or null, never words ("30% off" goes in the text field beside it); every listed key is present; an unknown is null or an empty list.`;
}

const prompt: PromptModule<IntakeArgs> = {
  ...prev,
  version: 23,
  user: (ctx, args) => {
    const base = prev.user(ctx, args);
    return args.retryNote ? `${base}\n\n<retry>\n${args.retryNote}\n</retry>` : base;
  },
};
export default prompt;
