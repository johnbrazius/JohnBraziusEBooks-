import { db } from "@/lib/db";
import { PageHeader, Table, Notice } from "@/components/admin/ui";

export const metadata = { title: "Newsletter" };

export default async function NewsletterAdmin() {
  const [subs, counts] = await Promise.all([
    db.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    db.newsletterSubscriber.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const n = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  return (
    <>
      <PageHeader title="Newsletter" description={`${n("SUBSCRIBED")} subscribed · ${n("UNSUBSCRIBED")} unsubscribed`} actions={<a download className="btn-secondary" href="/api/admin/export?type=newsletter">Export subscribers (CSV)</a>} />
      <Notice>
        Subscribers are stored with the exact consent text and date. Export the CSV to your email platform (e.g. Brevo, MailerLite, Mailchimp) to send campaigns,
        and include each subscriber’s unsubscribe link or use the platform’s own unsubscribe handling.
      </Notice>
      <div className="mt-6">
        {subs.length === 0 ? <Notice>No subscribers yet.</Notice> : (
          <Table>
            <thead><tr><th>Email</th><th>Status</th><th>Consented</th><th>Source</th></tr></thead>
            <tbody>{subs.map((s) => <tr key={s.id}><td>{s.email}</td><td>{s.status.toLowerCase()}</td><td className="text-xs">{s.consentAt.toLocaleString("en-GB")}</td><td>{s.source}</td></tr>)}</tbody>
          </Table>
        )}
      </div>
    </>
  );
}
