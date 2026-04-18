import { describe, expect, it, vi } from "vitest";
import { AirdropInputSchema } from "../../../types/solana";
import { executeAirdrop } from "../airdrop-tool";

const VALID_ADDRESS = "So11111111111111111111111111111111111111112";

// ─────────────────────────────────────────────
// Input schema validation
// ─────────────────────────────────────────────

describe("AirdropInputSchema", () => {
  it("accepts valid airdrop input", () => {
    expect(
      AirdropInputSchema.safeParse({ address: VALID_ADDRESS, amountSol: 1 }).success,
    ).toBe(true);
  });

  it("rejects amountSol > 2", () => {
    expect(
      AirdropInputSchema.safeParse({ address: VALID_ADDRESS, amountSol: 2.1 }).success,
    ).toBe(false);
  });

  it("rejects amountSol = 0", () => {
    expect(
      AirdropInputSchema.safeParse({ address: VALID_ADDRESS, amountSol: 0 }).success,
    ).toBe(false);
  });

  it("rejects negative amountSol", () => {
    expect(
      AirdropInputSchema.safeParse({ address: VALID_ADDRESS, amountSol: -1 }).success,
    ).toBe(false);
  });

  it("rejects empty address", () => {
    expect(
      AirdropInputSchema.safeParse({ address: "", amountSol: 1 }).success,
    ).toBe(false);
  });

  it("accepts exactly 2 SOL", () => {
    expect(
      AirdropInputSchema.safeParse({ address: VALID_ADDRESS, amountSol: 2 }).success,
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────
// executeAirdrop — core logic
// ─────────────────────────────────────────────

describe("executeAirdrop", () => {
  const FAKE_SIG = "5xFakeSignatureAbcdef1234567890AbcdefGhijklmnop";

  it("returns signature and amountSol on success", async () => {
    const requestAirdropFn = vi.fn().mockResolvedValue(FAKE_SIG);
    const confirmFn = vi.fn().mockResolvedValue(undefined);

    const result = await executeAirdrop(VALID_ADDRESS, 1, requestAirdropFn, confirmFn);

    expect(result.signature).toBe(FAKE_SIG);
    expect(result.amountSol).toBe(1);
  });

  it("calls requestAirdropFn with correct lamports (1 SOL = 1e9)", async () => {
    const requestAirdropFn = vi.fn().mockResolvedValue(FAKE_SIG);
    const confirmFn = vi.fn().mockResolvedValue(undefined);

    await executeAirdrop(VALID_ADDRESS, 1, requestAirdropFn, confirmFn);

    expect(requestAirdropFn).toHaveBeenCalledWith(VALID_ADDRESS, 1_000_000_000);
  });

  it("calls requestAirdropFn with correct lamports for 0.5 SOL", async () => {
    const requestAirdropFn = vi.fn().mockResolvedValue(FAKE_SIG);
    const confirmFn = vi.fn().mockResolvedValue(undefined);

    await executeAirdrop(VALID_ADDRESS, 0.5, requestAirdropFn, confirmFn);

    expect(requestAirdropFn).toHaveBeenCalledWith(VALID_ADDRESS, 500_000_000);
  });

  it("throws RPC_ERROR when requestAirdrop fails", async () => {
    const requestAirdropFn = vi.fn().mockRejectedValue(new Error("airdrop limit exceeded"));
    const confirmFn = vi.fn();

    await expect(
      executeAirdrop(VALID_ADDRESS, 1, requestAirdropFn, confirmFn),
    ).rejects.toThrow(/RPC_ERROR/);
  });

  it("passes address and amountSol through to result", async () => {
    const requestAirdropFn = vi.fn().mockResolvedValue(FAKE_SIG);
    const confirmFn = vi.fn().mockResolvedValue(undefined);

    const result = await executeAirdrop(VALID_ADDRESS, 2, requestAirdropFn, confirmFn);

    expect(result.amountSol).toBe(2);
  });
});
