import type { Db } from "../../supabase.ts";
import type { Database } from "../../database.types.ts";
import type { StepName } from "../config.ts";
import type { FormatSpec } from "../formats/spec.ts";
import type { Dossier } from "../schemas/research.ts";
import type { OfferBrief } from "../schemas/brief.ts";

export type GenerationRow = Database["public"]["Tables"]["generations"]["Row"];
export type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
export type ClaimRow = Database["public"]["Tables"]["offer_claims"]["Row"];
export type OfferConfigRow = Database["public"]["Tables"]["offer_config"]["Row"];
export type OfferQuestionRow = Database["public"]["Tables"]["offer_questions"]["Row"];
export type OfferVariantRow = Database["public"]["Tables"]["offer_variants"]["Row"];
export type VoiceProfileRow = Database["public"]["Tables"]["voice_profiles"]["Row"];
export type DraftRow = Database["public"]["Tables"]["drafts"]["Row"];
export type AngleRow = Database["public"]["Tables"]["angles"]["Row"];
export type StepRow = Database["public"]["Tables"]["generation_steps"]["Row"];

/** Everything a step may read. Loaded once by run-step; steps never query ad hoc for inputs they could get here. */
export interface StepContext {
  db: Db;
  generation: GenerationRow;
  offer: OfferRow;
  brief: OfferBrief | null;
  claims: ClaimRow[];
  config: OfferConfigRow | null;
  /** Intake's open questions with the user's answers; answers are the user's own facts, open ones stay unknown. */
  questions: OfferQuestionRow[];
  variant: OfferVariantRow | null;          // approved offer construction, if any
  dossier: Dossier | null;                  // active research
  voice: VoiceProfileRow | null;
  format: FormatSpec;
  angles: AngleRow[];                       // from the argument step
  winningAngle: AngleRow | null;
  drafts: DraftRow[];                       // ascending by version
  latestDraft: DraftRow | null;
  stepOutputs: Partial<Record<StepName, unknown>>; // latest completed output per step
  revisionCycles: number;
  attempt: number;
  promptVersions: Record<string, { id: string; version: number; template: string; model: string; effort: string; max_tokens: number } | undefined>;
  /** Report progress to the UI (generations.progress_message). */
  progress: (message: string) => Promise<void>;
  /**
   * Resumable steps (draft): the partial state saved by the previous attempt of this step in this pass, or null.
   * A step that does several model calls persists after each call group with savePartial, and when its time
   * budget is spent returns `continueLater` so the runner re-enqueues the same step in a fresh invocation.
   */
  partial: unknown | null;
  savePartial: (partial: unknown) => Promise<void>;
  /** Wall-clock budget for this invocation in ms (the runner sets it below the Edge Function limit). */
  timeBudgetMs: number;
  startedAt: number;
}

export interface StepResult<T = unknown> {
  output: T;                 // persisted to generation_steps.output (zod-validated by the step)
  model?: string;
  summary: string;           // one line for the timeline
  /** Side effects the runner applies: new draft version, angles, claims, flags, predictions. */
  effects?: StepEffects;
  /** When true the pipeline pauses with status needs_input (e.g. offer approval, blocking questions). */
  pause?: { reason: string };
  /** The step saved partial state and needs another invocation to finish; the runner re-enqueues the same step. */
  continueLater?: { reason: string };
}

export interface StepEffects {
  newDraft?: { origin: "system" | "revise" | "challenger"; label?: string; blocks: unknown; markdown: string; skimPath: string[]; ledgerRefs: string[]; wordCount: number };
  angles?: { candidate: unknown; gates: unknown; scores: unknown; total: number; isFinalist: boolean; isWinner: boolean; keptAsLoser: boolean; rank: number; thesis?: string }[];
  claimsToAdd?: unknown[];                 // ClaimRowInput[]
  offerVariant?: { optionsSheet: unknown; chosen: unknown; reasons: string; guarantee: unknown; deadline: unknown; gapNote: string };
  research?: { dossier: Dossier; sources: unknown };
  flags?: { source: "editorial" | "factual" | "mechanical" | "cold_read"; kind: string; severity: string; quote: string | null; rule: string | null; issue: string; suggestedRewrite: string | null; claimId?: string | null }[];
  prediction?: { prediction: "beat" | "lose" | "unsure"; reason: string };
  questions?: { question: string; why: string }[];
  editorialVerdict?: "REJECT" | "REVISE" | "APPROVE";
  mechanicalHardFail?: boolean;
  factualFatal?: boolean;
  selectedAngleId?: string;
}

export type StepFn = (ctx: StepContext) => Promise<StepResult>;
