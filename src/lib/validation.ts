import { z } from "zod";
import { SLUG_RE } from "./slug";
import { toMinor } from "./money";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid date" });
      return z.NEVER;
    }
    return d;
  });

export const MAX_PRICE_MAJOR = 100_000;

export type PriceInput = { currency: string; amount: string; saleAmount: string };

export function parsePrices(rows: PriceInput[]): { ok: true; prices: { currency: string; amount: number; saleAmount: number | null }[] } | { ok: false; error: string } {
  const seen = new Set<string>();
  const out: { currency: string; amount: number; saleAmount: number | null }[] = [];
  for (const row of rows) {
    const currency = row.currency.trim().toUpperCase();
    if (!currency && !row.amount.trim()) continue; // empty row
    if (!/^[A-Z]{3}$/.test(currency)) return { ok: false, error: `"${row.currency}" is not a valid 3-letter currency code.` };
    if (seen.has(currency)) return { ok: false, error: `${currency} is listed more than once.` };
    seen.add(currency);
    const amount = toMinor(row.amount, currency);
    if (amount == null || amount <= 0) return { ok: false, error: `Enter a valid price above zero for ${currency}.` };
    if (amount > toMinor(MAX_PRICE_MAJOR, currency)!) return { ok: false, error: `The ${currency} price is unrealistically high.` };
    let saleAmount: number | null = null;
    if (row.saleAmount.trim()) {
      saleAmount = toMinor(row.saleAmount, currency);
      if (saleAmount == null || saleAmount <= 0) return { ok: false, error: `Enter a valid sale price for ${currency}.` };
      if (saleAmount >= amount) return { ok: false, error: `The ${currency} sale price must be lower than the regular price.` };
    }
    out.push({ currency, amount, saleAmount });
  }
  return { ok: true, prices: out };
}

export function parseFaq(text: string): { question: string; answer: string }[] {
  // Blocks separated by blank lines; first line is the question, the rest is the answer.
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [q, ...rest] = block.split("\n");
      return { question: q.replace(/^Q:\s*/i, "").trim(), answer: rest.join("\n").replace(/^A:\s*/i, "").trim() };
    })
    .filter((f) => f.question && f.answer)
    .slice(0, 30);
}

export function faqToText(faq: unknown): string {
  if (!Array.isArray(faq)) return "";
  return faq
    .filter((f): f is { question: string; answer: string } => typeof f?.question === "string" && typeof f?.answer === "string")
    .map((f) => `${f.question}\n${f.answer}`)
    .join("\n\n");
}

export const productFormSchema = z.object({
  type: z.enum(["EBOOK", "BUNDLE"]),
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(160),
  subtitle: optionalText(200),
  slug: z.string().trim().toLowerCase().regex(SLUG_RE, "Slug may contain only lower-case letters, numbers and single hyphens.").max(80),
  shortDescription: z.string().trim().max(300, "Short description must be 300 characters or fewer."),
  description: z.string().trim().max(20_000),
  audience: z.string().trim().max(5_000),
  learningOutcomes: z.string().max(5_000).transform((v) => v.split("\n").map((l) => l.replace(/^[-*•]\s*/, "").trim()).filter(Boolean).slice(0, 30)),
  tableOfContents: z.string().trim().max(10_000),
  faq: z.string().max(20_000).transform(parseFaq),
  tags: z.string().max(500).transform((v) => [...new Set(v.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 20)),
  fileFormat: z.string().trim().min(1).max(40),
  pageCount: z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 10_000) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Page count must be a whole number." });
        return z.NEVER;
      }
      return n;
    }),
  language: z.string().trim().min(1).max(40),
  author: optionalText(120),
  isFeatured: z.boolean(),
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
  coverAlt: optionalText(200),
  categoryId: optionalText(40),
  saleStartsAt: optionalDate,
  saleEndsAt: optionalDate,
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

/** Reasons a product cannot be published yet. Empty array = ready. */
export function publishProblems(p: {
  type: "EBOOK" | "BUNDLE";
  title: string;
  shortDescription: string;
  description: string;
  categoryId: string | null;
  prices: { currency: string }[];
  hasMainFile: boolean;
  bundleCount: number;
  baseCurrency: string;
}): string[] {
  const problems: string[] = [];
  if (p.title.trim().length < 3) problems.push("Add a title.");
  if (p.shortDescription.trim().length < 20) problems.push("Add a short description (at least 20 characters).");
  if (p.description.trim().length < 50) problems.push("Add a full description (at least 50 characters).");
  if (!p.categoryId) problems.push("Choose a category.");
  if (!p.prices.some((x) => x.currency === p.baseCurrency)) problems.push(`Set a price in the store's base currency (${p.baseCurrency}).`);
  if (p.type === "EBOOK" && !p.hasMainFile) problems.push("Upload the downloadable ebook file.");
  if (p.type === "BUNDLE" && p.bundleCount < 2) problems.push("A bundle must include at least two ebooks.");
  return problems;
}
