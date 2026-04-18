import { createTool } from "@mastra/core/tools";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  CallProgramInputSchema,
  SolanaTxRequestSchema,
  type CallProgramInput,
  type SolanaTxRequest,
} from "../../types/solana";

interface CallProgramDeps {
  getRecentBlockhashFn: () => Promise<string>;
}

/**
 * 汎用 Solana Program 呼び出しトランザクションを構築するコアロジック。
 */
export async function buildCallProgramTransaction(
  params: CallProgramInput,
  deps: CallProgramDeps,
): Promise<SolanaTxRequest> {
  const programPubkey = new PublicKey(params.programId);
  const fromPubkey = new PublicKey(params.fromAddress);
  const blockhash = await deps.getRecentBlockhashFn();

  const keys = params.accounts.map((acc) => ({
    pubkey: new PublicKey(acc.pubkey),
    isSigner: acc.isSigner,
    isWritable: acc.isWritable,
  }));

  const data = params.instructionData
    ? Buffer.from(params.instructionData, "base64")
    : Buffer.alloc(0);

  const instruction = new TransactionInstruction({
    programId: programPubkey,
    keys,
    data,
  });

  const transaction = new Transaction();
  transaction.add(instruction);
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPubkey;

  const serializedTx = transaction
    .serialize({ requireAllSignatures: false })
    .toString("base64");

  const progShort = `${params.programId.slice(0, 4)}...${params.programId.slice(-4)}`;
  const description =
    `Program ${progShort} を呼び出し | ` +
    `アカウント: ${params.accounts.length} 件 | ` +
    `データ: ${params.instructionData.length} bytes (Base64)`;

  return {
    type: "solana_tx_request",
    serializedTx,
    description,
    txType: "program_call",
  };
}

/**
 * 汎用 Solana スマートコントラクト（Program）呼び出しトランザクション構築ツール。
 *
 * Program ID・インストラクションデータ（Base64）・アカウントリストを受け取り、
 * Phantom ウォレットで署名できるシリアライズ済みトランザクションを返します。
 *
 * Solana Program の概念:
 * - Program: Solana 上のスマートコントラクト。不変の実行可能コード。
 * - Instruction: Program への命令（Program ID + アカウント + データ）。
 * - PDA: Program Derived Address — Program が制御する特殊アカウント。
 *
 * 使用シナリオ:
 * - カスタム Anchor Program の命令を実行するとき
 * - SPL Token Program や System Program を直接呼び出すとき
 * - DeFi プロトコルとのインタラクションが必要なとき
 *
 * Build a generic Solana program call transaction. Never signs — only the user does.
 */
export const callProgramTool = createTool({
  id: "call-program",
  description: `汎用 Solana Program（スマートコントラクト）呼び出しトランザクションを構築します。
入力:
  - programId: 呼び出す Program の ID（base58 公開鍵）
  - instructionData: インストラクションデータ（Base64 エンコード文字列、空文字列も可）
  - accounts: アカウントリスト（各要素: pubkey, isSigner, isWritable）最低 1 件必要
  - fromAddress: 手数料支払いウォレット（fee payer）の公開鍵
出力: Phantom で署名可能な SolanaTxRequest（program_call トランザクション）
注意: アカウントの順序と isSigner/isWritable フラグは Program の仕様に従うこと。
Use case: 'このプログラムを呼び出して', 'Execute instruction on program xxx'`,

  inputSchema: CallProgramInputSchema,
  outputSchema: SolanaTxRequestSchema,

  execute: async (params) => {
    const rpcUrl =
      process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

    try {
      new PublicKey(params.programId);
      new PublicKey(params.fromAddress);
      for (const acc of params.accounts) new PublicKey(acc.pubkey);
    } catch {
      throw new Error(
        "無効なアドレス形式です。base58 形式の Solana 公開鍵を指定してください。",
      );
    }

    const connection = new Connection(rpcUrl, "confirmed");
    return buildCallProgramTransaction(params, {
      getRecentBlockhashFn: async () => {
        const { blockhash } = await connection.getLatestBlockhash("confirmed");
        return blockhash;
      },
    });
  },
});
