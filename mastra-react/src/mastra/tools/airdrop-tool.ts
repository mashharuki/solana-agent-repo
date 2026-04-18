import { createTool } from "@mastra/core/tools";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  AirdropInputSchema,
  AirdropOutputSchema,
  type AirdropOutput,
} from "../../types/solana";

const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * DevNet エアドロップのコアロジック（injectable deps）。
 */
export async function executeAirdrop(
  address: string,
  amountSol: number,
  requestAirdropFn: (address: string, lamports: number) => Promise<string>,
  confirmFn: (signature: string) => Promise<void>,
): Promise<AirdropOutput> {
  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);
  try {
    const signature = await requestAirdropFn(address, lamports);
    await confirmFn(signature);
    return { signature, amountSol };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "エアドロップに失敗しました";
    throw new Error(`RPC_ERROR: DevNet エアドロップに失敗しました。${msg}`);
  }
}

/**
 * Solana DevNet SOL エアドロップツール。
 *
 * DevNet 上の指定アドレスに SOL をエアドロップします（最大 2 SOL / リクエスト）。
 * このツールは DevNet 専用です。Mainnet では使用できません。
 *
 * 使用シナリオ:
 * - ユーザーが「DevNet SOL をエアドロップして」「テスト用 SOL が欲しい」と依頼したとき
 * - 残高ゼロで送金できない場合に SOL を補充するとき
 *
 * DevNet-only airdrop tool. Max 2 SOL per request.
 */
export const airdropTool = createTool({
  id: "airdrop",
  description: `Solana DevNet に SOL をエアドロップします（DevNet 専用・最大 2 SOL）。
入力:
  - address: エアドロップ先ウォレットアドレス（base58 公開鍵）
  - amountSol: エアドロップ量（SOL 単位、0 より大きく 2 以下）
出力: トランザクション署名（signature）とエアドロップ量（amountSol）
注意: このツールは Solana DevNet 専用です。Mainnet では使用できません。
Use case: 'DevNet SOL をエアドロップして', 'Airdrop 1 SOL to my wallet'`,

  inputSchema: AirdropInputSchema,
  outputSchema: AirdropOutputSchema,

  execute: async ({ address, amountSol }) => {
    const rpcUrl =
      process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");

    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(address);
    } catch {
      throw new Error(
        `無効なアドレス形式です: "${address}"。base58 形式の Solana 公開鍵を指定してください。`,
      );
    }

    return executeAirdrop(
      address,
      amountSol,
      (_addr, lamports) => connection.requestAirdrop(publicKey, lamports),
      (sig) =>
        connection.confirmTransaction(sig, "confirmed").then(() => undefined),
    );
  },
});
