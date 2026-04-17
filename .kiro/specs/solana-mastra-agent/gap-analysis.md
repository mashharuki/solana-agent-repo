# ギャップ分析書 — Solana Mastra AI Agent アプリ

生成日: 2026-04-17

---

## 1. 現状調査 (Current State)

### プロジェクトディレクトリ: `mastra-react/`

#### 技術スタック（確認済み）

| カテゴリ | 内容 |
|---|---|
| フロントエンド | React 19, Vite 8, TypeScript 6, Tailwind CSS 4, Shadcn UI |
| AI/チャット | Mastra 1.5, `@mastra/core`, `@ai-sdk/react` useChat フック, `ai` SDK |
| スタイリング | motion (Framer Motion), `tw-animate-css`, Inter Variable フォント |
| ツール | biome 2.4, bun (bun.lockb あり), zod v4 |
| バックエンド | `@mastra/libsql` (LibSQL), `@mastra/duckdb` (Observability), `@mastra/memory` |

#### 既存アセット

**`src/components/ai-elements/`** — AI Elements コンポーネント群（再利用可能）
- `conversation.tsx` — チャット会話コンテナ ✅
- `message.tsx` — メッセージ表示（user/assistant 区別） ✅
- `prompt-input.tsx` — 入力フォーム ✅
- `tool.tsx` — ツール実行結果表示 ✅
- `confirmation.tsx` — **確認ダイアログ（トランザクション署名 UI に転用可能）** ✅
- `shimmer.tsx`, `spinner.tsx` — ローディング表示 ✅
- `code-block.tsx` — コードブロック ✅

**`src/components/ui/`** — Shadcn UI コンポーネント群
- Button, Card, Dialog, Badge, Avatar, Tabs, Tooltip など ✅

**`src/mastra/`** — Mastra バックエンド
- `index.ts` — Mastra インスタンス（ChatRoute, Storage, Observability 設定済み） ✅
- `agents/weather-agent.ts` — サンプルエージェント（置き換え対象）
- `tools/weather-tool.ts` — サンプルツール（置き換え対象）
- `workflows/weather-workflow.ts` — サンプルワークフロー（置き換え対象）

**CSS/デザイン**
- `src/css/index.css` — CSS Custom Properties（現状はモノクロ中心、Solana カラーへの置き換えが必要）

---

## 2. 要件フィージビリティ分析 (Requirements vs. Codebase)

### 要件 1: ウォレット接続・認証

| 要件項目 | 現状 | ギャップ |
|---|---|---|
| Phantom Connect SDK | なし | **Missing** — `@phantom/wallet-sdk` or `@solana/wallet-adapter-phantom` 要追加 |
| ソーシャルログイン | なし | **Missing** — Dynamic.xyz or Privy or Magic.link 等の導入判断が必要（Research Needed） |
| 未接続時の接続ボタン UI | なし（App.tsx はチャット直起動） | **Missing** — ウォレット接続ガード実装が必要 |
| 接続済みアドレス表示 | なし | **Missing** — ヘッダーコンポーネント新規作成が必要 |
| 切断フロー | なし | **Missing** |

### 要件 2: チャット UI とエージェントインタラクション

| 要件項目 | 現状 | ギャップ |
|---|---|---|
| チャット UI コンポーネント | ✅ 既存（Conversation, Message, PromptInput） | スタイル更新のみ |
| Mastra Agent との接続（useChat） | ✅ weatherAgent エンドポイントで動作中 | エンドポイントを solana-agent に変更 |
| ローディング表示 | ✅ shimmer/spinner あり | 接続可能 |
| エラーハンドリング | △ 部分的 | チャット内エラー表示ロジック追加 |
| 独自デザイン（非 AI ルック） | ❌ デフォルト Shadcn カラー | **Missing** — Solana テーマへの全面刷新 |

### 要件 3: SOL 残高と NFT 表示

| 要件項目 | 現状 | ギャップ |
|---|---|---|
| SOL 残高取得 | なし | **Missing** — `@solana/web3.js` Connection + getBalance |
| NFT 一覧取得 | なし | **Missing** — Metaplex `getAssetsByOwner` (DAS API) or `getTokenAccountsByOwner` |
| 残高/NFT 表示コンポーネント | なし | **Missing** — サイドバー/ウォレットパネル 新規作成 |

### 要件 4: トランザクション構築とユーザー署名フロー

| 要件項目 | 現状 | ギャップ |
|---|---|---|
| トランザクション構築（Agent 側） | なし | **Missing** — Solana tools 実装 |
| 署名ボタン UI | △ `confirmation.tsx` が転用可能 | 拡張が必要 |
| `signAndSendTransaction` | なし | **Missing** — Phantom SDK メソッド呼び出し実装 |
| トランザクション結果コールバック → Agent | なし | **Missing** — 結果を Agent にフィードバックする仕組み |
| エラー/キャンセル処理 | なし | **Missing** |

### 要件 5: Mastra Agent の機能・ツール

| 要件項目 | 現状 | ギャップ |
|---|---|---|
| Solana RPC ツール（残高・履歴） | なし（weather ツールのみ） | **Missing** |
| SOL 送金ツール | なし | **Missing** |
| NFT ツール（Metaplex） | なし | **Missing** — `@metaplex-foundation/umi` 等の依存追加 |
| DeFi ツール（Jupiter） | なし | **Missing** — Jupiter API v6 or SDK 要調査（Research Needed） |
| スマートコントラクト呼び出しツール | なし | **Missing** |
| Solana Agent SKILL 統合 | なし | **Missing** — Mastra workspace 機能での SKILL 統合 |
| Agent instructions/description 丁寧な記述 | △ weather agent は簡素 | 書き直し必要 |

### 要件 6: デザインと UI/UX

| 要件項目 | 現状 | ギャップ |
|---|---|---|
| Solana カラースキーム | ❌ モノクロ | **Missing** — CSS Custom Properties を Solana グラデーションに変更 |
| Apple HIG 準拠 | △ Inter フォント・Shadcn でベースあり | 余白・タイポグラフィの最適化 |
| 非 AI ルック | ❌ 標準 ChatGPT 風 | **Missing** — 完全なレイアウト・ビジュアル刷新 |
| レスポンシブ | △ Tailwind 使用 | モバイル最適化が必要 |
| アニメーション | △ motion インストール済み | 既存コンポーネントへの適用が必要 |
| Pencil MCP | N/A | デザイン検討フェーズで利用可能 |

### 要件 7: Solana DevNet 対応

| 要件項目 | 現状 | ギャップ |
|---|---|---|
| DevNet エンドポイント設定 | なし | **Missing** — 環境変数 `VITE_SOLANA_RPC_URL` 追加 |
| ネットワーク表示 | なし | **Missing** |
| DevNet エアドロップ | なし | **Missing** — Mastra ツールとして実装 |
| ネットワーク不一致検知 | なし | **Missing** |

### 要件 8: デプロイとパフォーマンス

| 要件項目 | 現状 | ギャップ |
|---|---|---|
| Vercel 対応 | △ Vite SPA のため基本的には可能 | Mastra サーバーの Vercel Serverless 化要確認（Research Needed） |
| bun 使用 | ✅ bun.lockb あり | OK |
| biome 使用 | ✅ biome.json あり | OK |
| 環境変数管理 | △ `.env.example` あり | Solana 関連変数の追加 |
| monorepo Vercel デプロイ | △ 単一ディレクトリ構成 | vercel.json の設定確認が必要 |

---

## 3. 実装アプローチ選択肢

### Option A: 既存コンポーネントを最大限拡張

**対象**: チャット UI 部分（App.tsx, conversation, message, prompt-input）

- weatherAgent → solanaAgent への置き換え（`src/mastra/agents/`）
- App.tsx にウォレット接続ガードを追加
- CSS Custom Properties を Solana カラーに更新

**トレードオフ**
- ✅ 最小変更、既存テンプレートの恩恵を維持
- ❌ App.tsx の肥大化リスク
- ❌ Solana 固有の UI（ウォレットパネル、署名 UI）との責務混在

### Option B: Solana 固有の新規コンポーネント作成

**対象**:
- `src/components/wallet/` — WalletProvider, WalletConnect, WalletStatusBar, AssetPanel
- `src/components/transaction/` — TransactionCard, SignButton, TransactionResult
- `src/mastra/agents/solana-agent.ts` — 新規エージェント
- `src/mastra/tools/solana/` — ツール群ディレクトリ

**トレードオフ**
- ✅ 明確な責務分離
- ✅ テスト容易性
- ❌ ファイル数増加
- ❌ 既存コンポーネントとの接続設計が必要

### Option C: ハイブリッドアプローチ（推奨）

**フェーズ 1**: 骨格（Solana 接続）
- 既存 App.tsx を WalletGate パターンで拡張（wallet 未接続 → 接続画面、接続済み → チャット画面）
- `src/components/wallet/` を新規作成（WalletProvider, WalletConnectScreen, WalletStatus）

**フェーズ 2**: Solana Agent（バックエンド）
- `weatherAgent` を `solanaAgent` に差し替え（ファイル丸ごと置き換え）
- `src/mastra/tools/solana/` 配下に各ツールを新規作成

**フェーズ 3**: トランザクション UX
- `src/components/transaction/` を新規作成（署名 UI、結果表示）
- 既存 `confirmation.tsx` を拡張して署名フロー専用コンポーネントへ

**フェーズ 4**: Solana デザインテーマ
- `src/css/index.css` の CSS 変数を Solana カラーに全面更新
- motion アニメーション追加

**トレードオフ**
- ✅ 段階的実装でリスク分散
- ✅ 各フェーズが独立してテスト可能
- ✅ 既存 AI Elements の最大活用
- ❌ フェーズ間の調整コスト

---

## 4. Research Needed（設計フェーズで調査すべき項目）

| # | 調査項目 | 理由 |
|---|---|---|
| R1 | **ソーシャルログイン実装手段** | Dynamic.xyz / Privy / Magic.link の比較評価（Phantom + ソーシャル統合の最適解） |
| R2 | **Mastra の Vercel Serverless デプロイ** | Mastra サーバーが Vercel Edge/Serverless Functions に対応するか確認 |
| R3 | **Jupiter API v6 統合方法** | DeFi スワップの最新 API（REST vs SDK の選択） |
| R4 | **Phantom Connect SDK の最新バージョン** | `@phantom/wallet-sdk` vs `@solana/wallet-adapter-phantom` の適切な選択 |
| R5 | **NFT 取得 API** | Metaplex DAS API（`getAssetsByOwner`）のエンドポイントと認証要件 |
| R6 | **Mastra workspace SKILL の統合方法** | Solana Agent SKILL の workspace 経由での組み込みパターン確認 |

---

## 5. 実装複雑度とリスク

| 要件領域 | 工数 | リスク | 根拠 |
|---|---|---|---|
| ウォレット接続・認証 | M | Medium | Phantom SDK は整備されているが、ソーシャルログイン統合が未確定 |
| チャット UI/エージェント接続 | S | Low | 既存テンプレートのエンドポイント変更が主 |
| SOL 残高・NFT 表示 | S | Low | `@solana/web3.js` getBalance は確立済みパターン |
| トランザクション署名フロー | M | Medium | Agent ↔ Frontend のコールバック設計が非標準 |
| Mastra Solana ツール群 | L | Medium | 5 種類のツール実装 + DeFi は依存ライブラリ確定待ち |
| Solana デザインテーマ | M | Low | CSS 変数の全面更新 + コンポーネントスタイル調整 |
| DevNet 設定 | S | Low | 環境変数追加のみ |
| Vercel デプロイ | S | Medium | Mastra サーバーの Serverless 対応確認が必要 |

**総合工数見積もり**: **L〜XL（1〜3 週間）**

---

## 6. 設計フェーズへの推奨事項

### 採用推奨アプローチ
**Option C（ハイブリッド）** を推奨。4 フェーズに分割して実装し、各フェーズの完了後に動作確認を行う。

### 優先決定事項（設計書で確定すべき）
1. ソーシャルログインプロバイダーの選定（R1）
2. Phantom SDK のバージョン・API の確定（R4）
3. Agent ↔ Frontend のトランザクションコールバック設計（Mastra のツール返却値をどう React 側で受け取るか）
4. Vercel デプロイ構成の確定（R2）

### 既存資産の再利用ポイント
- `confirmation.tsx` → トランザクション署名 UI に拡張
- `useChat` + `DefaultChatTransport` → solana-agent エンドポイントへの転換
- `tool.tsx` → Solana ツール実行結果のリアルタイム表示
- `motion` → ウォレット接続画面・トランザクション完了のアニメーション
