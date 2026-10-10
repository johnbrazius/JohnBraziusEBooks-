import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, BackLink } from "@/components/admin/ui";
import { PageForm } from "../PageForm";
import { deletePage } from "../actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export const metadata = { title: "Edit page" };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await db.page.findUnique({ where: { id } });
  if (!page) notFound();
  return (
    <>
      <BackLink href="/admin/pages">Pages</BackLink>
      <PageHeader title={page.title} actions={<Link href={`/${page.slug}`} target="_blank" className="btn-secondary">View ↗</Link>} />
      <PageForm key={page.updatedAt.toISOString()} initial={{ id: page.id, title: page.title, slug: page.slug, body: page.body, metaDescription: page.metaDescription ?? "", needsReview: page.needsReview, showInFooter: page.showInFooter }} />
      <form action={deletePage} className="mt-8"><input type="hidden" name="id" value={page.id} /><ConfirmButton className="btn-danger" message="Delete this page?">Delete page</ConfirmButton></form>
    </>
  );
}
