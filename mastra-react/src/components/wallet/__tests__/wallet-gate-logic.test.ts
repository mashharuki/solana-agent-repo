/**
 * WalletGate 接続状態による画面分岐テスト
 * Task 9.3 — Requirement 1.1, 1.6
 *
 * WalletGate コンポーネントのレンダリング分岐ロジックを
 * 純粋関数として抽出し、独立してテストする。
 */

import { describe, expect, it } from "vitest";
import { selectWalletGateView } from "@/lib/wallet-state";

describe("selectWalletGateView — WalletGate 画面分岐ロジック (Req 1.1, 1.6)", () => {
  it("Req 1.1: connected=false → 'connect' を返す（未接続時は接続画面）", () => {
    expect(selectWalletGateView(false)).toBe("connect");
  });

  it("Req 1.6: connected=true → 'app' を返す（接続済みはアプリ画面）", () => {
    expect(selectWalletGateView(true)).toBe("app");
  });

  it("connecting 中（connected=false）でも 'connect' 画面を表示する", () => {
    expect(selectWalletGateView(false)).toBe("connect");
  });

  it("戻り値は必ず 'connect' か 'app' のいずれか", () => {
    const views = [true, false].map(selectWalletGateView);
    for (const v of views) {
      expect(["connect", "app"]).toContain(v);
    }
  });
});
