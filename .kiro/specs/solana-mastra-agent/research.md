# Research & Design Decisions — Solana Mastra AI Agent

---

**Purpose**: ギャップ分析と技術調査の結果を記録し、design.md の根拠とする。

---

## Summary

- **Feature**: `solana-mastra-agent`
- **Discovery Scope**: Complex Integration（新規機能 + 外部サービス複数統合）
- **Key Findings**:
  - `@solana/wallet-adapter-react` が Phantom Connect の推奨統合手段であり、Triple-layer Provider（ConnectionProvider → WalletProvider → WalletModalProvider）で構成する
  - Mastra は `@mastra/deployer-vercel` で Vercel Serverless Functions に完全対応済み。ただしエフェメラルファイルシステムの制約により、LibSQL の `file:` URLを外部ホスティング（Turso Cloud）に変更する必要がある
  - Jupiter v6 Ultra Swap API は REST（quote → swap → シリアライズ済みトランザクション返却）で統合可能。ユーザー署名後に Phantom SDK でブロードキャスト
  - Metaplex DAS API の `getAssetsByOwner` が NFT 一覧取得の最適手段。`@metaplex-foundation/digital-asset-standard-api` + DevNet 対応 RPC で利用可能

---

## Research Log

### トピック 1: Phantom Wallet / Solana Wallet Adapter

- **Context**: 要件 1 のウォレット接続実装手段の調査
- **Sources Consulted**:
  - https://solana.com/developers/cookbook/wallets/connect-wallet-react
  - https://www.npmjs.com/package/@solana/wallet-adapter-phantom
  - https://medium.com/solana-development-magazine/solana-wallet-adapter-react-2025-update-7d3bbadf07b9
- **Findings**:
  - 必要パッケージ: `@solana/web3.js`, `@solana/wallet-adapter-base`, `@solana/wallet-adapter-react`, `@solana/wallet-adapter-react-ui`, `@solana/wallet-adapter-wallets`
  - Provider 3 層: ConnectionProvider（RPC エンドポイント）→ WalletProvider（ウォレット状態）→ WalletModalProvider（UI）
  - `autoConnect: true` でセッション再接続を自動化
  - `useWallet()` フックで `publicKey`, `connected`, `signAndSendTransaction`, `disconnect` を取得
  - `useConnection()` フックで `Connection` オブジェクトを取得
- **Implications**: 既存の `main.tsx` に Provider 注入が必要。`App.tsx` の `useChat` はウォレット接続後のみ有効化する

### トピック 2: Mastra Vercel Deployment

- **Context**: 要件 8 のデプロイ戦略の確認
- **Sources Consulted**:
  - https://mastra.ai/guides/deployment/vercel
  - https://mastra.ai/docs/deployment/serverless-platforms
- **Findings**:
  - パッケージ: `@mastra/deployer-vercel`
  - `new VercelDeployer()` を `Mastra({ deployer })` に渡すだけでデプロイ設定完了
  - ビルドコマンド: `mastra build`（package.json scripts に追加）
  - **エフェメラルファイルシステム**: `file:./mastra.db`（LibSQL ローカル）は使用不可 → Turso Cloud の libsql URL に変更が必要
  - `studio: true` オプションで Mastra Studio も Vercel にデプロイ可能
  - 環境変数で API キーと RPC URL を管理
- **Implications**: `src/mastra/index.ts` の `LibSQLStore` の URL を `MASTRA_LIBSQL_URL` 環境変数経由に変更。DuckDB (observability) は Vercel 非対応のため、Vercel 向けには Cloud Exporter のみ使用

### トピック 3: Jupiter v6 Swap API

- **Context**: 要件 5.4 の DeFi スワップツール実装の調査
- **Sources Consulted**:
  - https://developers.jup.ag/docs/ultra
  - https://dev.jup.ag/api-reference
  - https://hub.jup.ag/docs/apis/swap-api
- **Findings**:
  - Jupiter v6 Swap API の流れ: `/quote` → `/swap` → シリアライズ済みトランザクション
  - Ultra Swap API: RPC レスでガスレス、自動スリッページ最適化付き（2026 現在の推奨）
  - エンドポイント: `https://quote-api.jup.ag/v6/quote` と `https://quote-api.jup.ag/v6/swap`
  - Mastra ツールはトランザクションを構築して返却するのみ。署名は Frontend 側で Phantom SDK が担当
  - Rate limit: ビリング設定が必要（2026 年 6 月までは旧ポータルユーザーは無料）
- **Implications**: Agent ツールは「シリアライズされた Base64 トランザクション」を返す。Frontend がそれを Phantom の `signAndSendTransaction` に渡す

### トピック 4: Metaplex DAS API（NFT 取得）

- **Context**: 要件 3.4 の NFT 一覧取得の調査
- **Sources Consulted**:
  - https://developers.metaplex.com/dev-tools/das-api/guides/get-nfts-by-owner
  - https://github.com/metaplex-foundation/digital-asset-standard-api
- **Findings**:
  - メソッド: `getAssetsByOwner({ ownerAddress, limit, page })`
  - パッケージ: `@metaplex-foundation/digital-asset-standard-api` + `@metaplex-foundation/umi`
  - DevNet RPC が DAS API をサポートする必要がある（QuickNode / Helius の DevNet エンドポイントが対応）
  - 返却値: `DasApiAsset[]` に `name`, `image` (url), `id` (mint address) などが含まれる
  - DevNet 上ではテスト NFT が少ないため、デモ用にはデモ用ウォレットへの事前 mint が推奨
- **Implications**: Solana 公式無料 DevNet RPC はDAS API非対応の可能性あり → QuickNode or Helius の無料枠 DevNet エンドポイントを `VITE_SOLANA_RPC_URL` に設定する

---

## Architecture Pattern Evaluation

| オプション | 説明 | 強み | リスク | 採用判断 |
|---|---|---|---|---|
| 単一コンポーネント拡張 (Option A) | App.tsx に全機能追加 | 最小ファイル数 | 責務混在・保守困難 | 不採用 |
| 全新規コンポーネント (Option B) | 完全分離した新コンポーネント群 | 明確な責務分離 | 既存資産の活用不足 | 部分採用 |
| ハイブリッド (Option C) | 既存 AI Elements 再利用 + Solana 専用新規 | バランス良好・段階実装可能 | フェーズ間の調整コスト | **採用** |
| Layered Architecture | Presentation / State / Integration / External の 4 層 | テスト容易性・型安全性 | — | **採用** |

---

## Design Decisions

### Decision: ウォレット接続ライブラリの選定

- **Context**: 要件 1 — Phantom Connect + ソーシャルログイン対応
- **Alternatives Considered**:
  1. `@phantom/wallet-sdk` — Phantom 独自 SDK（最新だが他ウォレット非対応）
  2. `@solana/wallet-adapter-react` — エコシステム標準（Phantom, Backpack, Solflare 等対応）
  3. Dynamic.xyz / Privy — ソーシャルログイン特化（別 SDK 追加が必要）
- **Selected Approach**: `@solana/wallet-adapter-react` を基盤とし、ソーシャルログインは Privy の Embedded Wallet オプションで追加（Phase 2 機能）
- **Rationale**: BootCamp デモの主要ユースケースは Phantom Connect。Privy は追加の wrapper SDK として後から導入できる設計にする
- **Trade-offs**: Privy 統合の複雑度増加 vs 純 Phantom ユーザーへの即時対応
- **Follow-up**: Privy の Solana DevNet サポートを実装時に確認

### Decision: トランザクションコールバックパターン

- **Context**: 要件 4.6 — Agent がトランザクション構築 → Frontend が署名 → Agent に結果フィードバック
- **Alternatives Considered**:
  1. Mastra の Human-in-the-loop (approval) パターン — `confirmation.tsx` 活用
  2. Frontend が useChat でフォローアップメッセージを送信 — シンプル
  3. 専用コールバック API エンドポイント — 複雑
- **Selected Approach**: オプション 2 を採用。ツールが `{ type: "solana_tx_request", serializedTx: string }` を返し、Frontend がそれを検出して TransactionCard を表示。署名完了後 useChat 経由でフォローアップメッセージ送信
- **Rationale**: 既存の `useChat` + `DefaultChatTransport` の拡張のみで実装可能。Mastra の approval API は非同期ポーリングが必要で複雑
- **Trade-offs**: シンプルさ優先 vs Mastra ネイティブ機能の未活用
- **Follow-up**: ツールの返却型に `type` discriminated union を定義してフロントエンドの型安全を確保

### Decision: Vercel 向けストレージ

- **Context**: 要件 8 — Vercel デプロイ時の LibSQL ローカルファイル制約
- **Alternatives Considered**:
  1. LibSQL ローカル (`file:./mastra.db`) — 開発時のみ使用可能
  2. Turso Cloud — LibSQL のクラウドサービス、本番 URL
  3. PostgreSQL (Neon) — Mastra の PostgreSQL アダプター
- **Selected Approach**: 開発時は `file:` URL、本番 (Vercel) は `MASTRA_LIBSQL_URL` 環境変数で Turso Cloud URL を指定
- **Rationale**: Mastra のデフォルトストレージが LibSQL ベース。Turso は無料枠あり、移行コスト最小
- **Follow-up**: DuckDB (observability) は Vercel 非対応のため本番では Cloud Exporter のみ使用

### Decision: CSS デザインテーマ

- **Context**: 要件 6 — Solana ブランドカラー + Apple HIG
- **Alternatives Considered**:
  1. 既存 `index.css` の CSS Custom Properties を上書き
  2. Tailwind テーマ拡張 (`tailwind.config.js`)
  3. CSS Module per component
- **Selected Approach**: `index.css` の `:root` / `.dark` 変数を Solana ブランドカラーに全面更新
- **Rationale**: Tailwind CSS v4 は CSS-first 設定。`@theme` ブロックで変数を定義すれば全コンポーネントに自動適用される

---

## Risks & Mitigations

- **DevNet RPC が DAS API 非対応** — QuickNode/Helius の無料 DevNet エンドポイントを `VITE_SOLANA_RPC_URL` に設定してリスク回避
- **Vercel の DuckDB 非対応** — 本番は Cloud Exporter のみ使用、開発時は DefaultExporter 追加
- **Jupiter Rate Limit** — デモ用途では無料枠で十分だが、本番前にビリング設定が必要
- **Privy ソーシャルログインの複雑度** — Phase 1 では Phantom のみ対応とし、Phase 2 で Privy 追加
- **LibSQL ローカル → Turso 移行** — 環境変数による切り替えで開発/本番の差異を最小化

---

## References

- [@solana/wallet-adapter-react 公式ドキュメント](https://solana.com/developers/cookbook/wallets/connect-wallet-react)
- [Mastra Vercel Deployment Guide](https://mastra.ai/guides/deployment/vercel)
- [Jupiter v6 Ultra Swap API](https://developers.jup.ag/docs/ultra)
- [Metaplex DAS API getAssetsByOwner](https://developers.metaplex.com/dev-tools/das-api/guides/get-nfts-by-owner)
- [Mastra Serverless Deployment](https://mastra.ai/docs/deployment/serverless-platforms)
