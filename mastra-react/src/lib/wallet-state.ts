/**
 * ウォレット接続状態を UI 表示用の状態に変換するユーティリティ
 */

/**
 * 長いウォレットアドレスを「先頭4文字...末尾4文字」形式に省略する。
 * 8文字以下はそのまま返す。
 */
export function truncateAddress(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

interface WalletStateInput {
  connected: boolean;
  connecting: boolean;
  error: string | null;
}

export type WalletDisplayState =
  | { status: "connected" }
  | { status: "connecting" }
  | { status: "disconnected" }
  | { status: "error"; message: string };

/**
 * WalletGate のレンダリング分岐を決定する純関数。
 * connected=true → アプリ画面、false → 接続画面。
 */
export function selectWalletGateView(connected: boolean): "connect" | "app" {
  return connected ? "app" : "connect";
}

/**
 * ウォレット接続の raw 状態を UI 表示用の状態へ変換する純関数。
 * 優先順位: connected > connecting > error > disconnected
 */
export function getWalletDisplayState(
  input: WalletStateInput,
): WalletDisplayState {
  if (input.connected) return { status: "connected" };
  if (input.connecting) return { status: "connecting" };
  if (input.error) return { status: "error", message: input.error };
  return { status: "disconnected" };
}
