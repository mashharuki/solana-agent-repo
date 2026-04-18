/**
 * ウォレット接続状態を UI 表示用の状態に変換するユーティリティ
 */

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
