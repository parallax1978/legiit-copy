import { describe, expect, it } from "vitest";
import { guessPageFormat, pageWords, REWRITE_FORMATS } from "@/lib/page-format";
import { FORMAT_IDS } from "@engine/schemas/common.ts";

/** About n words of plain prose. */
const filler = (n: number) => Array.from({ length: Math.ceil(n / 8) }, (_, i) => (i % 7 === 0 ? "The crew finishes the job the same day." : "Then the truck goes to the next street.")).join(" ");

describe("the page type a URL most likely is", () => {
  it("offers only formats the engine has, and guesses from the page's own words", () => {
    for (const id of REWRITE_FORMATS) expect(FORMAT_IDS).toContain(id);
    expect(guessPageFormat("Pro $59 a month. Agency $199 per month. Compare plans.", "https://x.com/pricing")).toBe("pricing_page");
    expect(guessPageFormat("Starter $9/month, Growth $29/month, Scale $99/month. Every plan includes support.")).toBe("pricing_page");
    expect(guessPageFormat("Thanks for signing up. Check your inbox for the first email.", "https://x.com/thank-you")).toBe("thank_you");
    expect(guessPageFormat("Enter your card number and billing address, then place your order.")).toBe("order_form");
    expect(guessPageFormat("Oak dining table, seats six. $899. In stock. Free shipping. Add to cart.")).toBe("product_description");
    expect(guessPageFormat("Wait, add this to your order: the deluxe case for $19. Yes, add it. No thanks.")).toBe("upsell");
    expect(guessPageFormat("Get the free checklist. Enter your email and it lands in your inbox in a minute.")).toBe("optin");
    expect(guessPageFormat(`Sponsored content. ${filler(700)}`)).toBe("advertorial");
    expect(guessPageFormat(filler(2000))).toBe("sales_letter");
    expect(guessPageFormat(filler(300))).toBe("landing_page_short");
  });
  it("counts words plainly", () => {
    expect(pageWords("")).toBe(0);
    expect(pageWords("  one two\nthree ")).toBe(3);
  });
});
