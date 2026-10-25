import { assertEquals } from "@std/assert";
import { discoverKeyPages } from "../../discover.ts";

const HTML = `
<nav><a href="/">Home</a> <a href="/pricing">Pricing</a> <a href="https://www.example.com/about-us">About us</a>
<a href="/blog/post-1">A post</a> <a href="/faq">FAQ</a> <a href="#top">Top</a> <a href="mailto:x@example.com">Mail</a></nav>
<footer><a href="/legal/terms">Terms of service</a> <a href="/legal/refund-policy">Refund policy</a>
<a href="https://other.example.net/terms">Partner terms</a> <a href="/how-it-works">How it works</a> <a href="/pricing#plans">Plans</a></footer>`;

Deno.test("discoverKeyPages: same-site key pages, best first, deduplicated, capped, the base page excluded", () => {
  const pages = discoverKeyPages(HTML, "https://example.com/");
  assertEquals(pages.map((p) => p.label), ["refund or guarantee", "terms", "pricing", "about or team", "faq", "how it works"]);
  assertEquals(pages[0].url, "https://example.com/legal/refund-policy");
  assertEquals(pages.some((p) => p.url.includes("other.example.net")), false);
  assertEquals(pages.some((p) => p.url.includes("/blog/")), false);
  assertEquals(pages.filter((p) => p.url.startsWith("https://example.com/pricing")).length, 1);
  assertEquals(discoverKeyPages(HTML, "https://example.com/", { max: 2 }).length, 2);
  assertEquals(discoverKeyPages(HTML, "https://example.com/", { exclude: ["https://example.com/faq"] }).some((p) => p.label === "faq"), false);
  assertEquals(discoverKeyPages("<p>no links</p>", "https://example.com/"), []);
  assertEquals(discoverKeyPages(HTML, "not a url"), []);
});
