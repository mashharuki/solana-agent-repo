import { type Connection, type PublicKey } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import { LAMPORTS_PER_SOL, fetchSolBalance } from "../useSolanaBalance";

function mockConnection(lamports: number | Error): Partial<Connection> {
  return {
    getBalance: vi
      .fn()
      .mockImplementation(() =>
        lamports instanceof Error
          ? Promise.reject(lamports)
          : Promise.resolve(lamports),
      ),
  };
}

function mockPublicKey(
  address = "FakePublicKey1111111111111111111111111",
): PublicKey {
  return { toBase58: () => address } as unknown as PublicKey;
}

describe("fetchSolBalance", () => {
  it("returns SOL balance converted from lamports", async () => {
    const result = await fetchSolBalance(
      mockConnection(1_000_000_000) as Connection,
      mockPublicKey(),
    );
    expect(result).toBe(1);
  });

  it("returns fractional SOL for partial lamports", async () => {
    const result = await fetchSolBalance(
      mockConnection(500_000_000) as Connection,
      mockPublicKey(),
    );
    expect(result).toBeCloseTo(0.5);
  });

  it("returns 0 when balance is 0 lamports", async () => {
    const result = await fetchSolBalance(
      mockConnection(0) as Connection,
      mockPublicKey(),
    );
    expect(result).toBe(0);
  });

  it("returns null when lamports is negative", async () => {
    const result = await fetchSolBalance(
      mockConnection(-1) as Connection,
      mockPublicKey(),
    );
    expect(result).toBeNull();
  });

  it("propagates RPC errors", async () => {
    await expect(
      fetchSolBalance(
        mockConnection(new Error("RPC unavailable")) as Connection,
        mockPublicKey(),
      ),
    ).rejects.toThrow("RPC unavailable");
  });

  it("calls getBalance with the provided publicKey", async () => {
    const conn = mockConnection(1_000_000_000);
    const pk = mockPublicKey("TestKey1111111111111111111111111111111");
    await fetchSolBalance(conn as Connection, pk);
    expect(conn.getBalance).toHaveBeenCalledWith(pk);
  });
});

describe("LAMPORTS_PER_SOL", () => {
  it("is 1 billion", () => {
    expect(LAMPORTS_PER_SOL).toBe(1_000_000_000);
  });
});
