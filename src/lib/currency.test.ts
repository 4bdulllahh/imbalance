import { describe, expect, it, vi, afterEach } from "vitest";
import { openDb } from "./db";
import { getRates, RATES_MAX_AGE_MS } from "./currency";
import { formatIn } from "./format";

afterEach(() => vi.unstubAllGlobals());

const ok = (rates: Record<string, number>) =>
  vi.fn(async () =>
    Response.json({ result: "success", base_code: "USD", rates }),
  );

describe("currency", () => {
  it("converts USD cents for display only", () => {
    expect(formatIn(1000, "USD", 1)).toBe("$10.00");
    expect(formatIn(1000, "AED", 3.6725)).toMatch(/^AED\s36\.73$/);
    expect(formatIn(null, "CAD", 1.4)).toBe("-");
  });

  it("caches rates for a day and keeps old rates when the API fails", async () => {
    const db = openDb(":memory:");
    const fetchMock = ok({ CAD: 1.4 });
    vi.stubGlobal("fetch", fetchMock);
    expect((await getRates(db, 1000)).rates).toEqual({ CAD: 1.4, USD: 1 });
    await getRates(db, 2000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("down", { status: 500 })),
    );
    expect((await getRates(db, 1000 + RATES_MAX_AGE_MS)).rates.CAD).toBe(1.4);
  });

  it("falls back to USD only with no saved rates and no internet", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("offline"))),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await getRates(openDb(":memory:"))).rates).toEqual({ USD: 1 });
  });
});
