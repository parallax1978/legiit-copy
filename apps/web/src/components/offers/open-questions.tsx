"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, HelpCircle, Loader2, Plus, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { answerQuestions, addQuestion } from "@/lib/actions/offers";
import type { OfferQuestionRow } from "./normalize";
import { SectionCard } from "./fields";

export function OpenQuestions({ offerId, questions, unknowns, editable, extracting }: { offerId: string; questions: OfferQuestionRow[]; unknowns: string[]; editable: boolean; extracting: boolean }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>(() => Object.fromEntries(questions.map((q) => [q.id, q.answer ?? ""])));
  const [note, setNote] = useState("");
  const [newQ, setNewQ] = useState("");
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"save" | "reextract" | "add" | null>(null);
  const open = questions.filter((q) => !q.answer);
  const answered = questions.filter((q) => q.answer);
  const changed = questions.some((q) => (answers[q.id] ?? "") !== (q.answer ?? "")) || note.trim().length > 0;

  function submit(reextract: boolean) {
    setMode(reextract ? "reextract" : "save");
    start(async () => {
      const r = await answerQuestions(offerId, { answers: questions.map((q) => ({ id: q.id, answer: answers[q.id] ?? "" })), note, reextract });
      setMode(null);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(r.data.reextracted ? "Answers saved. Extraction is re-running with them." : "Answers saved.");
        setNote("");
        router.refresh();
      }
    });
  }

  function add() {
    if (!newQ.trim()) return;
    setMode("add");
    start(async () => {
      const r = await addQuestion(offerId, newQ, "Added by the team.");
      setMode(null);
      if (!r.ok) toast.error(r.error);
      else {
        setNewQ("");
        router.refresh();
      }
    });
  }

  return (
    <SectionCard
      title={
        <span className="inline-flex items-center gap-2">
          <HelpCircle className="size-4 text-warn" /> Open questions
          {open.length > 0 && <span className="rounded-full bg-warn-soft px-2 py-px text-xs font-semibold text-warn">{open.length}</span>}
        </span>
      }
      description="Consequential facts the sources do not settle. The writer will not invent them; answer what you can and re-extract so the brief and ledger pick the answers up."
    >
      <div className="space-y-5">
        {questions.length === 0 && unknowns.length === 0 && <p className="text-sm text-ink-soft">Nothing open. The sources settled what the writer needs.</p>}

        {open.length > 0 && (
          <ul className="space-y-4">
            {open.map((q) => (
              <li key={q.id}>
                <p className="text-sm font-medium text-ink">{q.question}</p>
                {q.why && <p className="mt-0.5 text-xs text-ink-muted">Why it matters: {q.why}</p>}
                <Textarea className="mt-2" rows={2} placeholder="Your answer, with the exact figure where there is one" value={answers[q.id] ?? ""} disabled={!editable} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
              </li>
            ))}
          </ul>
        )}

        {unknowns.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Facts the sources do not settle</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink-muted">
              {unknowns.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
          </div>
        )}

        {editable && (
          <div>
            <label htmlFor="extra-note" className="text-sm font-medium text-ink">
              Anything else the sources leave out
            </label>
            <Textarea id="extra-note" className="mt-1.5" rows={3} placeholder="Numbers, dates, names, terms. Whatever you know that the pages do not say." value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        )}

        {answered.length > 0 && (
          <details className="rounded-md border border-line">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-ink">
              <CheckCircle2 className="mr-1.5 inline size-4 text-good" />
              {answered.length} answered
            </summary>
            <ul className="divide-y divide-line border-t border-line">
              {answered.map((q) => (
                <li key={q.id} className="px-3 py-2">
                  <p className="text-sm text-ink">{q.question}</p>
                  {editable ? (
                    <Textarea className="mt-1.5" rows={2} value={answers[q.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
                  ) : (
                    <p className="mt-0.5 text-sm text-ink-muted">{q.answer}</p>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}

        {editable && (
          <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Input placeholder="Add a question the team should answer" value={newQ} onChange={(e) => setNewQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} className="sm:w-80" />
              <Button variant="outline" size="icon" aria-label="Add question" onClick={add} disabled={pending || !newQ.trim()}>
                {mode === "add" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => submit(false)} disabled={pending || !changed}>
                {mode === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save answers
              </Button>
              <Button onClick={() => submit(true)} disabled={pending || extracting || (!changed && questions.every((q) => !q.answer))}>
                {mode === "reextract" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Answer and re-extract
              </Button>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
