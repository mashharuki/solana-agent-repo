import { createTool } from "@mastra/core/tools";
import { PublicKey } from "@solana/web3.js";
import {
  JupiterSwapInputSchema,
  SolanaTxRequestSchema,
  type JupiterSwapInput,
  type SolanaTxRequest,
} from "../../types/solana";

const JUPITER_QUOTE_URL = "https://quote-api.jup.ag/v6/quote";
const JUPITER_SWAP_URL = "https://quote-api.jup.ag/v6/swap";
const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * Jupiter v6 API でスワップトランザクションを構築するコアロジック（injectable fetch）。
 */
export async function buildJupiterSwapTransaction(
  params: JupiterSwapInput,
  fetchFn: typeof fetch = fetch,
): Promise<SolanaTxRequest> {
  // 1. Get quote
  const quoteUrl = new URL(JUPITER_QUOTE_URL);
  quoteUrl.searchParams.set("inputMint", params.inputMint);
  quoteUrl.searchParams.set("outputMint", params.outputMint);
  quoteUrl.searchParams.set("amount", String(params.amountLamports));
  quoteUrl.searchParams.set("slippageBps", String(params.slippageBps));

  const quoteRes = await fetchFn(quoteUrl.toString());
  const quote = (await quoteRes.json()) as Record<string, unknown>;

  if (quote.error) {
    throw new Error(`Jupiter Quote エラー: ${quote.error}`);
  }

  // 2. Get swap transaction
  const swapRes = await fetchFn(JUPITER_SWAP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: params.userPublicKey,
      wrapAndUnwrapSol: true,
    }),
  });
  const swapData = (await swapRes.json()) as Record<string, unknown>;

  if (!swapData.swapTransaction) {
    throw new Error("スワップトランザクションの取得に失敗しました。");
  }

  // 3. Build description
  const inSol = (params.amountLamports / LAMPORTS_PER_SOL).toFixed(4);
  const outAmount =
    typeof quote.outAmount === "string"
      ? ` → 約 ${(Number(quote.outAmount) / 1e6).toFixed(2)} (出力)` // USDC has 6 decimals
      : "";
  const slippagePct = (params.slippageBps / 100).toFixed(2);
  const description = `${inSol} (入力)${outAmount} スワップ | スリッページ: ${slippagePct}%`;

  return {
    type: "solana_tx_request",
    serializedTx: swapData.swapTransaction as string,
    description,
    txType: "swap",
  };
}

/**
 * Jupiter v6 を使ったトークンスワップトランザクション構築ツール。
 *
 * 入出力トークンの mint アドレス・スワップ量・スリッページを受け取り、
 * Jupiter v6 Quote API でレートを取得後、Phantom で署名可能な
 * スワップトランザクションを返します。
 *
 * 使用シナリオ:
 * - ユーザーが「SOL を USDC にスワップして」「X トークンを Y に交換したい」と依頼したとき
 *
 * Build a Jupiter v6 swap transaction. The agent never signs — only the user does.
 * slippageBps: 50 = 0.5% slippage tolerance (default).
 */
export const jupiterSwapTool = createTool({
  id: "jupiter-swap",
  description: `Jupiter v6 API でトークンスワップトランザクションを構築します。
入力:
  - inputMint: 入力トークンの mint アドレス（例: SOL = So11111111111111111111111111111111111111112）
  - outputMint: 出力トークンの mint アドレス（例: USDC = EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v）
  - amountLamports: スワップ量（lamports 単位の整数）
  - slippageBps: スリッページ許容値（basis points: 50 = 0.5%、デフォルト 50）
  - userPublicKey: 実行ウォレットの公開鍵
出力: Phantom で署名可能な SolanaTxRequest（スワップトランザクション）
注意: DevNet では Jupiter の流動性が限られています。
Use case: 'SOL を USDC にスワップして', 'Swap 0.1 SOL for USDC'`,

  inputSchema: JupiterSwapInputSchema,
  outputSchema: SolanaTxRequestSchema,

  execute: async (params) => {
    try {
      new PublicKey(params.userPublicKey);
      new PublicKey(params.inputMint);
      new PublicKey(params.outputMint);
    } catch {
      throw new Error(
        "無効なアドレス形式です。base58 形式の Solana 公開鍵を指定してください。",
      );
    }

    return buildJupiterSwapTransaction({
      ...params,
      slippageBps: params.slippageBps ?? 50,
    });
  },
});
