import { getWalletDisplayState } from "@/lib/wallet-state";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useRef, useState } from "react";

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
  // select() の反映後にだけ connect() を呼ぶためのフラグ。
  // useRef なので useEffect 内で更新しても再レンダーを発生させない。
  const pendingConnectRef = useRef(false);

  useEffect(() => {
    if (!pendingConnectRef.current || !wallet) return;
    pendingConnectRef.current = false;
    connect().catch((err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : "接続に失敗しました。再試行してください。";
      setLocalError(message);
    });
  }, [wallet, connect]);

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
      pendingConnectRef.current = true;
    } else {
      setLocalError(
        "Phantom ウォレットが見つかりません。拡張機能をインストールしてください。",
      );
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      {/* Solana ブランドロゴエリア */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <div className="h-16 w-16 rounded-full bg-solana-gradient" />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Solana AI Agent
        </h1>
        <p className="text-sm text-muted-foreground">
          Devnet · Phantom ウォレットで接続してください
        </p>
      </div>

      {/* 状態別 UI */}
      {displayState.status === "connecting" ? (
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"
            role="status"
            aria-label="接続中"
          />
          <p className="text-sm text-muted-foreground">ウォレットに接続中...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          {/* エラーメッセージ */}
          {displayState.status === "error" && (
            <div className="mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {displayState.message}
            </div>
          )}

          {/* 接続ボタン */}
          <button
            type="button"
            onClick={handleConnect}
            className="min-w-[200px] rounded-xl bg-solana-gradient px-8 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-95"
          >
            {displayState.status === "error" ? "再接続する" : "Phantom で接続"}
          </button>
        </div>
      )}
    </div>
  );
}
