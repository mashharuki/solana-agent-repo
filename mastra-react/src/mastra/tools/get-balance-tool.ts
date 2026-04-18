import { createTool } from "@mastra/core/tools";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  GetBalanceInputSchema,
  GetBalanceOutputSchema,
  type GetBalanceOutput,
} from "../../types/solana";

const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * 残高取得のコアロジック。
 * getBalanceFn を注入することでユニットテストが可能。
 */
export async function executeGetBalance(
  address: string,
  getBalanceFn: (address: string) => Promise<number>,
): Promise<GetBalanceOutput> {
  const lamports = await getBalanceFn(address);
  return {
    address,
    lamports,
    sol: lamports / LAMPORTS_PER_SOL,
    network: "devnet",
  };
}

/**
 * Solana DevNet の SOL 残高照会ツール。
 *
 * 指定された Solana ウォレットアドレス（base58 公開鍵）の SOL 残高を
 * Solana DevNet RPC から取得して返します。
 *
 * 使用シナリオ:
 * - ユーザーが「残高を教えて」「いくら持ってる？」などと尋ねたとき
 * - 送金前に残高が十分かどうか確認するとき
 * - DevNet エアドロップ後に残高を確認するとき
 *
 * Get SOL balance tool for Solana DevNet.
 * Returns the current SOL balance for a given wallet address.
 */
export const getBalanceTool = createTool({
  id: "get-balance",
  description: `Solana DevNet ウォレットアドレスの SOL 残高を取得します。
入力: address — base58 形式の Solana 公開鍵（ウォレットアドレス）
出力: lamports（最小単位）と sol（SOL 単位）の残高、および対象ネットワーク（devnet）
注意: このツールは Solana DevNet 専用です。Mainnet の残高は取得できません。
Use case: 'Check my balance', '残高を確認して', 'How much SOL do I have?'`,

  inputSchema: GetBalanceInputSchema,
  outputSchema: GetBalanceOutputSchema,

  execute: async ({ address }) => {
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

    return executeGetBalance(address, () => connection.getBalance(publicKey));
  },
});
