import { assertEquals, assertStringIncludes } from "@std/assert";
import { htmlToText, titleOf } from "../../html_text.ts";

Deno.test("htmlToText keeps the page's layout as marks", () => {
  const html = `<html><head><title>Command Center | Legiit</title><style>.x{}</style></head><body>
    <nav><a href="/">Home</a> <a href="/login">Log In</a></nav>
    <main>
      <h1>Stop Guessing What To Work On.</h1>
      <p>Command Center shows you the <strong>next move</strong>.<br>Billed annually.</p>
      <a class="btn btn-primary" href="/start">Start Free Trial</a>
      <ul><li>Business plan</li><li>Specialist on call</li></ul>
      <form><label for="e">Your email</label><input id="e" type="email" placeholder="you@example.com"><button type="submit">Send me the plan</button><input type="hidden" name="t" value="1"></form>
      <table><tr><td>Plan</td><td>$399</td></tr></table>
      <script>var x = 1;</script>
    </main>
    <footer><a href="/terms">Terms</a> &middot; <a href="/privacy">Privacy</a></footer>
  </body></html>`;
  const text = htmlToText(html);
  assertEquals(
    text,
    [
      "[Nav] Home Log In",
      "# Stop Guessing What To Work On.",
      "Command Center shows you the next move.\nBilled annually.",
      "[Button] Start Free Trial",
      "- Business plan\n- Specialist on call",
      "Your email\n[Field] you@example.com",
      "[Button] Send me the plan",
      "Plan | $399",
      "[Footer] Terms · Privacy",
    ].join("\n\n"),
  );
  assertEquals(titleOf(html), "Command Center | Legiit");
});

Deno.test("htmlToText marks submit inputs and role buttons, drops asides and hidden controls", () => {
  const text = htmlToText(`<aside>Related posts</aside><div role="button" class="x">Open</div><a role="button" href="#">Buy now</a><input type="submit" value="Join"><input type="checkbox" name="agree"><label>I agree</label><select name="plan"><option>Monthly</option></select>`);
  assertEquals(text, "[Button] Open\n\n[Button] Buy now\n\n[Button] Join\nI agree\n[Field] plan");
  assertStringIncludes(text, "[Button] Join");
  assertEquals(text.includes("Related posts"), false);
  assertEquals(text.includes("Monthly"), false);
});

Deno.test("htmlToText folds a heading whole, keeps a list item's dash, an image's alt, a bare < in copy, and stops at an unclosed anchor", () => {
  assertEquals(htmlToText(`<h3><button class="accordion">Is there a refund?</button></h3><p>Yes.</p>`), "### Is there a refund?\n\nYes.");
  assertEquals(htmlToText(`<ul><li><p>First</p></li><li><h3>Second</h3><p>More</p></li></ul>`), "- First\n- ### Second\n\nMore");
  assertEquals(htmlToText(`<img src="a.png" alt="The dashboard"><img src="b.png" alt="b.png"><p>5 < 6 and 7 > 2</p>`), "[Image] The dashboard\n\n5 < 6 and 7 > 2");
  // an unclosed anchor keeps its words and loses only its mark; a card of nested divs with role=button is read as its blocks
  assertEquals(htmlToText(`<a class="btn" href="/a">Buy now<a class="btn" href="/b">Second CTA</a></a><div role="button"><div>Inner</div>Outer</div>`), "Buy now\n[Button] Second CTA\n\nInner\n\nOuter");
  assertEquals(htmlToText(`<svg/><p>Copy after a self-closed svg</p><dialog><p>A modal</p></dialog>`), "Copy after a self-closed svg");
});
