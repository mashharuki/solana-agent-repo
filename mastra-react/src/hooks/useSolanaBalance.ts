import type { SolanaError } from "@/types/solana";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import type { Connection, PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useState } from "react";

export const LAMPORTS_PER_SOL = 1_000_000_000;

const POLL_INTERVAL_MS = 30_000;

export interface UseSolanaBalanceReturn {
  solBalance: number | null;
  isLoading: boolean;
  error: SolanaError | null;
  refetch: () => Promise<void>;
}

/** SOL 残高を取得し SOL 単位で返す。lamports が負の場合は null を返す。 */
export async function fetchSolBalance(
  connection: Connection,
  publicKey: PublicKey,
): Promise<number | null> {
  // getBalance は lamports 単位で返す
  const lamports = await connection.getBalance(publicKey);
  if (lamports < 0) return null;
  return lamports / LAMPORTS_PER_SOL;
}

/**
 * 接続ウォレットの SOL 残高を取得し、30 秒間隔でポーリングするフック。
 * publicKey が変わると残高をリセットして再取得する。
 */
export function useSolanaBalance(): UseSolanaBalanceReturn {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();

  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<SolanaError | null>(null);

  /**
   * 残高を再取得する関数。
   * publicKey または接続状態がない場合は何もしない。
   */
  const refetch = useCallback(async () => {
    if (!publicKey || !connected) return;
    setIsLoading(true);
    setError(null);
    try {
      // SOL 残高を取得して SOL 単位で保存
      const balance = await fetchSolBalance(connection, publicKey);
      setSolBalance(balance);
    } catch (err) {
      setError({
        code: "RPC_ERROR",
        message:
          err instanceof Error ? err.message : "残高の取得に失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  }, [connection, publicKey, connected]);

  useEffect(() => {
    if (!publicKey || !connected) {
      setSolBalance(null);
      setError(null);
      return;
    }

    refetch();
    const interval = setInterval(refetch, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [publicKey, connected, refetch]);

  return { solBalance, isLoading, error, refetch };
}
