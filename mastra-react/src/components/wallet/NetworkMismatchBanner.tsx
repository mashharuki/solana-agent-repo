import { detectSolanaNetwork, type SolanaNetwork } from "@/lib/solana-utils";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";

/** RPC エンドポイントのジェネシスハッシュからネットワークを検出するフック */
function useNetworkMismatch() {
  const { connection } = useConnection();
  const { connected } = useWallet();
  const [network, setNetwork] = useState<SolanaNetwork | null>(null);

  useEffect(() => {
    if (!connected) {
      setNetwork(null);
      return;
    }
    let cancelled = false;
    connection
      .getGenesisHash()
      .then((hash) => {
        if (!cancelled) setNetwork(detectSolanaNetwork(hash));
      })
      .catch(() => {
        if (!cancelled) setNetwork("unknown");
      });
    return () => {
      cancelled = true;
    };
  }, [connection, connected]);

  return {
    network,
    isDevnet: network === "devnet",
    isMismatch: network !== null && network !== "devnet",
  };
}

/**
 * DevNet 以外のネットワークに接続されている場合に警告バナーを表示する。
 *
 * Requirements: 1.5, 7.4
 */
export function NetworkMismatchBanner() {
  const { isMismatch, network } = useNetworkMismatch();

  if (!isMismatch) return null;

  const networkLabel: Record<string, string> = {
    "mainnet-beta": "Mainnet-Beta",
    testnet: "Testnet",
    unknown: "不明なネットワーク",
  };

  return (
    <div
      role="alert"
      className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium"
      style={{
        background: "rgba(255, 166, 0, 0.12)",
        borderBottom: "1px solid rgba(255, 166, 0, 0.35)",
        color: "#FFA600",
      }}
    >
      <span aria-hidden="true">⚠️</span>
      <span>
        現在のネットワークは{" "}
        <strong>{networkLabel[network ?? "unknown"] ?? network}</strong>{" "}
        です。Phantom の設定を <strong>Devnet</strong> に切り替えてください。
      </span>
    </div>
  );
}
