import { getWalletDisplayState } from "@/lib/wallet-state";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";

/**
 * ウォレット未接続時に表示する接続画面。
 * Phantom ウォレットへの接続ボタン、接続中インジケーター、
 * エラーメッセージと再試行ボタンを状態に応じて表示する。
 *
 * Requirements: 1.1, 1.2, 1.5, 1.6
 */
export function WalletConnectScreen() {
  const { connecting, connect, select, wallet, wallets } = useWallet();
  const [localError, setLocalError] = useState<string | null>(null);
  // select() は React state 更新をスケジュールするだけなので、
  // 同一コール内で connect() を呼ぶと WalletNotSelectedError になる。
  // このフラグで「選択完了後に接続」を useEffect へ委譲する。
  const [pendingConnect, setPendingConnect] = useState(false);

  useEffect(() => {
    if (!pendingConnect || !wallet) return;
    setPendingConnect(false);
    connect().catch((err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : "接続に失敗しました。再試行してください。";
      setLocalError(message);
    });
  }, [pendingConnect, wallet, connect]);

  const displayState = getWalletDisplayState({
    connected: false,
    connecting,
    error: localError,
  });

  const handleConnect = () => {
    setLocalError(null);
    const phantomWallet = wallets.find((w) =>
      w.adapter.name.toLowerCase().includes("phantom"),
    );
    if (phantomWallet) {
      select(phantomWallet.adapter.name);
      // wallet state はまだ更新されていないため useEffect 経由で接続する
      setPendingConnect(true);
    } else {
      setLocalError(
        "Phantom ウォレットが見つかりません。拡張機能をインストールしてください。",
      );
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
