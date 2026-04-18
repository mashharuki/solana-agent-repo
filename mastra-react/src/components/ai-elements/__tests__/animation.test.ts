import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../../../");

const walletGate = readFileSync(
  resolve(root, "src/components/wallet/WalletGate.tsx"),
  "utf-8",
);
const appSrc = readFileSync(resolve(root, "src/App.tsx"), "utf-8");
const txCard = readFileSync(
  resolve(root, "src/components/transaction/TransactionCard.tsx"),
  "utf-8",
);

describe("WalletGate — screen transition animation", () => {
  it("imports AnimatePresence from motion/react", () => {
    expect(walletGate).toContain("AnimatePresence");
    expect(walletGate).toContain("motion/react");
  });

  it("uses motion.div for crossfade wrapper", () => {
    expect(walletGate).toContain("motion.div");
  });

  it("assigns separate keys to connect vs app screen", () => {
    expect(walletGate).toContain('"connect"');
    expect(walletGate).toContain('"app"');
  });
});

describe("TransactionCard — entrance/state animation", () => {
  it("imports motion from motion/react", () => {
    expect(txCard).toContain("motion/react");
  });

  it("wraps card root with a motion element", () => {
    expect(txCard).toMatch(/motion\./);
  });

  it("defines an initial animation state", () => {
    expect(txCard).toContain("initial=");
  });

  it("defines an animate state", () => {
    expect(txCard).toContain("animate=");
  });
});

describe("App — message entrance + typing indicator", () => {
  it("imports motion from motion/react", () => {
    expect(appSrc).toContain("motion/react");
  });

  it("wraps messages with motion.div for fade-in", () => {
    expect(appSrc).toContain("motion.div");
  });

  it("shows a typing/loading indicator while agent is responding", () => {
    expect(appSrc).toMatch(/submitted|streaming/);
    expect(appSrc).toContain("animate=");
  });
});
