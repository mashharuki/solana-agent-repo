import { SIGNING_TIMEOUT_MS, parsePhantomError } from "@/lib/transaction-error";
import { formatTxType, getTxTypeLabel } from "@/lib/transaction-utils";
import type { SolanaTxRequest, TransactionSignResult } from "@/types/solana";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
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
      const bytes = Buffer.from(txRequest.serializedTx, "base64");

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
    <div
      className="my-2 overflow-hidden rounded-2xl"
      style={{
        background: "rgba(153, 69, 255, 0.08)",
        border: "1px solid rgba(153, 69, 255, 0.25)",
      }}
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
        <p className="mb-3 text-sm" style={{ color: "#ccc" }}>
          {txRequest.description}
        </p>

        {status === "idle" && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSign}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #9945FF 0%, #14F195 100%)",
              }}
            >
              署名・送信
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-[#888] transition-colors hover:bg-white/5 hover:text-white"
            >
              キャンセル
            </button>
          </div>
        )}

        {status === "signing" && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 py-1">
              <div
                className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
                style={{
                  borderColor: "#9945FF",
                  borderTopColor: "transparent",
                }}
                role="status"
                aria-label="署名待ち"
              />
              <p className="text-sm" style={{ color: "#9945FF" }}>
                Phantom で署名してください…
              </p>
            </div>
            <p className="text-xs" style={{ color: "#666" }}>
              120 秒以内に応答がない場合は自動キャンセルされます。
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span style={{ color: "#14F195" }}>✓</span>
              <p className="text-sm font-semibold" style={{ color: "#14F195" }}>
                トランザクション送信完了
              </p>
            </div>
            {signature && (
              <a
                href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate font-mono text-xs"
                style={{ color: "#9945FF" }}
              >
                {signature}
              </a>
            )}
          </div>
        )}

        {status === "error" && (
          <div className="space-y-2">
            <p className="text-sm" style={{ color: "#f87171" }}>
              {errorMsg ?? "署名に失敗しました。"}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSign}
                className="rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: "rgba(153, 69, 255, 0.3)" }}
              >
                再試行
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-xl px-4 py-2 text-sm font-medium text-[#888] transition-colors hover:text-white"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
