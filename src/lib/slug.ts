export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Paths the storefront already uses at the top level; CMS pages may not claim them.
export const RESERVED_PAGE_SLUGS = new Set([
  "admin", "api", "ebooks", "categories", "cart", "checkout", "orders", "media", "newsletter",
  "sitemap.xml", "robots.txt", "search", "login", "_next",
]);
