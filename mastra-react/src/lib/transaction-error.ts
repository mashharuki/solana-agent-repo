import type { TransactionSignResult } from "@/types/solana";

/** 署名待ちのタイムアウト時間（120 秒） */
export const SIGNING_TIMEOUT_MS = 120_000;

/** エラーパターン → 日本語メッセージのマッピング */
const ERROR_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /user rejected|user denied|request was rejected/i,
    message:
      "署名がキャンセルされました。再度試みる場合は「再試行」ボタンを押してください。",
  },
  {
    pattern: /wallet.*lock|locked.*wallet/i,
    message:
      "Phantom がロックされています。Phantom を解除してから再試行してください。",
  },
  {
    pattern: /insufficient funds|insufficient lamports/i,
    message:
      "残高が不足しています。DevNet エアドロップを依頼してから再試行してください。",
  },
  {
    pattern: /network request failed|fetch failed|connection.*refused/i,
    message:
      "ネットワークエラーが発生しました。接続を確認してから再試行してください。",
  },
  {
    pattern: /SIGNING_TIMEOUT/,
    message: "署名がタイムアウトしました（120 秒）。もう一度お試しください。",
  },
  {
    pattern: /transaction simulation failed/i,
    message:
      "トランザクションのシミュレーションに失敗しました。内容を確認してください。",
  },
  {
    pattern: /blockhash not found|blockhash.*expired/i,
    message:
      "ブロックハッシュの有効期限が切れました。もう一度トランザクションを作成してください。",
  },
];

/**
 * Phantom / Solana ウォレットのエラーを日本語メッセージに変換する。
 */
export function parsePhantomError(err: Error): string {
  const msg = err.message ?? String(err);
  for (const { pattern, message } of ERROR_PATTERNS) {
    if (pattern.test(msg)) return message;
  }
  return `署名に失敗しました: ${msg}`;
}

/**
 * トランザクション署名結果をエージェントへのフォローアップメッセージに変換する。
 * このメッセージを useChat.sendMessage で送信することで、Agent が結果を解説する。
 */
export function buildTxResultFollowUp(result: TransactionSignResult): string {
  if (result.success) {
    const explorerUrl = `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`;
    return (
      `トランザクションが完了しました。\n` +
      `署名: ${result.signature}\n` +
      `Solana Explorer: ${explorerUrl}`
    );
  }
  return `トランザクションが失敗しました。エラー: ${result.error}`;
}
