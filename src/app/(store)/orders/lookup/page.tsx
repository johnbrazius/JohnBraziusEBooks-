import type { Metadata } from "next";
import { LookupForm } from "./LookupForm";

export const metadata: Metadata = { title: "Find my order", robots: { index: false } };

export default function LookupPage() {
  return (
    <div className="container-page max-w-lg py-12">
      <h1 className="font-display text-3xl font-bold text-navy-900">Find my order</h1>
      <p className="mt-3 text-navy-700">Lost your download link? Enter the email you used at checkout and your order reference. We’ll email the link to that address.</p>
      <LookupForm />
    </div>
  );
}
