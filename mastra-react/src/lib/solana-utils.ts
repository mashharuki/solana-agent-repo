/**
 * 環境変数から Solana RPC URL を取得して検証するユーティリティ
 */

interface RpcEnv {
  VITE_SOLANA_RPC_URL?: string;
}

/**
 * VITE_SOLANA_RPC_URL 環境変数を検証して返す。
 * テスト可能にするため env オブジェクトを引数として受け取り、
 * デフォルトは import.meta.env を使用する。
 */
export function getValidatedRpcUrl(env: RpcEnv = import.meta.env as RpcEnv): string {
  const rpcUrl = env.VITE_SOLANA_RPC_URL;
  if (!rpcUrl) {
    throw new Error(
      "VITE_SOLANA_RPC_URL が設定されていません。.env ファイルに VITE_SOLANA_RPC_URL を追加してください。",
    );
  }
  return rpcUrl;
}
