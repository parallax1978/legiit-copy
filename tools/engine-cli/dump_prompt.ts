/**
 * Prints the exact request the draft step would send for a stored generation, without calling the model:
 * the resolved system text and the user message of every call in the plan. Reads the database only.
 *
 *   deno run -c supabase/functions/deno.json --allow-read --allow-write --allow-env --allow-net \
 *     tools/engine-cli/dump_prompt.ts --generation <id> --out <dir> [--module <path to a draft prompt module>]
 */
import { parseArgs } from "@std/cli/parse-args";
import { join } from "@std/path";
import { serviceClient } from "../../supabase/functions/_shared/supabase.ts";
import { buildContext } from "../../supabase/functions/_shared/engine/context.ts";
import { ArgumentOutput } from "../../supabase/functions/_shared/engine/schemas/argument.ts";
import { parseOptions } from "../../supabase/functions/_shared/engine/draft/options.ts";
import { interrogate, knownClaimIds, targetAwareness, usableClaims } from "../../supabase/functions/_shared/engine/draft/ledger.ts";
import { leadTypesForAwareness } from "../../supabase/functions/_shared/engine/draft/leads.ts";
import { describePlan, planDraft } from "../../supabase/functions/_shared/engine/draft/plan.ts";
import { describeArgument, stepOutput } from "../../supabase/functions/_shared/engine/draft/step_util.ts";
import { SEQUENCE_ROLES } from "../../supabase/functions/_shared/engine/formats/index.ts";
import { resolvePrompt, type PromptModule } from "../../supabase/functions/_shared/engine/prompts/types.ts";
import type { DraftArgs } from "../../supabase/functions/_shared/engine/prompts/draft.v1.ts";
import type { StepContext } from "../../supabase/functions/_shared/engine/steps/types.ts";

const args = parseArgs(Deno.args, { string: ["generation", "out", "module"] });
if (!args.generation || !args.out) throw new Error("--generation and --out are required");
const modPath = args.module ?? "../../supabase/functions/_shared/engine/prompts/draft.v18.ts";
const mod = (await import(modPath.startsWith(".") ? new URL(modPath, import.meta.url).href : modPath)).draftPrompt as PromptModule<DraftArgs>;

const db = serviceClient();
const ctx: StepContext = await buildContext(db, args.generation, 1, async () => {});
// the checkout's prompt modules, as the CLI's --module-prompts does
ctx.promptVersions = Object.fromEntries(Object.entries(ctx.promptVersions).map(([s, pv]) => [s, pv ? { ...pv, id: null, version: null, template: null } : pv])) as unknown as StepContext["promptVersions"];

const spec = ctx.format;
const options = parseOptions(ctx.generation.options);
const target = targetAwareness(ctx.dossier, options);
const argOut = stepOutput(ctx, "argument", ArgumentOutput);
const known = knownClaimIds(usableClaims(ctx.claims));
const q = interrogate({ winner: ctx.winningAngle ? { candidate: ctx.winningAngle.candidate, thesis: ctx.winningAngle.thesis } : null, thesisFallback: argOut?.thesis ?? null, awareness: target.awareness, segment: target.segment, usableClaimIds: known });
if (!q.ok) throw new Error(`drafting would be blocked: ${q.reason}`);
const seqType = options.sequence_type && options.sequence_type in SEQUENCE_ROLES ? (options.sequence_type as keyof typeof SEQUENCE_ROLES) : null;
const roles = spec.id === "email_sequence" ? SEQUENCE_ROLES[seqType ?? "welcome"] : undefined;
const plan = planDraft(spec, { itemCount: options.item_count, roles });
const leadTypes = plan.leadSectionId ? leadTypesForAwareness(target.awareness, options.skeptical) : null;
const argumentText = describeArgument(ctx.winningAngle, ctx.angles);
const sophistication = ctx.dossier?.sophistication.stage ?? "unknown";

await Deno.mkdir(args.out, { recursive: true });
const r = resolvePrompt(ctx, mod);
await Deno.writeTextFile(join(args.out, "system.md"), r.system);
console.log(`draft prompt version ${mod.version}; system ${r.system.split(/\s+/).length} words`);
console.log(describePlan(plan).join("\n"));
for (const [i, call] of plan.calls.entries()) {
  const a: DraftArgs = { call, callIndex: i + 1, callTotal: plan.calls.length, awareness: target.awareness, segment: target.segment, sophistication, thesis: q.thesis, argumentText, drafted: [], leads: null, leadTypes: call.kind === "leads" || call.kind === "whole" ? leadTypes : null, examplesText: "", retryNote: null };
  const user = mod.user(ctx, a);
  const name = `user-${i + 1}-${call.kind}.md`;
  await Deno.writeTextFile(join(args.out, name), user);
  console.log(`${name}: ${user.split(/\s+/).length} words`);
}
