import { describe, expect, it, vi } from "vitest";
import { CallProgramInputSchema } from "../../../types/solana";
import { buildCallProgramTransaction } from "../call-program-tool";

const PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const FROM = "So11111111111111111111111111111111111111112";
const TEST_BLOCKHASH = "11111111111111111111111111111111";

const VALID_PARAMS = {
  programId: PROGRAM_ID,
  instructionData: "AQID", // base64 = [1,2,3]
  accounts: [
    { pubkey: FROM, isSigner: true, isWritable: true },
  ],
  fromAddress: FROM,
};

const deps = {
  getRecentBlockhashFn: vi.fn().mockResolvedValue(TEST_BLOCKHASH),
};

// ─────────────────────────────────────────────
// Input schema validation
// ─────────────────────────────────────────────

describe("CallProgramInputSchema", () => {
  it("accepts valid program call input", () => {
    expect(CallProgramInputSchema.safeParse(VALID_PARAMS).success).toBe(true);
  });

  it("rejects empty accounts array", () => {
    expect(
      CallProgramInputSchema.safeParse({ ...VALID_PARAMS, accounts: [] }).success,
    ).toBe(false);
  });

  it("rejects empty programId", () => {
    expect(
      CallProgramInputSchema.safeParse({ ...VALID_PARAMS, programId: "" }).success,
    ).toBe(false);
  });

  it("rejects empty fromAddress", () => {
    expect(
      CallProgramInputSchema.safeParse({ ...VALID_PARAMS, fromAddress: "" }).success,
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────
// buildCallProgramTransaction — core logic
// ─────────────────────────────────────────────

describe("buildCallProgramTransaction", () => {
  it('returns SolanaTxRequest with type "solana_tx_request"', async () => {
    const result = await buildCallProgramTransaction(VALID_PARAMS, deps);
    expect(result.type).toBe("solana_tx_request");
  });

  it('returns txType "program_call"', async () => {
    const result = await buildCallProgramTransaction(VALID_PARAMS, deps);
    expect(result.txType).toBe("program_call");
  });

  it("returns a non-empty base64 serializedTx", async () => {
    const result = await buildCallProgramTransaction(VALID_PARAMS, deps);
    expect(result.serializedTx.length).toBeGreaterThan(0);
    expect(result.serializedTx).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("includes the programId (truncated) in description", async () => {
    const result = await buildCallProgramTransaction(VALID_PARAMS, deps);
    // Program ID starts with "Toke"
    expect(result.description).toMatch(/Toke/);
  });

  it("includes account count in description", async () => {
    const result = await buildCallProgramTransaction(VALID_PARAMS, deps);
    expect(result.description).toMatch(/1/); // 1 account
  });

  it("handles multiple accounts", async () => {
    const params = {
      ...VALID_PARAMS,
      accounts: [
        { pubkey: FROM, isSigner: true, isWritable: true },
        { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
      ],
    };
    const result = await buildCallProgramTransaction(params, deps);
    expect(result.type).toBe("solana_tx_request");
  });

  it("handles empty instructionData (no-op instruction)", async () => {
    const params = { ...VALID_PARAMS, instructionData: "" };
    const result = await buildCallProgramTransaction(params, deps);
    expect(result.serializedTx.length).toBeGreaterThan(0);
  });
});
