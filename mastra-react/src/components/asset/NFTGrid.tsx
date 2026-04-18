import type { NFTAsset } from "@/types/solana";

interface NFTGridProps {
  nfts: NFTAsset[];
  isLoading: boolean;
}

/**
 * NFT サムネイルと名称を一覧表示するグリッド。
 * 0 件の場合は空状態メッセージを表示する。
 *
 * Requirements: 3.4, 3.5
 */
export function NFTGrid({ nfts, isLoading }: NFTGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "#9945FF", borderTopColor: "transparent" }}
          role="status"
          aria-label="NFT読み込み中"
        />
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <p className="py-4 text-center text-xs" style={{ color: "#555" }}>
        NFT が見つかりません
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {nfts.map((nft) => (
        <div
          key={nft.id}
          className="overflow-hidden rounded-lg"
          style={{ background: "rgba(153, 69, 255, 0.08)" }}
          title={nft.name}
        >
          {nft.imageUrl ? (
            <img
              src={nft.imageUrl}
              alt={nft.name}
              className="aspect-square w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="flex aspect-square w-full items-center justify-center"
              style={{ background: "rgba(153, 69, 255, 0.15)" }}
              aria-label={nft.name}
            >
              <span className="text-lg">🖼</span>
            </div>
          )}
          <p
            className="truncate px-1.5 py-1 text-center text-xs text-white"
            title={nft.name}
          >
            {nft.name}
          </p>
        </div>
      ))}
    </div>
  );
}
