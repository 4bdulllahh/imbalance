import type { Metadata } from "next";
import { Tracker } from "@/components/Tracker";

export const metadata: Metadata = { title: "Tracker | Imbalance" };

export default function TrackerPage() {
  return <Tracker />;
}
