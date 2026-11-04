/**
 * A page's copy with its layout kept: headings marked as headings, buttons as buttons, fields as fields, lists as
 * lists, the nav and footer folded to one line each, everything else in reading order. Where a line sits on the page
 * is part of what the page says (the headline, the first button, what the order form asks), and innerText loses it.
 *
 * The walker runs inside the page (puppeteer evaluates it in every frame), so it is kept as plain JavaScript source
 * rather than a function the server bundle could rewrite: nothing outside the string is referenced, and `outlineOf`
 * evaluates the same source for tests.
 */
export const OUTLINE_SRC = String.raw`(() => {
  const BLOCK = new Set(["address","article","aside","blockquote","body","dd","details","dialog","div","dl","dt","fieldset","figcaption","figure","form","header","hr","li","main","ol","p","pre","section","summary","table","tbody","tfoot","thead","tr","ul"]);
  const SKIP = new Set(["audio","canvas","embed","head","iframe","link","map","meta","noscript","object","option","picture","script","source","style","svg","template","title","track","video"]);
  const lines = [];
  let buf = "";
  const flush = () => {
    const t = buf.replace(/[ \t \r\f\v]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{2,}/g, "\n").trim();
    if (t) lines.push(t);
    buf = "";
  };
  const text = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();
  const isButton = (el, tag) => {
    if (tag === "button") return true;
    if (tag === "input") return /^(submit|button|reset|image)$/i.test(el.type || "");
    if (el.getAttribute("role") === "button") return true;
    if (tag === "a") return /(^|[\s_-])(btn|button|cta)([\s_-]|$)/i.test(typeof el.className === "string" ? el.className : "");
    return false;
  };
  const fieldLabel = (el) => {
    let label = "";
    if (el.id) {
      const l = el.ownerDocument.querySelector('label[for="' + el.id.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"]');
      if (l) label = text(l);
    }
    if (!label) {
      const l = el.closest("label");
      if (l) label = text(l);
    }
    return label || el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.getAttribute("name") || "";
  };
  const prefixed = (start, first, rest) => {
    for (let i = start; i < lines.length; i++) lines[i] = (i === start ? first : rest) + lines[i];
  };
  const walkChildren = (el) => {
    for (const child of el.childNodes) walk(child);
  };
  const walk = (node) => {
    if (node.nodeType === 3) {
      buf += node.nodeValue;
      return;
    }
    if (node.nodeType !== 1) return;
    const el = node;
    const tag = el.tagName.toLowerCase();
    if (SKIP.has(tag)) return;
    if (el.hidden || el.getAttribute("aria-hidden") === "true") return;
    const cs = el.ownerDocument.defaultView.getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return;
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
      const t = text(el);
      if (t) lines.push("#".repeat(Number(tag[1])) + " " + t);
      return;
    }
    if (isButton(el, tag)) {
      flush();
      const t = tag === "input" ? (el.value || el.getAttribute("aria-label") || "").trim() : text(el);
      if (t) lines.push("[Button] " + t);
      return;
    }
    if (tag === "input" || tag === "select" || tag === "textarea") {
      if (tag === "input" && /^(hidden|checkbox|radio)$/i.test(el.type || "")) return;
      flush();
      lines.push("[Field] " + (fieldLabel(el) || tag));
      return;
    }
    if (tag === "img") {
      const alt = (el.getAttribute("alt") || "").trim();
      if (alt.length >= 3) {
        flush();
        lines.push("[Image] " + alt);
      }
      return;
    }
    if (tag === "nav" || tag === "footer") {
      flush();
      const t = text(el);
      if (t) lines.push("[" + (tag === "nav" ? "Nav" : "Footer") + "] " + t.slice(0, 400));
      return;
    }
    if (tag === "label") {
      // a label for a text field: the field's line carries its words, so the label's own text would repeat them;
      // a label for a checkbox or a radio (consent lines, plan choices) is copy and stays
      const forId = el.getAttribute("for");
      const target = forId ? el.ownerDocument.getElementById(forId) : el.querySelector("input, select, textarea");
      const tt = target ? target.tagName.toLowerCase() : "";
      const carried = tt === "select" || tt === "textarea" || (tt === "input" && !/^(hidden|checkbox|radio|submit|button|reset|image)$/i.test(target.type || ""));
      if (carried) {
        if (forId) return;
        flush();
        for (const child of el.childNodes) if (child.nodeType === 1) walk(child);
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
      const cells = Array.from(el.children).map((c) => text(c)).filter(Boolean);
      if (cells.length) lines.push(cells.join(" | "));
      return;
    }
    const d = cs.display || "";
    const block = BLOCK.has(tag) || d === "block" || d === "flex" || d === "grid" || d === "list-item" || d === "flow-root" || d.startsWith("table") || d.startsWith("inline-block") === false && d.startsWith("inline") === false && d !== "" && d !== "contents";
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

/** The outline of a document, for tests: the same source the browser runs, evaluated against this window. */
export function outlineOf(doc: Document): string {
  const win = doc.defaultView as (Window & { document: Document }) | null;
  if (!win) throw new Error("the document has no window");
  return new Function("document", "window", `return ${OUTLINE_SRC};`)(doc, win) as string;
}
