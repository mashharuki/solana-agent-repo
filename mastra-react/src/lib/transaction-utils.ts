import type { TxType } from "@/types/solana";

const TX_TYPE_LABELS: Record<TxType, string> = {
  transfer: "SOL 送金",
  nft_mint: "NFT 発行",
  nft_transfer: "NFT 転送",
  swap: "トークンスワップ",
  program_call: "Program 呼び出し",
  airdrop: "DevNet エアドロップ",
};

const TX_TYPE_BADGES: Record<TxType, string> = {
  transfer: "→ SOL",
  nft_mint: "NFT+",
  nft_transfer: "→ NFT",
  swap: "<> swap",
  program_call: "</> Program",
  airdrop: "Airdrop",
};

/** txType を日本語ラベルに変換する */
export function formatTxType(txType: TxType): string {
  return TX_TYPE_LABELS[txType] ?? txType;
}

/** txType の短いバッジ文字列を返す */
export function getTxTypeLabel(txType: TxType): string {
  return TX_TYPE_BADGES[txType] ?? txType;
}
