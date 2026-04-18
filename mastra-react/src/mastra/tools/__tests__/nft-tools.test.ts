import { describe, expect, it, vi } from "vitest";
import { GetNftsInputSchema, MintNftInputSchema } from "../../../types/solana";
import { buildMintNftTransaction, executeGetNfts } from "../nft-tools";

// Valid Solana addresses for tests
const OWNER = "So11111111111111111111111111111111111111112";
const TEST_BLOCKHASH = "11111111111111111111111111111111";

// ─────────────────────────────────────────────
// Input schema validation
// ─────────────────────────────────────────────

describe("GetNftsInputSchema", () => {
  it("accepts valid input with defaults", () => {
    const r = GetNftsInputSchema.safeParse({ ownerAddress: OWNER });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.limit).toBe(20);
      expect(r.data.page).toBe(1);
    }
  });

  it("rejects empty ownerAddress", () => {
    expect(GetNftsInputSchema.safeParse({ ownerAddress: "" }).success).toBe(
      false,
    );
  });
});

describe("MintNftInputSchema", () => {
  const validMint = {
    ownerAddress: OWNER,
    name: "Test NFT",
    symbol: "TNFT",
    uri: "https://metadata.example.com/1.json",
    sellerFeeBasisPoints: 500,
  };

  it("accepts valid mint input", () => {
    expect(MintNftInputSchema.safeParse(validMint).success).toBe(true);
  });

  it("rejects sellerFeeBasisPoints > 10000", () => {
    expect(
      MintNftInputSchema.safeParse({
        ...validMint,
        sellerFeeBasisPoints: 10001,
      }).success,
    ).toBe(false);
  });

  it("rejects negative sellerFeeBasisPoints", () => {
    expect(
      MintNftInputSchema.safeParse({ ...validMint, sellerFeeBasisPoints: -1 })
        .success,
    ).toBe(false);
  });

  it("rejects empty name", () => {
    expect(
      MintNftInputSchema.safeParse({ ...validMint, name: "" }).success,
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────
// executeGetNfts
// ─────────────────────────────────────────────

describe("executeGetNfts", () => {
  function makeJsonRpcFetch(result: unknown) {
    return vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(result),
    } as Response);
  }

  it("returns NFT items and total from DAS response", async () => {
    const items = [
      { id: "nft1", content: { metadata: { name: "Alpha", symbol: "A" } } },
    ];
    const fetchFn = makeJsonRpcFetch({ result: { items, total: 1 } });

    const result = await executeGetNfts(OWNER, fetchFn);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("nft1");
    expect(result.total).toBe(1);
  });

  it("returns empty items when DAS responds with error", async () => {
    const fetchFn = makeJsonRpcFetch({
      error: { code: -32601, message: "Not found" },
    });
    const result = await executeGetNfts(OWNER, fetchFn);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("returns empty items on network error", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("Network error"));
    const result = await executeGetNfts(OWNER, fetchFn);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});

// ─────────────────────────────────────────────
// buildMintNftTransaction
// ─────────────────────────────────────────────

describe("buildMintNftTransaction", () => {
  const validParams = {
    ownerAddress: OWNER,
    name: "My NFT",
    symbol: "MN",
    uri: "https://example.com/metadata.json",
    sellerFeeBasisPoints: 500,
  };
  const deps = {
    getRecentBlockhashFn: vi.fn().mockResolvedValue(TEST_BLOCKHASH),
  };

  it('returns SolanaTxRequest with type "solana_tx_request"', async () => {
    const result = await buildMintNftTransaction(validParams, deps);
    expect(result.type).toBe("solana_tx_request");
  });

  it('returns txType "nft_mint"', async () => {
    const result = await buildMintNftTransaction(validParams, deps);
    expect(result.txType).toBe("nft_mint");
  });

  it("returns a non-empty base64 serializedTx", async () => {
    const result = await buildMintNftTransaction(validParams, deps);
    expect(result.serializedTx.length).toBeGreaterThan(0);
    expect(result.serializedTx).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("includes the NFT name in description", async () => {
    const result = await buildMintNftTransaction(validParams, deps);
    expect(result.description).toContain("My NFT");
  });

  it("includes the symbol in description", async () => {
    const result = await buildMintNftTransaction(validParams, deps);
    expect(result.description).toContain("MN");
  });
});
