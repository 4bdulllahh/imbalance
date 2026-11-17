import { describe, expect, it } from "vitest";
import { floatFlags } from "./special-float";

const labels = (f: number, min?: number, max?: number) =>
  floatFlags(f, min, max).map((x) => x.label);

describe("floatFlags", () => {
  it("flags very low floats", () => {
    expect(labels(0.0004)).toEqual(["0.000x"]);
    expect(labels(0.005)).toEqual(["0.00x"]);
    expect(labels(0.02)).toEqual([]);
  });
  it("flags the best of a wear", () => {
    expect(labels(0.0705)).toEqual(["Best MW"]);
    expect(labels(0.155)).toEqual(["Best FT"]);
    expect(labels(0.2)).toEqual([]);
  });
  it("flags the skin's own extremes", () => {
    expect(labels(0.0605, 0.06, 0.8)).toEqual(["Lowest possible"]);
    expect(labels(0.7995, 0, 0.8)).toEqual(["Highest possible"]);
    expect(labels(0.995)).toEqual(["0.99+"]);
  });
  it("doesn't call a skin's minimum the best of a wear it can't go below", () => {
    // Skin min 0.15: every FT starts at 0.15, so "Best FT" means nothing; "Lowest possible" does.
    expect(labels(0.1505, 0.15, 1)).toEqual(["Lowest possible"]);
  });
});
