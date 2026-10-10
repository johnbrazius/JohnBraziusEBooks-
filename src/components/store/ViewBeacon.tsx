"use client";

import { useEffect } from "react";

/** Counts one anonymous product view per page load. No cookies, IPs or identifiers are stored. */
export function ViewBeacon({ productId }: { productId: string }) {
  useEffect(() => {
    const body = JSON.stringify({ productId });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/views", new Blob([body], { type: "application/json" }));
    else fetch("/api/views", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  }, [productId]);
  return null;
}
