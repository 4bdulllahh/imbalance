import { floatFlags } from "@/lib/special-float";

/** Small badges for floats collectors pay extra for. */
export function FloatBadges({
  float,
  min,
  max,
}: {
  float: number | null;
  min?: number | null;
  max?: number | null;
}) {
  if (float == null) return null;
  return (
    <>
      {floatFlags(float, min ?? 0, max ?? 1).map((f) => (
        <span
          key={f.label}
          title={f.detail}
          className={`ml-1.5 rounded border px-1 font-sans text-xs ${f.rare ? "border-good text-good" : "border-accent text-accent"}`}
        >
          {f.label}
        </span>
      ))}
    </>
  );
}
