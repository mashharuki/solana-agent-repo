/**
 * useSolanaBalance / useNFTs フックのユニットテスト
 * Task 9.3 — Requirements: 3.1, 3.4
 *
 * React hooks のテストは jsdom 環境が必要なため、
 * hooks から export されている純粋ロジック関数を対象にする。
 */

import { describe, expect, it, vi } from "vitest";

// ── useSolanaBalance ────────────────────────────────────────────
import { LAMPORTS_PER_SOL, fetchSolBalance } from "@/hooks/useSolanaBalance";

// ── useNFTs ────────────────────────────────────────────────────
import {
  fetchNFTsByOwner,
  mapDasAssetToNFT,
  type DasAssetLike,
} from "@/hooks/useNFTs";

// ─────────────────────────────────────────────────────────────────
// useSolanaBalance の純粋ロジック (Req 3.1, 3.2, 3.3)
// ─────────────────────────────────────────────────────────────────

describe("LAMPORTS_PER_SOL 定数 (Req 3.1)", () => {
  it("1 SOL = 1,000,000,000 lamports", () => {
    expect(LAMPORTS_PER_SOL).toBe(1_000_000_000);
  });
});

describe("fetchSolBalance — モック RPC レスポンスによるユニットテスト (Req 3.1)", () => {
  const mockPublicKey =
    "So11111111111111111111111111111111111111112" as unknown as Parameters<
      typeof fetchSolBalance
    >[1];

  function makeConn(lamports: number) {
    return {
      getBalance: vi.fn().mockResolvedValue(lamports),
    } as unknown as Parameters<typeof fetchSolBalance>[0];
  }

  it("100_000_000 lamports → 0.1 SOL を返す", async () => {
    const result = await fetchSolBalance(makeConn(100_000_000), mockPublicKey);
    expect(result).toBeCloseTo(0.1, 9);
  });

  it("1_000_000_000 lamports → 1 SOL を返す", async () => {
    const result = await fetchSolBalance(
      makeConn(LAMPORTS_PER_SOL),
      mockPublicKey,
    );
    expect(result).toBe(1);
  });

  it("0 lamports → 0 SOL を返す（空ウォレット）", async () => {
    const result = await fetchSolBalance(makeConn(0), mockPublicKey);
    expect(result).toBe(0);
  });

  it("2_000_000_000 lamports → 2 SOL を返す", async () => {
    const result = await fetchSolBalance(
      makeConn(2_000_000_000),
      mockPublicKey,
    );
    expect(result).toBe(2);
  });

  it("負の lamports → null を返す（不正な RPC 応答のガード）", async () => {
    const result = await fetchSolBalance(makeConn(-1), mockPublicKey);
    expect(result).toBeNull();
  });

  it("RPC が例外をスローした場合は上位に伝播する", async () => {
    const conn = {
      getBalance: vi.fn().mockRejectedValue(new Error("RPC timeout")),
    } as unknown as Parameters<typeof fetchSolBalance>[0];
    await expect(fetchSolBalance(conn, mockPublicKey)).rejects.toThrow(
      "RPC timeout",
    );
  });

  it("getBalance の呼び出しに publicKey が渡される", async () => {
    const conn = makeConn(LAMPORTS_PER_SOL);
    await fetchSolBalance(conn, mockPublicKey);
    expect(conn.getBalance).toHaveBeenCalledWith(mockPublicKey);
  });
});

// ─────────────────────────────────────────────────────────────────
// useNFTs の純粋ロジック (Req 3.4, 3.5)
// ─────────────────────────────────────────────────────────────────

describe("mapDasAssetToNFT — DAS アセット → NFTAsset マッピング (Req 3.4)", () => {
  it("name・symbol・imageUrl が正しくマップされる", () => {
    const asset: DasAssetLike = {
      id: "mint_abc",
      content: {
        metadata: { name: "Solana NFT", symbol: "SNFT" },
        links: [{ image: "https://cdn.example.com/nft.png" }],
      },
    };
    const nft = mapDasAssetToNFT(asset);
    expect(nft).toEqual({
      id: "mint_abc",
      name: "Solana NFT",
      symbol: "SNFT",
      imageUrl: "https://cdn.example.com/nft.png",
    });
  });

  it("metadata が undefined → name は 'Unknown'、symbol は '' ", () => {
    const asset: DasAssetLike = { id: "bare" };
    const nft = mapDasAssetToNFT(asset);
    expect(nft.name).toBe("Unknown");
    expect(nft.symbol).toBe("");
  });

  it("links が空配列 → imageUrl は ''", () => {
    const asset: DasAssetLike = {
      id: "no-image",
      content: { metadata: { name: "No Image" }, links: [] },
    };
    const nft = mapDasAssetToNFT(asset);
    expect(nft.imageUrl).toBe("");
  });

  it("id は変換されずそのまま保持される", () => {
    const asset: DasAssetLike = { id: "unique-mint-id-xyz" };
    expect(mapDasAssetToNFT(asset).id).toBe("unique-mint-id-xyz");
  });
});

describe("fetchNFTsByOwner — モック fetch によるユニットテスト (Req 3.4, 3.5)", () => {
  const RPC_URL = "https://api.devnet.solana.com";
  const OWNER = "So11111111111111111111111111111111111111112";

  function mockFetch(items: DasAssetLike[]) {
    return vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { items, total: items.length } }),
    });
  }

  it("1 件の NFT を正しく取得してマップする", async () => {
    const asset: DasAssetLike = {
      id: "mint1",
      content: { metadata: { name: "My NFT", symbol: "MN" } },
    };
    const nfts = await fetchNFTsByOwner(RPC_URL, OWNER, mockFetch([asset]));
    expect(nfts).toHaveLength(1);
    expect(nfts[0].id).toBe("mint1");
    expect(nfts[0].name).toBe("My NFT");
  });

  it("NFT が 0 件のウォレット → 空配列を返す", async () => {
    const nfts = await fetchNFTsByOwner(RPC_URL, OWNER, mockFetch([]));
    expect(nfts).toEqual([]);
  });

  it("DAS API エラーレスポンス → 空配列を返す（フォールバック）", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        error: { code: -32601, message: "Method not found" },
      }),
    });
    const nfts = await fetchNFTsByOwner(RPC_URL, OWNER, fetchFn);
    expect(nfts).toEqual([]);
  });

  it("ネットワーク障害 → 空配列を返す（Req 3.5: DAS 非対応フォールバック）", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("Network error"));
    const nfts = await fetchNFTsByOwner(RPC_URL, OWNER, fetchFn);
    expect(nfts).toEqual([]);
  });

  it("getAssetsByOwner リクエストボディに ownerAddress が含まれる", async () => {
    const fetchFn = mockFetch([]);
    await fetchNFTsByOwner(RPC_URL, OWNER, fetchFn);
    const body = JSON.parse(
      (fetchFn.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.params.ownerAddress).toBe(OWNER);
  });

  it("getAssetsByOwner メソッドが正しく指定される", async () => {
    const fetchFn = mockFetch([]);
    await fetchNFTsByOwner(RPC_URL, OWNER, fetchFn);
    const body = JSON.parse(
      (fetchFn.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.method).toBe("getAssetsByOwner");
  });
});
