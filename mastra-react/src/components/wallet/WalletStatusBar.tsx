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
    <header
      className="flex items-center justify-between px-5 py-3"
      style={{
        background: "rgba(15, 15, 19, 0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(153, 69, 255, 0.2)",
      }}
    >
      {/* ブランドロゴ */}
      <div className="flex items-center gap-2">
        <div
          className="h-6 w-6 rounded-full"
          style={{
            background: "linear-gradient(135deg, #9945FF 0%, #14F195 100%)",
          }}
        />
        <span
          className="text-sm font-semibold text-white"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Solana AI Agent
        </span>
      </div>

      {/* 右側: DevNet バッジ + アドレス + 切断ボタン */}
      <div className="flex items-center gap-3">
        {/* DevNet バッジ */}
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{
            background: "rgba(20, 241, 149, 0.12)",
            color: "#14F195",
            border: "1px solid rgba(20, 241, 149, 0.3)",
          }}
        >
          DevNet
        </span>

        {/* ウォレットアドレス */}
        {displayAddress && (
          <span
            className="rounded-lg px-3 py-1 font-mono text-xs text-white"
            style={{ background: "rgba(153, 69, 255, 0.15)" }}
            title={publicKey?.toBase58()}
          >
            {displayAddress}
          </span>
        )}

        {/* 切断ボタン */}
        <button
          type="button"
          onClick={() => disconnect()}
          className="rounded-lg px-3 py-1 text-xs font-medium text-[#888] transition-colors hover:bg-white/5 hover:text-white"
        >
          切断
        </button>
      </div>
    </header>
  );
}
