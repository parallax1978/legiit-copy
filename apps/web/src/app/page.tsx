import Link from "next/link";
import type { ReactNode } from "react";
import { Check, ChevronRight, FileSearch, Gavel, Quote, ShieldCheck, Sparkles, X } from "lucide-react";
import { stripLedger } from "@engine/render.ts";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { facts, piece, review, type HomeBlock } from "./home-copy";

/*
 * Home page. The structure is the Legiit product-site page (legiitkeywords.com, legiitleads.com): dark hero with
 * the product on the right, a check strip, eyebrow-labelled sections alternating white and surface-alt, the
 * questions, a dark band with the same action, the footer. The words come from ./home-copy, which holds the piece
 * Legiit Copy wrote for this page; this file only places them.
 */

const blocks = (id: string): HomeBlock[] => piece.find((s) => s.section_id === id)?.blocks ?? [];
const first = (id: string, type: string): string | undefined => blocks(id).find((b) => b.type === type)?.text;
const clean = (t: string | undefined) => stripLedger(t ?? "");
const SIGN_IN = "/login";

const preheadline = clean(first("headline", "preheadline"));
const headline = clean(first("headline", "headline"));
const deck = clean(first("subhead", "deck"));
const buttonText = clean(first("cta_primary", "button") ?? first("cta_repeat", "button") ?? "Write your first piece");
const ctaLine = clean(first("cta_primary", "cta"));
const repeatLine = clean(first("cta_repeat", "cta"));
const repeatButton = clean(first("cta_repeat", "button") ?? buttonText);

/** Crossheads open a card; the paragraphs and bullets that follow fill it. */
function cards(id: string): { title: string; body: HomeBlock[] }[] {
  const out: { title: string; body: HomeBlock[] }[] = [];
  for (const b of blocks(id)) {
    if (b.type === "crosshead") out.push({ title: clean(b.text), body: [] });
    else if (out.length) out[out.length - 1].body.push(b);
    else out.push({ title: "", body: [b] });
  }
  return out;
}

function Body({ body, className = "" }: { body: HomeBlock[]; className?: string }) {
  return (
    <>
      {body.map((b, i) => {
        if (b.type === "bullets" || b.type === "numbered") {
          const items = b.items?.length ? b.items : b.text.split("\n").filter(Boolean);
          return (
            <ul key={i} className={`mt-3 space-y-2 ${className}`}>
              {items.map((it, j) => (
                <li key={j} className="flex gap-2"><Check className="mt-1 h-3.5 w-3.5 shrink-0 text-good" />{clean(it)}</li>
              ))}
            </ul>
          );
        }
        if (b.type === "guarantee") return <p key={i} className={`mt-3 rounded-lg border border-brand-soft bg-brand-faint px-4 py-3 ${className}`}>{clean(b.text)}</p>;
        if (b.type === "testimonial") return <blockquote key={i} className={`mt-3 border-l-2 border-brand-soft pl-4 italic ${className}`}>{clean(b.text)}{b.meta?.speaker ? <span className="mt-1 block not-italic text-xs text-ink-soft">{b.meta.speaker}</span> : null}</blockquote>;
        if (b.type === "caption") return <p key={i} className={`mt-2 text-xs text-ink-soft ${className}`}>{clean(b.text)}</p>;
        if (b.type === "button" || b.type === "price") return null;
        return <p key={i} className={`mt-3 ${className}`}>{clean(b.text)}</p>;
      })}
    </>
  );
}

const headlineLines = headline.split("\n").map((l) => l.trim()).filter(Boolean);

export default function Landing() {
  const benefits = cards("benefits");
  const objections = cards("objections");
  const demo = cards("demo_offer");
  const proof = blocks("proof_strip");

  return (
    <main className="min-h-screen bg-surface text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" aria-label="Legiit Copy"><Logo /></Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link className="hidden text-ink-muted hover:text-ink sm:inline" href="#how">How It Works</Link>
            <Link className="hidden text-ink-muted hover:text-ink sm:inline" href="#formats">Formats</Link>
            <Link className="hidden text-ink-muted hover:text-ink sm:inline" href="#faq">FAQ</Link>
            <Link className="hidden text-ink-muted hover:text-ink sm:inline" href={SIGN_IN}>Sign In</Link>
            <Button asChild size="sm" className="rounded-full px-3 text-xs shadow-glow"><Link href={SIGN_IN}>{buttonText}</Link></Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-dark overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div className="min-w-0">
            {preheadline && <p className="eyebrow text-brand-soft">{preheadline}</p>}
            <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              {headlineLines.map((line, i) => (
                i === headlineLines.length - 1 && headlineLines.length > 1 ? <span key={i} className="text-gradient block">{line}</span> : <span key={i} className="block">{line}</span>
              ))}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/75">{deck}</p>
            <form className="mt-8 max-w-xl" action={SIGN_IN} method="get">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  name="email"
                  placeholder="you@company.com"
                  aria-label="Your email address"
                  autoComplete="email"
                  className="h-14 min-w-0 appearance-none rounded-full border border-white/15 bg-white/10 px-5 text-[17px] text-white placeholder:text-white/40 outline-none backdrop-blur transition-colors focus:border-brand-soft focus:bg-white/15 sm:h-12 sm:flex-1 sm:text-base"
                />
                <Button type="submit" size="lg" className="h-14 shrink-0 rounded-full shadow-glow sm:h-12">{buttonText} <ChevronRight className="h-4 w-4" /></Button>
              </div>
              <p className="mt-3 max-w-md text-xs leading-relaxed text-white/60">{ctaLine}</p>
            </form>
          </div>

          <div className="relative mx-auto w-full min-w-0 max-w-lg lg:max-w-none" aria-hidden="true">
            <div className="absolute -inset-6 rounded-[2rem] bg-brand/40 blur-3xl" />
            <div className="relative rounded-2xl border border-white/10 bg-white p-5 text-ink shadow-pop sm:p-6">
              <div className="pr-0 sm:pr-28">
                <p className="eyebrow text-brand">The review</p>
                <p className="mt-1 text-base font-bold tracking-tight">This page, before anyone saw it</p>
              </div>
              <ol className="mt-4 divide-y divide-line rounded-xl border border-line">
                <ReviewRow n={1} label="Cold read" sub="a second model, no brief" chips={[[review.coldRead, "good"]]} />
                <ReviewRow n={2} label="Copy chief" sub={`${review.gatesPassed} gates, in order`} chips={[[review.verdict, "good"]]} />
                <ReviewRow n={3} label="Facts" sub={review.claims ? `${review.claims} claims checked against the ledger` : "every claim checked against the ledger"} chips={[[review.flags ? `${review.flags} for you to decide` : "nothing invented", review.flags ? "warn" : "good"]]} />
              </ol>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-ink-muted">{review.tellsPer300 === 0 ? "0 machine tells per 300 words" : `${review.tellsPer300} machine tells per 300 words`}{review.words ? ` · ${review.words.toLocaleString()} words` : ""}</p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-glow"><Sparkles className="h-3 w-3" /> Show evidence</span>
              </div>
            </div>
            <div className="absolute -right-3 -top-5 hidden rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-pop sm:block">
              <p className="flex items-center gap-1.5 font-semibold text-ink"><Gavel className="h-3.5 w-3.5 text-brand" /> Argument chosen first</p>
              <p className="mt-0.5 text-ink-muted">{review.argument || "before a word was written"}</p>
            </div>
            <div className="absolute -bottom-9 -left-5 hidden rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-pop sm:block">
              <p className="flex items-center gap-1.5 font-semibold text-ink"><ShieldCheck className="h-3.5 w-3.5 text-good" /> Headline written last</p>
              <p className="mt-0.5 text-ink-muted">{review.lead || "offer first, three leads, then the headline"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Check strip */}
      <div className="border-b border-line bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-ink">
            {["Every number has a source", "The argument is chosen before the prose", "Reviewed by a copy chief before you see it", "23 direct response formats"].map((t) => (
              <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-brand" />{t}</li>
            ))}
          </ul>
          <p className="mt-2 text-center text-xs text-ink-muted">From the team behind Legiit</p>
        </div>
      </div>

      {/* What you get */}
      <Section eyebrow="This is what you get" title="A piece that was argued, written and reviewed" lead="This page is the sample: Legiit Copy wrote it from its own saved offer. The copy is on the left, with the ledger tags the public page hides; the review the copy chief gave it is on the right.">
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <Chrome crumb="Legiit Copy · Home page · Draft">
            <p className="eyebrow text-brand">The piece</p>
            {preheadline && <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{preheadline}</p>}
            <p className="mt-1 text-lg font-bold leading-snug tracking-tight">{headline.replace("\n", " ")}</p>
            <p className="mt-2 text-sm text-ink-muted"><Tagged text={first("subhead", "deck") ?? ""} /></p>
            {benefits[0] && (
              <div className="mt-4 rounded-lg border border-line bg-surface-alt p-3">
                <p className="text-sm font-semibold">{benefits[0].title}</p>
                {benefits[0].body.slice(0, 1).map((b, i) => <p key={i} className="mt-1 text-sm text-ink-muted"><Tagged text={b.text} /></p>)}
              </div>
            )}
            <p className="mt-3 text-xs text-ink-soft">Each tag is a ledger row: the fact, its source, its grade.</p>
          </Chrome>
          <Chrome crumb="Legiit Copy · Home page · Review">
            <p className="eyebrow text-brand">The copy chief</p>
            <p className="mt-2 flex items-center gap-2 text-lg font-bold tracking-tight">{review.verdict} <Chip tone="good">{review.coldRead}</Chip></p>
            <dl className="mt-3 divide-y divide-line text-sm">
              <Row k="Gates" v={`${review.gatesPassed} passed, in order; it stops at the first failure`} />
              <Row k="Tells" v={`${review.tellsPer300} per 300 words`} />
              <Row k="Facts" v={review.flags ? `${review.flags} flagged, each with the line, the rule and a rewrite` : "every claim on the ledger, nothing invented"} />
              {review.argument && <Row k="Argument" v={review.argument} />}
            </dl>
            <p className="mt-3 text-xs text-ink-soft">What is left for you is what only you can decide.</p>
          </Chrome>
        </div>
        <CtaCentre />
      </Section>

      {/* Why it matters */}
      <Section alt eyebrow="Why it matters" title="An AI writer leaves the argument to you." lead="It writes whatever it is told, invents what it does not know, and reads like what it is. The expensive part of copy, deciding what to argue and proving it, is still yours.">
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-ink">A prompt gives you</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted">
              {["Whatever angle it landed on first", "Testimonials and numbers it made up", "\"Unlock\", \"Discover\", \"Elevate\" and the bold-label bullets", "A draft nobody reviewed", "Claims you find out about from a lawyer"].map((t) => (
                <li key={t} className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" />{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-brand">Legiit Copy gives you</p>
            <ul className="mt-3 space-y-2 text-sm text-ink">
              {benefits.map((b) => (
                <li key={b.title} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-good" />{b.title}</li>
              ))}
              {benefits.length < 4 && <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-good" />The line, the rule and a rewrite for every risky claim; you decide</li>}
            </ul>
          </div>
        </div>
        <div className="mt-10 grid gap-6 border-t border-line pt-8 md:grid-cols-3">
          {benefits.slice(0, 3).map((b) => (
            <div key={b.title}>
              <p className="text-sm font-semibold">{b.title}</p>
              <div className="text-sm text-ink-muted"><Body body={b.body} /></div>
            </div>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section id="how" eyebrow="How it works" title="Three steps, and the writing is the last one">
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Step n={1} title="Save the offer" body="Paste the pages, upload what you have, answer what only you know. It reads everything into a brief and a claims ledger: every fact, its source, its grade." note="One pass" />
          <Step n={2} title="It argues before it writes" body="Research in your customers' own words, twenty candidate arguments scored and gated in order. One wins and is chosen before any prose." note="The expensive part, done first" />
          <Step n={3} title="Reviewed like a copy chief" body="Cold read on a second model, gates that stop at the first failure, a tell detector, a factual review. The drafter fixes the notes itself, up to three rounds." note="Before you see it" />
        </div>
        <div className="mt-4 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          <span className="font-semibold">What the review does, step by step</span> <span className="text-ink-muted">cold read · copy chief · tell detector · factual review · revision, then it ships to you</span>
        </div>
        <CtaCentre />
      </Section>

      {/* Inside the piece */}
      <Section alt eyebrow="Inside the piece" title="Proof beside every claim">
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <Chrome crumb="Legiit Copy · Home page · Show evidence">
            {benefits.slice(0, 3).map((b) => (
              <div key={b.title} className="border-b border-line py-3 last:border-0">
                <p className="text-sm font-semibold">{b.title}</p>
                {b.body.slice(0, 1).map((blk, i) => <p key={i} className="mt-1 text-sm text-ink-muted"><Tagged text={blk.text} /></p>)}
              </div>
            ))}
          </Chrome>
          <div className="space-y-4">
            {proof.length > 0 && (
              <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
                <p className="flex items-center gap-2 text-sm font-semibold"><Quote className="h-4 w-4 text-brand" /> Who is behind it</p>
                <div className="text-sm text-ink-muted"><Body body={proof} /></div>
              </div>
            )}
            {demo.map((d) => (
              <div key={d.title} className="rounded-xl border border-line bg-surface p-5 shadow-card">
                <p className="text-sm font-semibold">{d.title}</p>
                <div className="text-sm text-ink-muted"><Body body={d.body} /></div>
              </div>
            ))}
            <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
              <p className="flex items-center gap-2 text-sm font-semibold"><FileSearch className="h-4 w-4 text-brand" /> Nothing is invented</p>
              <p className="mt-2 text-sm text-ink-muted">It never generates a testimonial, a narrator, a study or a statistic. A fact the sources do not settle becomes a question for you, not a line in the copy.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Formats */}
      <Section id="formats" eyebrow="Formats" title="Every format direct response runs on" lead="Each has its own spec: the sections, the word band, the order it is drafted in and the gates the copy chief checks.">
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {FORMAT_FAMILIES.map((f) => (
            <div key={f.name} className="rounded-xl border border-line bg-surface p-4 shadow-card">
              <p className="text-sm font-semibold">{f.name}</p>
              <ul className="mt-2 space-y-1 text-xs text-ink-muted">{f.items.map((i) => <li key={i}>{i}</li>)}</ul>
            </div>
          ))}
        </div>
      </Section>

      {/* Questions */}
      <Section id="faq" alt eyebrow="Questions" title="Before you start">
        <div className="mt-8 divide-y divide-line rounded-xl border border-line bg-surface">
          {[...objections.map((o) => ({ q: o.title, a: o.body })), ...facts.map((f) => ({ q: f.q, a: [{ type: "paragraph", text: f.a }] as HomeBlock[] }))].map(({ q, a }) => (
            <div key={q} className="grid gap-2 px-5 py-4 md:grid-cols-[1fr_2fr] md:gap-8">
              <p className="text-sm font-semibold">{q}</p>
              <div className="text-sm text-ink-muted [&>p]:mt-0 [&>p+p]:mt-2"><Body body={a} /></div>
            </div>
          ))}
        </div>
      </Section>

      {/* Band */}
      <section className="hero-dark">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{repeatLine || "Save one offer and read what it argues."}</h2>
          <p className="mt-3 text-white/70">{ctaLine}</p>
          <Button asChild size="lg" className="mt-7 h-12 rounded-full px-6 text-base shadow-glow"><Link href={SIGN_IN}>{repeatButton} <ChevronRight className="h-4 w-4" /></Link></Button>
          <p className="mt-4 text-xs text-white/60">No password. Nothing is charged.</p>
          <p className="mt-6 text-xs text-white/60">Already have an account? <Link href={SIGN_IN} className="underline hover:text-white">Sign in</Link></p>
        </div>
      </section>

      <footer className="bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
            <p className="flex items-center gap-2 text-sm"><Logo /> <span className="text-ink-muted">· A Legiit product</span></p>
            <nav className="flex flex-wrap gap-4 text-sm text-ink-muted">
              <Link className="hover:text-ink" href="#how">How It Works</Link>
              <Link className="hover:text-ink" href="#formats">Formats</Link>
              <Link className="hover:text-ink" href="#faq">FAQ</Link>
              <Link className="hover:text-ink" href="https://legiit.com">Legiit</Link>
              <Link className="hover:text-ink" href={SIGN_IN}>Sign In</Link>
            </nav>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-4 text-xs text-ink-muted">
            <Link className="hover:text-ink" href="/privacy">Privacy Policy</Link>
            <Link className="hover:text-ink" href="/terms">Terms</Link>
          </div>
          <p className="mt-3 text-xs text-ink-soft">© {new Date().getFullYear()} Superstar SEO LLC. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}

const FORMAT_FAMILIES = [
  { name: "Pages", items: ["Long-form sales letter", "Short landing page", "Opt-in page", "Upsell / one-time offer", "Order bump", "Order form and checkout", "Thank-you page", "B2B pricing page", "Advertorial", "Product description"] },
  { name: "Email and messages", items: ["Promotional email", "Email sequence", "Cold email", "SMS"] },
  { name: "Video and audio", items: ["Long video sales letter", "Short video sales letter", "Webinar package", "Podcast and audio read"] },
  { name: "Ads", items: ["Meta and Instagram ad", "YouTube ad script", "TikTok and Reels script", "Google responsive search ad"] },
  { name: "Social", items: ["Organic social post"] },
];

function Section({ id, alt, eyebrow, title, lead, children }: { id?: string; alt?: boolean; eyebrow: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section id={id} className={alt ? "bg-surface-alt" : "bg-surface"}>
      <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
        <p className="eyebrow text-brand">{eyebrow}</p>
        <h2 className="mt-2 text-[30px] font-bold leading-tight tracking-tight text-ink">{title}</h2>
        {lead && <p className="mt-3 max-w-2xl text-ink-muted">{lead}</p>}
        {children}
      </div>
    </section>
  );
}

function CtaCentre() {
  return (
    <div className="mt-10 flex flex-col items-center">
      <Button asChild size="lg" className="h-12 rounded-full px-6 text-base shadow-glow"><Link href={SIGN_IN}>{buttonText} <ChevronRight className="h-4 w-4" /></Link></Button>
      <p className="mt-3 max-w-md text-center text-xs text-ink-muted">{ctaLine}</p>
    </div>
  );
}

function Step({ n, title, body, note }: { n: number; title: string; body: string; note: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-alt p-5">
      <p className="flex items-center gap-2 text-sm font-semibold"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{n}</span>{title}</p>
      <p className="mt-3 text-sm text-ink-muted">{body}</p>
      <p className="mt-3 text-xs font-semibold text-brand">{note}</p>
    </div>
  );
}

function Chrome({ crumb, children }: { crumb: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className="flex items-center gap-2 border-b border-line bg-surface-alt px-3 py-2">
        <span className="flex gap-1" aria-hidden="true"><i className="h-2 w-2 rounded-full bg-line-strong" /><i className="h-2 w-2 rounded-full bg-line-strong" /><i className="h-2 w-2 rounded-full bg-line-strong" /></span>
        <span className="rounded-md border border-line bg-surface px-2 py-0.5 text-[11px] text-ink-muted">{crumb}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ReviewRow({ n, label, sub, chips }: { n: number; label: string; sub: string; chips: [string, "good" | "warn"][] }) {
  return (
    <li className="flex items-center gap-3 px-3 py-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-faint text-xs font-bold text-brand-strong">{n}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-ink-muted">{sub}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">{chips.map(([t, tone]) => <Chip key={t} tone={tone}>{t}</Chip>)}</div>
    </li>
  );
}

function Chip({ tone, children }: { tone: "good" | "warn"; children: ReactNode }) {
  const cls = tone === "good" ? "bg-good-soft text-good ring-good-soft" : "bg-warn-soft text-warn ring-warn-soft";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${tone === "good" ? "bg-good" : "bg-warn"}`} />{children}</span>;
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[72px_1fr] gap-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{k}</dt>
      <dd className="text-ink">{v}</dd>
    </div>
  );
}

/** Text with its ledger tags shown as the evidence marks the app uses. */
function Tagged({ text }: { text: string }) {
  const parts = text.split(/(\[\[L:[^\]]+\]\])/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = /^\[\[L:([^\]]+)\]\]$/.exec(p);
        if (!m) return <span key={i}>{p}</span>;
        return <sup key={i} className="ml-0.5 rounded bg-brand-faint px-1 text-[9px] font-semibold text-brand-strong">L:{m[1].slice(0, 4)}</sup>;
      })}
    </>
  );
}

