import { describe, expect, it } from "vitest";
import {
  SIGNING_TIMEOUT_MS,
  buildTxResultFollowUp,
  parsePhantomError,
} from "../transaction-error";

// ─────────────────────────────────────────────
// parsePhantomError — 6.2
// ─────────────────────────────────────────────

describe("parsePhantomError", () => {
  it("maps user-rejected errors to Japanese cancel message", () => {
    const err = new Error("User rejected the request.");
    expect(parsePhantomError(err)).toContain("キャンセル");
  });

  it("maps wallet-locked errors to Japanese lock message", () => {
    const err = new Error("Wallet is locked.");
    expect(parsePhantomError(err)).toContain("ロック");
  });

  it("maps insufficient-funds errors to Japanese balance message", () => {
    const err = new Error("Insufficient funds for fee");
    expect(parsePhantomError(err)).toContain("残高");
  });

  it("maps network-error patterns to Japanese network message", () => {
    const err = new Error("Network request failed");
    expect(parsePhantomError(err)).toContain("ネットワーク");
  });

  it("maps timeout errors to Japanese timeout message", () => {
    const err = new Error("SIGNING_TIMEOUT");
    expect(parsePhantomError(err)).toContain("タイムアウト");
  });

  it("returns generic Japanese message for unknown errors", () => {
    const err = new Error("Some unknown error XYZ");
    const msg = parsePhantomError(err);
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
  });

  it("handles errors with 'Transaction simulation failed'", () => {
    const err = new Error(
      "Transaction simulation failed: Error processing Instruction 0",
    );
    const msg = parsePhantomError(err);
    expect(msg).toContain("シミュレーション");
  });
});

describe("SIGNING_TIMEOUT_MS", () => {
  it("is 120 seconds", () => {
    expect(SIGNING_TIMEOUT_MS).toBe(120_000);
  });
});

// ─────────────────────────────────────────────
// buildTxResultFollowUp — 6.3
// ─────────────────────────────────────────────

describe("buildTxResultFollowUp", () => {
  it("builds success follow-up message with signature", () => {
    const msg = buildTxResultFollowUp({
      success: true,
      signature: "5FakeSignatureXyz",
    });
    expect(msg).toContain("5FakeSignatureXyz");
    expect(msg).toMatch(/完了|成功|success/i);
  });

  it("builds failure follow-up message with error", () => {
    const msg = buildTxResultFollowUp({
      success: false,
      error: "User rejected",
    });
    expect(msg).toContain("User rejected");
    expect(msg).toMatch(/失敗|エラー|error/i);
  });

  it("success message includes DevNet Explorer URL", () => {
    const msg = buildTxResultFollowUp({
      success: true,
      signature: "5SigABC",
    });
    expect(msg).toContain("5SigABC");
    expect(msg).toContain("explorer.solana.com");
  });

  it("returns a non-empty string for both cases", () => {
    const successMsg = buildTxResultFollowUp({
      success: true,
      signature: "sig",
    });
    const failMsg = buildTxResultFollowUp({ success: false, error: "err" });
    expect(successMsg.length).toBeGreaterThan(0);
    expect(failMsg.length).toBeGreaterThan(0);
  });
});
