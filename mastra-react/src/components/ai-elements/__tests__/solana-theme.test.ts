import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../../../");
const css = readFileSync(resolve(root, "src/css/index.css"), "utf-8");
const conversation = readFileSync(
  resolve(root, "src/components/ai-elements/conversation.tsx"),
  "utf-8",
);
const message = readFileSync(
  resolve(root, "src/components/ai-elements/message.tsx"),
  "utf-8",
);
const appSrc = readFileSync(resolve(root, "src/App.tsx"), "utf-8");

describe("Solana CSS design tokens", () => {
  it("defines --solana-purple brand token", () => {
    expect(css).toContain("--solana-purple:");
  });

  it("defines --solana-green brand token", () => {
    expect(css).toContain("--solana-green:");
  });

  it("dark mode primary is Solana purple (hue 293)", () => {
    const darkBlock = css.slice(css.indexOf(".dark {"), css.indexOf(".dark {") + 2000);
    expect(darkBlock).toContain("--primary:");
    expect(darkBlock).toContain("293");
  });

  it("dark mode accent is Solana green (hue 158)", () => {
    const darkBlock = css.slice(css.indexOf(".dark {"), css.indexOf(".dark {") + 2000);
    expect(darkBlock).toContain("--accent:");
    expect(darkBlock).toContain("158");
  });

  it("solana gradient utility is defined", () => {
    expect(css).toContain(".bg-solana-gradient");
  });

  it("text-solana-gradient utility is defined", () => {
    expect(css).toContain(".text-solana-gradient");
  });
});

describe("ConversationEmptyState has Solana branding", () => {
  it("does not use the generic 'No messages yet' default title", () => {
    expect(conversation).not.toContain('"No messages yet"');
  });

  it("contains Solana branding text", () => {
    expect(conversation).toContain("Solana");
  });
});

describe("MessageContent user bubble uses Solana theme", () => {
  it("does not use generic bg-secondary for user messages", () => {
    expect(message).not.toContain("group-[.is-user]:bg-secondary");
  });

  it("user messages use primary (Solana purple) background", () => {
    expect(message).toContain("group-[.is-user]:bg-primary");
  });
});

describe("App layout responsiveness", () => {
  it("does not rely on hardcoded #0f0f13 background", () => {
    expect(appSrc).not.toContain('bg-[#0f0f13]');
  });

  it("uses responsive layout classes", () => {
    expect(appSrc).toMatch(/lg:|md:|sm:/);
  });
});
