import type { Metadata } from "next";
import { DevTools } from "@/components/DevTools";

export const metadata: Metadata = { title: "Dev tools | Imbalance" };

export default function DebugPage() {
  return <DevTools />;
}
