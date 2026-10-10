import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, Table } from "@/components/admin/ui";
import { PageForm } from "./PageForm";

export const metadata = { title: "Pages" };

export default async function PagesAdmin() {
  const pages = await db.page.findMany({ orderBy: { title: "asc" } });
  return (
    <>
      <PageHeader title="Pages" description="About, contact, legal and help pages. Use {{storeName}} and {{supportEmail}} as placeholders." />
      <Table>
        <thead><tr><th>Title</th><th>URL</th><th>Review</th><th>Footer</th><th>Updated</th></tr></thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.id}>
              <td><Link href={`/admin/pages/${p.id}`} className="font-medium text-teal-700 hover:underline">{p.title}</Link></td>
              <td className="font-mono text-xs">/{p.slug}</td>
              <td>{p.needsReview ? <span className="badge bg-amber-100 text-amber-900">needs review</span> : <span className="badge bg-teal-100 text-teal-800">reviewed</span>}</td>
              <td>{p.showInFooter ? "yes" : "no"}</td>
              <td className="text-xs">{p.updatedAt.toLocaleDateString("en-GB")}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <details className="card mt-6 p-5">
        <summary className="cursor-pointer font-semibold">+ New page</summary>
        <div className="mt-4"><PageForm /></div>
      </details>
    </>
  );
}
