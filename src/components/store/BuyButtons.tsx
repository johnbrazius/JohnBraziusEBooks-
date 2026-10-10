"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-client";

export function BuyButtons({ productId, disabled }: { productId: string; disabled?: boolean }) {
  const cart = useCart();
  const router = useRouter();
  const inCart = cart.has(productId);
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        className="btn-primary px-6 py-3 text-base"
        disabled={disabled}
        onClick={() => {
          cart.add(productId);
          router.push("/cart");
        }}
      >
        Buy now
      </button>
      <button
        type="button"
        className="btn-secondary px-6 py-3 text-base"
        disabled={disabled}
        onClick={() => (inCart ? router.push("/cart") : cart.add(productId))}
        aria-live="polite"
      >
        {inCart ? "In cart — view cart" : "Add to cart"}
      </button>
    </div>
  );
}
