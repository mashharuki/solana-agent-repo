import { SIGNING_TIMEOUT_MS, parsePhantomError } from "@/lib/transaction-error";
import { formatTxType, getTxTypeLabel } from "@/lib/transaction-utils";
import type { SolanaTxRequest, TransactionSignResult } from "@/types/solana";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

type SigningStatus = "idle" | "signing" | "success" | "error";

interface TransactionCardProps {
  txRequest: SolanaTxRequest;
  onSign: (result: TransactionSignResult) => void;
  onCancel: () => void;
  /** Called after successful signing to refresh balance/NFTs */
  onRefetch?: () => void;
}

/**
 * チャット内トランザクション署名カード。
 * Agent が返した SolanaTxRequest を表示し、Phantom で署名・送信する。
 * 120 秒のタイムアウト・Phantom エラーの日本語変換・署名後のリフェッチを含む。
 *
 * Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 */
export function TransactionCard({
  txRequest,
  onSign,
  onCancel,
  onRefetch,
}: TransactionCardProps) {
  const { sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [status, setStatus] = useState<SigningStatus>("idle");
  const [signature, setSignature] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleSign = useCallback(async () => {
    setStatus("signing");
    setErrorMsg(null);

    // 120-second timeout — auto-cancel if Phantom doesn't respond
    timeoutRef.current = setTimeout(() => {
      setStatus("error");
      const timeoutMsg = parsePhantomError(new Error("SIGNING_TIMEOUT"));
      setErrorMsg(timeoutMsg);
      onSign({ success: false, error: timeoutMsg });
    }, SIGNING_TIMEOUT_MS);

    try {
      let tx: Transaction | VersionedTransaction;
      const bytes = Uint8Array.from(atob(txRequest.serializedTx), (c) =>
        c.charCodeAt(0),
      );

      try {
        tx = VersionedTransaction.deserialize(bytes);
      } catch {
        tx = Transaction.from(bytes);
      }

      const sig = await sendTransaction(tx, connection);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setSignature(sig);
      setStatus("success");
      onSign({ success: true, signature: sig });
      onRefetch?.();
    } catch (err) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Only update if we haven't already timed out
      setStatus((prev) => {
        if (prev === "signing") {
          const parsed =
            err instanceof Error
              ? parsePhantomError(err)
              : "署名に失敗しました。";
          setErrorMsg(parsed);
          onSign({ success: false, error: parsed });
          return "error";
        }
        return prev;
      });
    }
  }, [txRequest.serializedTx, sendTransaction, connection, onSign, onRefetch]);

  const handleCancel = useCallback(() => {
    if (status === "signing") return;
    onCancel();
  }, [status, onCancel]);

  return (
    <motion.div
      className="my-2 overflow-hidden rounded-2xl"
      style={{
        background: "rgba(153, 69, 255, 0.08)",
        border: "1px solid rgba(153, 69, 255, 0.25)",
      }}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid rgba(153, 69, 255, 0.15)" }}
      >
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{
            background: "rgba(153, 69, 255, 0.2)",
            color: "#c084fc",
          }}
        >
          {getTxTypeLabel(txRequest.txType)}
        </span>
        <span className="text-sm font-semibold text-white">
          {formatTxType(txRequest.txType)}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <p className="mb-3 text-sm text-muted-foreground">
          {txRequest.description}
        </p>

        <AnimatePresence mode="wait">
          {status === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex gap-2"
            >
              <button
                type="button"
                onClick={handleSign}
                className="flex-1 rounded-xl bg-solana-gradient py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-95"
              >
                署名・送信
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                キャンセル
              </button>
            </motion.div>
          )}

          {status === "signing" && (
            <motion.div
              key="signing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-3 py-1">
                <div
                  className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
                  role="status"
                  aria-label="署名待ち"
                />
                <p className="text-sm text-primary">
                  Phantom で署名してください…
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                120 秒以内に応答がない場合は自動キャンセルされます。
              </p>
            </motion.div>
          )}

          {status === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-accent">✓</span>
                <p className="text-sm font-semibold text-accent">
                  トランザクション送信完了
                </p>
              </div>
              {signature && (
                <a
                  href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate font-mono text-xs text-primary"
                >
                  {signature}
                </a>
              )}
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-2"
            >
              <p className="text-sm text-destructive">
                {errorMsg ?? "署名に失敗しました。"}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSign}
                  className="rounded-xl bg-primary/30 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  再試行
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  キャンセル
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
