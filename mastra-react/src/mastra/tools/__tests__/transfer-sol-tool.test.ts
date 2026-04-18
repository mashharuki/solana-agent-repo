import { describe, expect, it, vi } from "vitest";
import { TransferSolInputSchema } from "../../../types/solana";
import { buildTransferTransaction } from "../transfer-sol-tool";

// Known valid Solana base58 public keys for tests
const FROM = "So11111111111111111111111111111111111111112"; // Wrapped SOL mint
const TO = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"; // Token Program
const TEST_BLOCKHASH = "11111111111111111111111111111111"; // 32-byte zero hash (valid base58)

function makeDeps(balanceLamports: number) {
  return {
    getBalanceFn: vi.fn().mockResolvedValue(balanceLamports),
    getRecentBlockhashFn: vi.fn().mockResolvedValue(TEST_BLOCKHASH),
  };
}

// ─────────────────────────────────────────────
// Input schema validation
// ─────────────────────────────────────────────

describe("TransferSolInputSchema", () => {
  it("accepts valid transfer input", () => {
    const result = TransferSolInputSchema.safeParse({
      fromAddress: FROM,
      toAddress: TO,
      amountSol: 0.1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero amountSol", () => {
    const result = TransferSolInputSchema.safeParse({
      fromAddress: FROM,
      toAddress: TO,
      amountSol: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative amountSol", () => {
    const result = TransferSolInputSchema.safeParse({
      fromAddress: FROM,
      toAddress: TO,
      amountSol: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty fromAddress", () => {
    const result = TransferSolInputSchema.safeParse({
      fromAddress: "",
      toAddress: TO,
      amountSol: 0.1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty toAddress", () => {
    const result = TransferSolInputSchema.safeParse({
      fromAddress: FROM,
      toAddress: "",
      amountSol: 0.1,
    });
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────
// buildTransferTransaction — core logic
// ─────────────────────────────────────────────

describe("buildTransferTransaction", () => {
  it('returns SolanaTxRequest with type "solana_tx_request"', async () => {
    const result = await buildTransferTransaction(FROM, TO, 0.1, makeDeps(1_000_000_000));
    expect(result.type).toBe("solana_tx_request");
  });

  it('returns txType "transfer"', async () => {
    const result = await buildTransferTransaction(FROM, TO, 0.1, makeDeps(1_000_000_000));
    expect(result.txType).toBe("transfer");
  });

  it("returns a non-empty base64 serializedTx", async () => {
    const result = await buildTransferTransaction(FROM, TO, 0.1, makeDeps(1_000_000_000));
    expect(typeof result.serializedTx).toBe("string");
    expect(result.serializedTx.length).toBeGreaterThan(0);
    // Base64 characters only
    expect(result.serializedTx).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("description includes the transfer amount", async () => {
    const result = await buildTransferTransaction(FROM, TO, 0.5, makeDeps(1_000_000_000));
    expect(result.description).toContain("0.5");
  });

  it("description includes a truncated destination address", async () => {
    const result = await buildTransferTransaction(FROM, TO, 0.1, makeDeps(1_000_000_000));
    // TO starts with "Toke" and ends with "Q5DA"
    expect(result.description).toMatch(/Toke|Q5DA/);
  });

  it("throws INSUFFICIENT_BALANCE when balance < required lamports", async () => {
    const deps = makeDeps(50_000_000); // 0.05 SOL
    await expect(
      buildTransferTransaction(FROM, TO, 0.1, deps), // needs 0.1 SOL
    ).rejects.toThrow(/INSUFFICIENT_BALANCE/);
  });

  it("throws INSUFFICIENT_BALANCE with current and required amounts", async () => {
    const deps = makeDeps(0);
    await expect(
      buildTransferTransaction(FROM, TO, 1, deps),
    ).rejects.toThrow(/0\.0000.*SOL|0 SOL/i);
  });

  it("succeeds when balance exactly equals required lamports", async () => {
    const deps = makeDeps(100_000_000); // exactly 0.1 SOL
    const result = await buildTransferTransaction(FROM, TO, 0.1, deps);
    expect(result.type).toBe("solana_tx_request");
  });
});
