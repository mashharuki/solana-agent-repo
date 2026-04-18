import { getValidatedRpcUrl } from "@/lib/solana-utils";
import { describe, expect, it } from "vitest";

describe("getValidatedRpcUrl", () => {
  it("throws when VITE_SOLANA_RPC_URL is not set", () => {
    expect(() => getValidatedRpcUrl({})).toThrow(
      "VITE_SOLANA_RPC_URL が設定されていません",
    );
  });

  it("throws when VITE_SOLANA_RPC_URL is an empty string", () => {
    expect(() => getValidatedRpcUrl({ VITE_SOLANA_RPC_URL: "" })).toThrow(
      "VITE_SOLANA_RPC_URL が設定されていません",
    );
  });

  it("returns the URL when VITE_SOLANA_RPC_URL is set", () => {
    const url = "https://api.devnet.solana.com";
    expect(getValidatedRpcUrl({ VITE_SOLANA_RPC_URL: url })).toBe(url);
  });

  it("returns custom RPC URL when provided", () => {
    const url = "https://my-rpc.example.com";
    expect(getValidatedRpcUrl({ VITE_SOLANA_RPC_URL: url })).toBe(url);
  });
});
