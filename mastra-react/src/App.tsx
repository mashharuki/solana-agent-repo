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
  PromptInputTextarea,
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
import * as React from "react";

/**
 * メインチャット画面。
 * Solana Agent エンドポイントに接続し、ツール結果から
 * SolanaTxRequest を検出して TransactionCard をレンダリングする。
 *
 * Requirements: 2.1–2.7, 4.1–4.8
 */
export default function App() {
  const { connected } = useWallet();
  const { refetch: refetchBalance } = useSolanaBalance();
  const [input, setInput] = React.useState<string>("");
  const [pendingTxRequest, setPendingTxRequest] =
    React.useState<SolanaTxRequest | null>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat/solana-agent",
    }),
  });

  const isInputDisabled =
    status !== "ready" || pendingTxRequest !== null || !connected;

  const handleSubmit = async () => {
    if (!input.trim()) return;
    if (!connected) return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleSign = React.useCallback(
    (result: TransactionSignResult) => {
      const followUp = buildTxResultFollowUp(result);
      sendMessage({ text: followUp });
      setPendingTxRequest(null);
    },
    [sendMessage],
  );

  const handleCancel = React.useCallback(() => {
    sendMessage({ text: "署名がキャンセルされました。" });
    setPendingTxRequest(null);
  }, [sendMessage]);

  const handleRefetch = React.useCallback(() => {
    refetchBalance();
  }, [refetchBalance]);

  return (
    <div className="relative flex h-screen flex-col bg-background">
      <WalletStatusBar />
      <NetworkMismatchBanner />
      <div className="mx-auto flex size-full max-w-6xl flex-1 gap-4 overflow-hidden p-4 lg:p-6">
        <div className="hidden lg:flex">
          <AssetPanel />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <Conversation className="h-full">
            <ConversationContent>
              {messages.map((message) => (
                <div key={message.id}>
                  {message.parts?.map((part, i) => {
                    if (part.type === "text") {
                      return (
                        <Message key={`${message.id}-${i}`} from={message.role}>
                          <MessageContent>
                            <MessageResponse>{part.text}</MessageResponse>
                          </MessageContent>
                        </Message>
                      );
                    }

                    if (part.type?.startsWith("tool-")) {
                      const toolPart = part as ToolUIPart;
                      const txReq = detectTxRequest(toolPart.output);

                      // SolanaTxRequest 検出: TransactionCard をレンダリング
                      if (txReq) {
                        // Guard: 既に署名待ちの tx がある場合は無視する（7.2）
                        if (pendingTxRequest !== null) {
                          return null;
                        }
                        // 初回検出時に pendingTxRequest を設定
                        if (pendingTxRequest === null) {
                          // Use effect-like lazy set — avoid setState during render
                          return (
                            <TransactionCardRenderer
                              key={`${message.id}-${i}`}
                              txRequest={txReq}
                              onMount={() => setPendingTxRequest(txReq)}
                              onSign={handleSign}
                              onCancel={handleCancel}
                              onRefetch={handleRefetch}
                            />
                          );
                        }
                      }

                      // 通常のツール結果表示
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
                </div>
              ))}
              <ConversationScrollButton />
            </ConversationContent>
          </Conversation>

          {/* ウォレット未接続の案内 */}
          {!connected && (
            <p className="mb-2 text-center text-xs text-muted-foreground">
              Phantom ウォレットを接続するとチャットが利用できます
            </p>
          )}

          {/* 署名待ち案内 */}
          {pendingTxRequest !== null && (
            <p className="mb-2 text-center text-xs text-primary">
              トランザクションへの署名を完了するまでメッセージは送信できません
            </p>
          )}

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
          </PromptInput>
        </div>
      </div>
    </div>
  );
}

/**
 * TransactionCard のラッパー。
 * マウント時に pendingTxRequest を設定し、アンマウント後は不要。
 */
function TransactionCardRenderer({
  txRequest,
  onMount,
  onSign,
  onCancel,
  onRefetch,
}: {
  txRequest: SolanaTxRequest;
  onMount: () => void;
  onSign: (r: TransactionSignResult) => void;
  onCancel: () => void;
  onRefetch: () => void;
}) {
  React.useEffect(() => {
    onMount();
  }, [onMount]);

  return (
    <TransactionCard
      txRequest={txRequest}
      onSign={onSign}
      onCancel={onCancel}
      onRefetch={onRefetch}
    />
  );
}
