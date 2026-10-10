"use client";

import { useSyncExternalStore } from "react";

/** The cart holds only product IDs. Prices are always re-quoted by the server. */
const KEY = "wgl_cart_v1";
const EVENT = "wgl-cart-change";
const MAX_ITEMS = 50;

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

let cache: string[] = [];
let cacheRaw: string | null = null;

function snapshot(): string[] {
  const raw = typeof window === "undefined" ? null : localStorage.getItem(KEY);
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    cache = read();
  }
  return cache;
}

function write(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify([...new Set(ids)].slice(0, MAX_ITEMS)));
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

const EMPTY: string[] = [];

export function useCart() {
  const items = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  return {
    items,
    has: (id: string) => items.includes(id),
    add: (id: string) => write([...snapshot(), id]),
    remove: (id: string) => write(snapshot().filter((x) => x !== id)),
    set: (ids: string[]) => write(ids),
    clear: () => write([]),
  };
}
