import { useWallet } from "@solana/wallet-adapter-react";
import { type ReactNode } from "react";
import { WalletConnectScreen } from "./WalletConnectScreen";

interface WalletGateProps {
  children: ReactNode;
}

/**
 * ウォレット接続状態に基づいて子コンポーネントをゲートする。
 * 未接続の場合は WalletConnectScreen を表示し、
 * 接続済みの場合は children（AppShell）をレンダリングする。
 *
 * Requirements: 1.1, 1.6
 */
export function WalletGate({ children }: WalletGateProps) {
  const { connected } = useWallet();

  if (!connected) {
    return <WalletConnectScreen />;
  }

  return <>{children}</>;
}
