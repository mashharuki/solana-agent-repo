import { describe, expect, it } from "vitest";
import {
  SOLANA_AGENT_ID,
  SOLANA_AGENT_INSTRUCTIONS,
} from "../solana-agent";

describe("SOLANA_AGENT_ID", () => {
  it('equals "solana-agent"', () => {
    expect(SOLANA_AGENT_ID).toBe("solana-agent");
  });
});

describe("SOLANA_AGENT_INSTRUCTIONS", () => {
  it("instructs the agent to respond in Japanese", () => {
    expect(SOLANA_AGENT_INSTRUCTIONS).toMatch(/日本語/);
  });

  it("mentions Solana DevNet", () => {
    expect(SOLANA_AGENT_INSTRUCTIONS).toMatch(/DevNet/i);
  });

  it("explicitly states the agent must NOT sign transactions", () => {
    // Must contain a clear non-signing guarantee in Japanese or English
    const hasNoSign =
      /署名しない|署名.*しない|絶対.*署名|never.*sign|do not.*sign/i.test(
        SOLANA_AGENT_INSTRUCTIONS,
      );
    expect(hasNoSign).toBe(true);
  });

  it("describes SOL transfer operation", () => {
    expect(SOLANA_AGENT_INSTRUCTIONS).toMatch(/送金|transfer|SOL/i);
  });

  it("describes NFT operation", () => {
    expect(SOLANA_AGENT_INSTRUCTIONS).toMatch(/NFT/i);
  });

  it("is a non-empty string", () => {
    expect(typeof SOLANA_AGENT_INSTRUCTIONS).toBe("string");
    expect(SOLANA_AGENT_INSTRUCTIONS.length).toBeGreaterThan(200);
  });
});
