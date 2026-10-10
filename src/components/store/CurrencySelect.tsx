"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCurrency } from "@/app/actions";

export function CurrencySelect({ current, options }: { current: string; options: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (options.length < 2) return null;
  return (
    <label className="flex items-center gap-1.5 text-sm text-navy-700">
      <span className="sr-only">Display currency</span>
      <select
        className="rounded-md border border-navy-200 bg-white py-1 pl-2 pr-7 text-sm"
        value={current}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            await setCurrency(e.target.value);
            router.refresh();
          })
        }
      >
        {options.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </label>
  );
}
