/**
 * A page's copy with its layout kept: headings marked as headings, buttons as buttons, fields as fields, lists as
 * lists, the nav and footer folded to one line each, everything else in reading order. Where a line sits on the page
 * is part of what the page says (the headline, the first button, what the order form asks), and innerText loses it.
 *
 * The walker runs inside the page (puppeteer evaluates it in every frame), so it is kept as plain JavaScript source
 * rather than a function the server bundle could rewrite: nothing outside the string is referenced, and `outlineOf`
 * evaluates the same source for tests. The fetch-side read (_shared/html_text.ts) writes the same marks from markup.
 */
export const OUTLINE_SRC = String.raw`(() => {
  const BLOCK = new Set(["address","article","blockquote","body","dd","details","dialog","div","dl","dt","fieldset","figcaption","figure","form","header","hr","li","main","ol","p","pre","section","summary","table","tbody","td","tfoot","th","thead","tr","ul"]);
  const SKIP = new Set(["aside","audio","canvas","embed","head","iframe","link","map","meta","noscript","object","option","script","source","style","svg","template","title","track","video"]);
  const FIELD_INPUT = /^(hidden|checkbox|radio|submit|button|reset|image)$/i;
  const CHROME = /(^|[\s_-])(cookie|consent|gdpr)([\s_-]|$)/i;
  const lines = [];
  let buf = "";
  const win = document.defaultView || window;
  const bodyLength = document.body ? (document.body.textContent || "").length : 0;
  const flush = () => {
    const t = buf.replace(/[ \t \r\f\v]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{2,}/g, "\n").trim();
    if (t) lines.push(t);
    buf = "";
  };
  const cls = (el) => (typeof el.className === "string" ? el.className : "");
  const styleOf = (el) => {
    try { return win.getComputedStyle(el); } catch { return null; }
  };
  const blockDisplay = (d) => d === "block" || d === "flex" || d === "grid" || d === "list-item" || d === "flow-root" || d.startsWith("table");
  // hidden the way a reader finds it: display none or visibility hidden (opacity is an animation's starting state,
  // not a hiding); aria-hidden hides a part of the page, never the page itself (an open popup marks the rest)
  const hidden = (el, cs) => {
    if (el.hasAttribute("hidden")) return true;
    if (el.getAttribute("aria-hidden") === "true" && (el.textContent || "").length * 2 < bodyLength) return true;
    return !!cs && (cs.display === "none" || cs.visibility === "hidden");
  };
  const chrome = (el) => CHROME.test(el.id || "") || CHROME.test(cls(el));
  /** the words of one element as a reader sees them: the walker's own skips and hides, a space at a break or a block edge */
  const inline = (root) => {
    let s = "";
    const rec = (node) => {
      if (node.nodeType === 3) { s += node.nodeValue; return; }
      if (node.nodeType !== 1) return;
      const el = node;
      const tag = el.tagName.toLowerCase();
      if (SKIP.has(tag) || tag === "select" || tag === "textarea") return;
      const cs = styleOf(el);
      if (hidden(el, cs)) return;
      if (tag === "br") { s += " "; return; }
      const block = BLOCK.has(tag) || (cs ? blockDisplay(cs.display || "") : false);
      if (block) s += " ";
      for (const c of el.childNodes) rec(c);
      if (block) s += " ";
    };
    rec(root);
    return s.replace(/\s+/g, " ").trim();
  };
  const isButton = (el, tag) => {
    if (tag === "button") return true;
    if (tag === "input") return /^(submit|button|reset|image)$/i.test(el.type || "");
    if (el.getAttribute("role") === "button") return true;
    if (tag === "a") return /(^|[\s_-])(btn|button|cta)([\s_-]|$)/i.test(cls(el));
    return false;
  };
  const fieldLabel = (el) => {
    const labels = el.labels ? Array.from(el.labels) : [];
    for (const l of labels) {
      const t = inline(l);
      if (t) return t;
    }
    return el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.getAttribute("name") || "";
  };
  const prefixed = (start, first, rest) => {
    for (let i = start; i < lines.length; i++) lines[i] = (i === start ? first : rest) + lines[i];
  };
  const walkChildren = (el) => {
    for (const child of el.childNodes) walk(child);
  };
  const simpleCell = (c) => !c.querySelector("h1,h2,h3,h4,h5,h6,p,div,ul,ol,table,button,input,select,textarea");
  const walk = (node) => {
    try {
      walkNode(node);
    } catch {
      // one bad node (a selector it cannot answer, a detached element) skips itself, not the frame
    }
  };
  const walkNode = (node) => {
    if (node.nodeType === 3) {
      buf += node.nodeValue;
      return;
    }
    if (node.nodeType !== 1) return;
    const el = node;
    const tag = el.tagName.toLowerCase();
    if (SKIP.has(tag)) return;
    const cs = styleOf(el);
    if (hidden(el, cs)) return;
    if (chrome(el)) return; // a cookie or consent banner is the site's, not the page's
    if (tag === "br") {
      buf += "\n";
      return;
    }
    if (tag === "hr") {
      flush();
      lines.push("---");
      return;
    }
    if (/^h[1-6]$/.test(tag)) {
      flush();
      const t = inline(el);
      if (t) lines.push("#".repeat(Number(tag[1])) + " " + t);
      return;
    }
    if (isButton(el, tag)) {
      flush();
      const t = tag === "input"
        ? (el.getAttribute("alt") || el.value || el.getAttribute("aria-label") || (/^submit$/i.test(el.type || "") ? "Submit" : "")).trim()
        : inline(el);
      if (t) lines.push("[Button] " + t);
      return;
    }
    if (tag === "input" || tag === "select" || tag === "textarea") {
      if (tag === "input" && FIELD_INPUT.test(el.type || "")) return;
      flush();
      lines.push("[Field] " + (fieldLabel(el) || tag));
      return;
    }
    if (tag === "img") {
      const alt = (el.getAttribute("alt") || "").trim();
      if (alt.length >= 3 && !/\.(png|jpe?g|gif|webp|svg)$/i.test(alt)) {
        flush();
        lines.push("[Image] " + alt);
      }
      return;
    }
    if (tag === "nav" || tag === "footer") {
      flush();
      const t = inline(el);
      if (t) lines.push("[" + (tag === "nav" ? "Nav" : "Footer") + "] " + t.slice(0, 400));
      return;
    }
    if (tag === "label") {
      // a label for a text field: the field's line carries its words, so the label's own text would repeat them;
      // a label for a checkbox or a radio (consent lines, plan choices) is copy and stays
      const forId = el.getAttribute("for");
      const target = forId ? el.ownerDocument.getElementById(forId) : el.querySelector("input, select, textarea");
      const tt = target ? target.tagName.toLowerCase() : "";
      const carried = tt === "select" || tt === "textarea" || (tt === "input" && !FIELD_INPUT.test(target.type || ""));
      if (carried) {
        if (forId) return;
        flush();
        for (const c of el.querySelectorAll("input, select, textarea, button")) walk(c);
        flush();
        return;
      }
    }
    if (tag === "li") {
      flush();
      const start = lines.length;
      walkChildren(el);
      flush();
      prefixed(start, "- ", "  ");
      return;
    }
    if (tag === "blockquote") {
      flush();
      const start = lines.length;
      walkChildren(el);
      flush();
      prefixed(start, "> ", "> ");
      return;
    }
    if (tag === "tr") {
      flush();
      const cells = Array.from(el.children);
      if (cells.every(simpleCell)) {
        const texts = cells.map((c) => (hidden(c, styleOf(c)) ? "" : inline(c))).filter(Boolean);
        if (texts.length) lines.push(texts.join(" | "));
        return;
      }
      walkChildren(el); // a row of cards: every cell walked as the blocks it holds
      flush();
      return;
    }
    const d = cs ? cs.display || "" : "";
    const block = BLOCK.has(tag) || blockDisplay(d);
    if (block) flush();
    walkChildren(el);
    if (block) flush();
  };
  if (!document.body) return "";
  walk(document.body);
  let out = "";
  for (let i = 0; i < lines.length; i++) {
    const item = /^(- |  |> )/.test(lines[i]) && i > 0 && /^(- |  |> )/.test(lines[i - 1]);
    out += (i === 0 ? "" : item ? "\n" : "\n\n") + lines[i];
  }
  return out;
})()`;

/** The reader's flat text of the page, for the fallback: body.innerText without the options of its selects. */
export const FLAT_SRC = String.raw`(() => {
  if (!document.body) return "";
  const all = document.body.innerText || "";
  const selects = Array.from(document.querySelectorAll("select")).map((s) => s.innerText || "").join(" ");
  const words = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0);
  return { text: all, words: Math.max(0, words(all) - words(selects)) };
})()`;

/** The outline of a document, for tests: the same source the browser runs, evaluated against this window. */
export function outlineOf(doc: Document): string {
  const win = doc.defaultView as (Window & { document: Document }) | null;
  if (!win) throw new Error("the document has no window");
  return new Function("document", "window", `return ${OUTLINE_SRC};`)(doc, win) as string;
}
