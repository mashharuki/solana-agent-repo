import { createTool } from "@mastra/core/tools";
import { create, mplCore, ruleSet } from "@metaplex-foundation/mpl-core";
import {
  createNoopSigner,
  generateSigner,
  publicKey as umiPublicKey,
  signerIdentity,
} from "@metaplex-foundation/umi";
import type { Umi } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { PublicKey } from "@solana/web3.js";
import type { DasAssetLike } from "../../hooks/useNFTs";
import { mapDasAssetToNFT } from "../../hooks/useNFTs";
import {
  GetNftsInputSchema,
  GetNftsOutputSchema,
  MintNftInputSchema,
  SolanaTxRequestSchema,
  type GetNftsOutput,
  type MintNftInput,
  type SolanaTxRequest,
} from "../../types/solana";

// ─────────────────────────────────────────────
// getNftsTool — core logic
// ─────────────────────────────────────────────

interface DasApiResponse {
  result?: { items?: DasAssetLike[]; total?: number };
  error?: { code: number; message: string };
}

/**
 * DAS API で NFT 一覧を取得するコアロジック（injectable fetch）。
 */
export async function executeGetNfts(
  ownerAddress: string,
  fetchFn: typeof fetch = fetch,
): Promise<GetNftsOutput> {
  try {
    const rpcUrl =
      process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
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
    if (data.error || !data.result?.items) return { items: [], total: 0 };
    const items = data.result.items.map(mapDasAssetToNFT);
    return { items, total: data.result.total ?? items.length };
  } catch {
    return { items: [], total: 0 };
  }
}

/**
 * NFT 一覧取得ツール（Metaplex DAS API 経由）。
 *
 * 指定ウォレットが保有する NFT の一覧を取得します。
 * DAS API 非対応の RPC では空リストを返します（エラーにしません）。
 *
 * 使用シナリオ:
 * - ユーザーが「NFT を見せて」「保有している NFT は？」と尋ねたとき
 *
 * Get NFTs owned by a wallet address via Metaplex DAS API.
 */
export const getNftsTool = createTool({
  id: "get-nfts",
  description: `指定ウォレットが保有する NFT 一覧を Metaplex DAS API で取得します。
入力: ownerAddress — base58 形式の Solana 公開鍵、limit（最大件数、デフォルト 20）、page（ページ番号、デフォルト 1）
出力: items（NFTAsset の配列）と total（合計件数）
注意: DAS API 非対応 RPC では空リストを返します。
Use case: 'NFT を見せて', 'What NFTs do I own?', '保有 NFT 一覧'`,

  inputSchema: GetNftsInputSchema,
  outputSchema: GetNftsOutputSchema,

  execute: async ({ ownerAddress }) => executeGetNfts(ownerAddress),
});

// ─────────────────────────────────────────────
// mintNftTool — core logic
// ─────────────────────────────────────────────

interface MintDeps {
  createUmiFn: () => Umi;
  getRecentBlockhashFn: () => Promise<string>;
}

/**
 * NFT 発行トランザクションを構築するコアロジック（injectable deps）。
 *
 * Metaplex Core (mpl-core) の create() 命令で Core Asset アカウントを作成する。
 * ownerAddress は createNoopSigner で設定 — 実際の署名は Phantom ウォレットが行う。
 * asset keypair はサーバー側で生成・署名する（SystemProgram.createAccount 相当）。
 * sellerFeeBasisPoints > 0 の場合は Royalties プラグインを付与する。
 */
export async function buildMintNftTransaction(
  params: MintNftInput,
  deps: MintDeps,
): Promise<SolanaTxRequest> {
  const umi = deps.createUmiFn();
  const ownerKey = umiPublicKey(params.ownerAddress);

  // The owner signs via Phantom in the browser. createNoopSigner puts zero
  // bytes in the feePayer signature slot; Phantom fills in the real signature.
  umi.use(signerIdentity(createNoopSigner(ownerKey)));

  // Asset keypair is a new account generated server-side; it signs for real.
  const asset = generateSigner(umi);
  const blockhash = await deps.getRecentBlockhashFn();

  const plugins =
    params.sellerFeeBasisPoints > 0
      ? [
          {
            type: "Royalties" as const,
            basisPoints: params.sellerFeeBasisPoints,
            creators: [{ address: ownerKey, percentage: 100 }],
            ruleSet: ruleSet("None"),
          },
        ]
      : [];

  const builtTx = await create(umi, {
    asset,
    name: params.name,
    uri: params.uri,
    plugins,
  })
    .setBlockhash(blockhash)
    .buildAndSign(umi);

  const serializedTx = Buffer.from(
    umi.transactions.serialize(builtTx),
  ).toString("base64");

  const royaltyPct = (params.sellerFeeBasisPoints / 100).toFixed(2);
  const description =
    `NFT「${params.name}」(${params.symbol}) を発行 | ` +
    `ロイヤリティ: ${royaltyPct}% | ` +
    `Asset: ${asset.publicKey.slice(0, 8)}...`;

  return {
    type: "solana_tx_request",
    serializedTx,
    description,
    txType: "nft_mint",
  };
}

/**
 * NFT 発行トランザクション構築ツール。
 *
 * NFT の名称・シンボル・メタデータ URI・ロイヤリティを受け取り、
 * Phantom ウォレットで署名できるシリアライズ済みトランザクションを返します。
 *
 * 使用シナリオ:
 * - ユーザーが「NFT を発行して」「NFT を mint したい」と依頼したとき
 *
 * Build an NFT mint transaction using Metaplex Core. The agent never signs — only the user does.
 * Royalty is specified in basis points (500 = 5%).
 */
export const mintNftTool = createTool({
  id: "mint-nft",
  description: `NFT 発行トランザクションを構築します（署名はユーザーの Phantom ウォレットで行います）。
入力:
  - ownerAddress: 発行先ウォレットアドレス（base58 公開鍵）
  - name: NFT 名称
  - symbol: NFT シンボル（例: COOL）
  - uri: メタデータ JSON の URI（IPFS や Arweave URL）
  - sellerFeeBasisPoints: ロイヤリティ（basis points: 500 = 5%、0〜10000）
出力: Phantom で署名可能な SolanaTxRequest（NFT 発行トランザクション）
Use case: 'NFT を発行して', 'Mint an NFT named "Sky" with 5% royalty'`,

  inputSchema: MintNftInputSchema,
  outputSchema: SolanaTxRequestSchema,

  execute: async (params) => {
    const rpcUrl =
      process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

    try {
      new PublicKey(params.ownerAddress);
    } catch {
      throw new Error(
        `無効なアドレス形式です: "${params.ownerAddress}"。base58 形式の Solana 公開鍵を指定してください。`,
      );
    }

    const { Connection } = await import("@solana/web3.js");
    const connection = new Connection(rpcUrl, "confirmed");

    return buildMintNftTransaction(params, {
      createUmiFn: () => createUmi(rpcUrl).use(mplCore()),
      getRecentBlockhashFn: async () => {
        const { blockhash } = await connection.getLatestBlockhash("confirmed");
        return blockhash;
      },
    });
  },
});
