import { Suspense } from "react";
import type { Metadata } from "next";
import { Deals } from "@/components/Deals";

export const metadata: Metadata = { title: "Deals | Imbalance" };

export default function DealsPage() {
  // The page reads its filters from the URL, so it renders in the browser.
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading...</p>}>
      <Deals />
    </Suspense>
  );
}
