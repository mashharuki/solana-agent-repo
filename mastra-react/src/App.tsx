/**
 * App.tsx — Solana AI Agent チャット画面
 *
 * 【文脈の3問】
 * 1. 誰が何のために: Solana BootCamp 受講者が DevNet 上のAI Agentで
 *    SOL送金・NFT操作を自然言語で試す学習用デモ画面
 * 2. ムード/トーン: 精密機器 × 実験的。航空管制室のような即時フィードバック感、
 *    操作の重みが伝わるUI（署名は重要なアクション、ゆえに明示的なオーバーレイ）
 * 3. 異分野参照点: 航空管制室ダッシュボード — 状態変化の可視化、段階的情報開示、
 *    操作の確実性とフィードバックの即時性
 *
 * Requirements: 2.1–2.7, 4.1–4.8
 */

import { AssetPanel } from "@/components/asset/AssetPanel";
import { TransactionCard } from "@/components/transaction/TransactionCard";
import { NetworkMismatchBanner } from "@/components/wallet/NetworkMismatchBanner";
import { WalletStatusBar } from "@/components/wallet/WalletStatusBar";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { useSolanaBalance } from "@/hooks/useSolanaBalance";
import { detectTxRequest } from "@/lib/chat-utils";
import { buildTxResultFollowUp } from "@/lib/transaction-error";
import type { SolanaTxRequest, TransactionSignResult } from "@/types/solana";
import { useWallet } from "@solana/wallet-adapter-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type ToolUIPart } from "ai";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";

// ─── クイックアクション定義 ──────────────────────────────────────
const QUICK_ACTIONS = [
  {
    label: "残高確認",
    icon: "◈",
    prompt: "私のウォレットの SOL 残高を教えてください",
  },
  {
    label: "エアドロップ",
    icon: "⬇",
    prompt: "1 SOL のエアドロップをリクエストしてください",
  },
  {
    label: "NFT一覧",
    icon: "⬡",
    prompt: "私のウォレットが保有する NFT を一覧表示してください",
  },
  {
    label: "SOL送金",
    icon: "↗",
    prompt: "SOL を送金したいです。送金先と金額を指定します。",
  },
] as const;

// ─── メインコンポーネント ─────────────────────────────────────────

export default function App() {
  const { connected } = useWallet();
  const { refetch: refetchBalance } = useSolanaBalance();
  const [input, setInput] = React.useState<string>("");
  const [pendingTxRequest, setPendingTxRequest] =
    React.useState<SolanaTxRequest | null>(null);
  // 処理済み txRequest の識別子を記録し、署名/キャンセル後の再検出を防ぐ
  const handledTxKeys = React.useRef<Set<string>>(new Set());
  // 自動送信されたフォローアップテキストを記録し、チャット表示から非表示にする
  const autoSentTexts = React.useRef<Set<string>>(new Set());

  // クイックアクション後にテキストエリアにフォーカスするための DOM 参照
  // PromptInputTextarea は forwardRef 非対応のため、親 div に ref を置いて querySelector する
  const inputAreaRef = React.useRef<HTMLDivElement | null>(null);

  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/chat/solana-agent",
    }),
  });

  // 署名/キャンセル後のフォローアップを status === "ready" になってから送るためのキュー
  const pendingFollowUp = React.useRef<string | null>(null);

  // status が "ready" になったらキュー済みフォローアップを送信する
  React.useEffect(() => {
    if (status !== "ready") return;
    if (pendingFollowUp.current === null) return;
    const text = pendingFollowUp.current;
    pendingFollowUp.current = null;
    sendMessage({ text });
  }, [status, sendMessage]);

  // ── メッセージ全体をスキャンして最新の TxRequest を検出 ─────────────
  // レンダリング中に setState を呼ばないために useMemo で計算し、
  // useEffect で pendingTxRequest に同期する
  const detectedTxReq = React.useMemo<SolanaTxRequest | null>(() => {
    // 最後のメッセージから逆順に走査し、最初に見つかった txReq を返す
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (!message.parts) continue;
      for (const part of message.parts) {
        if (!part.type?.startsWith("tool-")) continue;
        const toolPart = part as ToolUIPart;
        const txReq = detectTxRequest(toolPart.output);
        if (txReq) return txReq;
      }
    }
    return null;
  }, [messages]);

  // detectedTxReq が非null で、まだ処理されていない場合に同期
  // status が "ready" の場合のみ TransactionCard を表示する
  // （streaming 中に署名 → sendMessage 競合を防止）
  React.useEffect(() => {
    if (detectedTxReq === null) return;
    if (status !== "ready") return;
    const key = detectedTxReq.serializedTx;
    if (pendingTxRequest === null && !handledTxKeys.current.has(key)) {
      setPendingTxRequest(detectedTxReq);
    }
  }, [detectedTxReq, pendingTxRequest, status]);

  // ── 送信可否 ────────────────────────────────────────────────────
  const isInputDisabled =
    status !== "ready" || pendingTxRequest !== null || !connected;

  // ── フォーム送信ハンドラ（PromptInput の onSubmit シグネチャに合わせる） ──
  const handleSubmit = React.useCallback(
    (message: PromptInputMessage) => {
      const text = message.text.trim();
      if (!text || !connected) return;
      sendMessage({ text });
      setInput("");
    },
    [connected, sendMessage],
  );

  // ── 署名・キャンセルハンドラ ────────────────────────────────────
  // フォローアップは status === "ready" になってから送信する。
  // streaming 中に sendMessage を呼ぶとチャットが stuck するため、
  // pendingFollowUp にキューイングして useEffect で送る。
  const handleSign = React.useCallback(
    (result: TransactionSignResult) => {
      const followUp = buildTxResultFollowUp(result);
      autoSentTexts.current.add(followUp);
      setPendingTxRequest((prev) => {
        if (prev) handledTxKeys.current.add(prev.serializedTx);
        return null;
      });
      if (status === "ready") {
        sendMessage({ text: followUp });
      } else {
        pendingFollowUp.current = followUp;
      }
    },
    [sendMessage, status],
  );

  const handleCancel = React.useCallback(() => {
    const cancelMsg = "署名がキャンセルされました。";
    autoSentTexts.current.add(cancelMsg);
    setPendingTxRequest((prev) => {
      if (prev) handledTxKeys.current.add(prev.serializedTx);
      return null;
    });
    if (status === "ready") {
      sendMessage({ text: cancelMsg });
    } else {
      pendingFollowUp.current = cancelMsg;
    }
  }, [sendMessage, status]);

  const handleRefetch = React.useCallback(() => {
    refetchBalance();
  }, [refetchBalance]);

  // ── クイックアクション ──────────────────────────────────────────
  const handleQuickAction = React.useCallback(
    (prompt: string) => {
      if (isInputDisabled) return;
      setInput(prompt);
      // テキストエリアにフォーカスを当てる（親 div 経由で querySelector）
      requestAnimationFrame(() => {
        const textarea = inputAreaRef.current?.querySelector("textarea");
        textarea?.focus();
      });
    },
    [isInputDisabled],
  );

  // ── ストップハンドラ ────────────────────────────────────────────
  const handleStop = React.useCallback(() => {
    stop();
    pendingFollowUp.current = null;
  }, [stop]);

  return (
    <div className="relative flex h-full flex-col bg-background">
      <WalletStatusBar />
      <NetworkMismatchBanner />

      <div className="mx-auto flex size-full max-w-6xl flex-1 gap-4 overflow-hidden p-4 lg:p-6">
        {/* サイドパネル (lg以上) */}
        <div className="hidden lg:flex">
          <AssetPanel />
        </div>

        {/* チャットカラム */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* ── メッセージリスト ─────────────────────────────────── */}
          <Conversation className="h-full">
            <ConversationContent>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  {message.parts?.map((part, i) => {
                    // テキストパート
                    if (part.type === "text") {
                      // 自動送信したフォローアップメッセージはUIに表示しない（エージェントには届く）
                      if (
                        message.role === "user" &&
                        autoSentTexts.current.has(part.text)
                      ) {
                        return null;
                      }
                      return (
                        <Message key={`${message.id}-${i}`} from={message.role}>
                          <MessageContent>
                            <MessageResponse>{part.text}</MessageResponse>
                          </MessageContent>
                        </Message>
                      );
                    }

                    // ツール結果パート: SolanaTxRequest は外部 TransactionCard で処理するため
                    // ここでは通常のツール表示のみ行う（バグ修正: 問題1）
                    if (part.type?.startsWith("tool-")) {
                      const toolPart = part as ToolUIPart;
                      return (
                        <Tool key={`${message.id}-${i}`}>
                          <ToolHeader
                            type={toolPart.type}
                            state={toolPart.state || "output-available"}
                            className="cursor-pointer"
                          />
                          <ToolContent>
                            <ToolInput input={toolPart.input || {}} />
                            <ToolOutput
                              output={toolPart.output}
                              errorText={toolPart.errorText}
                            />
                          </ToolContent>
                        </Tool>
                      );
                    }

                    return null;
                  })}
                </motion.div>
              ))}

              {/* タイピングインジケーター: 状態遷移の可視化（操作フィードバック） */}
              <AnimatePresence>
                {(status === "submitted" || status === "streaming") && (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-1.5 px-1 py-2"
                    aria-label="Agent が応答中"
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-2 w-2 rounded-full bg-primary"
                        animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{
                          duration: 0.7,
                          repeat: Infinity,
                          delay: i * 0.15,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <ConversationScrollButton />
            </ConversationContent>
          </Conversation>

          {/* ── 入力エリア下部ブロック ──────────────────────────────── */}
          <div className="shrink-0 space-y-2">
            {/* ウォレット未接続の案内 */}
            <AnimatePresence>
              {!connected && (
                <motion.p
                  key="wallet-notice"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="text-center text-xs text-muted-foreground"
                >
                  Phantom ウォレットを接続するとチャットが利用できます
                </motion.p>
              )}
            </AnimatePresence>

            {/* ── TransactionCard: メッセージリストの外、入力欄の上に表示 ─── */}
            {/* 署名が完了するまで消えないため pendingTxRequest で制御（バグ修正: 問題1） */}
            <AnimatePresence>
              {pendingTxRequest !== null && (
                <motion.div
                  key="tx-card"
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 340, damping: 30 }}
                >
                  <TransactionCard
                    txRequest={pendingTxRequest}
                    onSign={handleSign}
                    onCancel={handleCancel}
                    onRefetch={handleRefetch}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── 署名待ち案内テキスト ───────────────────────────────── */}
            <AnimatePresence>
              {pendingTxRequest !== null && (
                <motion.p
                  key="signing-notice"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                  className="text-center text-xs"
                  style={{ color: "#9945FF" }}
                >
                  トランザクションへの署名を完了するまでメッセージは送信できません
                </motion.p>
              )}
            </AnimatePresence>

            {/* ── PromptInput ──────────────────────────────────────────── */}
            {/*
              署名待ち中はオーバーレイ効果: 入力エリア全体を相対配置コンテナで包み、
              半透明オーバーレイと案内テキストを重ねて「操作できない状態」を伝える。
              これにより認知負荷を下げ、「次にすべき操作」が一目でわかる。
            */}
            <div ref={inputAreaRef} className="relative">
              <PromptInput onSubmit={handleSubmit}>
                <PromptInputBody>
                  <PromptInputTextarea
                    onChange={(e) => setInput(e.target.value)}
                    value={input}
                    placeholder={
                      connected
                        ? "Solana の操作を日本語で入力してください（例: 残高を教えて）"
                        : "Phantom ウォレットを接続してください"
                    }
                    disabled={isInputDisabled}
                  />
                </PromptInputBody>
                <PromptInputFooter>
                  {/* 左側: クイックアクションチップ群（問題2: リッチ入力欄） */}
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        disabled={isInputDisabled}
                        onClick={() => handleQuickAction(action.prompt)}
                        className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                        style={{
                          borderColor: "rgba(153, 69, 255, 0.30)",
                          background: "rgba(153, 69, 255, 0.08)",
                          color: "#c084fc",
                        }}
                        onMouseEnter={(e) => {
                          if (!isInputDisabled) {
                            e.currentTarget.style.background =
                              "rgba(153, 69, 255, 0.18)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            "rgba(153, 69, 255, 0.08)";
                        }}
                      >
                        <span
                          aria-hidden="true"
                          className="tabular-nums"
                          style={{ color: "#14F195", fontSize: "0.7rem" }}
                        >
                          {action.icon}
                        </span>
                        {action.label}
                      </button>
                    ))}
                  </div>

                  {/* 右側: 送信ボタン（問題2: PromptInputSubmit を追加） */}
                  <PromptInputSubmit
                    status={status}
                    onStop={handleStop}
                    disabled={isInputDisabled && status === "ready"}
                    style={{
                      background:
                        isInputDisabled && status === "ready"
                          ? undefined
                          : "linear-gradient(135deg, #9945FF 0%, #14F195 100%)",
                      opacity: isInputDisabled && status === "ready" ? 0.4 : 1,
                    }}
                    className="shrink-0 text-white transition-opacity hover:opacity-90"
                  />
                </PromptInputFooter>
              </PromptInput>

              {/* 署名待ち中オーバーレイ: 半透明 + 案内メッセージ */}
              <AnimatePresence>
                {pendingTxRequest !== null && (
                  <motion.div
                    key="input-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 flex cursor-not-allowed items-center justify-center rounded-[inherit]"
                    style={{
                      background: "rgba(0, 0, 0, 0.45)",
                      backdropFilter: "blur(2px)",
                      WebkitBackdropFilter: "blur(2px)",
                    }}
                    aria-hidden="true"
                  >
                    <p
                      className="select-none text-xs font-medium"
                      style={{ color: "rgba(255,255,255,0.65)" }}
                    >
                      署名待ち — 上のカードで操作してください
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
