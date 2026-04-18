// このファイルは、MASTRA のストレージ設定を管理するためのユーティリティ関数を提供します。
interface StorageEnv {
  MASTRA_LIBSQL_URL?: string;
  MASTRA_LIBSQL_AUTH_TOKEN?: string;
}

// MASTRA_LIBSQL_URL が設定されていない場合はローカルファイル DB を使用する。
export interface ResolvedStorageConfig {
  /** LibSQL 接続 URL（ローカルファイルまたは Turso Cloud） */
  url: string;
  /** Turso Cloud 認証トークン（本番のみ） */
  authToken?: string;
  /** MASTRA_LIBSQL_URL が設定されている場合は true（本番環境） */
  isProduction: boolean;
}

/**
 * 環境変数から LibSQL ストレージ設定を解決する純関数。
 *
 * - MASTRA_LIBSQL_URL 未設定 → ローカルファイル DB（開発）
 * - MASTRA_LIBSQL_URL 設定済み → Turso Cloud URL（本番 Vercel）
 */
export function resolveStorageConfig(
  env: StorageEnv = process.env as StorageEnv,
): ResolvedStorageConfig {
  const url = env.MASTRA_LIBSQL_URL;
  if (url) {
    return {
      url,
      authToken: env.MASTRA_LIBSQL_AUTH_TOKEN || undefined,
      isProduction: true,
    };
  }
  return { url: "file:./mastra.db", isProduction: false };
}
