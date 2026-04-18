import { useWallet } from "@solana/wallet-adapter-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode } from "react";
import { WalletConnectScreen } from "./WalletConnectScreen";

interface WalletGateProps {
  children: ReactNode;
}

const fadeTransition = { duration: 0.25, ease: "easeOut" as const };
const fadeExitTransition = { duration: 0.18, ease: "easeIn" as const };

/**
 * ウォレット接続状態に基づいて子コンポーネントをゲートする。
 * 未接続の場合は WalletConnectScreen を表示し、
 * 接続済みの場合は children（AppShell）をレンダリングする。
 * AnimatePresence で接続画面 ↔ チャット画面の crossfade transition を実現する。
 *
 * Requirements: 1.1, 1.6, 6.5
 */
export function WalletGate({ children }: WalletGateProps) {
  const { connected } = useWallet();

  return (
    <AnimatePresence mode="wait">
      {connected ? (
        <motion.div
          key="app"
          className="h-screen"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={fadeTransition}
        >
          {children}
        </motion.div>
      ) : (
        <motion.div
          key="connect"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={fadeExitTransition}
        >
          <WalletConnectScreen />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
