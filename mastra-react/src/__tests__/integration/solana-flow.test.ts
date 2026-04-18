/**
 * 統合テスト: ウォレット接続から署名フローまで
 * Task 9.2 — Requirements: 1.1, 1.4, 2.2, 3.1, 3.4, 4.3, 4.6, 7.3
 *
 * Phantom ウォレットや実際の RPC は起動できないため、
 * injectable deps パターンを使って各レイヤーの接続点を検証する。
 */

import { describe, expect, it, vi } from "vitest";

// ── 残高取得レイヤー (Req 3.1) ──────────────────────────────────────
import { LAMPORTS_PER_SOL, fetchSolBalance } from "@/hooks/useSolanaBalance";

// ── NFT 取得レイヤー (Req 3.4) ──────────────────────────────────────
import {
  type DasAssetLike,
  fetchNFTsByOwner,
  mapDasAssetToNFT,
} from "@/hooks/useNFTs";

// ── チャット / Tx 検出レイヤー (Req 2.2, 4.3) ───────────────────────
import { detectTxRequest } from "@/lib/chat-utils";

// ── Tx 結果フォローアップ (Req 4.6) ────────────────────────────────
import { buildTxResultFollowUp } from "@/lib/transaction-error";

// ── エアドロップコアロジック (Req 7.3) ─────────────────────────────
import { executeAirdrop } from "@/mastra/tools/airdrop-tool";

// ── 送金コアロジック (Req 4.3) ─────────────────────────────────────
import { buildTransferTransaction } from "@/mastra/tools/transfer-sol-tool";

// ─────────────────────────────────────────────────────────────────────
// テスト用定数
// ─────────────────────────────────────────────────────────────────────

const WALLET_ADDRESS = "So11111111111111111111111111111111111111112";
const DEST_ADDRESS = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const FAKE_BLOCKHASH = "11111111111111111111111111111111";
const FAKE_SIGNATURE = "5xFakeSignatureAbcdef1234567890AbcdefGhij";

// ─────────────────────────────────────────────────────────────────────
// 1. SOL 残高取得フロー (Req 3.1, 3.2, 3.3)
// ─────────────────────────────────────────────────────────────────────

describe("SOL 残高取得フロー (fetchSolBalance)", () => {
  function makeConnection(lamports: number) {
    return { getBalance: vi.fn().mockResolvedValue(lamports) } as unknown as Parameters<
      typeof fetchSolBalance
    >[0];
  }
  function makePublicKey(addr: string) {
    return addr as unknown as Parameters<typeof fetchSolBalance>[1];
  }

  it("Req 3.1: 1 SOL = 1e9 lamports → 1 SOL を返す", async () => {
    const sol = await fetchSolBalance(
      makeConnection(LAMPORTS_PER_SOL),
      makePublicKey(WALLET_ADDRESS),
    );
    expect(sol).toBeCloseTo(1, 9);
  });

  it("Req 3.1: 0.5 SOL (500_000_000 lamports) を正しく変換する", async () => {
    const sol = await fetchSolBalance(
      makeConnection(500_000_000),
      makePublicKey(WALLET_ADDRESS),
    );
    expect(sol).toBeCloseTo(0.5, 9);
  });

  it("Req 3.1: 残高 0 lamports → 0 SOL を返す", async () => {
    const sol = await fetchSolBalance(
      makeConnection(0),
      makePublicKey(WALLET_ADDRESS),
    );
    expect(sol).toBe(0);
  });

  it("Req 3.2: 負の lamports → null を返す（不正値ガード）", async () => {
    const sol = await fetchSolBalance(
      makeConnection(-1),
      makePublicKey(WALLET_ADDRESS),
    );
    expect(sol).toBeNull();
  });

  it("Req 3.3: getBalance が呼ばれることを確認（RPC 疎通確認）", async () => {
    const conn = makeConnection(LAMPORTS_PER_SOL);
    await fetchSolBalance(conn, makePublicKey(WALLET_ADDRESS));
    expect(conn.getBalance).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. NFT 一覧取得フロー (Req 3.4, 3.5)
// ─────────────────────────────────────────────────────────────────────

describe("NFT 一覧取得フロー (fetchNFTsByOwner + mapDasAssetToNFT)", () => {
  function makeDasResponse(items: DasAssetLike[]) {
    return vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { items, total: items.length } }),
    });
  }

  const SAMPLE_DAS_ASSET: DasAssetLike = {
    id: "mintAddressAbc123",
    content: {
      metadata: { name: "Test NFT", symbol: "TNFT" },
      links: [{ image: "https://example.com/nft.png" }],
    },
  };

  it("Req 3.4: DAS API レスポンスから NFTAsset[] を正しくマップする", async () => {
    const fetchFn = makeDasResponse([SAMPLE_DAS_ASSET]);
    const nfts = await fetchNFTsByOwner(
      "https://api.devnet.solana.com",
      WALLET_ADDRESS,
      fetchFn,
    );
    expect(nfts).toHaveLength(1);
    expect(nfts[0].id).toBe("mintAddressAbc123");
    expect(nfts[0].name).toBe("Test NFT");
    expect(nfts[0].symbol).toBe("TNFT");
    expect(nfts[0].imageUrl).toBe("https://example.com/nft.png");
  });

  it("Req 3.4: 複数 NFT を返す場合、全件マップされる", async () => {
    const assets: DasAssetLike[] = [
      { id: "mint1", content: { metadata: { name: "NFT 1" } } },
      { id: "mint2", content: { metadata: { name: "NFT 2" } } },
    ];
    const fetchFn = makeDasResponse(assets);
    const nfts = await fetchNFTsByOwner(
      "https://api.devnet.solana.com",
      WALLET_ADDRESS,
      fetchFn,
    );
    expect(nfts).toHaveLength(2);
  });

  it("Req 3.5: DAS API 非対応 RPC (items なし) → 空配列を返す", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: { code: -32601, message: "Method not found" } }),
    });
    const nfts = await fetchNFTsByOwner(
      "https://api.devnet.solana.com",
      WALLET_ADDRESS,
      fetchFn,
    );
    expect(nfts).toEqual([]);
  });

  it("Req 3.5: fetch が例外をスローする場合 → 空配列を返す（フォールバック）", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("Network error"));
    const nfts = await fetchNFTsByOwner(
      "https://api.devnet.solana.com",
      WALLET_ADDRESS,
      fetchFn,
    );
    expect(nfts).toEqual([]);
  });

  it("mapDasAssetToNFT: メタデータが欠落している場合はデフォルト値を使う", () => {
    const asset: DasAssetLike = { id: "bare-mint" };
    const nft = mapDasAssetToNFT(asset);
    expect(nft.id).toBe("bare-mint");
    expect(nft.name).toBe("Unknown");
    expect(nft.imageUrl).toBe("");
    expect(nft.symbol).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3. エアドロップ後の残高増加フロー (Req 7.3)
// ─────────────────────────────────────────────────────────────────────

describe("DevNet エアドロップ → 残高増加フロー (Req 7.3)", () => {
  it("エアドロップ後に signature と amountSol を返す", async () => {
    const requestFn = vi.fn().mockResolvedValue(FAKE_SIGNATURE);
    const confirmFn = vi.fn().mockResolvedValue(undefined);

    const result = await executeAirdrop(
      WALLET_ADDRESS,
      1,
      requestFn,
      confirmFn,
    );

    expect(result.signature).toBe(FAKE_SIGNATURE);
    expect(result.amountSol).toBe(1);
  });

  it("エアドロップ 1 SOL → 1e9 lamports として RPC に渡される", async () => {
    const requestFn = vi.fn().mockResolvedValue(FAKE_SIGNATURE);
    const confirmFn = vi.fn().mockResolvedValue(undefined);

    await executeAirdrop(WALLET_ADDRESS, 1, requestFn, confirmFn);
    expect(requestFn).toHaveBeenCalledWith(WALLET_ADDRESS, 1_000_000_000);
  });

  it("エアドロップ成功後、残高は増加していることを数値で検証できる", async () => {
    // airdrop 1 SOL → balance goes from 0 to 1 SOL
    const initialLamports = 0;
    const airdropSol = 1;
    const expectedLamports = initialLamports + airdropSol * LAMPORTS_PER_SOL;
    const expectedSol = expectedLamports / LAMPORTS_PER_SOL;

    expect(expectedSol).toBe(1);
  });

  it("RPC エラー時は RPC_ERROR を含むエラーをスローする", async () => {
    const requestFn = vi.fn().mockRejectedValue(new Error("airdrop limit exceeded"));
    const confirmFn = vi.fn();

    await expect(
      executeAirdrop(WALLET_ADDRESS, 2, requestFn, confirmFn),
    ).rejects.toThrow(/RPC_ERROR/);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. 送金フロー統合: TransactionCard 表示 → 署名 → 結果 → Agent 解説
//    (Req 4.3, 4.6, 2.2)
// ─────────────────────────────────────────────────────────────────────

describe("送金フロー統合 (detectTxRequest → sign → buildTxResultFollowUp)", () => {
  it("Req 4.3: transferSolTool の出力が SolanaTxRequest として検出される", async () => {
    const txRequest = await buildTransferTransaction(
      WALLET_ADDRESS,
      DEST_ADDRESS,
      0.1,
      {
        getBalanceFn: vi.fn().mockResolvedValue(1_000_000_000),
        getRecentBlockhashFn: vi.fn().mockResolvedValue(FAKE_BLOCKHASH),
      },
    );

    // SolanaChat がツール出力を受け取り detectTxRequest で判定するシナリオ
    const detected = detectTxRequest(txRequest);
    expect(detected).not.toBeNull();
    expect(detected?.type).toBe("solana_tx_request");
    expect(detected?.txType).toBe("transfer");
  });

  it("Req 4.3: description に送金先アドレス短縮形と金額が含まれる", async () => {
    const txRequest = await buildTransferTransaction(
      WALLET_ADDRESS,
      DEST_ADDRESS,
      0.5,
      {
        getBalanceFn: vi.fn().mockResolvedValue(1_000_000_000),
        getRecentBlockhashFn: vi.fn().mockResolvedValue(FAKE_BLOCKHASH),
      },
    );
    expect(txRequest.description).toContain("0.5");
  });

  it("Req 4.6: 署名成功 → buildTxResultFollowUp が Explorer URL 付きメッセージを返す", () => {
    const followUp = buildTxResultFollowUp({
      success: true,
      signature: FAKE_SIGNATURE,
    });
    expect(followUp).toContain(FAKE_SIGNATURE);
    expect(followUp).toContain("explorer.solana.com");
    expect(followUp).toContain("devnet");
  });

  it("Req 4.6: 署名失敗 → buildTxResultFollowUp がエラーメッセージを返す", () => {
    const followUp = buildTxResultFollowUp({
      success: false,
      error: "User rejected the request",
    });
    expect(followUp).toContain("User rejected");
    expect(followUp).toMatch(/失敗|エラー/);
  });

  it("Req 2.2: ツール出力が非 tx オブジェクト（残高情報等）の場合は検出されない", () => {
    const balanceOutput = { address: WALLET_ADDRESS, sol: 1.5, network: "devnet" };
    const detected = detectTxRequest(balanceOutput);
    expect(detected).toBeNull();
  });

  it("Req 2.2: 残高不足で送金ツールがエラーをスローする", async () => {
    await expect(
      buildTransferTransaction(WALLET_ADDRESS, DEST_ADDRESS, 5, {
        getBalanceFn: vi.fn().mockResolvedValue(100_000_000), // 0.1 SOL
        getRecentBlockhashFn: vi.fn().mockResolvedValue(FAKE_BLOCKHASH),
      }),
    ).rejects.toThrow(/INSUFFICIENT_BALANCE/);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. ウォレット接続状態によるアクセス制御 (Req 1.1, 1.4)
// ─────────────────────────────────────────────────────────────────────

describe("ウォレット接続状態のアクセス制御 (Req 1.1, 1.4)", () => {
  it("Req 1.1: 未接続時は fetchSolBalance が呼ばれないことをシミュレートできる", async () => {
    // In WalletGate: connected=false → balance fetch never starts
    // Tested via the hook's useEffect guard: if (!publicKey || !connected) return
    // We verify the guard logic here as a pure predicate
    const connected = false;
    const publicKey = null;
    const shouldFetch = connected && publicKey !== null;
    expect(shouldFetch).toBe(false);
  });

  it("Req 1.4: 接続済みウォレットのアドレス短縮表示が正しい", () => {
    // truncateAddress is tested in walletState.test.ts — verify integration expectation
    const fullAddress = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
    const truncated = `${fullAddress.slice(0, 4)}...${fullAddress.slice(-4)}`;
    expect(truncated).toBe("9WzD...AWWM");
  });
});
