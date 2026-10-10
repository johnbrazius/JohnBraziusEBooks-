import { z } from "zod";

export const storeSettingsSchema = z.object({
  storeName: z.string().min(1).max(80).default("Website Growth Lab"),
  tagline: z.string().max(160).default("Practical Knowledge. Digital Growth."),
  supportEmail: z.string().email().or(z.literal("")).default(""),
  /** Every product must have a price in this currency. It is the fallback charge currency. */
  baseCurrency: z.string().regex(/^[A-Z]{3}$/).default("USD"),
  /** Currencies visitors may choose to view prices in. */
  displayCurrencies: z.array(z.string().regex(/^[A-Z]{3}$/)).default(["USD", "INR"]),
  /** ISO country code → preferred display currency, e.g. { IN: "INR" }. */
  countryCurrency: z.record(z.string().regex(/^[A-Z]{2}$/), z.string().regex(/^[A-Z]{3}$/)).default({ IN: "INR" }),
  /**
   * Admin-entered, display-only rates: 1 unit of base currency = N units of the key currency.
   * Used ONLY to show clearly-labelled estimates when a product has no fixed price in the visitor's currency.
   */
  indicativeRates: z.record(z.string().regex(/^[A-Z]{3}$/), z.number().positive()).default({}),
  indicativeRatesUpdatedAt: z.string().nullable().default(null),
  banner: z
    .object({
      enabled: z.boolean().default(false),
      text: z.string().max(200).default(""),
      linkUrl: z.string().max(300).default(""),
      linkLabel: z.string().max(40).default(""),
    })
    .default({}),
  social: z
    .object({
      twitter: z.string().max(300).default(""),
      linkedin: z.string().max(300).default(""),
      youtube: z.string().max(300).default(""),
      instagram: z.string().max(300).default(""),
      facebook: z.string().max(300).default(""),
    })
    .default({}),
  newsletterEnabled: z.boolean().default(true),
  /** Minimum number of paid orders before a product may carry a "Bestseller" label. */
  bestsellerMinOrders: z.number().int().min(1).default(5),
});

export type StoreSettings = z.infer<typeof storeSettingsSchema>;

export const DEFAULT_SETTINGS: StoreSettings = storeSettingsSchema.parse({});

