/**
 * SolanaTxRequest 返却形式コントラクトテスト
 * Task 9.3 — Requirements: 4.1, 5.2, 5.4
 *
 * transferSolTool と jupiterSwapTool が返す値が
 * SolanaTxRequestSchema を満たすことを保証するクロスツール契約テスト。
 */

import { describe, expect, it, vi } from "vitest";
import {
  SolanaTxRequestSchema,
  TransferSolInputSchema,
  JupiterSwapInputSchema,
} from "@/types/solana";
import { buildTransferTransaction } from "@/mastra/tools/transfer-sol-tool";
import { buildJupiterSwapTransaction } from "@/mastra/tools/jupiter-swap-tool";

const FROM = "So11111111111111111111111111111111111111112";
const TO = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const BLOCKHASH = "11111111111111111111111111111111";
const FAKE_SWAP_TX = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

// ─────────────────────────────────────────────────────────────────
// transferSolTool — SolanaTxRequest 返却形式 (Req 4.1, 5.2)
// ─────────────────────────────────────────────────────────────────

describe("transferSolTool の SolanaTxRequest 返却形式 (Req 4.1, 5.2)", () => {
  function makeDeps(balanceLamports: number) {
    return {
      getBalanceFn: vi.fn().mockResolvedValue(balanceLamports),
      getRecentBlockhashFn: vi.fn().mockResolvedValue(BLOCKHASH),
    };
  }

  it("Req 4.1: 返却値が SolanaTxRequestSchema を満たす", async () => {
    const result = await buildTransferTransaction(
      FROM,
      TO,
      0.1,
      makeDeps(1_000_000_000),
    );
    expect(() => SolanaTxRequestSchema.parse(result)).not.toThrow();
  });

  it("Req 5.2: txType は 'transfer'", async () => {
    const result = await buildTransferTransaction(
      FROM,
      TO,
      0.1,
      makeDeps(1_000_000_000),
    );
    expect(result.txType).toBe("transfer");
  });

  it("Req 5.2: serializedTx は非空の Base64 文字列", async () => {
    const result = await buildTransferTransaction(
      FROM,
      TO,
      0.5,
      makeDeps(2_000_000_000),
    );
    expect(result.serializedTx).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(result.serializedTx.length).toBeGreaterThan(0);
  });

  it("Req 5.2: description に金額と送金先が含まれる", async () => {
    const result = await buildTransferTransaction(
      FROM,
      TO,
      0.25,
      makeDeps(1_000_000_000),
    );
    expect(result.description).toContain("0.25");
    // Truncated TO address: "Toke...Q5DA"
    expect(result.description).toMatch(/Toke|Q5DA/);
  });

  it("残高不足の場合は INSUFFICIENT_BALANCE エラー（SolanaTxRequest を返さない）", async () => {
    await expect(
      buildTransferTransaction(FROM, TO, 10, makeDeps(0)),
    ).rejects.toThrow(/INSUFFICIENT_BALANCE/);
  });

  it("入力スキーマ: fromAddress が空文字は不正", () => {
    const result = TransferSolInputSchema.safeParse({
      fromAddress: "",
      toAddress: TO,
      amountSol: 0.1,
    });
    expect(result.success).toBe(false);
  });

  it("入力スキーマ: amountSol = 0 は不正", () => {
    const result = TransferSolInputSchema.safeParse({
      fromAddress: FROM,
      toAddress: TO,
      amountSol: 0,
    });
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────
// jupiterSwapTool — SolanaTxRequest 返却形式 (Req 4.1, 5.4)
// ─────────────────────────────────────────────────────────────────

describe("jupiterSwapTool の SolanaTxRequest 返却形式 (Req 4.1, 5.4)", () => {
  const BASE_PARAMS = {
    inputMint: FROM,
    outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    amountLamports: 100_000_000,
    slippageBps: 50,
    userPublicKey: TO,
  };

  function makeSwapFetch(swapTx = FAKE_SWAP_TX) {
    let call = 0;
    return vi.fn().mockImplementation(() => {
      call++;
      const data =
        call === 1
          ? { outAmount: "5000000", routePlan: [] }
          : { swapTransaction: swapTx };
      return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
    });
  }

  it("Req 4.1: 返却値が SolanaTxRequestSchema を満たす", async () => {
    const result = await buildJupiterSwapTransaction(
      BASE_PARAMS,
      makeSwapFetch(),
    );
    expect(() => SolanaTxRequestSchema.parse(result)).not.toThrow();
  });

  it("Req 5.4: txType は 'swap'", async () => {
    const result = await buildJupiterSwapTransaction(
      BASE_PARAMS,
      makeSwapFetch(),
    );
    expect(result.txType).toBe("swap");
  });

  it("Req 5.4: serializedTx は Jupiter の swapTransaction をそのまま使用する", async () => {
    const result = await buildJupiterSwapTransaction(
      BASE_PARAMS,
      makeSwapFetch(FAKE_SWAP_TX),
    );
    expect(result.serializedTx).toBe(FAKE_SWAP_TX);
  });

  it("Req 5.4: description にスワップ情報が含まれる", async () => {
    const result = await buildJupiterSwapTransaction(
      BASE_PARAMS,
      makeSwapFetch(),
    );
    expect(typeof result.description).toBe("string");
    expect(result.description.length).toBeGreaterThan(0);
  });

  it("入力スキーマ: amountLamports = 0 は不正", () => {
    const result = JupiterSwapInputSchema.safeParse({
      ...BASE_PARAMS,
      amountLamports: 0,
    });
    expect(result.success).toBe(false);
  });

  it("入力スキーマ: inputMint が空文字は不正", () => {
    const result = JupiterSwapInputSchema.safeParse({
      ...BASE_PARAMS,
      inputMint: "",
    });
    expect(result.success).toBe(false);
  });

  it("Quote API エラー時は SolanaTxRequest を返さない", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ error: "Route not found" }),
    });
    await expect(
      buildJupiterSwapTransaction(BASE_PARAMS, fetchFn),
    ).rejects.toThrow(/Route not found/);
  });
});
