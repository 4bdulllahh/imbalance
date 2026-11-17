import { WEARS } from "./wear";

export type FloatFlag = { label: string; detail: string; rare: boolean };

/**
 * Floats collectors pay extra for: very low (0.00x, 0.000x), the best of a wear (just past
 * its lower edge), and the extremes of what the skin can roll. Imbalance flags them, but
 * can't price the premium: that needs sales at that exact float.
 */
export function floatFlags(
  float: number,
  minFloat = 0,
  maxFloat = 1,
): FloatFlag[] {
  const flags: FloatFlag[] = [];
  if (float < 0.001)
    flags.push({
      label: "0.000x",
      detail: "Double-zero float, very rare",
      rare: true,
    });
  else if (float < 0.01)
    flags.push({
      label: "0.00x",
      detail: "Under 0.01, collectors pay more",
      rare: false,
    });

  if (minFloat > 0 && float - minFloat < 0.001) {
    flags.push({
      label: "Lowest possible",
      detail: `Within 0.001 of this skin's minimum (${minFloat})`,
      rare: true,
    });
  }
  if (maxFloat - float < 0.001 && float > 0.5) {
    flags.push({
      label: "Highest possible",
      detail: `Within 0.001 of this skin's maximum (${maxFloat})`,
      rare: true,
    });
  } else if (float > 0.99) {
    flags.push({
      label: "0.99+",
      detail: "Near-max float, some collectors want these",
      rare: false,
    });
  }

  // Best of its wear: within 0.01 of the wear's lower edge (e.g. MW 0.070 to 0.080).
  const idx = WEARS.findIndex((w) => float < w.max);
  if (idx > 0) {
    const start = WEARS[idx - 1].max;
    if (float - start < 0.01 && start > minFloat) {
      flags.push({
        label: `Best ${WEARS[idx].short}`,
        detail: `Just past ${start}: the cleanest-looking ${WEARS[idx].name}`,
        rare: false,
      });
    }
  }
  return flags;
}
