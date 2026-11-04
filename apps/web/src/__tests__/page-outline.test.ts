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

describe("page outline: real-page cases", () => {
  it("reads headings, buttons, folds and cells through its own rules: no glue across breaks, no hidden or script text", () => {
    const out = outlineOf(doc(`
      <nav><style>.m{}</style><ul><li><a>Home</a><ul style="display:none"><li><a>Sub</a></li></ul></li><li><a>Pricing</a></li></ul></nav>
      <h1>Finally...<br>A Way To Win</h1>
      <h2><span style="display:block">Build faster</span><span style="display:block">with us</span></h2>
      <button>Add to cart<span style="display:none">Adding...</span></button>
      <button><svg><title>Arrow</title></svg>Buy</button>
      <table><tr><td>Plan<br>Pro</td><td><span style="display:none">was $99</span>$49</td></tr></table>
      <footer><p>Terms</p><style>.a{color:red}</style><script>window.x=1</script><ul style="display:none"><li>Hidden submenu</li></ul></footer>`));
    expect(out).toBe(["[Nav] Home Pricing", "# Finally... A Way To Win", "## Build faster with us", "[Button] Add to cart", "[Button] Buy", "Plan Pro | $49", "[Footer] Terms"].join("\n\n"));
  });

  it("keeps copy that only starts transparent, a form with a control named hidden, and a card row walked as blocks", () => {
    const out = outlineOf(doc(`
      <section style="opacity:0"><p>Fades in on scroll.</p></section>
      <form><input name="hidden" value="1" type="text" aria-label="Promo code"><input type="submit"></form>
      <table><tr><td><h3>Pro</h3><p>$49/mo</p></td><td><h3>Team</h3><p>$99/mo</p></td></tr></table>
      <div class="cookie-banner"><p>We use cookies.</p><button>Accept</button></div>
      <div role="button"><h3>Starter</h3><p>$9/mo</p></div>`));
    expect(out).toBe(["Fades in on scroll.", "[Field] Promo code", "[Button] Submit", "### Pro", "$49/mo", "### Team", "$99/mo", "[Button] Starter $9/mo"].join("\n\n"));
  });

  it("does not hide the page when its root carries aria-hidden for an open popup", () => {
    const out = outlineOf(doc(`<div id="app" aria-hidden="true"><h1>The page</h1><p>Still the page, with its copy and everything on it.</p></div><div role="dialog"><span aria-hidden="true">x</span>Sign in</div>`));
    expect(out).toContain("# The page");
    expect(out).not.toContain("x\n");
  });
});
