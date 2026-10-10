import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { Markdown } from "@/components/ui/Markdown";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";

type Params = Promise<{ pageSlug: string }>;

async function load(slug: string) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  return db.page.findUnique({ where: { slug } });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { pageSlug } = await params;
  const page = await load(pageSlug);
  if (!page) return { title: "Page not found", robots: { index: false } };
  return { title: page.title, description: page.metaDescription ?? undefined, alternates: { canonical: `/${page.slug}` } };
}

export default async function ContentPage({ params }: { params: Params }) {
  const { pageSlug } = await params;
  const page = await load(pageSlug);
  if (!page) notFound();
  const settings = await getSettings();
  // Simple placeholders admins can use in page copy.
  const body = page.body
    .replaceAll("{{storeName}}", settings.storeName)
    .replaceAll("{{supportEmail}}", settings.supportEmail || "[support email not set — add it in Settings]");

  return (
    <div className="container-page max-w-3xl py-10">
      <Breadcrumbs items={[{ name: page.title, href: `/${page.slug}` }]} />
      <h1 className="mt-4 font-display text-3xl font-bold text-navy-900 sm:text-4xl">{page.title}</h1>
      <p className="mt-2 text-sm text-navy-500">Last updated {page.updatedAt.toLocaleDateString("en-GB", { dateStyle: "long" })}</p>
      <Markdown className="mt-8">{body}</Markdown>
    </div>
  );
}
