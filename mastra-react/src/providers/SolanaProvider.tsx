import { getValidatedRpcUrl } from "@/lib/solana-utils";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { useMemo, type ReactNode } from "react";

interface SolanaProviderProps {
  children: ReactNode;
}

/**
 * Solana Wallet Adapter Provider。
 * ConnectionProvider → WalletProvider → WalletModalProvider の 3 層で children をラップし、
 * DevNet RPC URL を VITE_SOLANA_RPC_URL 環境変数から読み込む。
 * 環境変数が未設定の場合はエラー画面を表示する。
 */
export function SolanaProvider({ children }: SolanaProviderProps) {
  let rpcUrl = "";
  let envError: string | null = null;

  try {
    rpcUrl = getValidatedRpcUrl();
  } catch (error) {
    envError = (error as Error).message;
  }

  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  if (envError) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#0f0f13",
          color: "#ff4d4f",
          fontFamily: "sans-serif",
          flexDirection: "column",
          gap: "12px",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.25rem" }}>
          環境変数エラー
        </h2>
        <p style={{ margin: 0, fontSize: "0.9rem", color: "#aaa" }}>
          {envError}
        </p>
      </div>
    );
  }

  return (
    <ConnectionProvider endpoint={rpcUrl}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
