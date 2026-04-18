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
    <aside className="flex w-56 shrink-0 flex-col gap-4 overflow-y-auto rounded-2xl border border-primary/18 bg-primary/6 p-4">
      {/* SOL 残高セクション */}
      <section>
        <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
          残高
        </h2>

        {balanceLoading ? (
          <div
            className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent"
            role="status"
            aria-label="残高読み込み中"
          />
        ) : (
          <p
            className={`font-mono text-xl font-bold ${solBalance === null ? "text-muted-foreground" : "text-accent"}`}
            aria-label="SOL残高"
          >
            {formatSolBalance(solBalance)}
          </p>
        )}

        {solBalance === 0 && !balanceLoading && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            残高ゼロ — DevNet エアドロップをお試しください
          </p>
        )}
      </section>

      {/* セパレーター */}
      <div className="h-px w-full bg-primary/15" />

      {/* NFT セクション */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
          NFT
        </h2>
        <NFTGrid nfts={nfts} isLoading={nftsLoading} />
      </section>
    </aside>
  );
}
