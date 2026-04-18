/**
 * Solana 共有型定義ファイル
 *
 * Frontend と Mastra ツール間で共有する型・Zod スキーマを一元定義する。
 *
 * 【重要】Mastra ツール（src/mastra/tools/）からインポートする際は
 * Vite の "@" エイリアスを使わず相対パスを使用すること:
 *   import type { SolanaTxRequest } from "../../types/solana";
 *
 * React フロントエンドからは "@/types/solana" でもインポート可能。
 */
import { z } from "zod";

// ────────────────────────────────────────────────────────────
// SolanaTxRequest — Agent → Frontend のトランザクション型契約
// ────────────────────────────────────────────────────────────

export const TX_TYPE_VALUES = [
  "transfer",
  "nft_mint",
  "nft_transfer",
  "swap",
  "program_call",
  "airdrop",
] as const;

export type TxType = (typeof TX_TYPE_VALUES)[number];

/**
 * Mastra ツールがトランザクション構築後に返す discriminated union 型。
 * Frontend はこの `type` フィールドを検出して TransactionCard をレンダリングする。
 */
export const SolanaTxRequestSchema = z.object({
  type: z.literal("solana_tx_request"),
  /** Base64 エンコードされたシリアライズ済みトランザクション */
  serializedTx: z.string().min(1, "serializedTx は空にできません"),
  /** ユーザー向けの人間可読な説明（例: "0.1 SOL を xxx に送金"） */
  description: z.string(),
  /** トランザクションの種別 */
  txType: z.enum(TX_TYPE_VALUES),
});

export type SolanaTxRequest = z.infer<typeof SolanaTxRequestSchema>;

/**
 * 型ガード: 未知の値が SolanaTxRequest かどうかを判定する。
 * チャットメッセージのツール結果パーツを走査する際に使用する。
 */
export function isSolanaTxRequest(value: unknown): value is SolanaTxRequest {
  if (typeof value !== "object" || value === null) return false;
  return (value as Record<string, unknown>).type === "solana_tx_request";
}

// ────────────────────────────────────────────────────────────
// SolanaError — 共通エラー型
// ────────────────────────────────────────────────────────────

export const SOLANA_ERROR_CODES = [
  "INVALID_ADDRESS",
  "RPC_ERROR",
  "INSUFFICIENT_BALANCE",
  "RATE_LIMITED",
  "NETWORK_MISMATCH",
] as const;

export type SolanaErrorCode = (typeof SOLANA_ERROR_CODES)[number];

export const SolanaErrorSchema = z.object({
  code: z.enum(SOLANA_ERROR_CODES),
  message: z.string(),
});

export type SolanaError = z.infer<typeof SolanaErrorSchema>;

// ────────────────────────────────────────────────────────────
// NFTAsset
// ────────────────────────────────────────────────────────────

export const NFTAssetSchema = z.object({
  /** mint アドレス (base58) */
  id: z.string().min(1, "id は空にできません"),
  name: z.string(),
  imageUrl: z.string(),
  symbol: z.string(),
});

export type NFTAsset = z.infer<typeof NFTAssetSchema>;

// ────────────────────────────────────────────────────────────
// TransactionSignResult — 署名結果 (Frontend → Agent フォローアップ)
// ────────────────────────────────────────────────────────────

export const TransactionSignResultSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true), signature: z.string() }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export type TransactionSignResult = z.infer<typeof TransactionSignResultSchema>;

// ────────────────────────────────────────────────────────────
// Tool Input / Output スキーマ
// ────────────────────────────────────────────────────────────

// getBalanceTool
export const GetBalanceInputSchema = z.object({
  /** Solana 公開鍵 (base58) */
  address: z.string().min(1, "address は空にできません"),
});
export type GetBalanceInput = z.infer<typeof GetBalanceInputSchema>;

export const GetBalanceOutputSchema = z.object({
  address: z.string(),
  lamports: z.number().nonnegative(),
  sol: z.number().nonnegative(),
  network: z.literal("devnet"),
});
export type GetBalanceOutput = z.infer<typeof GetBalanceOutputSchema>;

// transferSolTool
export const TransferSolInputSchema = z.object({
  /** 送金元ウォレットアドレス (base58) */
  fromAddress: z.string().min(1),
  /** 送金先ウォレットアドレス (base58) */
  toAddress: z.string().min(1),
  /** 送金額 (SOL 単位, > 0) */
  amountSol: z
    .number()
    .positive("amountSol は 0 より大きい値を指定してください"),
});
export type TransferSolInput = z.infer<typeof TransferSolInputSchema>;

// getNftsTool
export const GetNftsInputSchema = z.object({
  ownerAddress: z.string().min(1),
  limit: z.number().int().positive().default(20),
  page: z.number().int().positive().default(1),
});
export type GetNftsInput = z.infer<typeof GetNftsInputSchema>;

export const GetNftsOutputSchema = z.object({
  items: z.array(NFTAssetSchema),
  total: z.number().nonnegative(),
});
export type GetNftsOutput = z.infer<typeof GetNftsOutputSchema>;

// mintNftTool
export const MintNftInputSchema = z.object({
  ownerAddress: z.string().min(1),
  name: z.string().min(1),
  symbol: z.string().min(1),
  /** NFT メタデータ JSON の URI */
  uri: z.string().min(1),
  /** ロイヤリティ (basis points, 0-10000) */
  sellerFeeBasisPoints: z.number().int().min(0).max(10000),
});
export type MintNftInput = z.infer<typeof MintNftInputSchema>;

// jupiterSwapTool
export const JupiterSwapInputSchema = z.object({
  /** 入力トークンの mint アドレス */
  inputMint: z.string().min(1),
  /** 出力トークンの mint アドレス */
  outputMint: z.string().min(1),
  /** スワップ量 (lamports 単位) */
  amountLamports: z.number().int().positive(),
  /** スリッページ許容値 (basis points, default: 50 = 0.5%) */
  slippageBps: z.number().int().nonnegative().default(50),
  /** 実行ウォレットの公開鍵 */
  userPublicKey: z.string().min(1),
});
export type JupiterSwapInput = z.infer<typeof JupiterSwapInputSchema>;

// airdropTool
export const AirdropInputSchema = z.object({
  address: z.string().min(1),
  /** エアドロップ量 (SOL 単位, DevNet のみ, max 2 SOL) */
  amountSol: z
    .number()
    .positive("amountSol は 0 より大きい値を指定してください")
    .max(2, "DevNet エアドロップの上限は 2 SOL です"),
});
export type AirdropInput = z.infer<typeof AirdropInputSchema>;

export const AirdropOutputSchema = z.object({
  signature: z.string(),
  amountSol: z.number().positive(),
});
export type AirdropOutput = z.infer<typeof AirdropOutputSchema>;

// callProgramTool
export const CallProgramAccountSchema = z.object({
  pubkey: z.string().min(1),
  isSigner: z.boolean(),
  isWritable: z.boolean(),
});
export type CallProgramAccount = z.infer<typeof CallProgramAccountSchema>;

export const CallProgramInputSchema = z.object({
  /** 呼び出す Program の ID (base58) */
  programId: z.string().min(1),
  /** インストラクションデータ (Base64) */
  instructionData: z.string(),
  /** アカウントリスト (最低 1 件必要) */
  accounts: z
    .array(CallProgramAccountSchema)
    .min(1, "accounts は最低 1 件必要です"),
  /** 手数料支払いウォレット (base58) */
  fromAddress: z.string().min(1),
});
export type CallProgramInput = z.infer<typeof CallProgramInputSchema>;
