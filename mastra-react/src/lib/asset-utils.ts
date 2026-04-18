/**
 * SOL 残高を表示用文字列にフォーマットする。
 * null は未取得状態を表し "—" を返す。
 */
export function formatSolBalance(balance: number | null): string {
  if (balance === null) return "—";
  return `${balance.toFixed(4)} SOL`;
}
