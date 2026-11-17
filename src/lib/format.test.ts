import { describe, expect, it } from "vitest";
import { formatAgo, formatMoney } from "./format";

describe("format", () => {
  it("formats cents", () => {
    expect(formatMoney(123456)).toBe("$1,234.56");
    expect(formatMoney(null)).toBe("-");
  });
  it("formats time ago", () => {
    const now = 10_000_000_000;
    expect(formatAgo(null, now)).toBe("never");
    expect(formatAgo(now - 5 * 60_000, now)).toBe("5 min ago");
    expect(formatAgo(now - 3 * 3_600_000, now)).toBe("3 h ago");
    expect(formatAgo(now - 72 * 3_600_000, now)).toBe("3 days ago");
  });
});
