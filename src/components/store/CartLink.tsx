"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-client";

export function CartLink() {
  const { items } = useCart();
  return (
    <Link href="/cart" className="relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-navy-800 hover:bg-navy-50">
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" />
      </svg>
      <span>Cart</span>
      {items.length > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-teal-600 px-1 text-xs font-bold text-white">
          {items.length}
          <span className="sr-only"> items</span>
        </span>
      )}
    </Link>
  );
}
