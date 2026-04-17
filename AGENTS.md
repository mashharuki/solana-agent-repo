# Agentic SDLC and Spec-Driven Development

Kiro-style Spec-Driven Development on an agentic SDLC

## Project Memory
Project memory keeps persistent guidance (steering, specs notes, component docs) so GitHub Copilot honors your standards each run. Treat it as the long-lived source of truth for patterns, conventions, and decisions.

- Use `.kiro/steering/` for project-wide policies: architecture principles, naming schemes, security constraints, tech stack decisions, api standards, etc.
- Use local `AGENTS.md` files for feature or library context (e.g. `src/lib/payments/AGENTS.md`): describe domain assumptions, API contracts, or testing conventions specific to that folder.
- Specs notes stay with each spec (under `.kiro/specs/`) to guide specification-level workflows.

## Project Context

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- Check `.kiro/specs/` for active specifications
- Use `/kiro-spec-status [feature-name]` to check progress

## Development Guidelines
- Think in English, generate responses in English. All Markdown content written to project files (e.g., requirements.md, design.md, tasks.md, research.md, validation reports) MUST be written in the target language configured for this specification (see spec.json.language).

## Minimal Workflow
- Phase 0 (optional): `/kiro-steering`, `/kiro-steering-custom`
- Discovery: `/kiro-discovery "idea"` — determines action path, writes brief.md + roadmap.md for multi-spec projects
- Phase 1 (Specification):
  - Single spec: `/kiro-spec-quick {feature} [--auto]` or step by step:
    - `/kiro-spec-init "description"`
    - `/kiro-spec-requirements {feature}`
    - `/kiro-validate-gap {feature}` (optional: for existing codebase)
    - `/kiro-spec-design {feature} [-y]`
    - `/kiro-validate-design {feature}` (optional: design review)
    - `/kiro-spec-tasks {feature} [-y]`
  - Multi-spec: `/kiro-spec-batch` — creates all specs from roadmap.md in parallel by dependency wave
- Phase 2 (Implementation): `/kiro-impl {feature} [tasks]`
  - Without task numbers: autonomous mode (subagent per task + independent review + final validation)
  - With task numbers: manual mode (selected tasks in main context, still reviewer-gated before completion)
  - `/kiro-validate-impl {feature}` (standalone re-validation)
- Progress check: `/kiro-spec-status {feature}` (use anytime)

## Skills Structure
Skills are located in `.github/skills/kiro-*/SKILL.md`
- Each skill is a directory with a `SKILL.md` file
- Use `/skills` to inspect currently available skills
- Invoke a skill directly with `/kiro-<skill-name>`
- **If there is even a 1% chance a skill applies to the current task, invoke it.** Do not skip skills because the task seems simple.
- `kiro-review` — task-local adversarial review protocol used by reviewer subagents
- `kiro-debug` — root-cause-first debug protocol used by debugger subagents
- `kiro-verify-completion` — fresh-evidence gate before success or completion claims

## Development Rules
- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/kiro-spec-status`
- Follow the user's instructions precisely, and within that scope act autonomously: gather the necessary context and complete the requested work end-to-end in this run, asking questions only when essential information is missing or the instructions are critically ambiguous.

## Steering Configuration
- Load entire `.kiro/steering/` as project memory
- Default files: `product.md`, `tech.md`, `structure.md`
- Custom files are supported (managed via `/kiro-steering-custom`)

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
