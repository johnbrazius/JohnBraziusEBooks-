import { displayPrice, type PricedProduct } from "@/lib/pricing";
import { formatMoney } from "@/lib/money";

export type PriceContext = { currency: string; baseCurrency: string; rates: Record<string, number> };

type Props = { product: Omit<PricedProduct, "title" | "id"> & { id?: string; title?: string }; ctx: PriceContext; size?: "sm" | "lg" };

/** Shows the price a visitor would actually be charged, plus a clearly labelled estimate where relevant. */
export function Price({ product, ctx, size = "sm" }: Props) {
  const dp = displayPrice({ id: "", title: "", ...product }, ctx.currency, ctx.baseCurrency, ctx.rates, new Date());
  if (!dp) return <span className="text-sm text-navy-500">Price unavailable</span>;
  const { price } = dp;
  const big = size === "lg";
  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-2">
        <span className={`${big ? "text-3xl" : "text-lg"} font-bold text-navy-900`}>{formatMoney(price.amount, price.currency)}</span>
        {price.onSale && (
          <span className={`${big ? "text-base" : "text-sm"} text-navy-400 line-through`}>
            <span className="sr-only">Regular price </span>
            {formatMoney(price.regularAmount, price.currency)}
          </span>
        )}
        {price.onSale && <span className="badge bg-teal-50 text-teal-800">Sale</span>}
      </div>
      {dp.kind === "base" && dp.estimate && (
        <span className="text-xs text-navy-500">
          ≈ {formatMoney(dp.estimate.amount, dp.estimate.currency)} (estimate — charged in {price.currency})
        </span>
      )}
    </div>
  );
}
