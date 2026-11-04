/**
 * Reads a page the way a browser does: for a page that draws itself with JavaScript (a claude.ai artifact, a React
 * app), the plain fetch in ingest-source sees only the shell, so the web tier opens it in headless Chromium and reads
 * the text of every frame, the artifact's own frame included. Server only. Guarded like ingest-source: http(s), a
 * public host, no private addresses reached from inside the page, one time budget.
 */
import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import puppeteer, { type Browser } from "puppeteer-core";
import { OUTLINE_SRC } from "./page-outline";

export interface RenderedPage {
  title: string;
  text: string;
  /** the frames that carried copy, largest first */
  frames: { url: string; words: number }[];
}

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
/**
 * The Chromium build the minimal package drives, fetched once per function instance into /tmp (Vercel's documented
 * setup: the binary inside the function would pass its size limit). Its version matches @sparticuz/chromium-min in
 * package.json; bump both together. CHROMIUM_PACK_URL overrides it (a mirror, a newer pack).
 */
const CHROMIUM_PACK = "https://github.com/Sparticuz/chromium/releases/download/v141.0.0/chromium-v141.0.0-pack.x64.tar";
/** A frame with fewer words than this is the app's chrome (a share bar, a sign-in link), not the page. */
const FRAME_MIN_WORDS = 30;
const MAX_CHARS = 400_000;

function privateAddress(ip: string): boolean {
  if (isIP(ip) === 6) return /^(::1$|::$|fc|fd|fe80:|::ffff:(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.))/i.test(ip);
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127);
}

function blockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local") || (isIP(h) > 0 && privateAddress(h));
}

/** The URL is http(s) on a public host; throws with a reason the user can read. */
export async function guardUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("That is not a full address.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("The address has to start with http:// or https://.");
  if (blockedHost(url.hostname)) throw new Error("That address is not a public page.");
  if (!isIP(url.hostname)) {
    const addrs = await lookup(url.hostname, { all: true }).catch(() => []);
    if (!addrs.length) throw new Error("That address does not resolve.");
    if (addrs.some((a) => privateAddress(a.address))) throw new Error("That address is not a public page.");
  }
  return url;
}

async function launch(): Promise<Browser> {
  // outside Vercel (local dev, tests) the Chromium on the machine; on Vercel the serverless build, downloaded and
  // unpacked into /tmp on the instance's first read and reused after
  const local = process.env.CHROMIUM_PATH;
  if (local) return puppeteer.launch({ executablePath: local, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const chromium = (await import("@sparticuz/chromium-min")).default;
  let executablePath: string;
  try {
    executablePath = await chromium.executablePath(process.env.CHROMIUM_PACK_URL || CHROMIUM_PACK);
  } catch (e) {
    throw new Error(`the browser could not be set up on the server (${e instanceof Error ? e.message : String(e)})`);
  }
  return puppeteer.launch({ executablePath, headless: true, args: chromium.args });
}

const words = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

/** The page's copy with its layout kept (see page-outline.ts), every frame read; empty text when the page carried none. */
export async function renderPage(raw: string, budgetMs = 40_000): Promise<RenderedPage> {
  const url = await guardUrl(raw);
  const started = Date.now();
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    await page.setViewport({ width: 1280, height: 900 });
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      try {
        const h = new URL(r.url()).hostname;
        if (blockedHost(h)) return void r.abort();
      } catch {
        return void r.abort();
      }
      void r.continue();
    });
    await page.goto(url.href, { waitUntil: "networkidle2", timeout: Math.max(5_000, budgetMs - 12_000) }).catch(() => undefined);
    // the frame's app boots after the shell: give it a moment, inside the budget
    await new Promise((r) => setTimeout(r, Math.min(4_000, Math.max(0, budgetMs - (Date.now() - started) - 3_000))));
    const title = await page.title().catch(() => "");
    const read = await Promise.all(page.frames().map(async (f) => {
      // the outline keeps where each line sits (headings, buttons, fields, lists); the flat text is the fallback
      // for a page whose styling hides the outline most of it (then the flat read is what a reader sees)
      const outline = await f.evaluate(OUTLINE_SRC).then((v) => (typeof v === "string" ? v : "")).catch(() => "");
      const flat = await f.evaluate(() => (document.body ? document.body.innerText : "")).catch(() => "");
      const text = words(outline) >= words(flat) * 0.6 ? outline : flat;
      return { url: f.url(), text: text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() };
    }));
    const carrying = read.map((r) => ({ ...r, words: words(r.text) })).filter((r) => r.words > 0).sort((a, b) => b.words - a.words);
    const kept = carrying.filter((r, i) => i === 0 || r.words >= FRAME_MIN_WORDS);
    const text = kept.map((r) => r.text).join("\n\n").slice(0, MAX_CHARS);
    return { title: title.trim(), text, frames: kept.map((r) => ({ url: r.url, words: r.words })) };
  } finally {
    await browser.close().catch(() => undefined);
  }
}
