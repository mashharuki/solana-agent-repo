import { isSolanaTxRequest, type SolanaTxRequest } from "@/types/solana";

/**
 * ツール実行出力から SolanaTxRequest を検出する純関数。
 * `type: "solana_tx_request"` を持つオブジェクトのみを返し、それ以外は null。
 */
export function detectTxRequest(output: unknown): SolanaTxRequest | null {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return null;
  }
  return isSolanaTxRequest(output) ? output : null;
}

/** ウォレット未接続時のブロックメッセージ */
export function formatWalletBlockedMessage(): string {
  return "Phantom ウォレットを接続してからメッセージを送信してください。";
}
