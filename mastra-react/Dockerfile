# -----------------------------------------------------------------------
# Mastra AI Agent — AWS Lambda Container Image (Multi-stage build)
#
# デプロイフロー:
#   1. cdk deploy → CDK が本 Dockerfile をビルドして ECR にプッシュ
#   2. Lambda が ECR イメージから起動
#   3. AWS Lambda Web Adapter が HTTP/Lambda イベント変換を担当
#   4. Mastra サーバーが PORT=8080 でリッスン
#
# 必須 Lambda 環境変数:
#   GOOGLE_GENERATIVE_AI_API_KEY  — Google Gemini API キー
#   MASTRA_LIBSQL_URL             — (省略可) Turso Cloud URL (省略時はインメモリ SQLite)
#
# Note: npm install -g bun は Alpine musl 環境で SIGSEGV (exit 139) を起こすが、
#       Debian (glibc) ベースの node:22 では正常動作する。
#       mastra build が内部で npm install を呼ぶため、npm が必要。
# -----------------------------------------------------------------------

# ── Build Stage ─────────────────────────────────────────────────────────
# node:22 (Debian) — npm 付き + bun をインストール。mastra build が npm を必要とする。
# --platform=linux/amd64: Mac (arm64) でビルドしても Lambda (x86_64) 向けに固定する
FROM --platform=linux/amd64 node:22 AS builder

# bun パッケージマネージャーをインストール
RUN npm install -g bun

WORKDIR /app

# 依存関係インストール
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# ソースコードとビルド設定をコピー
COPY src ./src
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY biome.json components.json ./
COPY public ./public

# Mastra サーバーをビルド → .mastra/output/index.mjs
RUN bunx mastra build

# ── Runtime Stage ────────────────────────────────────────────────────────
# node:22-slim (Debian slim) — builder と同じ glibc ベースでネイティブモジュール互換
FROM --platform=linux/amd64 node:22-slim

WORKDIR /app

# AWS Lambda Web Adapter: Lambda イベント → HTTP 変換ランタイム拡張
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 \
     /lambda-adapter /opt/extensions/lambda-adapter

# ビルド成果物と依存関係をコピー
COPY --from=builder /app/.mastra/output ./.mastra/output
COPY --from=builder /app/node_modules ./node_modules

# セキュリティ: 非 root ユーザーで実行
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/sh -m mastra && \
    chown -R mastra:nodejs /app

USER mastra

# Lambda Web Adapter 設定
ENV PORT=8080
ENV NODE_ENV=production
ENV AWS_LWA_READINESS_CHECK_PATH="/api"
# readiness チェック: 30回 × 1秒 = 最大30秒待機（デフォルト10回 × 2秒）
ENV AWS_LWA_READINESS_CHECK_MAX_RETRIES=30
ENV AWS_LWA_READINESS_CHECK_INTERVAL_MS=1000

CMD ["node", ".mastra/output/index.mjs"]
