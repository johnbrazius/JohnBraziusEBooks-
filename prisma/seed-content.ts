/**
 * Starter content. Everything here is DEMO / PLACEHOLDER material, to be replaced from the admin dashboard.
 */

export const CATEGORIES = [
  { slug: "website-development", name: "Website Development", description: "Plan, build and improve websites that load fast, look professional and turn visitors into customers." },
  { slug: "seo", name: "SEO and Local SEO", description: "Practical search engine optimisation for small businesses — from keyword research to Google Business Profile." },
  { slug: "digital-marketing", name: "Digital Marketing", description: "Email, social media and paid campaigns explained step by step, with templates you can reuse." },
  { slug: "ai-tools", name: "AI Tools and Automation", description: "Use AI assistants and no-code automation to save hours every week — responsibly and effectively." },
  { slug: "freelancing", name: "Freelancing and Online Business", description: "Find clients, price your services and run a sustainable online business." },
  { slug: "content-creation", name: "Content Creation", description: "Write, design and publish content that builds trust and attracts the right audience." },
  { slug: "business-growth", name: "Business Growth", description: "Strategy, offers and systems to grow a small business sustainably." },
  { slug: "productivity", name: "Productivity and Learning", description: "Learn faster, focus better and build habits that compound over time." },
];

type DemoProduct = {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  usd: number; // minor units
  inr?: number;
  saleUsd?: number;
  featured?: boolean;
  pages: number;
  short: string;
  description: string;
  audience: string;
  outcomes: string[];
  toc: string[];
  faq?: { question: string; answer: string }[];
  tags: string[];
  daysAgo: number;
};

export const PRODUCTS: DemoProduct[] = [
  {
    slug: "small-business-website-seo-playbook",
    title: "The Small Business Website & SEO Playbook",
    subtitle: "A step-by-step guide to a website that gets found on Google and wins customers",
    category: "seo",
    usd: 1000,
    inr: 49900,
    featured: true,
    pages: 120,
    short: "Plan, build and optimise a small business website that ranks locally and turns visitors into enquiries — no jargon, no fluff.",
    description: `Most small business websites look fine but quietly fail: they don't show up in search, they load slowly on phones, and visitors leave without getting in touch.

**This playbook walks you through fixing that, one practical step at a time.** You'll plan the pages your customers actually need, write copy that answers their questions, set up the technical SEO foundations, and build a simple routine for staying visible in local search.

Every chapter ends with a short checklist so you can apply what you've learned straight away.

> _Demo listing: replace this description, the cover and the PDF with your final content from the admin dashboard._`,
    audience: `- Small business owners who want more enquiries from their website
- Freelancers and agencies building sites for local clients
- Beginners who want a clear, jargon-free path to SEO basics`,
    outcomes: [
      "Plan a website structure around what customers search for",
      "Write page titles and descriptions that earn clicks",
      "Set up and optimise a Google Business Profile",
      "Fix the technical SEO issues that matter most",
      "Measure results with free tools",
      "Build a simple monthly SEO routine",
    ],
    toc: [
      "Why most small business websites underperform",
      "Planning pages around search intent",
      "Writing copy that converts",
      "On-page SEO essentials",
      "Local SEO and Google Business Profile",
      "Speed, mobile and technical health",
      "Measuring what matters",
      "Your 30-day action plan",
    ],
    faq: [
      { question: "Do I need technical skills?", answer: "No. The guide assumes no coding knowledge and explains every term the first time it appears." },
      { question: "Does it work for any website platform?", answer: "Yes. The principles apply to WordPress, Wix, Squarespace, Shopify or a custom site." },
    ],
    tags: ["seo", "local seo", "website", "small business", "google business profile"],
    daysAgo: 2,
  },
  {
    slug: "local-seo-checklist",
    title: "Local SEO in 30 Days",
    subtitle: "A daily checklist for ranking in your town or city",
    category: "seo",
    usd: 700,
    inr: 34900,
    pages: 64,
    short: "Thirty short daily tasks that build your local search presence — from citations to reviews to location pages.",
    description: "A compact, task-a-day programme for local businesses. Each day takes under 30 minutes and moves you closer to the map pack.\n\n> _Demo product — sample content only._",
    audience: "Local service businesses, shops and clinics that rely on nearby customers.",
    outcomes: ["Audit your current local visibility", "Build consistent business citations", "Earn and respond to reviews ethically", "Create helpful location pages"],
    toc: ["Week 1: Foundations", "Week 2: Citations and consistency", "Week 3: Reviews and reputation", "Week 4: Content and links", "Day 30: Review and next steps"],
    tags: ["local seo", "checklist", "google maps"],
    daysAgo: 10,
  },
  {
    slug: "fast-websites-for-beginners",
    title: "Fast Websites for Beginners",
    subtitle: "Make any website load quickly on mobile",
    category: "website-development",
    usd: 900,
    pages: 88,
    featured: true,
    short: "Understand Core Web Vitals and speed up your site with practical, platform-agnostic fixes.",
    description: "Speed affects rankings, conversions and customer trust. This guide explains what slows websites down and how to fix it without becoming a developer.\n\n> _Demo product — sample content only._",
    audience: "Website owners and junior developers who want measurable speed improvements.",
    outcomes: ["Read a PageSpeed report with confidence", "Optimise images and fonts", "Reduce unnecessary scripts", "Choose sensible hosting"],
    toc: ["Why speed matters", "Measuring performance", "Images and media", "Scripts and third parties", "Hosting and caching"],
    tags: ["web performance", "core web vitals", "website"],
    daysAgo: 20,
  },
  {
    slug: "ai-tools-for-small-business",
    title: "AI Tools for Small Business",
    subtitle: "Save ten hours a week with practical AI workflows",
    category: "ai-tools",
    usd: 1200,
    inr: 59900,
    saleUsd: 900,
    featured: true,
    pages: 96,
    short: "Practical, responsible ways to use AI assistants for writing, research, customer service and admin.",
    description: "A hands-on guide to using AI assistants and automation tools in everyday business tasks — with prompts, workflows and guidance on checking AI output.\n\n> _Demo product — sample content only._",
    audience: "Business owners and teams curious about AI but short on time.",
    outcomes: ["Write effective prompts", "Automate repetitive admin", "Draft content faster while keeping your voice", "Understand privacy and accuracy risks"],
    toc: ["Getting started with AI assistants", "Prompting fundamentals", "Content workflows", "Customer support workflows", "Automation without code", "Risks, privacy and quality control"],
    tags: ["ai", "automation", "productivity"],
    daysAgo: 5,
  },
  {
    slug: "email-marketing-starter-kit",
    title: "Email Marketing Starter Kit",
    subtitle: "Build a list and write emails people want to read",
    category: "digital-marketing",
    usd: 800,
    pages: 72,
    short: "Set up your first email list, write a welcome sequence and send newsletters that get opened.",
    description: "Email remains one of the highest-return marketing channels. This kit covers list building, consent, welcome sequences and simple analytics.\n\n> _Demo product — sample content only._",
    audience: "Creators and small businesses starting email marketing from scratch.",
    outcomes: ["Collect subscribers with clear consent", "Write a welcome sequence", "Plan a sustainable newsletter", "Track the metrics that matter"],
    toc: ["Why email still works", "Consent and compliance basics", "Lead magnets", "Welcome sequences", "Newsletters", "Measuring results"],
    tags: ["email marketing", "newsletter", "marketing"],
    daysAgo: 30,
  },
  {
    slug: "freelance-pricing-guide",
    title: "Price Your Freelance Services",
    subtitle: "Charge what you're worth — with confidence",
    category: "freelancing",
    usd: 900,
    inr: 44900,
    pages: 58,
    short: "Move from hourly rates to clear packages, write proposals that win, and handle price objections.",
    description: "A practical framework for pricing freelance work, packaging services and talking about money with clients.\n\n> _Demo product — sample content only._",
    audience: "New and experienced freelancers in web, design, writing and marketing.",
    outcomes: ["Calculate a sustainable minimum rate", "Package services clearly", "Write winning proposals", "Handle objections calmly"],
    toc: ["Know your numbers", "Hourly vs. project vs. value pricing", "Packaging", "Proposals", "Negotiation"],
    tags: ["freelancing", "pricing", "proposals"],
    daysAgo: 45,
  },
];

export const BUNDLE = {
  slug: "website-and-seo-starter-bundle",
  title: "Website & SEO Starter Bundle",
  subtitle: "Two practical guides to launch a faster, more visible website",
  category: "website-development",
  usd: 1500,
  inr: 69900,
  short: "Get the Small Business Website & SEO Playbook and Fast Websites for Beginners together at a bundle price.",
  description: "Everything you need to plan, speed up and optimise a small business website, in one bundle.\n\n> _Demo bundle — sample content only._",
  includes: ["small-business-website-seo-playbook", "fast-websites-for-beginners"],
};

const REVIEW_NOTE =
  "> **⚠️ Starter template — review before launch.** This text is a generic starting point, not legal advice. Have it reviewed by a qualified professional for your jurisdiction (e.g. India's IT Act and Consumer Protection (E-Commerce) Rules, and the GDPR if you sell to EU customers), then untick “Needs review” in the admin dashboard.\n\n";

export const PAGES: { slug: string; title: string; body: string; metaDescription: string; needsReview: boolean }[] = [
  {
    slug: "about",
    title: "About Us",
    metaDescription: "Who we are and why we publish practical guides on websites, SEO, marketing and business growth.",
    needsReview: false,
    body: `{{storeName}} publishes practical, actionable ebooks for business owners, freelancers and lifelong learners.

Our guides focus on skills that create real results online: building better websites, getting found in search, marketing effectively, using AI tools responsibly and growing a sustainable business.

## What we believe

- **Practical over theoretical.** Every guide includes steps you can apply the same day.
- **Clear language.** We explain jargon and assume no prior technical knowledge.
- **Honest promises.** We don't promise overnight results — we share methods that work with consistent effort.

_Edit this page in the admin dashboard to tell your own story._`,
  },
  {
    slug: "contact",
    title: "Contact",
    metaDescription: "How to get in touch with us.",
    needsReview: false,
    body: `We're happy to help with questions about our ebooks, your order or downloads.

**Email:** {{supportEmail}}

Please include your **order reference** (it starts with \`WGL-\`) if your question is about a purchase. We aim to reply within two business days.`,
  },
  {
    slug: "support",
    title: "Customer Support",
    metaDescription: "Help with downloads, orders and payments.",
    needsReview: false,
    body: `## Downloading your ebook

After your payment is confirmed you are taken to your personal order page, which contains your download buttons. If email delivery is enabled, the same link is emailed to you.

## Lost your download link?

Use [Find my order](/orders/lookup) with the email address you used at checkout and your order reference, or contact us at {{supportEmail}}.

## Payment questions

Payments are processed by our payment provider. We never see or store your card or bank details. If you were charged but did not receive access, contact us with your order reference and we will resolve it promptly.

## Opening your files

PDF files open on any device using a browser or a free PDF reader. EPUB files open in Apple Books, Google Play Books and most e-reader apps.`,
  },
  {
    slug: "faq",
    title: "Frequently Asked Questions",
    metaDescription: "Answers to common questions about our ebooks, payments and downloads.",
    needsReview: false,
    body: `### What format are the ebooks?
Most are PDF. Each product page lists the exact format.

### How do I receive my ebook?
Immediately after your payment is confirmed you'll see a download page. Keep that link — it is your personal access.

### Which currencies can I pay in?
The currency you will be charged in is shown in your cart before you pay. Where a price is shown as an estimate in another currency, the final amount is charged in the listed currency and your bank may apply its own conversion.

### Do I need an account?
No. We only ask for an email address to deliver your purchase.

### Can I get a refund?
Please read our [Refund Policy](/refund-policy).

### Can I share the ebook?
Please see the [Digital Product Licence](/licence).`,
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    metaDescription: "How we collect, use and protect your personal information.",
    needsReview: true,
    body: `${REVIEW_NOTE}This policy explains what information {{storeName}} collects and how it is used.

## Information we collect

- **Purchase information:** your email address, the products you bought, the amount, currency and payment status. Card, UPI and bank details are handled entirely by our payment provider and are never received or stored by us.
- **Newsletter:** your email address and the date you gave consent, only if you opt in.
- **Anonymous statistics:** a daily count of product page views. We do not store IP addresses or use tracking cookies for this.

## Cookies

We use only essential cookies: one to remember your chosen display currency and, for administrators, a secure sign-in cookie. Your cart is stored in your own browser.

## How we use information

To deliver your purchases, provide support, process refunds, meet legal and accounting obligations and — only with consent — send newsletters.

## Service providers

We use trusted providers to run the store, such as hosting, database and file storage, payment processing and (if enabled) email delivery. They process data on our behalf under their own security and privacy terms.

## Retention

Order records are kept for as long as required for accounting and tax purposes. You can unsubscribe from the newsletter at any time using the link in every email.

## Your rights

You may request access to, correction of or deletion of your personal data, subject to legal retention requirements, by contacting {{supportEmail}}.`,
  },
  {
    slug: "terms",
    title: "Terms of Service",
    metaDescription: "The terms that apply when you use this website and purchase our ebooks.",
    needsReview: true,
    body: `${REVIEW_NOTE}By using this website or purchasing from {{storeName}}, you agree to these terms.

## Products

We sell downloadable digital products. Product descriptions aim to be accurate; if we make a mistake, contact us and we will put it right.

## Prices and payment

Prices are shown on each product page. The exact amount and currency you will be charged are shown in your cart before payment. Payments are processed by our payment provider, and your bank may charge foreign-exchange or other fees outside our control.

## Delivery

Access to downloads is granted after your payment is confirmed by our payment provider. Download links are personal and may be subject to reasonable download limits.

## Licence

Your purchase grants a personal licence as described in the [Digital Product Licence](/licence).

## Refunds

See our [Refund Policy](/refund-policy).

## Liability

Our ebooks provide general educational information. Results depend on many factors, and we do not guarantee specific outcomes such as rankings, revenue or traffic.

## Changes

We may update these terms. The version published on this page applies to purchases made while it is published.

## Contact

{{supportEmail}}`,
  },
  {
    slug: "refund-policy",
    title: "Refund and Cancellation Policy",
    metaDescription: "Our refund and cancellation policy for digital products.",
    needsReview: true,
    body: `${REVIEW_NOTE}Because our products are delivered digitally and immediately, orders cannot be cancelled once the download has been made available.

## When we will refund

- You were charged but did not receive access to your download and we cannot resolve the problem.
- The file is faulty or materially different from its description and we cannot provide a working replacement.
- You were charged more than once for the same order.

_[Optional: state whether you offer a satisfaction guarantee, for example "within 14 days of purchase", and any conditions.]_

## How to request a refund

Email {{supportEmail}} with your order reference. Approved refunds are returned to the original payment method through our payment provider. Processing times depend on the provider and your bank.

## After a refund

When an order is fully refunded, access to its downloads ends.`,
  },
  {
    slug: "licence",
    title: "Digital Product Licence",
    metaDescription: "What you may and may not do with ebooks purchased from us.",
    needsReview: true,
    body: `${REVIEW_NOTE}When you buy an ebook from {{storeName}}, you receive a **personal, non-exclusive, non-transferable licence** to use it.

## You may

- Download, read and print the ebook for your own use.
- Keep copies on your own devices.
- Apply the techniques it teaches in your own work and for your clients.

## You may not

- Share, resell, give away or upload the files for others to download.
- Republish substantial parts of the content as your own.
- Remove copyright notices.

For team or organisation licences, contact {{supportEmail}}.

All content remains the intellectual property of its author(s).`,
  },
];
