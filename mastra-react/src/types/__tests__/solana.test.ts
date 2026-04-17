import { describe, expect, it } from "vitest";
import {
	AirdropInputSchema,
	AirdropOutputSchema,
	CallProgramInputSchema,
	GetBalanceInputSchema,
	GetBalanceOutputSchema,
	GetNftsInputSchema,
	GetNftsOutputSchema,
	JupiterSwapInputSchema,
	MintNftInputSchema,
	NFTAssetSchema,
	SolanaErrorSchema,
	SolanaTxRequestSchema,
	TransactionSignResultSchema,
	TransferSolInputSchema,
	isSolanaTxRequest,
} from "../solana";

// ────────────────────────────────────────────────────────────
// SolanaTxRequest
// ────────────────────────────────────────────────────────────
describe("SolanaTxRequestSchema", () => {
	it("valid transfer request を受け入れる", () => {
		const data = {
			type: "solana_tx_request",
			serializedTx: "AAAA==",
			description: "0.1 SOL を xxx に送金",
			txType: "transfer",
		};
		expect(() => SolanaTxRequestSchema.parse(data)).not.toThrow();
	});

	it("type が solana_tx_request 以外はエラー", () => {
		const data = {
			type: "wrong_type",
			serializedTx: "AAAA==",
			description: "test",
			txType: "transfer",
		};
		expect(() => SolanaTxRequestSchema.parse(data)).toThrow();
	});

	it("無効な txType はエラー", () => {
		const data = {
			type: "solana_tx_request",
			serializedTx: "AAAA==",
			description: "test",
			txType: "invalid_type",
		};
		expect(() => SolanaTxRequestSchema.parse(data)).toThrow();
	});

	it("serializedTx が空文字はエラー", () => {
		const data = {
			type: "solana_tx_request",
			serializedTx: "",
			description: "test",
			txType: "transfer",
		};
		expect(() => SolanaTxRequestSchema.parse(data)).toThrow();
	});

	it("すべての txType を受け入れる", () => {
		const txTypes = [
			"transfer",
			"nft_mint",
			"nft_transfer",
			"swap",
			"program_call",
			"airdrop",
		] as const;
		for (const txType of txTypes) {
			const data = {
				type: "solana_tx_request",
				serializedTx: "AAAA==",
				description: "test",
				txType,
			};
			expect(() => SolanaTxRequestSchema.parse(data)).not.toThrow();
		}
	});
});

// ────────────────────────────────────────────────────────────
// isSolanaTxRequest 型ガード
// ────────────────────────────────────────────────────────────
describe("isSolanaTxRequest", () => {
	it("有効なオブジェクトを true と判定する", () => {
		const data = {
			type: "solana_tx_request",
			serializedTx: "AAAA==",
			description: "test",
			txType: "transfer",
		};
		expect(isSolanaTxRequest(data)).toBe(true);
	});

	it("null は false", () => {
		expect(isSolanaTxRequest(null)).toBe(false);
	});

	it("type フィールドが異なる場合は false", () => {
		expect(isSolanaTxRequest({ type: "other" })).toBe(false);
	});

	it("プリミティブ値は false", () => {
		expect(isSolanaTxRequest("string")).toBe(false);
		expect(isSolanaTxRequest(42)).toBe(false);
	});
});

// ────────────────────────────────────────────────────────────
// SolanaError
// ────────────────────────────────────────────────────────────
describe("SolanaErrorSchema", () => {
	it("INVALID_ADDRESS エラーを受け入れる", () => {
		const data = { code: "INVALID_ADDRESS", message: "不正なアドレスです" };
		expect(() => SolanaErrorSchema.parse(data)).not.toThrow();
	});

	it("INSUFFICIENT_BALANCE エラーを受け入れる", () => {
		const data = { code: "INSUFFICIENT_BALANCE", message: "残高が不足しています" };
		expect(() => SolanaErrorSchema.parse(data)).not.toThrow();
	});

	it("未定義のエラーコードはエラー", () => {
		const data = { code: "UNKNOWN_ERROR", message: "test" };
		expect(() => SolanaErrorSchema.parse(data)).toThrow();
	});

	it("すべての定義済みコードを受け入れる", () => {
		const codes = [
			"INVALID_ADDRESS",
			"RPC_ERROR",
			"INSUFFICIENT_BALANCE",
			"RATE_LIMITED",
			"NETWORK_MISMATCH",
		] as const;
		for (const code of codes) {
			expect(() => SolanaErrorSchema.parse({ code, message: "test" })).not.toThrow();
		}
	});
});

// ────────────────────────────────────────────────────────────
// NFTAsset
// ────────────────────────────────────────────────────────────
describe("NFTAssetSchema", () => {
	it("有効な NFTAsset を受け入れる", () => {
		const data = {
			id: "mint_address_123",
			name: "My NFT",
			imageUrl: "https://example.com/image.png",
			symbol: "MNFT",
		};
		expect(() => NFTAssetSchema.parse(data)).not.toThrow();
	});

	it("id が空文字はエラー", () => {
		const data = { id: "", name: "NFT", imageUrl: "https://example.com/img.png", symbol: "N" };
		expect(() => NFTAssetSchema.parse(data)).toThrow();
	});
});

// ────────────────────────────────────────────────────────────
// TransactionSignResult
// ────────────────────────────────────────────────────────────
describe("TransactionSignResultSchema", () => {
	it("success=true 結果を受け入れる", () => {
		const data = { success: true, signature: "tx_sig_abc123" };
		expect(() => TransactionSignResultSchema.parse(data)).not.toThrow();
	});

	it("success=false 結果を受け入れる", () => {
		const data = { success: false, error: "User rejected" };
		expect(() => TransactionSignResultSchema.parse(data)).not.toThrow();
	});
});

// ────────────────────────────────────────────────────────────
// Tool Input/Output スキーマ
// ────────────────────────────────────────────────────────────
describe("GetBalanceInputSchema", () => {
	it("有効な base58 アドレスを受け入れる", () => {
		const data = { address: "11111111111111111111111111111111" };
		expect(() => GetBalanceInputSchema.parse(data)).not.toThrow();
	});

	it("空文字アドレスはエラー", () => {
		expect(() => GetBalanceInputSchema.parse({ address: "" })).toThrow();
	});
});

describe("GetBalanceOutputSchema", () => {
	it("有効な出力を受け入れる", () => {
		const data = {
			address: "11111111111111111111111111111111",
			lamports: 1000000000,
			sol: 1.0,
			network: "devnet",
		};
		expect(() => GetBalanceOutputSchema.parse(data)).not.toThrow();
	});

	it("network が devnet 以外はエラー", () => {
		const data = {
			address: "11111111111111111111111111111111",
			lamports: 1000000000,
			sol: 1.0,
			network: "mainnet",
		};
		expect(() => GetBalanceOutputSchema.parse(data)).toThrow();
	});
});

describe("TransferSolInputSchema", () => {
	it("有効な送金入力を受け入れる", () => {
		const data = {
			fromAddress: "11111111111111111111111111111111",
			toAddress: "22222222222222222222222222222222",
			amountSol: 0.1,
		};
		expect(() => TransferSolInputSchema.parse(data)).not.toThrow();
	});

	it("amountSol が 0 以下はエラー", () => {
		const data = {
			fromAddress: "11111111111111111111111111111111",
			toAddress: "22222222222222222222222222222222",
			amountSol: 0,
		};
		expect(() => TransferSolInputSchema.parse(data)).toThrow();
	});
});

describe("GetNftsInputSchema", () => {
	it("ownerAddress のみで有効", () => {
		expect(() => GetNftsInputSchema.parse({ ownerAddress: "addr123" })).not.toThrow();
	});

	it("limit と page のデフォルト値が適用される", () => {
		const result = GetNftsInputSchema.parse({ ownerAddress: "addr123" });
		expect(result.limit).toBe(20);
		expect(result.page).toBe(1);
	});
});

describe("GetNftsOutputSchema", () => {
	it("有効な NFT リスト出力を受け入れる", () => {
		const data = {
			items: [{ id: "mint1", name: "NFT1", imageUrl: "https://img.com/1.png", symbol: "N1" }],
			total: 1,
		};
		expect(() => GetNftsOutputSchema.parse(data)).not.toThrow();
	});
});

describe("MintNftInputSchema", () => {
	it("有効な mint 入力を受け入れる", () => {
		const data = {
			ownerAddress: "addr123",
			name: "My NFT",
			symbol: "MNFT",
			uri: "https://example.com/metadata.json",
			sellerFeeBasisPoints: 500,
		};
		expect(() => MintNftInputSchema.parse(data)).not.toThrow();
	});

	it("sellerFeeBasisPoints が 10000 超はエラー", () => {
		const data = {
			ownerAddress: "addr123",
			name: "My NFT",
			symbol: "MNFT",
			uri: "https://example.com/metadata.json",
			sellerFeeBasisPoints: 10001,
		};
		expect(() => MintNftInputSchema.parse(data)).toThrow();
	});
});

describe("JupiterSwapInputSchema", () => {
	it("有効なスワップ入力を受け入れる", () => {
		const data = {
			inputMint: "So11111111111111111111111111111111111111112",
			outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
			amountLamports: 1000000,
			slippageBps: 50,
			userPublicKey: "addr123",
		};
		expect(() => JupiterSwapInputSchema.parse(data)).not.toThrow();
	});

	it("slippageBps のデフォルト値は 50", () => {
		const data = {
			inputMint: "mint1",
			outputMint: "mint2",
			amountLamports: 1000000,
			userPublicKey: "addr123",
		};
		const result = JupiterSwapInputSchema.parse(data);
		expect(result.slippageBps).toBe(50);
	});
});

describe("AirdropInputSchema", () => {
	it("有効なエアドロップ入力を受け入れる", () => {
		const data = { address: "addr123", amountSol: 1.0 };
		expect(() => AirdropInputSchema.parse(data)).not.toThrow();
	});

	it("amountSol が 2 SOL 超はエラー", () => {
		const data = { address: "addr123", amountSol: 2.1 };
		expect(() => AirdropInputSchema.parse(data)).toThrow();
	});

	it("amountSol が 0 以下はエラー", () => {
		const data = { address: "addr123", amountSol: 0 };
		expect(() => AirdropInputSchema.parse(data)).toThrow();
	});
});

describe("AirdropOutputSchema", () => {
	it("有効な出力を受け入れる", () => {
		const data = { signature: "tx_sig_abc", amountSol: 1.0 };
		expect(() => AirdropOutputSchema.parse(data)).not.toThrow();
	});
});

describe("CallProgramInputSchema", () => {
	it("有効な program 呼び出し入力を受け入れる", () => {
		const data = {
			programId: "program123",
			instructionData: "AAAA==",
			accounts: [{ pubkey: "addr1", isSigner: true, isWritable: false }],
			fromAddress: "addr123",
		};
		expect(() => CallProgramInputSchema.parse(data)).not.toThrow();
	});

	it("accounts が空配列はエラー", () => {
		const data = {
			programId: "program123",
			instructionData: "AAAA==",
			accounts: [],
			fromAddress: "addr123",
		};
		expect(() => CallProgramInputSchema.parse(data)).toThrow();
	});
});
