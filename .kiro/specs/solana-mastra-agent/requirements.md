# 要件定義書 — Solana Mastra AI Agent アプリ

## はじめに

本ドキュメントは、Solana Superteam Japan 主催の Solana BootCamp 向けに開発する **AI Agent アプリ** の要件を定義します。

本アプリは、React・Mastra・TypeScript・Phantom Connect・Solana SDK を用いて、ユーザーが自然言語で Solana ブロックチェーン上の資産管理・NFT 発行・送金・スマートコントラクト呼び出しを行えるチャット型 AI Agent アプリです。すべてのトランザクション署名はユーザーの意志に基づいて行われ、AI Agent が代わりに署名することはありません。対象ネットワークは Solana DevNet です。

---

## 要件一覧

### 要件 1: ウォレット接続・認証

**目的:** Solana ユーザーとして、Phantom ウォレットまたはソーシャルログインでアプリに接続できるようにしたい。そうすることで、ブロックチェーン操作の起点となる安全なセッションを確立できる。

#### 受け入れ基準

1. When ユーザーがアプリを初回起動したとき、the Solana AI Agent App shall ウォレット未接続状態を検知し、画面中央にウォレット接続ボタンを表示する。
2. When ユーザーがウォレット接続ボタンをクリックしたとき、the Solana AI Agent App shall Phantom Connect SDK を通じてウォレット接続フローを起動する。
3. Where ソーシャルログイン機能が有効な場合、the Solana AI Agent App shall Google・Twitter・Discord などのソーシャルプロバイダーによるウォレット作成・接続オプションを提供する。
4. When ウォレット接続が成功したとき、the Solana AI Agent App shall 接続済みウォレットアドレスとネットワーク（DevNet）をヘッダーまたはステータスバーに表示する。
5. If ウォレット接続が失敗または拒否されたとき、the Solana AI Agent App shall エラーメッセージを表示し、再接続オプションを提供する。
6. While ウォレットが未接続の状態、the Solana AI Agent App shall チャットインターフェースへのアクセスを無効化し、ユーザーに接続を促すメッセージを表示する。
7. When ユーザーがウォレットを切断したとき、the Solana AI Agent App shall セッションをクリアし、接続前の初期画面に戻る。

---

### 要件 2: チャット UI とエージェントインタラクション

**目的:** ユーザーとして、自然言語でチャット形式の AI Agent と会話し、Solana の情報取得やブロックチェーン操作の指示ができるようにしたい。そうすることで、専門知識なしに Solana を活用できる。

#### 受け入れ基準

1. The Solana AI Agent App shall Solana らしいカラースキームと Apple Design Guidelines に準拠した、従来の ChatGPT 型チャットとは差別化された革新的なチャット UI を提供する。
2. When ウォレット接続済みのユーザーがメッセージを送信したとき、the Solana AI Agent App shall Mastra Agent に自然言語メッセージを転送し、応答を受信してチャット画面に表示する。
3. The Solana AI Agent App shall ユーザーメッセージとエージェント応答を視覚的に区別して表示する。
4. While Mastra Agent が応答を処理している間、the Solana AI Agent App shall タイピングインジケーターまたはローディング表示を行う。
5. If ネットワークエラーまたはエージェントのタイムアウトが発生したとき、the Solana AI Agent App shall エラーメッセージをチャット内に表示し、再送信オプションを提供する。
6. The Solana AI Agent App shall チャット履歴をセッション中保持し、スクロールで過去の会話を参照できるようにする。
7. When ユーザーが Solana に関する情報（残高・トランザクション履歴・NFT情報・DeFi プロトコル情報など）を尋ねたとき、the Mastra Agent shall Solana RPC または関連 API を通じて情報を取得し、わかりやすく整形して返答する。

---

### 要件 3: SOL 残高と NFT 保有状況の表示

**目的:** ユーザーとして、接続したウォレットの SOL 残高と保有 NFT を一目で確認したい。そうすることで、現在の資産状況を把握しながら操作を行える。

#### 受け入れ基準

1. When ウォレット接続が完了したとき、the Solana AI Agent App shall 接続ウォレットの SOL 残高を DevNet から取得してサイドバーまたはヘッダーエリアに表示する。
2. The Solana AI Agent App shall SOL 残高を SOL 単位で小数点 4 桁まで表示する。
3. When ユーザーが残高の更新を要求したとき、または定期更新タイミングが到来したとき、the Solana AI Agent App shall DevNet から最新残高を再取得して画面を更新する。
4. When ウォレット接続が完了したとき、the Solana AI Agent App shall 接続ウォレットが保有する NFT の一覧（サムネイル・名称）を表示する。
5. If NFT が 0 件の場合、the Solana AI Agent App shall 「NFTなし」などの空状態メッセージを表示する。
6. The Solana AI Agent App shall 残高・NFT 表示エリアとチャットエリアを視覚的に分離して同時に確認できるレイアウトを提供する。

---

### 要件 4: トランザクション構築とユーザー署名フロー

**目的:** ユーザーとして、自然言語で送金・NFT 操作・DeFi 取引を指示し、AI Agent がトランザクションを構築した上で、最終的な署名と送信を自分の意志で行いたい。そうすることで、誤操作やセキュリティリスクなしにブロックチェーン操作を実行できる。

#### 受け入れ基準

1. When ユーザーが送金・NFT 発行・DeFi 取引など署名を要するアクションを依頼したとき、the Mastra Agent shall トランザクションデータを構築し、署名依頼メッセージとともにトランザクション詳細をチャット内に表示する。
2. The Solana AI Agent App shall Mastra Agent がユーザーに代わってトランザクションに署名することを禁止する。
3. When Mastra Agent がトランザクション署名依頼を提示したとき、the Solana AI Agent App shall Phantom Wallet の署名 API を呼び出すための「署名・送信」ボタンをチャット内に表示する。
4. When ユーザーが「署名・送信」ボタンをクリックしたとき、the Solana AI Agent App shall Phantom Connect SDK の signAndSendTransaction を呼び出し、ユーザーウォレットによる署名確認画面を表示する。
5. If ユーザーが署名を拒否したとき、the Solana AI Agent App shall トランザクションをキャンセルし、キャンセルメッセージをチャットに表示する。
6. When トランザクションが Solana ネットワークに送信されて結果が返ってきたとき、the Solana AI Agent App shall トランザクション結果（成功・失敗・署名ハッシュ）を Mastra Agent に渡し、エージェントが結果をわかりやすく解説したメッセージをチャットに表示する。
7. When トランザクションが成功したとき、the Solana AI Agent App shall SOL 残高と NFT 表示を自動更新する。
8. If トランザクション送信中にネットワークエラーが発生したとき、the Solana AI Agent App shall エラー詳細をチャットに表示し、再試行オプションを提供する。

---

### 要件 5: Mastra Agent の機能・ツール

**目的:** 開発者として、Mastra Agent に適切なツールと説明を定義し、ユーザーの自然言語指示に対して正確なブロックチェーン操作を実行できる AI Agent を構築したい。

#### 受け入れ基準

1. The Mastra Agent shall Solana RPC を通じて残高照会・トランザクション履歴・アカウント情報を取得するツールを持つ。
2. The Mastra Agent shall SOL 送金トランザクションを構築するツールを持つ。
3. The Mastra Agent shall Metaplex SDK を使用して NFT 発行・転送・メタデータ取得を行うトランザクションを構築するツールを持つ。
4. The Mastra Agent shall DeFi プロトコル（Jupiter 等）を通じたトークンスワップトランザクションを構築するツールを持つ。
5. The Mastra Agent shall Solana スマートコントラクト（Program）の呼び出しトランザクションを構築するツールを持つ。
6. The Mastra Agent shall description フィールドに各ツールの目的・入出力・使用シナリオを丁寧かつ詳細に記述する。
7. The Mastra Agent shall Solana Agent SKILL を Mastra の workspace 機能を通じて活用する。
8. When トランザクション結果のコールバックを受け取ったとき、the Mastra Agent shall 実行結果（成功・失敗・ガス費用・トランザクションリンク等）を日本語でわかりやすく解説する。

---

### 要件 6: デザインと UI/UX

**目的:** ユーザーとして、Solana らしい洗練されたデザインの UI を通じて AI Agent を操作したい。そうすることで、BootCamp の聴衆に印象的なデモンストレーションを提供できる。

#### 受け入れ基準

1. The Solana AI Agent App shall Solana 公式ブランドのグラデーション（パープル・グリーン・シアン系）を基調としたカラースキームを採用する。
2. The Solana AI Agent App shall Apple Human Interface Guidelines に準拠したタイポグラフィ・余白・コンポーネント設計を採用する。
3. The Solana AI Agent App shall 汎用的な「AI チャットツール」に見えない独自のビジュアルデザインを採用し、文言・アイコン・レイアウトから生成 AI ツールらしさを排除する。
4. The Solana AI Agent App shall モバイルとデスクトップの両方で適切に表示されるレスポンシブレイアウトを提供する。
5. The Solana AI Agent App shall アニメーションとトランジションを用いてスムーズで洗練されたインタラクションを実現する。
6. Where Pencil MCP が利用可能な場合、the Solana AI Agent App shall Pencil MCP を使用してデザイン検討・プロトタイピングを行った上で実装に進む。

---

### 要件 7: Solana DevNet 対応

**目的:** 開発者として、アプリが Solana DevNet 上で正常に動作することを確認したい。そうすることで、メインネット費用なしにデモや開発を行える。

#### 受け入れ基準

1. The Solana AI Agent App shall すべてのブロックチェーン操作を Solana DevNet エンドポイントに向けて実行する。
2. The Solana AI Agent App shall 接続中のネットワークが DevNet であることをユーザーに常時表示する。
3. When ユーザーが DevNet SOL の取得（エアドロップ）を要求したとき、the Mastra Agent shall Solana DevNet の airdrop API を通じて SOL をリクエストするトランザクションを生成または直接実行する。
4. If ウォレットが DevNet 以外のネットワークに接続されている場合、the Solana AI Agent App shall ネットワーク不一致を警告し、DevNet への切り替えをユーザーに促す。

---

### 要件 8: デプロイとパフォーマンス

**目的:** 開発者として、アプリを Vercel にデプロイし、BootCamp 参加者が URL にアクセスするだけで即座に体験できるようにしたい。

#### 受け入れ基準

1. The Solana AI Agent App shall Vercel にデプロイ可能な構成であり、環境変数を通じて API キーや RPC エンドポイントを管理する。
2. The Solana AI Agent App shall 初回ページロードを 3 秒以内に完了する（Vercel Edge Network 経由）。
3. The Solana AI Agent App shall bun をパッケージマネージャーとして使用し、biome をリンター・フォーマッターとして使用する。
4. If 環境変数が未設定の状態でビルドが実行された場合、the Solana AI Agent App shall ビルドエラーまたは起動時警告を出力して不正な設定での運用を防ぐ。
5. The Solana AI Agent App shall Mastra Agent バックエンドと React フロントエンドが同一リポジトリ（`mastra-react` ディレクトリ）内に共存し、Vercel の monorepo 構成でデプロイされる。
