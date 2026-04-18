import { getWalletDisplayState } from "@/lib/wallet-state";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";

/**
 * ウォレット未接続時に表示する接続画面。
 * Phantom ウォレットへの接続ボタン、接続中インジケーター、
 * エラーメッセージと再試行ボタンを状態に応じて表示する。
 *
 * Requirements: 1.1, 1.2, 1.5, 1.6
 */
export function WalletConnectScreen() {
  const { connecting, connect, select, wallets } = useWallet();
  const [localError, setLocalError] = useState<string | null>(null);

  /**
   * ウォレットの接続状態をもとに、表示すべき UI 状態を決定する。
   * - connecting: ウォレットに接続中の状態
   * - error: 接続に失敗した状態（localError にエラーメッセージが入る）
   * - default: それ以外の状態（接続前の初期状態）
   */
  const displayState = getWalletDisplayState({
    connected: false,
    connecting,
    error: localError,
  });

  /**
   * 接続ボタンがクリックされたときの処理。
   * Phantom ウォレットを優先的に選択して接続を試みる。
   * 接続に失敗した場合は、エラーメッセージを localError にセットして表示する。
   */
  const handleConnect = async () => {
    try {
      setLocalError(null);
      // Phantom を優先的に選択。wallets[0] が Phantom Adapter
      const phantomWallet = wallets.find((w) =>
        w.adapter.name.toLowerCase().includes("phantom"),
      );
      if (phantomWallet) {
        select(phantomWallet.adapter.name);
      }
      // 接続を試みる
      await connect();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "接続に失敗しました。再試行してください。";
      setLocalError(message);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f0f13]">
      {/* Solana ブランドロゴエリア */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <div
          className="h-16 w-16 rounded-full"
          style={{
            background: "linear-gradient(135deg, #9945FF 0%, #14F195 100%)",
          }}
        />
        <h1
          className="text-2xl font-semibold tracking-tight text-white"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Solana AI Agent
        </h1>
        <p className="text-sm text-[#888]">
          Devnet · Phantom ウォレットで接続してください
        </p>
      </div>

      {/* 状態別 UI */}
      {displayState.status === "connecting" ? (
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 animate-spin rounded-full border-4 border-[#9945FF] border-t-transparent"
            role="status"
            aria-label="接続中"
          />
          <p className="text-sm text-[#888]">ウォレットに接続中...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          {/* エラーメッセージ */}
          {displayState.status === "error" && (
            <div className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {displayState.message}
            </div>
          )}

          {/* 接続ボタン */}
          <button
            type="button"
            onClick={handleConnect}
            className="rounded-xl px-8 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #9945FF 0%, #14F195 100%)",
              minWidth: "200px",
            }}
          >
            {displayState.status === "error" ? "再接続する" : "Phantom で接続"}
          </button>
        </div>
      )}
    </div>
  );
}
