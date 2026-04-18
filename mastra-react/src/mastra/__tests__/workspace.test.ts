import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SKILL_PATH = join(process.cwd(), "src/mastra/skills/SKILL.md");

describe("Solana Agent SKILL.md", () => {
  it("exists on disk", () => {
    expect(existsSync(SKILL_PATH)).toBe(true);
  });

  it("contains Solana domain knowledge", () => {
    const content = readFileSync(SKILL_PATH, "utf-8");
    expect(content).toContain("Solana");
  });

  it("mentions DevNet", () => {
    const content = readFileSync(SKILL_PATH, "utf-8");
    expect(content).toMatch(/DevNet/i);
  });

  it("has YAML frontmatter with name field", () => {
    const content = readFileSync(SKILL_PATH, "utf-8");
    expect(content).toMatch(/^---/);
    expect(content).toMatch(/name:/);
  });

  it("describes SOL transfer concept", () => {
    const content = readFileSync(SKILL_PATH, "utf-8");
    expect(content).toMatch(/transfer|送金/i);
  });

  it("describes NFT concept", () => {
    const content = readFileSync(SKILL_PATH, "utf-8");
    expect(content).toMatch(/NFT/);
  });
});

describe("solanaAgent workspace", () => {
  it("has a workspace configured", async () => {
    const { solanaAgent } = await import("../agents/solana-agent");
    expect(solanaAgent.hasOwnWorkspace()).toBe(true);
  });
});
