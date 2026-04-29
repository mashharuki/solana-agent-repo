import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message,
} from "@aws-sdk/client-bedrock-runtime";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

// Bedrock 実行結果用のクライアントを生成
const bedrockClient = new BedrockRuntimeClient({});

// システムプロンプト — 役割と能力を定義
const SYSTEM_PROMPT = `
  You are a helpful Solana blockchain AI assistant for a demo application.
  You assist users with:
  - Checking SOL balances on Solana Devnet
  - Understanding Solana transactions and accounts
  - Explaining NFT minting and DeFi concepts on Solana
  - Guiding through Phantom Wallet interactions
  - Interpreting on-chain data and program calls

  Always be concise, accurate, and guide users through blockchain interactions safely.
  When a user wants to send SOL or interact with on-chain programs, explain the process clearly.
`;

/**
 * CORSヘッダーを生成するユーティリティ関数
 * @param allowedOrigin
 * @returns
 */
function corsHeaders(allowedOrigin: string) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type,Authorization,x-api-key",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Lambda関数のエントリポイント — Bedrock Converse APIを呼び出してLLM応答を生成
 * @param event
 * @returns
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "*";
  const modelId =
    process.env.BEDROCK_MODEL_ID ?? "jp.anthropic.claude-haiku-4-5-20251001-v1:0";

  // Handle CORS preflight
  if (event.requestContext.http.method === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(allowedOrigin) };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      headers: corsHeaders(allowedOrigin),
      body: JSON.stringify({ error: "Missing request body" }),
    };
  }

  // ai SDK v6 sends UIMessage with `parts` array; legacy v5 sent `content: string`
  type IncomingPart = { type: string; text?: string };
  type IncomingMessage = { role: string; content?: string; parts?: IncomingPart[] };
  let body: { messages?: IncomingMessage[] };

  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf-8")
      : event.body;
    body = JSON.parse(raw);
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders(allowedOrigin),
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const incomingMessages = body.messages ?? [];

  if (incomingMessages.length === 0) {
    return {
      statusCode: 400,
      headers: corsHeaders(allowedOrigin),
      body: JSON.stringify({ error: "No messages provided" }),
    };
  }

  // Map to Bedrock Converse message format (role must be 'user' | 'assistant')
  // Support ai SDK v6 (parts[]) and legacy v5 (content string)
  const bedrockMessages: Message[] = incomingMessages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => {
      const text = m.parts
        ? m.parts
            .filter(
              (p): p is { type: "text"; text: string } =>
                p.type === "text" && typeof p.text === "string",
            )
            .map((p) => p.text)
            .join("")
        : (m.content ?? "");
      return text
        ? ({ role: m.role as "user" | "assistant", content: [{ text }] } as Message)
        : null;
    })
    .filter((m): m is Message => m !== null);

  // Ensure conversation starts with a user message
  if (bedrockMessages.length === 0 || bedrockMessages[0].role !== "user") {
    return {
      statusCode: 400,
      headers: corsHeaders(allowedOrigin),
      body: JSON.stringify({
        error: "Conversation must start with a user message",
      }),
    };
  }

  try {
    // Call Bedrock Converse API
    const response = await bedrockClient.send(
      new ConverseCommand({
        modelId,
        system: [{ text: SYSTEM_PROMPT }],
        messages: bedrockMessages,
        inferenceConfig: {
          maxTokens: 2048,
          temperature: 0.7,
        },
      }),
    );

    const assistantText =
      response.output?.message?.content
        ?.filter((block): block is { text: string } => "text" in block)
        .map((block) => block.text)
        .join("") ?? "";

    // Return in AI SDK v6 UIMessageChunk SSE format
    // DefaultChatTransport expects: Content-Type: text/event-stream + x-vercel-ai-ui-message-stream: v1
    const finishReason = response.stopReason ?? "stop";
    const messageId = `msg-${Date.now()}`;
    const textId = `txt-${Date.now()}`;

    const chunks = [
      { type: "start", messageId },
      { type: "start-step" },
      { type: "text-start", id: textId },
      { type: "text-delta", id: textId, delta: assistantText },
      { type: "text-end", id: textId },
      { type: "finish-step" },
      { type: "finish", finishReason },
    ];

    const sseBody = chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("");

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders(allowedOrigin),
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "x-vercel-ai-ui-message-stream": "v1",
        "x-accel-buffering": "no",
      },
      body: sseBody,
    };
  } catch (error: unknown) {
    console.error("Bedrock ConverseCommand error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return {
      statusCode: 502,
      headers: corsHeaders(allowedOrigin),
      body: JSON.stringify({ error: message }),
    };
  }
};
