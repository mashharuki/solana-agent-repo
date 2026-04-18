import { describe, expect, it } from "vitest";
import { formatSolBalance } from "../asset-utils";

describe("formatSolBalance", () => {
  it('returns "—" when balance is null (not yet loaded)', () => {
    expect(formatSolBalance(null)).toBe("—");
  });

  it('returns "0.0000 SOL" when balance is zero', () => {
    expect(formatSolBalance(0)).toBe("0.0000 SOL");
  });

  it("formats a positive whole number to 4 decimal places", () => {
    expect(formatSolBalance(1)).toBe("1.0000 SOL");
  });

  it("formats a fractional balance to 4 decimal places", () => {
    expect(formatSolBalance(0.5)).toBe("0.5000 SOL");
  });

  it("rounds to 4 decimal places", () => {
    expect(formatSolBalance(1.23456789)).toBe("1.2346 SOL");
  });

  it("handles large balances", () => {
    expect(formatSolBalance(100)).toBe("100.0000 SOL");
  });

  it("handles very small balances near zero", () => {
    expect(formatSolBalance(0.0001)).toBe("0.0001 SOL");
  });
});
