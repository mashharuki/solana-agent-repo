import { describe, expect, it } from "vitest";
import { getWalletDisplayState } from "@/lib/wallet-state";

describe("getWalletDisplayState", () => {
  it("未接続・非接続中 → disconnected を返す", () => {
    const result = getWalletDisplayState({
      connected: false,
      connecting: false,
      error: null,
    });
    expect(result.status).toBe("disconnected");
  });

  it("接続中 → connecting を返す", () => {
    const result = getWalletDisplayState({
      connected: false,
      connecting: true,
      error: null,
    });
    expect(result.status).toBe("connecting");
  });

  it("接続済み → connected を返す", () => {
    const result = getWalletDisplayState({
      connected: true,
      connecting: false,
      error: null,
    });
    expect(result.status).toBe("connected");
  });

  it("エラーがある → error を返す", () => {
    const result = getWalletDisplayState({
      connected: false,
      connecting: false,
      error: "User rejected the request",
    });
    expect(result.status).toBe("error");
    expect("message" in result && result.message).toBe(
      "User rejected the request",
    );
  });

  it("接続中はエラーより connecting を優先する", () => {
    const result = getWalletDisplayState({
      connected: false,
      connecting: true,
      error: "Some error",
    });
    expect(result.status).toBe("connecting");
  });

  it("接続済みはエラーより connected を優先する", () => {
    const result = getWalletDisplayState({
      connected: true,
      connecting: false,
      error: "Some error",
    });
    expect(result.status).toBe("connected");
  });
});
