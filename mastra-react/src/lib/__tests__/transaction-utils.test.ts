import { describe, expect, it } from "vitest";
import { formatTxType, getTxTypeLabel } from "../transaction-utils";

describe("formatTxType", () => {
  it("maps 'transfer' to Japanese label", () => {
    expect(formatTxType("transfer")).toBe("SOL 送金");
  });

  it("maps 'nft_mint' to Japanese label", () => {
    expect(formatTxType("nft_mint")).toBe("NFT 発行");
  });

  it("maps 'nft_transfer' to Japanese label", () => {
    expect(formatTxType("nft_transfer")).toBe("NFT 転送");
  });

  it("maps 'swap' to Japanese label", () => {
    expect(formatTxType("swap")).toBe("トークンスワップ");
  });

  it("maps 'program_call' to Japanese label", () => {
    expect(formatTxType("program_call")).toBe("Program 呼び出し");
  });

  it("maps 'airdrop' to Japanese label", () => {
    expect(formatTxType("airdrop")).toBe("DevNet エアドロップ");
  });
});

describe("getTxTypeLabel", () => {
  it("returns a non-empty string for every known txType", () => {
    const types = [
      "transfer",
      "nft_mint",
      "nft_transfer",
      "swap",
      "program_call",
      "airdrop",
    ] as const;
    for (const t of types) {
      expect(getTxTypeLabel(t).length).toBeGreaterThan(0);
    }
  });

  it("returns a short prefix string for 'transfer'", () => {
    expect(getTxTypeLabel("transfer")).toMatch(/SOL|送金/);
  });

  it("returns a prefix string for 'swap'", () => {
    expect(getTxTypeLabel("swap")).toMatch(/swap|スワップ/i);
  });
});
