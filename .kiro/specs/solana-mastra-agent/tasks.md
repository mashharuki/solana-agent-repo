# 実装タスクリスト — Solana Mastra AI Agent アプリ

## Task 1. 基盤セットアップ

- [x] 1.1 Solana 共有型定義ファイルの作成
  - `SolanaTxRequest`（discriminated union）、`SolanaError`、`NFTAsset`、`TransactionSignResult` など、Frontend と Mastra ツール間で共有する型をひとつのファイルに定義する
  - Mastra ツールからは Vite `@` エイリアスを使わず相対パスでインポートできるよう、ファイルの配置場所を設計書の規約に従って決定する
  - Zod スキーマと TypeScript 型の両方を定義し、ツール入力バリデーションに再利用できるようにする
  - _Requirements: 4.1, 5.1, 5.2, 5.3, 5.4, 5.5, 8.3_

- [x] 1.2 開発環境と API パスの統一設定
  - Vite dev server に `/api` プロキシを設定し、フロントエンドからの API リクエストを Mastra サーバー（ポート 4111）に転送できるようにする
  - Mastra の chatRoute パスを `/api/chat/:agentId` に変更して、開発時と Vercel 本番で同一 URL を使用できるようにする
  - `bun dev` でフロントエンドと Mastra サーバーを同時起動する手順を確認する
  - _Requirements: 8.3, 8.5_

- [x] 1.3 Solana 関連パッケージの追加
  - `@solana/web3.js`、`@solana/wallet-adapter-react`、`@solana/wallet-adapter-phantom`、`@solana/wallet-adapter-react-ui`、`@solana/wallet-adapter-base` を追加する
  - `@metaplex-foundation/umi`、`@metaplex-foundation/digital-asset-standard-api` を追加する
  - `@mastra/deployer-vercel` を追加する
  - TypeScript の型エラーが出ないことを `tsc --noEmit` で確認する
  - _Requirements: 1.2, 3.4, 8.1, 8.3_

## Task 2. ウォレット接続レイヤー

- [x] 2.1 Solana Wallet Adapter Provider の統合
  - アプリのエントリポイントに ConnectionProvider・WalletProvider・WalletModalProvider の 3 層を追加し、DevNet RPC URL を環境変数から読み込む
  - `autoConnect: true` を設定し、ページリロード後もウォレット接続が維持されるようにする
  - 環境変数 `VITE_SOLANA_RPC_URL` が未設定の場合に起動時エラーを表示する仕組みを加える
  - _Requirements: 1.2, 1.3, 7.1_

- [x] 2.2 ウォレット未接続時の接続画面の実装
  - ウォレット接続状態を監視し、未接続時は画面中央にウォレット接続ボタンを表示する画面を実装する
  - Phantom で接続ボタンのクリックで Wallet Adapter の接続フローを起動する
  - 接続中はローディングインジケーターを表示し、接続失敗時はエラーメッセージと再試行ボタンを表示する
  - ウォレット未接続の間はチャット画面へのアクセスをブロックする
  - _Requirements: 1.1, 1.2, 1.5, 1.6_

- [x] 2.3 ウォレット接続済みヘッダーの実装
  - 接続済みウォレットの公開鍵アドレス（先頭 4 文字 + 末尾 4 文字の省略表示）を表示する
  - 接続ネットワークが DevNet であることを常時表示するバッジを加える
  - ウォレット切断ボタンを実装し、クリックで接続をクリアして接続前の画面に戻る
  - _Requirements: 1.4, 1.7, 7.2_

- [x] 2.4 DevNet ネットワーク不一致の検知と警告
  - 接続ウォレットのネットワークが DevNet 以外の場合に警告バナーを表示する
  - ユーザーに Phantom の設定を DevNet に切り替えるよう案内するメッセージを表示する
  - _Requirements: 1.5, 7.4_

## Task 3. 資産表示レイヤー

- [x] 3.1 (P) SOL 残高取得フックの実装
  - ウォレット接続後に自動で SOL 残高を取得し、30 秒間隔で最新値にポーリング更新するフックを実装する
  - 手動更新用の `refetch` 関数を提供し、トランザクション成功時に呼び出せるようにする
  - 残高を SOL 単位（小数点 4 桁）で返し、ローディング状態とエラー状態も返す
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3.2 (P) NFT 一覧取得フックの実装
  - Metaplex DAS API の `getAssetsByOwner` を使って接続ウォレットが保有する NFT 一覧を取得するフックを実装する
  - NFT のサムネイル URL・名称・mint アドレスを返し、取得できない場合は空配列を返す
  - DAS API 非対応 RPC の場合のフォールバック（NFTなし表示）を実装する
  - _Requirements: 3.4, 3.5_

- [x] 3.3 資産パネル（残高・NFT 表示）UI の実装
  - SOL 残高をサイドバーまたはヘッダーエリアに表示し、残高ゼロや未取得状態を明確に区別して表示する
  - 保有 NFT のサムネイルと名称を一覧表示するグリッドコンポーネントを実装する
  - NFT が 0 件の場合は空状態メッセージを表示する
  - 残高表示エリアとチャットエリアが並べて確認できるレイアウトにする
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

## Task 4. Mastra Solana エージェントの基盤

- [x] 4.1 solanaAgent の定義と既存エージェントの置き換え
  - weatherAgent を削除し、Solana 専用エージェントを新たに定義する
  - エージェントの System Prompt に Solana DevNet の操作説明・日本語での応答指示・絶対にトランザクションを自己署名しない旨を丁寧かつ詳細に記述する
  - エージェント ID を `solana-agent` に設定し、chatRoute のエンドポイントと一致させる
  - Mastra インスタンスの agents 登録を更新する
  - _Requirements: 5.6, 5.8, 2.7_

- [x] 4.2 Mastra ストレージと Vercel デプロイ設定の更新
  - LibSQL ストレージの URL を環境変数から読み込み、開発時はローカルファイル、本番は Turso Cloud URL を使用できるようにする
  - `VercelDeployer` を Mastra インスタンスに追加し、`mastra build` コマンドで Vercel 向けのビルドが通ることを確認する
  - Vercel 本番では DuckDB が使用できないため、Observability の Exporter を環境に応じて切り替える設定を加える
  - _Requirements: 8.1, 8.4, 8.5_

## Task 5. Solana ツール群の実装

- [x] 5.1 (P) 残高照会ツールの実装
  - 指定アドレスの SOL 残高を Solana DevNet RPC から取得して返すツールを実装する
  - Zod スキーマで入力アドレスの形式（base58 公開鍵）を検証し、不正値はエラーを返す
  - ツールの `description` に目的・入力パラメータ・使用シナリオを日本語・英語で丁寧に記述する
  - _Requirements: 5.1, 5.6_

- [x] 5.2 (P) SOL 送金トランザクション構築ツールの実装
  - 送金元アドレス・送金先アドレス・送金額（SOL 単位）を受け取り、シリアライズされた送金トランザクションを返すツールを実装する
  - 返却値は `SolanaTxRequest` 型（`type: "solana_tx_request"`）に準拠させる
  - 残高不足の場合は `INSUFFICIENT_BALANCE` エラーを返す
  - _Requirements: 5.2, 5.6, 4.1_

- [x] 5.3 (P) NFT 取得・発行トランザクション構築ツールの実装
  - 指定ウォレットが保有する NFT 一覧を Metaplex DAS API 経由で取得するツールを実装する
  - NFT 発行（mint）のパラメータ（名称・シンボル・メタデータ URI・ロイヤリティ）を受け取り、発行トランザクションを構築して返すツールを実装する
  - 両ツールの `description` に Metaplex NFT の概念・入力パラメータを詳細に記述する
  - _Requirements: 5.3, 5.6_

- [x] 5.4 (P) Jupiter スワップトランザクション構築ツールの実装
  - 入出力トークンの mint アドレス・スワップ量・スリッページを受け取り、Jupiter v6 Quote API でレート取得後にスワップトランザクションを構築して返すツールを実装する
  - 返却値は `SolanaTxRequest` 型に準拠させ、スワップ内容の人間向け説明を `description` フィールドに含める
  - _Requirements: 5.4, 5.6_

- [x] 5.5 (P) DevNet エアドロップツールの実装
  - 指定アドレスに DevNet SOL をエアドロップするツールを実装する（最大 2 SOL / リクエスト）
  - エアドロップ成功時はトランザクション署名を返し、エラー時は `RPC_ERROR` を返す
  - ツールの説明に DevNet 専用である旨を明記する
  - _Requirements: 5.1, 5.6, 7.3_

- [x] 5.6 (P) スマートコントラクト呼び出しトランザクション構築ツールの実装
  - Program ID・インストラクションデータ（Base64）・アカウントリストを受け取り、Program 呼び出しトランザクションを構築して `SolanaTxRequest` 型で返すツールを実装する
  - ツールの `description` に汎用 Program 呼び出しの概念・使用例を詳しく記述する
  - _Requirements: 5.5, 5.6_

- [x] 5.7 Solana Agent SKILL の workspace 統合
  - Mastra の workspace 機能を使って Solana Agent SKILL をエージェントに統合する
  - SKILL が提供する追加ツールや知識がエージェントから利用できることを確認する
  - _Requirements: 5.7_

## Task 6. トランザクション署名 UI

- [ ] 6.1 チャット内トランザクションカードの実装
  - Agent のツール実行結果に `type: "solana_tx_request"` が含まれる場合、チャット内にトランザクション詳細（種別・説明・送金先/金額など）を表示するカードコンポーネントを実装する
  - 「署名・送信」ボタンをクリックすると Phantom SDK の署名確認ダイアログを呼び出す
  - 署名待ち中はプロンプト入力を無効化し、ユーザーへの案内テキストを表示する
  - 署名完了後はカードを結果表示に切り替え、プロンプト入力を再有効化する
  - _Requirements: 4.2, 4.3, 4.4_

- [ ] 6.2 署名キャンセル・エラー・タイムアウト処理の実装
  - ユーザーが署名を拒否した場合はキャンセルメッセージをチャットに追加し、pendingTxRequest をリセットする
  - 署名待ち状態が 120 秒を超えた場合は自動キャンセルし、タイムアウトメッセージを表示する
  - Phantom 拡張機能のロック・残高不足・ネットワークエラーなど各エラーに応じた日本語メッセージを表示する
  - _Requirements: 4.5, 4.8_

- [ ] 6.3 署名後のトランザクション結果表示とコールバックの実装
  - トランザクション送信が成功した場合、署名ハッシュと Solana Explorer (DevNet) へのリンクをチャット内に表示する
  - 署名結果（成功 or 失敗・署名ハッシュ）を useChat 経由でフォローアップメッセージとして Agent に送信する
  - Agent が結果を受け取り日本語で解説したメッセージを表示する
  - トランザクション成功後に SOL 残高と NFT 一覧を自動更新する
  - _Requirements: 4.6, 4.7, 4.8_

## Task 7. チャット UI と Agent 統合

- [ ] 7.1 メインチャット画面の Solana Agent 統合
  - 既存の App.tsx を Solana Agent エンドポイント（`/api/chat/solana-agent`）に接続したチャット画面に置き換える
  - ウォレット未接続状態ではメッセージ送信をブロックし、接続を促すメッセージを表示する
  - Agent 応答のストリーミング表示、ローディングインジケーター、エラーメッセージのチャット内表示を実装する
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 7.2 ToolResult からの TransactionCard 検出レンダリング
  - チャットメッセージのパーツを走査し、ツール実行結果に `type: "solana_tx_request"` が含まれる場合に TransactionCard をレンダリングするロジックを実装する
  - すでに署名待ちのトランザクションが存在する場合、後続の tx リクエストは無視して Agent にその旨を通知する
  - Solana 情報取得（残高・NFT 等）のツール結果はそのままテキスト形式で表示する
  - _Requirements: 2.2, 2.7, 4.1, 4.2_

## Task 8. Solana デザインテーマの実装

- [ ] 8.1 (P) CSS カスタムプロパティの Solana ブランドカラーへの更新
  - 既存の CSS Custom Properties（`:root` と `.dark`）を Solana 公式ブランドのグラデーション（パープル `#9945FF`・グリーン `#14F195`・シアン系）をベースにした配色に全面更新する
  - primary・secondary・accent・background など主要なデザイントークンを Solana ブランドに合わせて定義する
  - Apple Human Interface Guidelines に準拠した余白スケールとタイポグラフィスケールを Tailwind テーマに設定する
  - _Requirements: 6.1, 6.2_

- [ ] 8.2 (P) チャット UI の独自デザイン実装
  - 既存の Conversation・Message・PromptInput コンポーネントに Solana テーマのスタイルを適用し、汎用的な「AI チャットツール」に見えないデザインにする
  - 文言・アイコン・レイアウトから生成 AI ツールらしさを排除し、Solana ブロックチェーンアプリとしての独自 UX を表現する
  - モバイルとデスクトップの両方で適切に表示されるレスポンシブレイアウトを確認する
  - _Requirements: 6.3, 6.4_

- [ ] 8.3 (P) アニメーションとトランジションの実装
  - ウォレット接続画面→チャット画面の遷移アニメーションを motion ライブラリで実装する
  - TransactionCard の表示/非表示アニメーションを実装する
  - Agent 応答のストリーミング表示をスムーズに見せるアニメーションを加える
  - _Requirements: 6.5_

## Task 9. 環境設定と統合テスト

- [ ] 9.1 環境変数のセットアップと起動時バリデーション
  - `.env.example` を更新し、必要な環境変数（`VITE_SOLANA_RPC_URL`、`VITE_SOLANA_NETWORK`、`MASTRA_LIBSQL_URL`、LLM API キー等）をすべて記載する
  - 必須環境変数が未設定の場合にアプリ起動時またはビルド時に明確なエラーを出力する仕組みを実装する
  - _Requirements: 8.1, 8.4_

- [ ] 9.2 ウォレット接続から署名フローまでの統合テスト
  - Phantom ウォレット（DevNet）を接続し、SOL 残高と NFT 一覧が正常に表示されることを確認する
  - 「残高を教えて」などの情報取得メッセージに Agent が正常応答することを確認する
  - DevNet エアドロップを依頼し、残高が増加することを確認する
  - 送金トランザクションの依頼から TransactionCard 表示・署名・結果表示・Agent の解説までの一連のフローを確認する
  - _Requirements: 1.1, 1.4, 2.2, 3.1, 3.4, 4.3, 4.6, 7.3_

- [ ]* 9.3 ユニットテストとコンポーネントテストの実装
  - `useSolanaBalance` と `useNFTs` フックのモック RPC レスポンスを使ったユニットテストを実装する
  - `WalletGate` の接続状態による画面分岐テストを実装する
  - `transferSolTool` と `jupiterSwapTool` の入力スキーマバリデーションおよび `SolanaTxRequest` 返却形式テストを実装する
  - _Requirements: 1.1, 1.6, 3.1, 4.1, 5.2, 5.4_
