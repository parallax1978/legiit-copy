"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Check, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCard, MANNER_OPTIONS, defaultMannerName, isFormatId, isMannerId, type FormatId } from "@/lib/formats";
import { MIN_PAGE_WORDS, REWRITE_FORMATS } from "@/lib/page-format";
import { finishRewrite, getRewriteStatus, readRenderedPage, startRewrite, type RewriteStatus } from "@/lib/actions/rewrite";

const POLL_MS = 3000;

/**
 * Paste a URL, the app reads the page into an offer of its own and builds the brief from it, you confirm what kind
 * of page it is, and the piece is written with the original as the control the copy chief predicts against.
 */
export function RewriteForm() {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [offerId, setOfferId] = useState<string | null>(null);
  const [status, setStatus] = useState<RewriteStatus | null>(null);
  const [format, setFormat] = useState<FormatId | null>(null);
  const [manner, setManner] = useState("engine");
  const [purpose, setPurpose] = useState("");
  const [pending, startTransition] = useTransition();
  const [browser, setBrowser] = useState<"idle" | "opening" | "done" | "failed">("idle");
  const [browserError, setBrowserError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const opening = browser === "opening";
  const reading = !!offerId && (opening || !status || status.status === "extracting" || status.sourceStatus === "pending" || status.sourceStatus === "processing");
  // a page the fetch saw only the shell of is opened in a browser before it counts as unread
  const needsBrowser = !!status && !reading && status.tooShort && !status.readInBrowser && browser === "idle";
  const failed = !!status && !reading && !needsBrowser && (status.sourceStatus === "failed" || status.tooShort || !status.briefReady || browser === "failed");
  const ready = !!status && !reading && !failed && !needsBrowser;
  const pastedWords = text.trim() ? text.trim().split(/\s+/).length : 0;
  const canRead = pastedWords >= MIN_PAGE_WORDS || (!!url.trim() && pastedWords === 0);

  useEffect(() => {
    if (!offerId || !reading) return;
    let stopped = false;
    const tick = async () => {
      const r = await getRewriteStatus(offerId);
      if (stopped) return;
      if (r.ok) {
        setStatus(r.data);
        if (r.data.guess && !format) setFormat(r.data.guess);
      } else toast.error(r.error);
      timer.current = setTimeout(tick, POLL_MS);
    };
    timer.current = setTimeout(tick, 1200);
    return () => {
      stopped = true;
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerId, reading]);

  // the fetch got the shell: open the page in a browser and read every frame, then the brief is rebuilt from it
  useEffect(() => {
    if (!offerId || !needsBrowser) return;
    setBrowser("opening");
    setBrowserError(null);
    readRenderedPage(offerId)
      .then((r) => {
        if (r.ok) {
          setBrowser("done");
          setStatus(null);
        } else {
          setBrowser("failed");
          setBrowserError(r.error);
        }
      })
      .catch((e: unknown) => {
        // the server action itself failed (the function timed out or died): say so instead of spinning
        setBrowser("failed");
        setBrowserError(`The browser read did not finish on the server (${e instanceof Error ? e.message : String(e)}).`);
      });
  }, [offerId, needsBrowser]);

  function read(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await startRewrite({ url, text });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setStatus(null);
      setFormat(null);
      setBrowser("idle");
      setBrowserError(null);
      setOfferId(r.data.offerId);
    });
  }

  function write() {
    if (!offerId || !format) return;
    startTransition(async () => {
      const r = await finishRewrite({ offerId, format, manner: isMannerId(manner) ? manner : "", purpose });
      if (r && !r.ok) toast.error(r.error);
    });
  }

  const card = format ? formatCard(format) : null;

  return (
    <div className="space-y-6">
      <form onSubmit={read} className="rounded-xl border border-line bg-surface p-5">
        <Label htmlFor="url">The page</Label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input id="url" type="url" inputMode="url" placeholder="https://example.com/the-page" value={url} onChange={(e) => setUrl(e.target.value)} disabled={pending || reading} />
          <Button type="submit" disabled={pending || reading || !canRead} className="rounded-full">
            {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} {offerId ? "Read another" : "Read it"}
          </Button>
        </div>
        <div className="mt-3 space-y-1">
          <Label htmlFor="pasted" className="text-ink-muted">Or paste the page&apos;s copy</Label>
          <Textarea id="pasted" rows={4} value={text} onChange={(e) => setText(e.target.value)} disabled={pending || reading} placeholder="For a page the app cannot fetch (an app that draws itself in the browser, a page behind a login): select everything on the page, copy, paste here." className="font-mono text-xs" />
          {pastedWords > 0 && pastedWords < MIN_PAGE_WORDS && <p className="text-xs text-ink-muted">{pastedWords} words so far; a page is at least {MIN_PAGE_WORDS}.</p>}
          {pastedWords >= MIN_PAGE_WORDS && <p className="text-xs text-ink-muted">{pastedWords.toLocaleString()} words pasted. The paste is read instead of the address.</p>}
        </div>
        <p className="mt-3 text-xs text-ink-muted">The page becomes an offer of its own: its facts go into a claims ledger with evidence grades, and its copy becomes the control the new piece has to beat.</p>
      </form>

      {offerId && reading && (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-alt p-4 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{opening ? "The page draws itself in the browser, so it is being opened in one and read, frame by frame. The first read on a server takes up to a minute." : status?.sourceStatus === "done" ? "Page read. Building the brief and the claims ledger from it." : "Reading the page and the pages it links to (pricing, terms, about)."}</span>
        </div>
      )}

      {offerId && failed && status && (
        <div className="rounded-xl border border-line bg-surface p-4 text-sm">
          <div className="font-medium text-ink">{browser === "failed" ? "The page could not be read, even in a browser." : status.tooShort ? `The page gave back only ${status.words} word${status.words === 1 ? "" : "s"}.` : "The page could not be read."}</div>
          <p className="mt-1 text-ink-muted">
            {browserError ?? status.error ?? (status.tooShort ? "The fetch saw none of its copy, and the browser read found no more." : "The reader could not build a brief from what came back.")} Open the page yourself, select everything, copy it, paste it in the box above and read it again.
            {" "}The empty offer it made is <Link href={`/app/offers/${offerId}`} className="underline">here</Link> if you want to delete it.
          </p>
        </div>
      )}

      {offerId && ready && status && (
        <div className="space-y-5 rounded-xl border border-line bg-surface p-5">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-ink"><Check className="h-4 w-4 text-brand" /> Read: {status.title ?? status.url}</div>
            <p className="mt-1 text-xs text-ink-muted">{status.words.toLocaleString()} words{status.readInBrowser ? ", read in a browser" : ""}. {status.excerpt && <span className="italic">&ldquo;{status.excerpt}&hellip;&rdquo;</span>}</p>
            {status.openQuestions > 0 && (
              <p className="mt-2 text-xs text-ink-muted">
                The page leaves {status.openQuestions} thing{status.openQuestions === 1 ? "" : "s"} unsaid (a guarantee, who signs, a deadline). The copy writes from what the page says and never invents those; nothing waits on them. Answer any you want used on <Link href={`/app/offers/${offerId}`} className="underline">the offer page</Link>.
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>What kind of page it is</Label>
              <Select value={format ?? ""} onValueChange={(v) => isFormatId(v) && setFormat(v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pick the page type" /></SelectTrigger>
                <SelectContent>
                  {REWRITE_FORMATS.map((id) => (
                    <SelectItem key={id} value={id}>{formatCard(id).name}{status.guess === id ? " (the app's guess)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {card && <p className="text-xs text-ink-muted">{card.description}</p>}
            </div>
            <div className="space-y-2">
              <Label>Written like</Label>
              <Select value={manner} onValueChange={(v) => (v === "engine" || isMannerId(v)) && setManner(v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="engine">Engine picks{format ? ` (${defaultMannerName(format)})` : ""}</SelectItem>
                  {MANNER_OPTIONS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-ink-muted">{manner === "engine" ? "One master's way in, shape of proof and voice for the whole piece." : MANNER_OPTIONS.find((m) => m.id === manner)?.description ?? ""}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Anything the new page must do differently (optional)</Label>
            <Textarea id="purpose" rows={2} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Sell the annual plan, not the monthly. Keep the guarantee wording." />
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-ink-muted">The copy chief judges the new piece against the page as it is now and says whether it beats it.</p>
            <Button onClick={write} disabled={pending || !format} className="rounded-full shadow-glow">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Rewrite it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
