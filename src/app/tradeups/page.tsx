import { Suspense } from "react";
import type { Metadata } from "next";
import { TradeUps } from "@/components/TradeUps";

export const metadata: Metadata = { title: "Trade-ups | Imbalance" };

export default function TradeUpsPage() {
  // The page reads its filters from the URL, so it renders in the browser.
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading...</p>}>
      <TradeUps />
    </Suspense>
  );
}
