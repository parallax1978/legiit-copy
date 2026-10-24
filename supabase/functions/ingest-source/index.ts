/**
 * ingest-source: turns an offer source (url | file | text) into extracted_text.
 *   POST { source_id, run_extraction?: boolean }
 *   → { source_id, offer_id, extraction_status: "done" | "failed", chars, title, error?, extraction_started? } (202 when intake was started in the background)
 * The caller must be an editor of the source's workspace (checked under RLS before the service client is used).
 * URL fetches are guarded: http(s) only, public hosts only (literal and resolved; an unresolvable host is refused),
 * ≤ 3 redirects each re-checked, 10s timeout, 5 MB cap. File sources are downloaded only from the source's own
 * <workspace_id>/<offer_id>/ folder, so a crafted storage_path cannot reach another workspace's objects.
 * Fetched and uploaded text is untrusted data; it is stored verbatim and handed to the intake prompt as a document.
 */
import { z } from "zod";
import { extractText } from "unpdf";
import mammoth from "mammoth";
import { HttpError, json, requireUser, serviceClient } from "shared/supabase.ts";
import { assertEditor, background, errorMessage, normalizeWhitespace, parseBody, runIntake, serve } from "shared/http.ts";

const Body = z.object({ source_id: z.uuid(), run_extraction: z.boolean().optional().default(false) });

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_CHARS = 400_000;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

serve(async (req) => {
  const { client } = await requireUser(req);
  const body = await parseBody(req, Body);

  const { data: src, error } = await client.from("offer_sources").select("*").eq("id", body.source_id).maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!src) throw new HttpError(404, "source not found");
  await assertEditor(client, src.workspace_id);

  const db = serviceClient();
  await db.from("offer_sources").update({ extraction_status: "processing", error: null }).eq("id", src.id);

  let text = "";
  let title: string | null = src.title;
  let mime: string | null = src.mime_type;
  try {
    if (src.kind === "url") {
      if (!src.url) throw new Error("url source has no url");
      const r = await fetchUrlAsText(src.url);
      text = r.text;
      title = title ?? r.title;
      mime = r.mime;
    } else if (src.kind === "file") {
      if (!src.storage_path) throw new Error("file source has no storage_path");
      if (!storagePathBelongsTo(src.storage_path, src.workspace_id, src.offer_id)) throw new Error("storage_path is outside the offer's folder");
      const { data: blob, error: dlErr } = await db.storage.from("offer-sources").download(src.storage_path);
      if (dlErr || !blob) throw new Error(`download failed: ${dlErr?.message ?? "no data"}`);
      if (blob.size > MAX_BYTES) throw new Error(`file exceeds ${MAX_BYTES / 1024 / 1024} MB`);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const r = await bytesToText(bytes, mime ?? blob.type ?? null, src.storage_path);
      text = r.text;
      mime = r.mime;
      title = title ?? src.storage_path.split("/").pop() ?? null;
    } else {
      text = src.extracted_text ?? "";
      if (!text.trim()) throw new Error("text source is empty");
    }

    text = normalizeWhitespace(text).slice(0, MAX_CHARS);
    if (!text) throw new Error("no text could be extracted");

    const { error: upErr } = await db
      .from("offer_sources")
      .update({ extracted_text: text, extraction_status: "done", error: null, title, mime_type: mime })
      .eq("id", src.id);
    if (upErr) throw new Error(`offer_sources update failed: ${upErr.message}`);
  } catch (e) {
    const msg = errorMessage(e).slice(0, 1000);
    await db.from("offer_sources").update({ extraction_status: "failed", error: msg }).eq("id", src.id);
    return json({ source_id: src.id, offer_id: src.offer_id, extraction_status: "failed", chars: 0, title, error: msg });
  }

  const out: Record<string, unknown> = { source_id: src.id, offer_id: src.offer_id, extraction_status: "done", chars: text.length, title };
  if (body.run_extraction) {
    // The intake model call takes minutes; it runs after the response. runIntake moves the offer off 'extracting'
    // itself on success or failure, and the offer page watches offers.status.
    background(runIntake(db, src.offer_id).catch((e) => console.error("intake failed", errorMessage(e).slice(0, 500))));
    out.extraction_started = true;
  }
  return json(out, body.run_extraction ? 202 : 200);
});

/** Objects live at <workspace_id>/<offer_id>/<file>. Anything else (another folder, "..", encoded or nested segments) is refused before the service client downloads it. */
export function storagePathBelongsTo(path: string, workspaceId: string, offerId: string): boolean {
  const parts = path.split("/");
  return parts.length === 3 && parts[0] === workspaceId && parts[1] === offerId && /^[A-Za-z0-9][A-Za-z0-9._-]{0,200}$/.test(parts[2]);
}

// ---------- bytes → text ----------

async function bytesToText(bytes: Uint8Array, mime: string | null, name: string): Promise<{ text: string; mime: string }> {
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  const m = (mime ?? "").toLowerCase().split(";")[0].trim();
  const isPdf = m === "application/pdf" || ext === "pdf" || startsWith(bytes, [0x25, 0x50, 0x44, 0x46]); // %PDF
  const isDocx = m === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || ext === "docx" ||
    (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) && ext !== "zip"); // PK..
  if (isPdf) return { text: await pdfToText(bytes), mime: "application/pdf" };
  if (isDocx) return { text: await docxToText(bytes), mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
  const decoded = decode(bytes, charsetOf(mime));
  if (m === "text/html" || ext === "html" || ext === "htm" || looksLikeHtml(decoded)) return { text: htmlToText(decoded), mime: "text/html" };
  if (ext === "md" || m === "text/markdown") return { text: decoded, mime: "text/markdown" };
  return { text: decoded, mime: m || "text/plain" };
}

async function pdfToText(bytes: Uint8Array): Promise<string> {
  const { text } = await extractText(bytes, { mergePages: true });
  return text;
}

async function docxToText(bytes: Uint8Array): Promise<string> {
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const r = await mammoth.extractRawText({ arrayBuffer: ab });
  return r.value;
}

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  return magic.every((b, i) => bytes[i] === b);
}

function decode(bytes: Uint8Array, charset: string | null): string {
  if (charset) {
    try {
      return new TextDecoder(charset, { fatal: false }).decode(bytes);
    } catch {
      /* unknown label; fall through to utf-8 */
    }
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function charsetOf(contentType: string | null): string | null {
  const m = /charset=([^;\s]+)/i.exec(contentType ?? "");
  return m ? m[1].replace(/^["']|["']$/g, "").toLowerCase() : null;
}

function looksLikeHtml(s: string): boolean {
  return /<(?:!doctype\s+html|html|body|head|div|p|article|section)[\s>]/i.test(s.slice(0, 5000));
}

// ---------- HTML → text ----------

export function htmlToText(html: string): string {
  let h = html;
  h = h.replace(/<!--[\s\S]*?-->/g, " ");
  h = h.replace(/<(script|style|noscript|template|svg|canvas|iframe|object|head)\b[\s\S]*?<\/\1\s*>/gi, " ");
  h = h.replace(/<(nav|footer|aside|form)\b[\s\S]*?<\/\1\s*>/gi, " ");
  h = h.replace(/<br\s*\/?>/gi, "\n");
  h = h.replace(/<\/?(li)\b[^>]*>/gi, (t) => (t.startsWith("</") ? "\n" : "\n- "));
  h = h.replace(/<\/(p|div|h[1-6]|tr|blockquote|section|article|header|ul|ol|table|pre|figure|figcaption|dd|dt)\s*>/gi, "\n\n");
  h = h.replace(/<(h[1-6]|p|div|tr|blockquote|section|article|pre)\b[^>]*>/gi, "\n");
  h = h.replace(/<\/(td|th)\s*>/gi, "\t");
  h = h.replace(/<\/?(?:a|abbr|b|bdi|bdo|cite|code|data|del|dfn|em|font|i|ins|kbd|label|mark|q|s|samp|small|span|strike|strong|sub|sup|time|tt|u|var|wbr)\b[^>]*>/gi, ""); // inline: no space
  h = h.replace(/<[^>]+>/g, " ");
  h = decodeEntities(h);
  return normalizeWhitespace(h);
}

export function titleOf(html: string): string | null {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!m) return null;
  const t = normalizeWhitespace(decodeEntities(m[1]));
  return t ? t.slice(0, 200) : null;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  copy: "©",
  reg: "®",
  trade: "™",
  bull: "•",
  middot: "·",
  laquo: "«",
  raquo: "»",
  deg: "°",
  times: "×",
  euro: "€",
  pound: "£",
  cent: "¢",
  shy: "",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return whole;
      try {
        return String.fromCodePoint(code);
      } catch {
        return whole;
      }
    }
    const v = NAMED_ENTITIES[body.toLowerCase()];
    return v === undefined ? whole : v;
  });
}

// ---------- guarded URL fetch ----------

async function fetchUrlAsText(input: string): Promise<{ text: string; title: string | null; mime: string }> {
  let url = parseHttpUrl(input);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LegiitCopy/1.0; offer source ingest)",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,application/pdf;q=0.8,*/*;q=0.5",
        "Accept-Language": "en",
      },
    });
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      await res.body?.cancel().catch(() => {});
      if (!loc) throw new Error(`redirect without location (HTTP ${res.status})`);
      url = parseHttpUrl(new URL(loc, url).toString());
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel().catch(() => {});
      throw new Error(`fetch failed: HTTP ${res.status}`);
    }
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) {
      await res.body?.cancel().catch(() => {});
      throw new Error(`page exceeds ${MAX_BYTES / 1024 / 1024} MB`);
    }
    const bytes = await readCapped(res, MAX_BYTES);
    const ctype = res.headers.get("content-type") ?? "";
    const m = ctype.toLowerCase().split(";")[0].trim();
    if (m === "application/pdf" || startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return { text: await pdfToText(bytes), title: null, mime: "application/pdf" };
    if (m === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return { text: await docxToText(bytes), title: null, mime: m };
    const decoded = decode(bytes, charsetOf(ctype));
    if (m.includes("html") || m === "application/xhtml+xml" || looksLikeHtml(decoded)) return { text: htmlToText(decoded), title: titleOf(decoded), mime: "text/html" };
    return { text: decoded, title: null, mime: m || "text/plain" };
  }
  throw new Error(`more than ${MAX_REDIRECTS} redirects`);
}

function parseHttpUrl(s: string): URL {
  let u: URL;
  try {
    u = new URL(s.trim());
  } catch {
    throw new Error("invalid url");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("only http(s) urls are fetched");
  if (u.username || u.password) throw new Error("urls with credentials are not fetched");
  return u;
}

async function readCapped(res: Response, max: number): Promise<Uint8Array> {
  if (!res.body) return new Uint8Array(0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => {});
      throw new Error(`page exceeds ${max / 1024 / 1024} MB`);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}

/**
 * Blocks loopback, link-local, private and reserved ranges by literal and by DNS answer (A and AAAA). A host with no
 * resolvable public address is refused rather than passed to fetch unchecked (fail closed). The fetch that follows
 * resolves again, so a rebinding resolver could still swap answers between the two lookups; the redirect loop
 * re-checks every hop, which closes the common redirect-to-metadata path.
 */
async function assertPublicHost(url: URL): Promise<void> {
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host) throw new Error("url has no host");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".arpa") || host === "metadata.google.internal") {
    throw new Error("host is not public");
  }
  if (isIpLiteral(host)) {
    if (isPrivateIp(host)) throw new Error("host is not public");
    return;
  }
  const addrs: string[] = [];
  for (const type of ["A", "AAAA"] as const) {
    try {
      addrs.push(...(await Deno.resolveDns(host, type)));
    } catch (e) {
      if (e instanceof Error && e.name === "NotFound") continue; // no record of this type
      console.warn(`resolveDns ${type} ${host} unavailable: ${errorMessage(e)}`);
    }
  }
  if (addrs.length === 0) throw new Error("host could not be resolved to a public address");
  if (addrs.some(isPrivateIp)) throw new Error("host resolves to a private address");
}

function isIpLiteral(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":");
}

export function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const hextets = parseIpv6(ip);
    if (!hextets) return true; // unparsable: refuse
    // IPv4-mapped (::ffff:a.b.c.d) → judge the inner address
    if (hextets.slice(0, 5).every((h) => h === 0) && hextets[5] === 0xffff) {
      return isPrivateV4([(hextets[6] >> 8) & 255, hextets[6] & 255, (hextets[7] >> 8) & 255, hextets[7] & 255]);
    }
    if (hextets.every((h) => h === 0)) return true; // ::
    if (hextets.slice(0, 7).every((h) => h === 0) && hextets[7] === 1) return true; // ::1
    const first = hextets[0];
    if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link local
    if ((first & 0xff00) === 0xff00) return true; // ff00::/8 multicast
    if (first === 0x64 && hextets[1] === 0xff9b) return true; // 64:ff9b::/96 NAT64
    if (first === 0x2001 && hextets[1] === 0xdb8) return true; // documentation
    return false;
  }
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return true;
  return isPrivateV4(parts);
}

function isPrivateV4([a, b, c]: number[]): boolean {
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64/10 shared address space
  if (a === 169 && b === 254) return true; // link local, cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a >= 224) return true; // multicast and reserved, incl. broadcast
  return false;
}

export function parseIpv6(s: string): number[] | null {
  let str = s.split("%")[0];
  // trailing dotted IPv4 (::ffff:1.2.3.4)
  const v4 = /:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(str);
  if (v4) {
    const p = v4[1].split(".").map(Number);
    if (p.some((n) => n > 255)) return null;
    str = str.slice(0, v4.index + 1) + ((p[0] << 8) | p[1]).toString(16) + ":" + ((p[2] << 8) | p[3]).toString(16);
  }
  const halves = str.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return null;
  const all = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  if (all.length !== 8) return null;
  const out: number[] = [];
  for (const h of all) {
    if (!/^[0-9a-f]{1,4}$/i.test(h)) return null;
    out.push(parseInt(h, 16));
  }
  return out;
}
