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
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type ToolUIPart } from "ai";
import * as React from "react";

/**
 * App コンポーネント
 * @returns
 */
export default function App() {
  const [input, setInput] = React.useState<string>("");

  // useChat フックを使用してチャットの状態と関数を取得
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "http://localhost:4111/chat/weather-agent",
    }),
  });

  /**
   * ボタンをクリックしたときの処理
   * @returns
   */
  const handleSubmit = async () => {
    if (!input.trim()) return;
    // 入力されたテキストを送信してAIの機能を呼び出す
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="relative mx-auto size-full h-screen max-w-4xl p-6">
      <div className="flex h-full flex-col">
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
                    return (
                      <Tool key={`${message.id}-${i}`}>
                        <ToolHeader
                          type={(part as ToolUIPart).type}
                          state={
                            (part as ToolUIPart).state || "output-available"
                          }
                          className="cursor-pointer"
                        />
                        <ToolContent>
                          <ToolInput input={(part as ToolUIPart).input || {}} />
                          <ToolOutput
                            output={(part as ToolUIPart).output}
                            errorText={(part as ToolUIPart).errorText}
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
        <PromptInput onSubmit={handleSubmit} className="mt-20">
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              className="md:leading-10"
              value={input}
              placeholder="Ask about the weather..."
              disabled={status !== "ready"}
            />
          </PromptInputBody>
        </PromptInput>
      </div>
    </div>
  );
}
