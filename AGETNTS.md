# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Goal

Solana上のAI Agentサンプルアプリ。React + Mastra + TypeScript + Phantom Connect + Solana を組み合わせ、自然言語でSOL送金・NFT発行・スマートコントラクト呼び出しができるチャット UI を構築する。Solana Superteam Japan BootCamp 講師用デモとして開発中。

対象ネットワーク: **Devnet**  
デプロイ先: **Vercel**

## Working Directory

すべての実装は `mastra-react/` 配下で行う。ルートの `docs/memo.md` に要件メモがある。

## Commands (run inside `mastra-react/`)

```bash
# フロントエンド開発サーバー (localhost:5173)
bun run dev

# Mastra Studio / バックエンドサーバー (localhost:4111)
npx mastra dev   # または npm run dev:mastra があれば使用

# ビルド確認
bun run build

# フォーマット
bun run format

# Lint
bun run lint
```

> フロントエンド (`vite`) とMastraバックエンド (`mastra dev`) は **別ターミナル**で同時起動する必要がある。フロントは `http://localhost:4111/chat/<agentId>` にAPIコールする。

## Architecture

```
mastra-react/
├── src/
│   ├── mastra/                  # Mastraバックエンド
│   │   ├── index.ts             # Mastraインスタンス設定 (agents/workflows/storage/observability登録)
│   │   ├── agents/              # Agentの定義 (model, tools, memory, instructions)
│   │   ├── tools/               # createTool() で作成したツール (Zod schema必須)
│   │   ├── workflows/           # createWorkflow() + createStep() の多段パイプライン
│   │   └── public/              # ビルド成果物に同梱するstatic files
│   ├── components/
│   │   └── ai-elements/         # AI SDK React 用の会話UI部品
│   │       ├── conversation.tsx
│   │       ├── message.tsx
│   │       ├── prompt-input.tsx
│   │       └── tool.tsx
│   ├── App.tsx                  # チャットUI本体。useChat() → Mastra chatRoute に接続
│   └── main.tsx
└── vite.config.ts               # @/ → src/ エイリアス設定済み
```

### Mastraの重要規則

- **新しいAgent/Tool/Workflow は必ず `src/mastra/index.ts` に登録する**
- Tool の `inputSchema` / `outputSchema` は Zod で定義する
- Agent の `description` と Tool の `description` は詳細に書く（AI の挙動に直結）
- Workflow は `.then()` チェーンの最後に `.commit()` を呼ぶ
- ストレージ: LibSQL (default) + DuckDB (observability) の CompositeStore 構成

### Solana固有の設計方針

- **Agentはトランザクションを構築するだけで署名しない** — 署名はPhantom Wallet APIでユーザーが行う
- トランザクション完了後、結果をコールバックとしてAgentに渡して解説させる
- ウォレット未接続の場合はチャットを無効化し、接続ボタンのみ表示する

### デザイン方針

- Solana のブランドカラー（グラデーション紫〜緑）ベース
- Apple Design Guidelines 準拠
- AI生成っぽい没個性的UIを避ける（intentional-design-guard スキル参照）
- デザイン検討時は Pencil MCP を使用する

## Skills to Use

| タスク | 使用するSkill |
|--------|---------------|
| Mastra Agent/Tool/Workflow の実装 | `mastra` |
| Solana / Anchor / Phantom | `solana-dev` or `phantom-wallet` |
| フロントエンドUIの設計・実装 | `frontend-design` |
| デザインレビュー | `intentional-design-guard` |

## Environment Variables

`.env.example` を参照してコピーし `.env` を作成する。必要なキーは少なくとも:
- `GOOGLE_GENERATIVE_AI_API_KEY` — weatherAgent が `google/gemini-3-flash-preview` を使用
- `MASTRA_CLOUD_ACCESS_TOKEN` — CloudExporter 使用時（オプション）
