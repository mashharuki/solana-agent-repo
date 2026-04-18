import type { NFTAsset, SolanaError } from "@/types/solana";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";

// ─────────────────────────────────────────────
// DAS API shape (minimal duck-type for testing)
// ─────────────────────────────────────────────

export interface DasAssetLike {
  id: string;
  content?: {
    metadata?: { name?: string; symbol?: string };
    links?: Array<Record<string, unknown>>;
  };
}

interface DasApiResponse {
  result?: { items?: DasAssetLike[]; total?: number };
  error?: { code: number; message: string };
}

// ─────────────────────────────────────────────
// Pure mapping function
// ─────────────────────────────────────────────

export function mapDasAssetToNFT(asset: DasAssetLike): NFTAsset {
  const name = asset.content?.metadata?.name || "Unknown";
  const symbol = asset.content?.metadata?.symbol ?? "";
  const imageUrl =
    (asset.content?.links?.[0]?.image as string | undefined) ?? "";
  return { id: asset.id, name, imageUrl, symbol };
}

// ─────────────────────────────────────────────
// Core fetch — injectable fetch for testability
// ─────────────────────────────────────────────

export async function fetchNFTsByOwner(
  rpcUrl: string,
  ownerAddress: string,
  fetchFn: typeof fetch = fetch,
): Promise<NFTAsset[]> {
  try {
    const response = await fetchFn(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getAssetsByOwner",
        params: {
          ownerAddress,
          page: 1,
          limit: 20,
          displayOptions: { showFungible: false },
        },
      }),
    });
    const data: DasApiResponse = await response.json();
    if (data.error || !data.result?.items) return [];
    return data.result.items.map(mapDasAssetToNFT);
  } catch {
    // DAS not supported (standard DevNet RPC) — fall back to empty list
    return [];
  }
}

// ─────────────────────────────────────────────
// React hook
// ─────────────────────────────────────────────

export interface UseNFTsReturn {
  nfts: NFTAsset[];
  isLoading: boolean;
  error: SolanaError | null;
}

/**
 * 接続ウォレットが保有する NFT 一覧を Metaplex DAS API から取得するフック。
 * DAS API 非対応の RPC では空配列を返す（エラーにしない）。
 */
export function useNFTs(): UseNFTsReturn {
  const { publicKey, connected } = useWallet();
  const [nfts, setNfts] = useState<NFTAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<SolanaError | null>(null);

  useEffect(() => {
    if (!publicKey || !connected) {
      setNfts([]);
      setError(null);
      return;
    }

    let cancelled = false;
    const rpcUrl = (import.meta.env.VITE_SOLANA_RPC_URL as string) ?? "";

    setIsLoading(true);
    setError(null);

    fetchNFTsByOwner(rpcUrl, publicKey.toBase58())
      .then((result) => {
        if (!cancelled) setNfts(result);
      })
      .catch(() => {
        if (!cancelled)
          setError({ code: "RPC_ERROR", message: "NFTの取得に失敗しました" });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [publicKey, connected]);

  return { nfts, isLoading, error };
}
