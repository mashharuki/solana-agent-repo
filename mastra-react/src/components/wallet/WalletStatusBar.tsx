import { truncateAddress } from "@/lib/wallet-state";
import { useWallet } from "@solana/wallet-adapter-react";

/**
 * 接続済みウォレットのヘッダーバー。
 * 省略ウォレットアドレス・DevNet バッジ・切断ボタンを表示する。
 *
 * Requirements: 1.4, 1.7, 7.2
 */
export function WalletStatusBar() {
  // ウォレットの公開鍵と切断関数を取得
  const { publicKey, disconnect } = useWallet();
  // 公開鍵が存在する場合は省略表示、存在しない場合は空文字列
  const displayAddress = publicKey ? truncateAddress(publicKey.toBase58()) : "";

  return (
    <header className="flex items-center justify-between border-b border-primary/20 bg-background/85 px-5 py-3 backdrop-blur-md">
      {/* ブランドロゴ */}
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-solana-gradient" />
        <span className="text-sm font-semibold text-foreground">
          Solana AI Agent
        </span>
      </div>

      {/* 右側: DevNet バッジ + アドレス + 切断ボタン */}
      <div className="flex items-center gap-3">
        {/* DevNet バッジ */}
        <span className="rounded-full border border-accent/30 bg-accent/12 px-2.5 py-0.5 text-xs font-medium text-accent">
          DevNet
        </span>

        {/* ウォレットアドレス */}
        {displayAddress && (
          <span
            className="rounded-lg bg-primary/15 px-3 py-1 font-mono text-xs text-foreground"
            title={publicKey?.toBase58()}
          >
            {displayAddress}
          </span>
        )}

        {/* 切断ボタン */}
        <button
          type="button"
          onClick={() => disconnect()}
          className="rounded-lg px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          切断
        </button>
      </div>
    </header>
  );
}
