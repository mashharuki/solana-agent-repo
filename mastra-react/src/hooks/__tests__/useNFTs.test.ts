import { describe, expect, it, vi } from "vitest";
import {
  type DasAssetLike,
  fetchNFTsByOwner,
  mapDasAssetToNFT,
} from "../useNFTs";

// ─────────────────────────────────────────────
// mapDasAssetToNFT
// ─────────────────────────────────────────────

describe("mapDasAssetToNFT", () => {
  it("maps a full DAS asset to NFTAsset", () => {
    const asset: DasAssetLike = {
      id: "mint111",
      content: {
        metadata: { name: "Cool NFT", symbol: "COOL" },
        links: [{ image: "https://example.com/nft.png" }],
      },
    };
    expect(mapDasAssetToNFT(asset)).toEqual({
      id: "mint111",
      name: "Cool NFT",
      imageUrl: "https://example.com/nft.png",
      symbol: "COOL",
    });
  });

  it("falls back to empty string when image is missing from links", () => {
    const asset: DasAssetLike = {
      id: "mint222",
      content: {
        metadata: { name: "No Image NFT", symbol: "NI" },
        links: [{}],
      },
    };
    expect(mapDasAssetToNFT(asset).imageUrl).toBe("");
  });

  it("falls back to empty string when links array is absent", () => {
    const asset: DasAssetLike = {
      id: "mint333",
      content: { metadata: { name: "No Links", symbol: "NL" } },
    };
    expect(mapDasAssetToNFT(asset).imageUrl).toBe("");
  });

  it('falls back to "Unknown" when name is missing', () => {
    const asset: DasAssetLike = {
      id: "mint444",
      content: { metadata: { name: "", symbol: "SYM" } },
    };
    expect(mapDasAssetToNFT(asset).name).toBe("Unknown");
  });

  it("falls back to empty strings when content is absent", () => {
    const asset: DasAssetLike = { id: "mint555" };
    const result = mapDasAssetToNFT(asset);
    expect(result).toEqual({
      id: "mint555",
      name: "Unknown",
      imageUrl: "",
      symbol: "",
    });
  });

  it("preserves non-empty symbol", () => {
    const asset: DasAssetLike = {
      id: "mint666",
      content: { metadata: { name: "Token", symbol: "TKN" } },
    };
    expect(mapDasAssetToNFT(asset).symbol).toBe("TKN");
  });
});

// ─────────────────────────────────────────────
// fetchNFTsByOwner
// ─────────────────────────────────────────────

const OWNER = "FakeOwner1111111111111111111111111111111";

function makeJsonRpcFetch(result: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(result),
  } as Response);
}

describe("fetchNFTsByOwner", () => {
  it("returns mapped NFTs from a successful DAS response", async () => {
    const dasItem: DasAssetLike = {
      id: "nft1",
      content: {
        metadata: { name: "My NFT", symbol: "MN" },
        links: [{ image: "https://img.com/1.png" }],
      },
    };
    const fetchFn = makeJsonRpcFetch({
      result: { items: [dasItem], total: 1 },
    });

    const nfts = await fetchNFTsByOwner(
      "https://rpc.example.com",
      OWNER,
      fetchFn,
    );

    expect(nfts).toHaveLength(1);
    expect(nfts[0]).toMatchObject({ id: "nft1", name: "My NFT" });
  });

  it("returns empty array when DAS responds with an error", async () => {
    const fetchFn = makeJsonRpcFetch({
      error: { code: -32601, message: "Method not found" },
    });
    const nfts = await fetchNFTsByOwner(
      "https://rpc.example.com",
      OWNER,
      fetchFn,
    );
    expect(nfts).toEqual([]);
  });

  it("returns empty array when result.items is missing", async () => {
    const fetchFn = makeJsonRpcFetch({ result: { total: 0 } });
    const nfts = await fetchNFTsByOwner(
      "https://rpc.example.com",
      OWNER,
      fetchFn,
    );
    expect(nfts).toEqual([]);
  });

  it("returns empty array on network-level fetch error", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("Network error"));
    const nfts = await fetchNFTsByOwner(
      "https://rpc.example.com",
      OWNER,
      fetchFn,
    );
    expect(nfts).toEqual([]);
  });

  it("returns empty array when items array is empty", async () => {
    const fetchFn = makeJsonRpcFetch({ result: { items: [], total: 0 } });
    const nfts = await fetchNFTsByOwner(
      "https://rpc.example.com",
      OWNER,
      fetchFn,
    );
    expect(nfts).toEqual([]);
  });

  it("sends the correct JSON-RPC payload with ownerAddress", async () => {
    const fetchFn = makeJsonRpcFetch({ result: { items: [], total: 0 } });
    await fetchNFTsByOwner("https://rpc.example.com", OWNER, fetchFn);

    const body = JSON.parse(
      (fetchFn.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.method).toBe("getAssetsByOwner");
    expect(body.params.ownerAddress).toBe(OWNER);
  });

  it("handles multiple NFTs in response", async () => {
    const items: DasAssetLike[] = [
      { id: "a", content: { metadata: { name: "A", symbol: "AA" } } },
      { id: "b", content: { metadata: { name: "B", symbol: "BB" } } },
    ];
    const fetchFn = makeJsonRpcFetch({ result: { items, total: 2 } });
    const nfts = await fetchNFTsByOwner(
      "https://rpc.example.com",
      OWNER,
      fetchFn,
    );
    expect(nfts).toHaveLength(2);
    expect(nfts.map((n) => n.id)).toEqual(["a", "b"]);
  });
});
