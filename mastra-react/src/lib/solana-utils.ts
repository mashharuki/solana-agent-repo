/**
 * 環境変数から Solana RPC URL を取得して検証するユーティリティ
 */

export type SolanaNetwork = "devnet" | "mainnet-beta" | "testnet" | "unknown";

const GENESIS_HASHES: Record<string, SolanaNetwork> = {
  EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG: "devnet",
  "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d": "mainnet-beta",
  "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY": "testnet",
};

/** ジェネシスハッシュから Solana ネットワーク名を返す純関数 */
export function detectSolanaNetwork(genesisHash: string): SolanaNetwork {
  return GENESIS_HASHES[genesisHash] ?? "unknown";
}

interface RpcEnv {
  VITE_SOLANA_RPC_URL?: string;
}

interface FrontendEnv extends RpcEnv {
  VITE_SOLANA_NETWORK?: string;
}

/**
 * VITE_SOLANA_RPC_URL 環境変数を検証して返す。
 * テスト可能にするため env オブジェクトを引数として受け取り、
 * デフォルトは import.meta.env を使用する。
 */
export function getValidatedRpcUrl(
  env: RpcEnv = import.meta.env as RpcEnv,
): string {
  const rpcUrl = env.VITE_SOLANA_RPC_URL;
  if (!rpcUrl) {
    throw new Error(
      "VITE_SOLANA_RPC_URL が設定されていません。.env ファイルに VITE_SOLANA_RPC_URL を追加してください。",
    );
  }
  return rpcUrl;
}

/**
 * フロントエンドに必要な全環境変数を検証する。
 * 未設定の必須変数がある場合はエラーをスローする。
 */
export function validateFrontendEnvVars(
  env: FrontendEnv = import.meta.env as FrontendEnv,
): void {
  const missing: string[] = [];
  if (!env.VITE_SOLANA_RPC_URL) missing.push("VITE_SOLANA_RPC_URL");
  if (!env.VITE_SOLANA_NETWORK) missing.push("VITE_SOLANA_NETWORK");

  if (missing.length > 0) {
    throw new Error(
      `必須環境変数が設定されていません: ${missing.join(", ")}。.env ファイルを確認してください。`,
    );
  }
}
