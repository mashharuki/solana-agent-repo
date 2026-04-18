import { describe, expect, it } from "vitest";
import { detectSolanaNetwork } from "@/lib/solana-utils";

describe("detectSolanaNetwork", () => {
  it("DevNet のジェネシスハッシュ → 'devnet' を返す", () => {
    expect(
      detectSolanaNetwork("EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG"),
    ).toBe("devnet");
  });

  it("MainNet-beta のジェネシスハッシュ → 'mainnet-beta' を返す", () => {
    expect(
      detectSolanaNetwork("5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"),
    ).toBe("mainnet-beta");
  });

  it("TestNet のジェネシスハッシュ → 'testnet' を返す", () => {
    expect(
      detectSolanaNetwork("4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY"),
    ).toBe("testnet");
  });

  it("未知のハッシュ → 'unknown' を返す", () => {
    expect(detectSolanaNetwork("unknownhash123")).toBe("unknown");
  });

  it("空文字列 → 'unknown' を返す", () => {
    expect(detectSolanaNetwork("")).toBe("unknown");
  });
});
