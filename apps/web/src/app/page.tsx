import Link from "next/link";
import type { ReactNode } from "react";
import { Check, ChevronRight, FileSearch, Gavel, Quote, Sparkles } from "lucide-react";
import { readerText } from "@engine/draft/ledger.ts";
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
const clean = (t: string | undefined) => readerText(t ?? "");
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
  return out.filter((c) => c.title);
}

/** Blocks of a section before its first crosshead: the opening the writer put ahead of the cards. */
function intro(id: string): HomeBlock[] {
  const out: HomeBlock[] = [];
  for (const b of blocks(id)) {
    if (b.type === "crosshead") break;
    out.push(b);
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

const headlineLines = (() => {
  const lines = headline.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1) return lines;
  const m = /^(.+?[.!?])\s+(.+)$/.exec(headline.trim());
  return m ? [m[1], m[2]] : lines;
})();

export default function Landing() {
  const benefits = cards("benefits");
  const opening = intro("benefits");
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

          <HeroVisual />
        </div>
      </section>

      {/* Check strip */}
      <div className="border-b border-line bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-ink">
            {["Sales pages, emails and ads for your offer", "Written from what your buyers say", "Every claim tied to its source", "Free during early access"].map((t) => (
              <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-brand" />{t}</li>
            ))}
          </ul>
          <p className="mt-2 text-center text-xs text-ink-muted">From the team behind Legiit</p>
        </div>
      </div>

      {/* What you get */}
      <Section eyebrow="This is what you get" title="This page is the sample" lead="Legiit Copy wrote the words on this page from its own saved offer. The draft is on the left, with the evidence tags the public page hides; what sits beside it in the app is on the right.">
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <Chrome crumb="Legiit Copy · Home page · Draft">
            <p className="eyebrow text-brand">The piece</p>
            {preheadline && <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{preheadline}</p>}
            <p className="mt-1 text-lg font-bold leading-snug tracking-tight">{headline.replace("\n", " ")}</p>
            <p className="mt-2 text-sm text-ink-muted"><Tagged text={first("subhead", "deck") ?? ""} /></p>
            {(opening[0] ?? benefits[0]?.body[0]) && (
              <div className="mt-4 rounded-lg border border-line bg-surface-alt p-3">
                {!opening[0] && benefits[0] && <p className="text-sm font-semibold">{benefits[0].title}</p>}
                <p className="mt-1 text-sm text-ink-muted"><Tagged text={(opening[0] ?? benefits[0].body[0]).text} /></p>
              </div>
            )}
            <p className="mt-3 text-xs text-ink-soft">Each tag opens the fact behind the line and where it came from.</p>
          </Chrome>
          <Chrome crumb="Legiit Copy · Home page · Beside the draft">
            <p className="eyebrow text-brand">Beside the draft</p>
            <dl className="mt-3 divide-y divide-line text-sm">
              {review.argument && <Row k="Argument" v={`${review.argument} (chosen before a word was written)`} />}
              {review.quotes > 0 && <Row k="Research" v={`${review.quotes} quotes from the market, each with its source`} />}
              <Row k="Evidence" v="every number, name and quote tied to where it came from" />
              <Row k="Angle" v="Try another angle picks a different argument and writes it again" />
            </dl>
          </Chrome>
        </div>
        <CtaCentre />
      </Section>

      {/* How it works: the piece's own benefits */}
      <Section id="how" alt eyebrow="How it works" title={opening[0] ? clean(opening[0].text) : "How it works"}>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {benefits.map((b) => (
            <div key={b.title} className="rounded-xl border border-line bg-surface p-5 shadow-card">
              <p className="font-semibold">{b.title}</p>
              <div className="text-sm text-ink-muted"><Body body={b.body} /></div>
            </div>
          ))}
        </div>
        <CtaCentre />
      </Section>

      {/* Who is behind it */}
      {(proof.length > 0 || demo.length > 0) && (
        <Section eyebrow="Who is behind it" title="From the team behind Legiit">
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {proof.length > 0 && (
              <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
                <p className="flex items-center gap-2 text-sm font-semibold"><Quote className="h-4 w-4 text-brand" /> Chris M. Walker, founder of Legiit</p>
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
              <p className="mt-2 text-sm text-ink-muted">It never makes up a testimonial, a customer, a study or a statistic. A fact your sources do not settle becomes a question for you, not a line in the copy.</p>
            </div>
          </div>
        </Section>
      )}

      {/* Formats */}
      <Section id="formats" eyebrow="Formats" title="Every format direct response runs on" lead="Pick the piece. Each one has its own sections, length and job.">
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
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{headlineLines.join(" ")}</h2>
          <p className="mt-3 text-white/70">{repeatLine || ctaLine}</p>
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

/**
 * The product in the hero, drawn in HTML like the sister sites' mockups: the draft sheet behind, what sits beside
 * it in the app in front (the research it was written from, the argument, the evidence), and two chips. Everything
 * on it is this page's own run.
 */
function HeroVisual() {
  const deckBlock = first("subhead", "deck") ?? "";
  return (
    <div className="relative mx-auto w-full min-w-0 max-w-lg lg:max-w-none" aria-hidden="true">
      <div className="absolute -inset-8 rounded-[2.5rem] bg-brand/40 blur-3xl" />

      {/* the draft sheet, behind */}
      <div className="absolute -left-3 top-2 hidden w-[60%] -rotate-3 rounded-xl border border-line bg-white p-4 text-ink shadow-pop md:block">
        <p className="eyebrow text-brand">The piece</p>
        {preheadline && <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{preheadline}</p>}
        <p className="mt-1 line-clamp-2 text-[13px] font-bold leading-snug tracking-tight">{headline.replace("\n", " ")}</p>
        <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-ink-muted"><Tagged text={deckBlock} /></p>
        <div className="mt-3 space-y-1.5">
          <div className="h-1.5 w-11/12 rounded-full bg-surface-sunken" />
          <div className="h-1.5 w-full rounded-full bg-surface-sunken" />
          <div className="flex items-center gap-1.5"><div className="h-1.5 w-7/12 rounded-full bg-surface-sunken" /><span className="rounded bg-brand-faint px-1 text-[9px] font-semibold text-brand-strong">L:816b</span></div>
          <div className="h-1.5 w-10/12 rounded-full bg-surface-sunken" />
          <div className="flex items-center gap-1.5"><div className="h-1.5 w-5/12 rounded-full bg-surface-sunken" /><span className="rounded bg-brand-faint px-1 text-[9px] font-semibold text-brand-strong">L:d8c4</span></div>
        </div>
        <span className="mt-3 inline-flex items-center rounded-full bg-brand px-2.5 py-1 text-[10px] font-semibold text-white">{buttonText}</span>
      </div>

      {/* beside the draft, in front */}
      <div className="relative rounded-2xl border border-white/10 bg-white p-5 text-ink shadow-pop md:ml-[26%] md:mt-16 sm:p-6">
        <p className="eyebrow text-brand">Beside the draft</p>
        <p className="mt-1 text-base font-bold tracking-tight">What this page is built on</p>
        <div className="mt-4 flex items-center gap-5">
          <div className="relative h-22 w-22 shrink-0">
            <svg viewBox="0 0 36 36" className="h-22 w-22 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--surface-sunken)" strokeWidth="3.2" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--brand)" strokeWidth="3.2" strokeLinecap="round" pathLength={100} strokeDasharray="100 100" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold leading-none tracking-tight">{review.quotes}</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">quotes</span>
            </div>
          </div>
          <ol className="min-w-0 flex-1 divide-y divide-line">
            <MiniRow label="Research" sub="what buyers want, in their words" chip={`${review.sources} sources`} tone="good" />
            <MiniRow label="Argument" sub="chosen before a word was written" chip="Chosen first" tone="good" />
            <MiniRow label="Evidence" sub="every claim tied to its source" chip="Nothing invented" tone="good" />
          </ol>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-xs text-ink-muted">Sales page · emails · ads</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-glow"><Sparkles className="h-3 w-3" /> Show evidence</span>
        </div>
      </div>

      {/* chips */}
      <div className="absolute -right-3 -top-4 hidden items-center gap-2 rounded-xl border border-line bg-white py-2 pl-2 pr-3 text-xs shadow-pop sm:flex">
        <span className="brand-gradient flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white">CW</span>
        <span><span className="block font-semibold text-ink">Chris M. Walker</span><span className="text-ink-muted">Founder, Legiit</span></span>
      </div>
      <div className="absolute -bottom-9 right-10 hidden rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-pop sm:block">
        <p className="flex items-center gap-1.5 font-semibold text-ink"><Gavel className="h-3.5 w-3.5 text-brand" /> Argument chosen first</p>
        <p className="mt-0.5 text-ink-muted">{review.argument || "before a word was written"}</p>
      </div>
    </div>
  );
}

function MiniRow({ label, sub, chip, tone }: { label: string; sub: string; chip: string; tone: "good" | "warn" }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight">{label}</p>
        <p className="truncate text-[11px] text-ink-muted">{sub}</p>
      </div>
      <Chip tone={tone}>{chip}</Chip>
    </li>
  );
}

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

function Chip({ tone, children }: { tone: "good" | "warn"; children: ReactNode }) {
  const cls = tone === "good" ? "bg-good-soft text-good ring-good-soft" : "bg-warn-soft text-warn ring-warn-soft";
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${tone === "good" ? "bg-good" : "bg-warn"}`} />{children}</span>;
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

