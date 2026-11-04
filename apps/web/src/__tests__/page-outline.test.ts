import { describe, expect, it } from "vitest";
import { outlineOf } from "@/lib/page-outline";

function doc(body: string): Document {
  const d = document.implementation.createHTMLDocument("t");
  d.body.innerHTML = body;
  // jsdom gives the new document a window only through the parent; reuse the test window's styles
  Object.defineProperty(d, "defaultView", { value: window, configurable: true });
  return d;
}

describe("page outline", () => {
  it("keeps headings, buttons, fields, lists and order", () => {
    const out = outlineOf(doc(`
      <nav><a href="/">Home</a> <a href="/login">Log In</a></nav>
      <main>
        <h1>Stop Guessing What To Work On.</h1>
        <p>Command Center shows you the <strong>next move</strong>.<br>Billed annually.</p>
        <a class="btn btn-primary" href="/start">Start Free Trial</a>
        <ul><li>Business plan</li><li>Specialist on call<p>when you want it done</p></li></ul>
        <form><label for="e">Your email</label><input id="e" type="email" placeholder="you@example.com"><button type="submit">Send me the plan</button></form>
        <table><tr><td>Plan</td><td>$399</td></tr></table>
        <blockquote>Nobody else does this.</blockquote>
        <img src="x.png" alt="The dashboard">
        <div style="display:none">hidden copy</div>
        <span hidden>also hidden</span>
        <script>var x = 1;</script>
      </main>
      <footer>Terms · Privacy</footer>`));
    expect(out).toBe([
      "[Nav] Home Log In",
      "# Stop Guessing What To Work On.",
      "Command Center shows you the next move.\nBilled annually.",
      "[Button] Start Free Trial",
      "- Business plan\n- Specialist on call\n  when you want it done",
      "[Field] Your email",
      "[Button] Send me the plan",
      "Plan | $399",
      "> Nobody else does this.",
      "[Image] The dashboard",
      "[Footer] Terms · Privacy",
    ].join("\n\n"));
    expect(out).not.toContain("hidden");
    expect(out).not.toContain("var x");
  });

  it("reads a field's label from its wrapper and a submit input's value", () => {
    const out = outlineOf(doc(`<form><label>Name <input name="n"></label><input type="submit" value="Join"><input type="hidden" name="t" value="1"></form>`));
    expect(out).toBe("[Field] Name\n\n[Button] Join");
  });

  it("treats inline spans as part of the sentence and block spans as lines", () => {
    const out = outlineOf(doc(`<p>One <span>two</span> three.</p><span style="display:block">Four.</span>`));
    expect(out).toBe("One two three.\n\nFour.");
  });

  it("gives an empty string for an empty body", () => {
    expect(outlineOf(doc(``))).toBe("");
  });
});
