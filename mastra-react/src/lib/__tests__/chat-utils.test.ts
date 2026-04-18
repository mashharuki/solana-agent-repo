import { describe, expect, it } from "vitest";
import { detectTxRequest, formatWalletBlockedMessage } from "../chat-utils";

// ─────────────────────────────────────────────
// detectTxRequest — 7.2
// ─────────────────────────────────────────────

const VALID_TX_REQUEST = {
  type: "solana_tx_request",
  serializedTx: "AAAA",
  description: "0.1 SOL を送金",
  txType: "transfer",
};

describe("detectTxRequest", () => {
  it("returns SolanaTxRequest when output has type solana_tx_request", () => {
    const result = detectTxRequest(VALID_TX_REQUEST);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("solana_tx_request");
  });

  it("returns null for a plain text tool output", () => {
    expect(detectTxRequest({ balance: "1.5", network: "devnet" })).toBeNull();
  });

  it("returns null for null", () => {
    expect(detectTxRequest(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(detectTxRequest(undefined)).toBeNull();
  });

  it("returns null for a string", () => {
    expect(detectTxRequest("some text")).toBeNull();
  });

  it("returns null when type field is different", () => {
    expect(detectTxRequest({ type: "other_type", data: "x" })).toBeNull();
  });

  it("returns the full SolanaTxRequest object", () => {
    const result = detectTxRequest(VALID_TX_REQUEST);
    expect(result).toEqual(VALID_TX_REQUEST);
  });

  it("handles nested outputs by returning null", () => {
    // Tool output might be an array or nested object — not a direct tx request
    expect(detectTxRequest([VALID_TX_REQUEST])).toBeNull();
  });
});

// ─────────────────────────────────────────────
// formatWalletBlockedMessage — 7.1
// ─────────────────────────────────────────────

describe("formatWalletBlockedMessage", () => {
  it("returns a non-empty Japanese message", () => {
    const msg = formatWalletBlockedMessage();
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
  });

  it("mentions wallet connection", () => {
    const msg = formatWalletBlockedMessage();
    expect(msg).toMatch(/ウォレット|接続|Phantom/);
  });
});
