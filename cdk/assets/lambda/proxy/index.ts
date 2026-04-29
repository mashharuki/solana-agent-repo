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
    process.env.BEDROCK_MODEL_ID ?? "anthropic.claude-3-5-haiku-20241022-v1:0";

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

  let body: { messages?: Array<{ role: string; content: string }> };

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
  const bedrockMessages: Message[] = incomingMessages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: [{ text: m.content }],
    }));

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

    // Return in Vercel AI SDK data stream format (v1) so useChat() works
    // Format: 0:"<text chunk>"\n  then  d:{finishReason}\n
    const finishReason = response.stopReason ?? "stop";
    const promptTokens = response.usage?.inputTokens ?? 0;
    const completionTokens = response.usage?.outputTokens ?? 0;

    const dataStream =
      `0:${JSON.stringify(assistantText)}\n` +
      `d:${JSON.stringify({ finishReason, usage: { promptTokens, completionTokens } })}\n`;

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders(allowedOrigin),
        "Content-Type": "text/plain; charset=utf-8",
        "x-vercel-ai-data-stream": "v1",
      },
      body: dataStream,
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
