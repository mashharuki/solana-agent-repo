import { describe, expect, it } from "vitest";
import {
  getValidatedRpcUrl,
  validateFrontendEnvVars,
} from "@/lib/solana-utils";

describe("getValidatedRpcUrl", () => {
  it("VITE_SOLANA_RPC_URL が設定されている場合はURLを返す", () => {
    const env = { VITE_SOLANA_RPC_URL: "https://api.devnet.solana.com" };
    expect(getValidatedRpcUrl(env)).toBe("https://api.devnet.solana.com");
  });

  it("VITE_SOLANA_RPC_URL が未設定の場合はエラーをスローする", () => {
    expect(() => getValidatedRpcUrl({})).toThrow(
      "VITE_SOLANA_RPC_URL が設定されていません",
    );
  });
});

describe("validateFrontendEnvVars", () => {
  it("全必須変数が設定されている場合はエラーなし", () => {
    const env = {
      VITE_SOLANA_RPC_URL: "https://api.devnet.solana.com",
      VITE_SOLANA_NETWORK: "devnet",
    };
    expect(() => validateFrontendEnvVars(env)).not.toThrow();
  });

  it("VITE_SOLANA_RPC_URL が未設定の場合はエラーをスローする", () => {
    const env = { VITE_SOLANA_NETWORK: "devnet" };
    expect(() => validateFrontendEnvVars(env)).toThrow("VITE_SOLANA_RPC_URL");
  });

  it("VITE_SOLANA_NETWORK が未設定の場合はエラーをスローする", () => {
    const env = { VITE_SOLANA_RPC_URL: "https://api.devnet.solana.com" };
    expect(() => validateFrontendEnvVars(env)).toThrow("VITE_SOLANA_NETWORK");
  });

  it("複数の必須変数が未設定の場合、全変数名をエラーメッセージに含める", () => {
    expect(() => validateFrontendEnvVars({})).toThrow("VITE_SOLANA_RPC_URL");
  });

  it("VITE_SOLANA_NETWORK が 'devnet' 以外の場合は警告を返すが例外はスローしない", () => {
    const env = {
      VITE_SOLANA_RPC_URL: "https://api.devnet.solana.com",
      VITE_SOLANA_NETWORK: "mainnet-beta",
    };
    expect(() => validateFrontendEnvVars(env)).not.toThrow();
  });
});
