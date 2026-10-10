import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { makePlaceholderPdf } from "../../scripts/lib/pdf";

// Repeated local runs would otherwise trip the (intentional) login rate limit and account lockout.
test.beforeAll(async () => {
  const db = new PrismaClient();
  await db.rateLimit.deleteMany({});
  await db.adminUser.updateMany({ data: { failedLoginCount: 0, lockedUntil: null } });
  await db.$disconnect();
});

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "E2e-Test-Password-123";
const slug = `e2e-test-ebook-${Date.now()}`;
const title = `E2E Test Ebook ${Date.now()}`;

// 1×1 PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function buy(page: Page, productSlug: string, outcome: "success" | "fail") {
  await page.goto(`/ebooks/${productSlug}`);
  await page.getByRole("button", { name: "Buy now" }).click();
  await expect(page).toHaveURL(/\/cart/);
  await page.getByLabel("Email for delivery").fill("buyer@example.com");
  await page.getByRole("checkbox", { name: /I agree to the/ }).check();
  await page.getByRole("button", { name: /^Pay / }).click();
  await expect(page).toHaveURL(/\/checkout\/mock\//);
  await page.getByRole("button", { name: outcome === "success" ? "Simulate successful payment" : "Simulate failed payment" }).click();
  await expect(page).toHaveURL(/\/orders\/WGL-/);
}

test.describe.serial("product lifecycle", () => {
  test("admin area is protected", async ({ page, request }) => {
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/admin\/login/);
    expect((await request.post("/api/admin/uploads", { data: {} })).status()).toBe(401);
    expect((await request.get("/api/admin/export?type=orders")).status()).toBe(401);
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill("wrong-password-123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
  });

  test("create draft, publish, edit, purchase, download, unpublish", async ({ page, request }) => {
    await login(page);

    // Create a draft with cover + PDF
    await page.goto("/admin/products/new");
    await page.getByLabel("Title *").fill(title);
    await page.getByLabel("URL slug *").fill(slug);
    await page.getByLabel(/Short description/).fill("A short description long enough to pass validation.");
    await page.getByLabel("Full description *").fill("A full description that is definitely longer than fifty characters for the test.");
    await page.getByLabel("Category").selectOption({ label: "SEO and Local SEO" });
    await page.getByLabel("Price in USD", { exact: true }).fill("12.00");
    await page.getByLabel("Price in INR", { exact: true }).fill("599");
    await page.getByLabel("Cover image").setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByText("cover.png (1 KB) uploaded")).toBeVisible();
    await page.getByLabel("Downloadable ebook file *").setInputFiles({ name: "book.pdf", mimeType: "application/pdf", buffer: makePlaceholderPdf(["E2E BOOK CONTENT"]) });
    await expect(page.getByText(/book\.pdf .* uploaded/)).toBeVisible();
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Draft created")).toBeVisible();

    // Draft is not public
    expect((await request.get(`/ebooks/${slug}`)).status()).toBe(404);
    const listing = await (await request.get(`/ebooks?q=${encodeURIComponent(title)}`)).text();
    expect(listing).not.toContain(`href="/ebooks/${slug}"`);

    // Invalid price is rejected
    await page.getByLabel("Price in USD", { exact: true }).fill("-3");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText(/Enter a valid price above zero/).first()).toBeVisible();
    await page.getByLabel("Price in USD", { exact: true }).fill("12.00");

    // Publish
    await page.getByRole("button", { name: "Save & publish" }).click();
    await expect(page.getByText("Published — it is now live")).toBeVisible();
    const editUrl = page.url();

    await page.goto(`/ebooks?q=${encodeURIComponent(title)}`);
    await expect(page.getByRole("link", { name: title })).toBeVisible();
    await page.getByRole("link", { name: title }).click();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByText("$12").first()).toBeVisible();

    // Edit price + description
    await page.goto(editUrl);
    await page.getByLabel("Price in USD", { exact: true }).fill("15.00");
    await page.getByLabel("Full description *").fill("An updated full description that is also longer than fifty characters, for the edit test.");
    await page.getByLabel("Downloadable ebook file *").setInputFiles({ name: "book-v2.pdf", mimeType: "application/pdf", buffer: makePlaceholderPdf(["E2E BOOK VERSION 2"]) });
    await expect(page.getByText(/book-v2\.pdf .* uploaded/)).toBeVisible();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await expect(page.getByText("Current: book-v2.pdf")).toBeVisible();
    await page.goto(`/ebooks/${slug}`);
    await expect(page.getByText("$15").first()).toBeVisible();
    await expect(page.getByText("An updated full description")).toBeVisible();

    // Currency switch shows the fixed INR price
    await page.getByLabel("Display currency").selectOption("INR");
    await expect(page.getByText("₹599").first()).toBeVisible();
    await page.getByLabel("Display currency").selectOption("USD");
    await expect(page.getByText("$15").first()).toBeVisible();

    // Failed payment never unlocks
    await buy(page, slug, "fail");
    await expect(page.getByRole("heading", { name: "Payment not completed" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Download" })).toHaveCount(0);

    // Successful payment unlocks exactly this product
    await buy(page, slug, "success");
    await expect(page.getByRole("heading", { name: /your ebooks are ready/ })).toBeVisible();
    const dl = page.getByRole("link", { name: "Download" });
    await expect(dl).toHaveCount(1);
    const href = await dl.getAttribute("href");
    const file = await request.get(href!);
    expect(file.status()).toBe(200);
    expect(file.headers()["content-type"]).toBe("application/pdf");
    expect((await file.body()).toString("latin1")).toContain("E2E BOOK VERSION 2");

    // Tampered token cannot download or view the order
    const bad = href!.replace(/t=[^&]+/, "t=forged");
    expect((await request.get(bad)).status()).toBe(404);
    const orderUrl = new URL(page.url());
    orderUrl.searchParams.set("t", "forged");
    expect((await request.get(orderUrl.pathname + orderUrl.search)).status()).toBe(404);

    // Unpublish removes it from public listings
    await page.goto(editUrl);
    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByText("Unpublished")).toBeVisible();
    expect((await request.get(`/ebooks/${slug}`)).status()).toBe(404);
    expect(await (await request.get("/sitemap.xml")).text()).not.toContain(slug);
  });

  test("payment webhooks require a valid signature", async ({ request }) => {
    const res = await request.post("/api/webhooks/razorpay", {
      data: { event: "payment.captured", payload: { payment: { entity: { id: "pay_fake", order_id: "order_fake", amount: 100, currency: "INR" } } } },
      headers: { "x-razorpay-signature": "forged" },
    });
    expect(res.status()).toBe(400);
  });

  test("private areas are not indexable", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /orders");
    const res = await request.get("/admin/login");
    expect(res.headers()["x-robots-tag"]).toContain("noindex");
  });

  test("storefront works on mobile", async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    await page.getByLabel("Menu").click();
    await expect(page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "All ebooks" })).toBeVisible();
  });
});
