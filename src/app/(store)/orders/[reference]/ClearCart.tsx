"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-client";

export function ClearCart() {
  const cart = useCart();
  useEffect(() => {
    if (cart.items.length) cart.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
