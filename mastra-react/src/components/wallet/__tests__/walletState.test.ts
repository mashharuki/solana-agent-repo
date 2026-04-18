import { describe, expect, it } from "vitest";
import { getWalletDisplayState, truncateAddress } from "@/lib/wallet-state";

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

describe("truncateAddress", () => {
  it("32文字以上のアドレスを先頭4文字 + ... + 末尾4文字に省略する", () => {
    const address = "AbCdEfGhIjKlMnOpQrStUvWxYz123456";
    expect(truncateAddress(address)).toBe("AbCd...3456");
  });

  it("8文字以下のアドレスは省略せずそのまま返す", () => {
    expect(truncateAddress("AbCdEfGh")).toBe("AbCdEfGh");
  });

  it("空文字列を渡すと空文字列を返す", () => {
    expect(truncateAddress("")).toBe("");
  });

  it("実際の Solana アドレス形式を正しく省略する", () => {
    const addr = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
    expect(truncateAddress(addr)).toBe("9WzD...AWWM");
  });
});
