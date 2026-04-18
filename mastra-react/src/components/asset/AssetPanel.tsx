import { useNFTs } from "@/hooks/useNFTs";
import { useSolanaBalance } from "@/hooks/useSolanaBalance";
import { formatSolBalance } from "@/lib/asset-utils";
import { NFTGrid } from "./NFTGrid";

/**
 * SOL 残高と NFT 一覧を表示するサイドパネル。
 * useSolanaBalance / useNFTs フックから最新データを取得する。
 *
 * Requirements: 3.1–3.6
 */
export function AssetPanel() {
  const { solBalance, isLoading: balanceLoading } = useSolanaBalance();
  const { nfts, isLoading: nftsLoading } = useNFTs();

  return (
    <aside
      className="flex w-56 shrink-0 flex-col gap-4 overflow-y-auto rounded-2xl p-4"
      style={{
        background: "rgba(153, 69, 255, 0.06)",
        border: "1px solid rgba(153, 69, 255, 0.18)",
      }}
    >
      {/* SOL 残高セクション */}
      <section>
        <h2
          className="mb-1.5 text-xs font-semibold uppercase tracking-widest"
          style={{ color: "#9945FF" }}
        >
          残高
        </h2>

        {balanceLoading ? (
          <div
            className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: "#14F195", borderTopColor: "transparent" }}
            role="status"
            aria-label="残高読み込み中"
          />
        ) : (
          <p
            className="font-mono text-xl font-bold"
            style={{
              color: solBalance === null ? "#555" : "#14F195",
            }}
            aria-label="SOL残高"
          >
            {formatSolBalance(solBalance)}
          </p>
        )}

        {solBalance === 0 && !balanceLoading && (
          <p className="mt-0.5 text-xs" style={{ color: "#666" }}>
            残高ゼロ — DevNet エアドロップをお試しください
          </p>
        )}
      </section>

      {/* セパレーター */}
      <div
        className="h-px w-full"
        style={{ background: "rgba(153, 69, 255, 0.15)" }}
      />

      {/* NFT セクション */}
      <section>
        <h2
          className="mb-2 text-xs font-semibold uppercase tracking-widest"
          style={{ color: "#9945FF" }}
        >
          NFT
        </h2>
        <NFTGrid nfts={nfts} isLoading={nftsLoading} />
      </section>
    </aside>
  );
}
