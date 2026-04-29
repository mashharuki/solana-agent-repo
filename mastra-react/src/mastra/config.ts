// このファイルは、MASTRA のストレージ設定を管理するためのユーティリティ関数を提供します。
interface StorageEnv {
  MASTRA_LIBSQL_URL?: string;
  MASTRA_LIBSQL_AUTH_TOKEN?: string;
  AWS_LAMBDA_FUNCTION_NAME?: string;
}

// MASTRA_LIBSQL_URL が設定されていない場合はローカルファイル DB を使用する。
export interface ResolvedStorageConfig {
  /** LibSQL 接続 URL（ローカルファイルまたは Turso Cloud） */
  url: string;
  /** Turso Cloud 認証トークン（本番のみ） */
  authToken?: string;
  /** MASTRA_LIBSQL_URL が設定されている場合は true（本番環境） */
  isProduction: boolean;
  /** AWS Lambda 環境かどうか（AWS_LAMBDA_FUNCTION_NAME で判定） */
  isLambda: boolean;
}

/**
 * 環境変数から LibSQL ストレージ設定を解決する純関数。
 *
 * - MASTRA_LIBSQL_URL 設定済み → 指定 URL（Turso Cloud など）
 * - Lambda かつ URL 未設定 → インメモリ SQLite（デモ用、コールドスタート間でリセット）
 * - その他（ローカル開発）→ ローカルファイル DB
 */
export function resolveStorageConfig(
  env: StorageEnv = process.env as StorageEnv,
): ResolvedStorageConfig {
  const isLambda = !!env.AWS_LAMBDA_FUNCTION_NAME;
  const url = env.MASTRA_LIBSQL_URL;

  if (url) {
    return {
      url,
      authToken: env.MASTRA_LIBSQL_AUTH_TOKEN || undefined,
      isProduction: true,
      isLambda,
    };
  }

  // Lambda 環境かつ URL 未設定 → インメモリ SQLite（永続化不要のデモ向け）
  // 永続化が必要な場合は MASTRA_LIBSQL_URL に Turso Cloud URL を設定すること
  if (isLambda) {
    return { url: "file::memory:?cache=shared", isProduction: true, isLambda };
  }

  return { url: "file:./mastra.db", isProduction: false, isLambda: false };
}
