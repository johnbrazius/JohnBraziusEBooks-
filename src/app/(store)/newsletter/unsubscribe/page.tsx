import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

type SP = Promise<{ token?: string; done?: string }>;

export default async function UnsubscribePage({ searchParams }: { searchParams: SP }) {
  const { token, done } = await searchParams;

  async function unsubscribe() {
    "use server";
    if (token) await db.newsletterSubscriber.updateMany({ where: { unsubscribeToken: token }, data: { status: "UNSUBSCRIBED" } });
    redirect("/newsletter/unsubscribe?done=1");
  }

  return (
    <div className="container-page max-w-lg py-16 text-center">
      <h1 className="font-display text-3xl font-bold text-navy-900">Unsubscribe</h1>
      {done ? (
        <p role="status" className="mt-4 text-navy-700">You have been unsubscribed. You will not receive further newsletter emails.</p>
      ) : token ? (
        // A button (not an automatic GET) so email link scanners cannot unsubscribe people by accident.
        <form action={unsubscribe} className="mt-6">
          <p className="text-navy-700">Click below to stop receiving our newsletter.</p>
          <button className="btn-navy mt-4">Unsubscribe me</button>
        </form>
      ) : (
        <p className="mt-4 text-navy-700">This unsubscribe link is invalid or incomplete.</p>
      )}
    </div>
  );
}
