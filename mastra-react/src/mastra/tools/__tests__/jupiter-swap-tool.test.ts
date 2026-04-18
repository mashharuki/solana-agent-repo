import { describe, expect, it, vi } from "vitest";
import { JupiterSwapInputSchema } from "../../../types/solana";
import { buildJupiterSwapTransaction } from "../jupiter-swap-tool";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USER_PUBKEY = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

const BASE_PARAMS = {
  inputMint: SOL_MINT,
  outputMint: USDC_MINT,
  amountLamports: 100_000_000, // 0.1 SOL
  slippageBps: 50,
  userPublicKey: USER_PUBKEY,
};

// ─────────────────────────────────────────────
// Input schema validation
// ─────────────────────────────────────────────

describe("JupiterSwapInputSchema", () => {
  it("accepts valid swap input", () => {
    expect(JupiterSwapInputSchema.safeParse(BASE_PARAMS).success).toBe(true);
  });

  it("applies default slippageBps of 50", () => {
    const r = JupiterSwapInputSchema.safeParse({
      ...BASE_PARAMS,
      slippageBps: undefined,
    });
    if (r.success) expect(r.data.slippageBps).toBe(50);
  });

  it("rejects zero amountLamports", () => {
    expect(
      JupiterSwapInputSchema.safeParse({ ...BASE_PARAMS, amountLamports: 0 })
        .success,
    ).toBe(false);
  });

  it("rejects negative amountLamports", () => {
    expect(
      JupiterSwapInputSchema.safeParse({ ...BASE_PARAMS, amountLamports: -1 })
        .success,
    ).toBe(false);
  });

  it("rejects empty inputMint", () => {
    expect(
      JupiterSwapInputSchema.safeParse({ ...BASE_PARAMS, inputMint: "" })
        .success,
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────
// buildJupiterSwapTransaction
// ─────────────────────────────────────────────

const FAKE_SWAP_TX = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"; // base64 placeholder

function makeQuoteFetch(quoteData: object, swapTx = FAKE_SWAP_TX) {
  let callCount = 0;
  return vi.fn().mockImplementation(() => {
    callCount++;
    const data =
      callCount === 1
        ? quoteData // first call: quote
        : { swapTransaction: swapTx }; // second call: swap
    return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
  });
}

describe("buildJupiterSwapTransaction", () => {
  it('returns SolanaTxRequest with type "solana_tx_request"', async () => {
    const fetchFn = makeQuoteFetch({ outAmount: "5000000", routePlan: [] });
    const result = await buildJupiterSwapTransaction(BASE_PARAMS, fetchFn);
    expect(result.type).toBe("solana_tx_request");
  });

  it('returns txType "swap"', async () => {
    const fetchFn = makeQuoteFetch({ outAmount: "5000000", routePlan: [] });
    const result = await buildJupiterSwapTransaction(BASE_PARAMS, fetchFn);
    expect(result.txType).toBe("swap");
  });

  it("uses the swapTransaction from Jupiter as serializedTx", async () => {
    const fetchFn = makeQuoteFetch(
      { outAmount: "5000000", routePlan: [] },
      FAKE_SWAP_TX,
    );
    const result = await buildJupiterSwapTransaction(BASE_PARAMS, fetchFn);
    expect(result.serializedTx).toBe(FAKE_SWAP_TX);
  });

  it("includes input amount in description", async () => {
    const fetchFn = makeQuoteFetch({ outAmount: "5000000", routePlan: [] });
    const result = await buildJupiterSwapTransaction(BASE_PARAMS, fetchFn);
    // 0.1 SOL = 100000000 lamports
    expect(result.description).toMatch(/0\.1/);
  });

  it("includes slippage in description", async () => {
    const fetchFn = makeQuoteFetch({ outAmount: "5000000", routePlan: [] });
    const result = await buildJupiterSwapTransaction(BASE_PARAMS, fetchFn);
    expect(result.description).toMatch(/0\.5|50/);
  });

  it("throws when quote API returns an error", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ error: "Route not found" }),
    });
    await expect(
      buildJupiterSwapTransaction(BASE_PARAMS, fetchFn),
    ).rejects.toThrow(/Route not found/);
  });

  it("throws when swapTransaction is missing from response", async () => {
    let callCount = 0;
    const fetchFn = vi.fn().mockImplementation(() => {
      callCount++;
      const data = callCount === 1 ? { outAmount: "5000000" } : {};
      return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
    });
    await expect(
      buildJupiterSwapTransaction(BASE_PARAMS, fetchFn),
    ).rejects.toThrow(/スワップトランザクション/);
  });

  it("sends userPublicKey to the swap endpoint", async () => {
    const fetchFn = makeQuoteFetch({ outAmount: "5000000" });
    await buildJupiterSwapTransaction(BASE_PARAMS, fetchFn);

    const swapCall = fetchFn.mock.calls[1];
    const body = JSON.parse((swapCall[1] as RequestInit).body as string);
    expect(body.userPublicKey).toBe(USER_PUBKEY);
  });
});
