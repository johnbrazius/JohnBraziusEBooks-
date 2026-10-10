import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { activeProvider } from "@/lib/payments";
import { CartView } from "./CartView";

export const metadata: Metadata = { title: "Your cart", robots: { index: false, follow: false } };

export default async function CartPage() {
  const settings = await getSettings();
  const provider = activeProvider();
  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-bold text-navy-900 sm:text-4xl">Your cart</h1>
      <CartView storeName={settings.storeName} checkoutReady={Boolean(provider?.ready)} />
    </div>
  );
}
