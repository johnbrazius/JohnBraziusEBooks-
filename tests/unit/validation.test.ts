import { describe, expect, it } from "vitest";
import { parseFaq, parsePrices, publishProblems } from "@/lib/validation";
import { formatMoney, fromMinor, toMinor } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { matchesMagicBytes, safeFileName } from "@/lib/storage/files";

describe("money", () => {
  it("parses decimal input into minor units", () => {
    expect(toMinor("10", "USD")).toBe(1000);
    expect(toMinor("10.5", "USD")).toBe(1050);
    expect(toMinor("499.00", "INR")).toBe(49900);
    expect(toMinor("1,299", "INR")).toBe(129900);
    expect(toMinor("500", "JPY")).toBe(500);
  });
  it("rejects invalid amounts", () => {
    for (const bad of ["-1", "abc", "1.234", "", "1e5"]) expect(toMinor(bad, "USD")).toBeNull();
    expect(toMinor("5.5", "JPY")).toBeNull();
  });
  it("formats and round-trips", () => {
    expect(fromMinor(1050, "USD")).toBe("10.50");
    expect(formatMoney(1000, "USD")).toBe("$10");
    expect(formatMoney(49900, "INR")).toBe("₹499");
  });
});

describe("parsePrices", () => {
  it("accepts valid rows and skips blank ones", () => {
    const r = parsePrices([{ currency: "usd", amount: "10", saleAmount: "" }, { currency: "", amount: "", saleAmount: "" }, { currency: "INR", amount: "499", saleAmount: "399" }]);
    expect(r).toEqual({ ok: true, prices: [{ currency: "USD", amount: 1000, saleAmount: null }, { currency: "INR", amount: 49900, saleAmount: 39900 }] });
  });
  it("rejects zero/negative prices, duplicates, bad codes and sale >= price", () => {
    expect(parsePrices([{ currency: "USD", amount: "0", saleAmount: "" }]).ok).toBe(false);
    expect(parsePrices([{ currency: "USD", amount: "-5", saleAmount: "" }]).ok).toBe(false);
    expect(parsePrices([{ currency: "USD", amount: "5", saleAmount: "" }, { currency: "usd", amount: "6", saleAmount: "" }]).ok).toBe(false);
    expect(parsePrices([{ currency: "US", amount: "5", saleAmount: "" }]).ok).toBe(false);
    expect(parsePrices([{ currency: "USD", amount: "5", saleAmount: "5" }]).ok).toBe(false);
    expect(parsePrices([{ currency: "USD", amount: "999999999", saleAmount: "" }]).ok).toBe(false);
  });
});

describe("publishProblems", () => {
  const ok = { type: "EBOOK" as const, title: "A real title", shortDescription: "x".repeat(30), description: "y".repeat(60), categoryId: "c", prices: [{ currency: "USD" }], hasMainFile: true, bundleCount: 0, baseCurrency: "USD" };
  it("passes a complete product", () => expect(publishProblems(ok)).toEqual([]));
  it("blocks incomplete products", () => {
    expect(publishProblems({ ...ok, hasMainFile: false })).toContain("Upload the downloadable ebook file.");
    expect(publishProblems({ ...ok, prices: [{ currency: "INR" }] }).join()).toMatch(/base currency/);
    expect(publishProblems({ ...ok, categoryId: null })).toContain("Choose a category.");
    expect(publishProblems({ ...ok, type: "BUNDLE", hasMainFile: false, bundleCount: 1 }).join()).toMatch(/at least two/);
  });
});

describe("helpers", () => {
  it("slugifies titles", () => {
    expect(slugify("The Small Business Website & SEO Playbook")).toBe("the-small-business-website-and-seo-playbook");
    expect(slugify("  Café — Guide!! ")).toBe("cafe-guide");
  });
  it("parses FAQ blocks", () => {
    expect(parseFaq("Q: One?\nA: Yes.\n\nTwo?\nNo,\nreally.")).toEqual([{ question: "One?", answer: "Yes." }, { question: "Two?", answer: "No,\nreally." }]);
  });
  it("checks file signatures", () => {
    expect(matchesMagicBytes("application/pdf", new TextEncoder().encode("%PDF-1.7"))).toBe(true);
    expect(matchesMagicBytes("application/pdf", new TextEncoder().encode("<html>"))).toBe(false);
    expect(matchesMagicBytes("image/png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    expect(matchesMagicBytes("image/svg+xml", new TextEncoder().encode("<svg"))).toBe(false);
  });
  it("sanitises file names", () => {
    expect(safeFileName('../../etc/"passwd".pdf')).toBe("....etcpasswd.pdf");
  });
});
