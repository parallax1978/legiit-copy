/**
 * An operator's check that the headless browser read works where the app runs: POST { url } with the shared
 * RENDER_CHECK_SECRET as a bearer token and get back what the browser read (the title, the word count, the frames).
 * Disabled when the secret is not set. Never used by the app itself; the rewrite flow reads pages through its server
 * action. Kept so a change to the browser packages can be proved on the host before a user hits it.
 */
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { renderPage } from "@/lib/render-page";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.RENDER_CHECK_SECRET;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || !given || secret.length !== given.length) return false;
  return timingSafeEqual(Buffer.from(secret), Buffer.from(given));
}

export async function POST(req: Request) {
  if (!process.env.RENDER_CHECK_SECRET) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let url = "";
  try {
    url = String((await req.json())?.url ?? "");
  } catch {
    return NextResponse.json({ error: "a JSON body with a url" }, { status: 400 });
  }
  const started = Date.now();
  try {
    const page = await renderPage(url);
    const words = page.text.trim() ? page.text.trim().split(/\s+/).length : 0;
    return NextResponse.json({ ok: true, ms: Date.now() - started, title: page.title, words, frames: page.frames, sample: page.text.slice(0, 300) });
  } catch (e) {
    return NextResponse.json({ ok: false, ms: Date.now() - started, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) }, { status: 500 });
  }
}
