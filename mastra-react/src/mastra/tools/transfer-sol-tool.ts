import { createTool } from "@mastra/core/tools";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  SolanaTxRequestSchema,
  TransferSolInputSchema,
  type SolanaTxRequest,
} from "../../types/solana";

const LAMPORTS_PER_SOL = 1_000_000_000;

interface TransferDeps {
  getBalanceFn: (address: string) => Promise<number>;
  getRecentBlockhashFn: () => Promise<string>;
}

/**
 * SOL 送金トランザクションを構築するコアロジック。
 * deps を注入することでユニットテストが可能。
 */
export async function buildTransferTransaction(
  fromAddress: string,
  toAddress: string,
  amountSol: number,
  deps: TransferDeps,
): Promise<SolanaTxRequest> {
  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);

  const balance = await deps.getBalanceFn(fromAddress);
  if (balance < lamports) {
    const currentSol = (balance / LAMPORTS_PER_SOL).toFixed(4);
    throw new Error(
      `INSUFFICIENT_BALANCE: 残高が不足しています。現在の残高: ${currentSol} SOL、必要な残高: ${amountSol} SOL`,
    );
  }

  const fromPubkey = new PublicKey(fromAddress);
  const toPubkey = new PublicKey(toAddress);
  const blockhash = await deps.getRecentBlockhashFn();

  const transaction = new Transaction();
  transaction.add(SystemProgram.transfer({ fromPubkey, toPubkey, lamports }));
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPubkey;

  const serializedTx = transaction
    .serialize({ requireAllSignatures: false })
    .toString("base64");

  const toShort = `${toAddress.slice(0, 4)}...${toAddress.slice(-4)}`;
  const description = `${amountSol} SOL を ${toShort} に送金`;

  return {
    type: "solana_tx_request",
    serializedTx,
    description,
    txType: "transfer",
  };
}

/**
 * SOL 送金トランザクション構築ツール。
 *
 * 送金元・送金先アドレスと送金額（SOL 単位）を受け取り、
 * Phantom ウォレットで署名できるシリアライズ済みトランザクションを返します。
 * トランザクション署名はユーザーが Phantom ウォレットを通じて行います。
 *
 * 使用シナリオ:
 * - ユーザーが「〇〇に X SOL 送金して」と依頼したとき
 * - 送金トランザクションの確認・実行フローを開始するとき
 *
 * Build a SOL transfer transaction for signing via Phantom wallet.
 * The agent never signs transactions — only the user does.
 */
export const transferSolTool = createTool({
  id: "transfer-sol",
  description: `SOL 送金トランザクションを構築します（署名はユーザーの Phantom ウォレットで行います）。
入力:
  - fromAddress: 送金元ウォレットアドレス（base58 公開鍵）
  - toAddress: 送金先ウォレットアドレス（base58 公開鍵）
  - amountSol: 送金額（SOL 単位、0 より大きい値）
出力: Phantom で署名可能な SolanaTxRequest（シリアライズ済みトランザクション）
注意: 残高不足の場合は INSUFFICIENT_BALANCE エラーを返します。
Use case: '0.1 SOL を xxxx に送って', 'Send 1 SOL to yyyy'`,

  inputSchema: TransferSolInputSchema,
  outputSchema: SolanaTxRequestSchema,

  execute: async ({ fromAddress, toAddress, amountSol }) => {
    const rpcUrl =
      process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");

    try {
      new PublicKey(fromAddress);
      new PublicKey(toAddress);
    } catch {
      throw new Error(
        "無効なアドレス形式です。base58 形式の Solana 公開鍵を指定してください。",
      );
    }

    return buildTransferTransaction(fromAddress, toAddress, amountSol, {
      getBalanceFn: (addr) => connection.getBalance(new PublicKey(addr)),
      getRecentBlockhashFn: async () => {
        const { blockhash } = await connection.getLatestBlockhash("confirmed");
        return blockhash;
      },
    });
  },
});
