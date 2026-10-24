import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <main className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/"><Logo /></Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link className="hidden text-ink-muted hover:text-ink sm:inline" href="#how">How it works</Link>
            <Link className="hidden text-ink-muted hover:text-ink sm:inline" href="#formats">Formats</Link>
            <Link className="hidden text-ink-muted hover:text-ink sm:inline" href="/login">Sign in</Link>
            <Button asChild size="sm" className="rounded-full px-3 shadow-glow"><Link href="/login">Write your first piece</Link></Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-16 pt-20">
        <p className="text-sm font-semibold text-brand">Direct response copy, argued from your evidence</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Copy that picks the argument before it writes a word.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-muted">
          Legiit Copy reads your offer, researches the market in your customers&apos; own words, chooses the one promise the evidence can carry, and writes the sales page, the emails, the webinar, the ads. Every number is tied to a source. Every claim that could get you in trouble is flagged for you to decide, never quietly softened.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild size="lg" className="rounded-full shadow-glow"><Link href="/login">Start with one offer <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          <span className="text-sm text-ink-soft">Sign in with a magic link. No password.</span>
        </div>
      </section>

      <section id="how" className="border-t border-line bg-surface-alt">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-16 md:grid-cols-3">
          {[
            ["1. Save the offer", "Paste a URL or upload what you have. Legiit Copy extracts the brief and builds a claims ledger: every fact, its evidence, its grade."],
            ["2. It argues before it writes", "Research in customer verbatims, the offer sharpened, twenty candidate arguments scored and gated. One wins. Two losers are kept for the body."],
            ["3. Reviewed like a copy chief", "A cold read on a second model, gates that stop at the first fatal defect, a tell detector, and a factual review that shows you the line, the rule and a rewrite."],
          ].map(([h, p]) => (
            <div key={h} className="rounded-card border border-line bg-surface p-6 shadow-card">
              <h3 className="font-bold text-ink">{h}</h3>
              <p className="mt-2 text-sm text-ink-muted">{p}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="formats" className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-2xl font-bold tracking-tight text-ink">Every format direct response runs on</h2>
        <p className="mt-2 max-w-2xl text-ink-muted">Long-form sales letters, short landing pages, opt-in pages, upsells and order bumps, order forms, promotional emails and full sequences, webinar packages, long and short VSLs, Meta and YouTube ads, TikTok scripts, Google RSAs, advertorials, organic social, product descriptions, SMS, cold email, pricing pages, podcast reads.</p>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-xs text-ink-soft">
          <span>A Legiit product.</span>
          <span className="flex gap-4"><Link href="/terms" className="hover:text-ink">Terms</Link><Link href="/privacy" className="hover:text-ink">Privacy</Link></span>
        </div>
      </footer>
    </main>
  );
}
