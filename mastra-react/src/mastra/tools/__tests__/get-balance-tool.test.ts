import { describe, expect, it, vi } from "vitest";
import { GetBalanceInputSchema } from "../../../types/solana";
import { executeGetBalance } from "../get-balance-tool";

// ─────────────────────────────────────────────
// Input schema validation (Zod)
// ─────────────────────────────────────────────

describe("GetBalanceInputSchema", () => {
  it("accepts a non-empty address string", () => {
    const result = GetBalanceInputSchema.safeParse({
      address: "FakeAddr1111111111111111111111111111111",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty address", () => {
    const result = GetBalanceInputSchema.safeParse({ address: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing address field", () => {
    const result = GetBalanceInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────
// executeGetBalance — core logic
// ─────────────────────────────────────────────

describe("executeGetBalance", () => {
  const TEST_ADDRESS = "FakeAddr1111111111111111111111111111111";

  it("returns correct GetBalanceOutput for 1 SOL", async () => {
    const getBalanceFn = vi.fn().mockResolvedValue(1_000_000_000);
    const result = await executeGetBalance(TEST_ADDRESS, getBalanceFn);

    expect(result).toEqual({
      address: TEST_ADDRESS,
      lamports: 1_000_000_000,
      sol: 1,
      network: "devnet",
    });
  });

  it("returns sol as lamports / 1e9", async () => {
    const getBalanceFn = vi.fn().mockResolvedValue(500_000_000);
    const result = await executeGetBalance(TEST_ADDRESS, getBalanceFn);

    expect(result.lamports).toBe(500_000_000);
    expect(result.sol).toBeCloseTo(0.5);
  });

  it("returns sol = 0 when balance is 0 lamports", async () => {
    const getBalanceFn = vi.fn().mockResolvedValue(0);
    const result = await executeGetBalance(TEST_ADDRESS, getBalanceFn);

    expect(result.lamports).toBe(0);
    expect(result.sol).toBe(0);
  });

  it('always sets network to "devnet"', async () => {
    const getBalanceFn = vi.fn().mockResolvedValue(0);
    const result = await executeGetBalance(TEST_ADDRESS, getBalanceFn);

    expect(result.network).toBe("devnet");
  });

  it("passes the address through to output", async () => {
    const getBalanceFn = vi.fn().mockResolvedValue(0);
    const result = await executeGetBalance(TEST_ADDRESS, getBalanceFn);

    expect(result.address).toBe(TEST_ADDRESS);
  });

  it("propagates RPC errors", async () => {
    const getBalanceFn = vi
      .fn()
      .mockRejectedValue(new Error("RPC unavailable"));

    await expect(executeGetBalance(TEST_ADDRESS, getBalanceFn)).rejects.toThrow(
      "RPC unavailable",
    );
  });

  it("calls getBalanceFn with the provided address", async () => {
    const getBalanceFn = vi.fn().mockResolvedValue(0);
    await executeGetBalance(TEST_ADDRESS, getBalanceFn);

    expect(getBalanceFn).toHaveBeenCalledWith(TEST_ADDRESS);
  });
});
