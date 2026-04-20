# Solana AI Agent — AWS CDK 実装計画

> **目的**: Mastra + React で構築した Solana AI Agent を AWS にサーバーレスデプロイする
> **環境**: 検証・学習用（Solana DevNet）
> **言語**: TypeScript (CDK v2)
> **アーキテクチャ図**: [aws-architecture.drawio](./aws-architecture.drawio)

---

## 1. サービス選定とアーキテクチャ概要

### 1.1 全体構成

```
User (Browser + Phantom Wallet)
  │
  ▼ HTTPS
CloudFront ─── OAC ──→ S3 (React SPA)
  │
  │ /chat/*
  ▼
API Gateway (HTTP API v2)
  │
  ├──→ Bedrock AgentCore (Mastra Runtime)  ← メイン
  │       ├──→ Amazon Bedrock (Foundation Model)
  │       ├──→ Solana DevNet (RPC)
  │       ├──→ DynamoDB (Memory / Sessions)
  │       └──→ Secrets Manager (API Keys)
  │
  └──→ Lambda (Fallback / Pre-processing)  ← 補助
          └──→ CloudWatch (Logs)
```

### 1.2 サービス選定一覧

| レイヤー | サービス | 選定理由 |
|---------|---------|---------|
| **CDN** | CloudFront | グローバルCDN。S3 OACで安全な配信。API Gatewayへのルーティングも単一ドメインで統合可能 |
| **フロントエンド** | S3 | Vite ビルド成果物の静的ホスティング。BucketDeployment で CI/CD なしでも即デプロイ |
| **API ルーティング** | API Gateway HTTP API (v2) | REST API より低コスト・低レイテンシ。JWT認証対応。WebSocket は必要に応じて別途追加 |
| **Agent ランタイム** | Bedrock AgentCore | Mastra フレームワークのマネージド実行環境。Memory管理・ツール実行・セッション管理をビルトインで提供 |
| **LLM** | Amazon Bedrock | Claude / Gemini 等の Foundation Model をマネージドで利用。現行の Google AI API からの移行先 |
| **ストレージ** | DynamoDB | AgentCore のメモリ・セッション永続化。PAY_PER_REQUEST で検証コスト最小化 |
| **シークレット** | Secrets Manager | API キー（LLM、Solana RPC等）の安全な管理 |
| **監視** | CloudWatch + X-Ray | ログ集約・メトリクス・分散トレーシング |
| **Fallback** | Lambda | AgentCore CDK未対応時のフォールバック、またはリクエスト前処理用 |
| **セキュリティ** | WAF (Optional) | CloudFront に付与。検証環境では省略可 |

### 1.3 代替案の検討

| 比較対象 | 不採用理由 |
|---------|-----------|
| ECS Fargate | Mastra サーバーをコンテナ化できるが、AgentCore の方がエージェント特化の管理機能を提供 |
| App Runner | 簡易コンテナホスティング。AgentCore が持つエージェント固有機能（Memory、Tool sandboxing等）がない |
| Lambda 単体 | コールドスタートが AI エージェントの長時間対話に不向き。タイムアウト制約（最大15分）もリスク |
| Vercel (現行) | 社内で AWS スキルを蓄積したい要件に合わない。CDKでのIaC管理ができない |

---

## 2. CDK スタック分割設計

検証・学習目的のため **3スタック構成** とする。小規模ではあるが、フロントエンド・バックエンド・ストレージのライフサイクルが異なるため分離する。

```
solana-agent-cdk/
├── bin/
│   └── app.ts                          # CDK App エントリーポイント
├── lib/
│   ├── stacks/
│   │   ├── frontend-stack.ts           # CloudFront + S3
│   │   ├── backend-stack.ts            # API Gateway + AgentCore + Lambda
│   │   └── storage-stack.ts            # DynamoDB + Secrets Manager
│   └── constructs/
│       ├── static-site.ts              # S3 + CloudFront + OAC カスタムコンストラクト
│       └── agent-runtime.ts            # AgentCore + IAM カスタムコンストラクト
├── test/
│   ├── frontend-stack.test.ts
│   ├── backend-stack.test.ts
│   └── storage-stack.test.ts
├── assets/
│   └── lambda/
│       └── proxy/                      # Lambda proxy ハンドラー
│           └── index.ts
├── cdk.json
├── tsconfig.json
└── package.json
```

### スタック依存関係

```
StorageStack  ←──  BackendStack  ←──  FrontendStack
 (DynamoDB,        (API Gateway,       (CloudFront,
  Secrets)          AgentCore,          S3,
                    Lambda)             OAC)
```

- **StorageStack** → 他スタックに依存しない（最初にデプロイ）
- **BackendStack** → StorageStack の DynamoDB テーブル ARN と Secrets ARN を参照
- **FrontendStack** → BackendStack の API Gateway URL を参照（CloudFront のカスタムオリジンに設定）

---

## 3. 各スタックの詳細設計

### 3.1 StorageStack

```typescript
// lib/stacks/storage-stack.ts
export interface StorageStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'prod';
}

// リソース:
// 1. DynamoDB テーブル (Agent Memory / Sessions)
//    - partitionKey: "sessionId" (S)
//    - sortKey: "timestamp" (N)
//    - billingMode: PAY_PER_REQUEST (検証向け)
//    - TTL: expiresAt
//    - removalPolicy: DESTROY (検証環境)
//
// 2. Secrets Manager シークレット
//    - GOOGLE_GENERATIVE_AI_API_KEY (現行LLM用、Bedrock移行後は不要)
//    - SOLANA_RPC_URL (DevNet)
//    - MASTRA_CLOUD_ACCESS_TOKEN (Optional)
//
// 出力:
//    - tableArn / tableName
//    - secretArn
```

**コスト見積もり（検証環境）:**
- DynamoDB PAY_PER_REQUEST: ほぼ無料（月数千リクエスト想定）
- Secrets Manager: $0.40/シークレット/月 × 2–3 = 約$1.20/月

### 3.2 BackendStack

```typescript
// lib/stacks/backend-stack.ts
export interface BackendStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'prod';
  memoryTable: dynamodb.ITable;
  apiKeySecret: secretsmanager.ISecret;
}

// リソース:
// 1. Bedrock AgentCore Agent
//    - runtime: Mastra
//    - framework: "mastra"
//    - agentCode: Mastra エージェントコード (src/mastra/)
//    - tools: getBalance, transferSol, mintNft, jupiterSwap, airdrop, callProgram
//    - memory: DynamoDB 連携
//    - IAM Role: Bedrock InvokeModel + DynamoDB R/W + Secrets Read
//
// 2. Lambda Function (Proxy / Fallback)
//    - NodejsFunction (esbuild バンドル)
//    - handler: リクエスト変換 + AgentCore Invoke
//    - timeout: 30s
//    - memorySize: 256MB
//    - environment: TABLE_NAME, SECRET_ARN
//
// 3. API Gateway HTTP API v2
//    - POST /chat/{agentId} → AgentCore / Lambda
//    - CORS: CloudFront ドメインのみ許可
//    - throttling: 100 req/s (検証環境)
//
// 出力:
//    - apiUrl (API Gateway エンドポイント)
//    - agentId (AgentCore Agent ID)
```

**AgentCore + Mastra の統合ポイント:**

現行のコードからの変更点：
```
現行: React → Vite Proxy → localhost:4111 (mastra dev) → Google AI
AWS:  React → CloudFront → API Gateway → AgentCore (Mastra) → Bedrock
```

| 現行 | AWS 移行後 |
|------|-----------|
| `@mastra/deployer-vercel` | AgentCore deployer (or CustomResource) |
| `google/gemini-3-flash-preview` | `amazon.nova-*` / `anthropic.claude-*` (Bedrock) |
| LibSQL (ローカル file DB) | DynamoDB |
| `process.env.GOOGLE_GENERATIVE_AI_API_KEY` | Secrets Manager → AgentCore 環境変数 |
| `chatRoute` on localhost:4111 | API Gateway → AgentCore endpoint |

### 3.3 FrontendStack

```typescript
// lib/stacks/frontend-stack.ts
export interface FrontendStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'prod';
  apiUrl: string;       // BackendStack からの API Gateway URL
  domainName?: string;  // カスタムドメイン (Optional)
}

// リソース:
// 1. S3 Bucket
//    - blockPublicAccess: BLOCK_ALL
//    - encryption: S3_MANAGED
//    - removalPolicy: DESTROY (検証環境)
//    - autoDeleteObjects: true (検証環境)
//
// 2. CloudFront Distribution
//    - defaultBehavior: S3 Origin (OAC)
//    - additionalBehaviors:
//        "/chat/*" → API Gateway Origin (HttpOrigin)
//    - defaultRootObject: "index.html"
//    - errorResponses: 403/404 → /index.html (SPA フォールバック)
//    - priceClass: PriceClass.PRICE_CLASS_100 (コスト最小化)
//    - geoRestriction: なし
//
// 3. BucketDeployment
//    - sources: [Source.asset('../mastra-react/dist')]  ← vite build 成果物
//    - distribution: CloudFront (キャッシュ無効化)
//
// 出力:
//    - distributionDomainName (CloudFront URL)
//    - distributionId
```

**CloudFront ルーティング設計:**

```
CloudFront Distribution
├── /* (Default)
│   └── Origin: S3 Bucket (OAC)
│       ├── /index.html
│       ├── /assets/*
│       └── /favicon.ico
│
└── /chat/* (Additional Behavior)
    └── Origin: API Gateway (HttpOrigin)
        ├── POST /chat/solana-agent
        └── OPTIONS /chat/* (CORS preflight)
```

---

## 4. セキュリティ設計

### 4.1 IAM 最小権限

```
AgentCore Role:
├── bedrock:InvokeModel (指定モデルのみ)
├── dynamodb:GetItem / PutItem / Query (指定テーブルのみ)
├── secretsmanager:GetSecretValue (指定シークレットのみ)
├── logs:CreateLogGroup / PutLogEvents (ログ出力)
└── xray:PutTraceSegments (トレーシング)

Lambda Role:
├── bedrock-agentcore:InvokeAgent (指定エージェントのみ)
├── logs:CreateLogGroup / PutLogEvents
└── xray:PutTraceSegments
```

### 4.2 ネットワークセキュリティ

- S3: パブリックアクセス完全ブロック、OAC 経由のみ
- API Gateway: CORS 制限（CloudFront ドメインのみ）
- Secrets Manager: IAM ポリシーで AgentCore ロールのみアクセス許可
- CloudFront: TLSv1.2 以上を強制

### 4.3 検証環境向けの補足

- WAF は検証段階では省略可（コスト $5/月〜）
- 認証は初期段階では省略し、後からCognitoを追加可能
- API throttling で異常トラフィックを遮断

---

## 5. Bedrock AgentCore 統合の詳細

### 5.1 AgentCore とは

Amazon Bedrock AgentCore は AI エージェントのマネージド実行環境で、以下を提供する：

- **Agent Runtime**: フレームワーク（Mastra, LangChain, CrewAI 等）のマネージド実行
- **Memory Management**: エージェントの会話履歴・コンテキストの自動永続化
- **Tool Sandbox**: エージェントツールの安全な実行環境
- **Session Management**: マルチターン対話のセッション管理
- **Observability**: CloudWatch / X-Ray 統合

### 5.2 Mastra コード変更方針

AgentCore にデプロイするために必要な変更は最小限に抑える：

```typescript
// 変更点 1: Deployer の差し替え
// Before (Vercel):
import { VercelDeployer } from "@mastra/deployer-vercel";
deployer: new VercelDeployer({ maxDuration: 60 }),

// After (AgentCore):
// AgentCore は Mastra のネイティブランタイムとして動作するため、
// deployer 設定は不要（AgentCore が直接 Mastra インスタンスを実行）
```

```typescript
// 変更点 2: Storage の差し替え（LibSQL → DynamoDB）
// Before:
import { LibSQLStore } from "@mastra/libsql";
storage: new LibSQLStore({ url: "file:./mastra.db" }),

// After:
// AgentCore のビルトインメモリを使用するか、
// DynamoDB ストレージアダプターを実装
// (@mastra/dynamodb が存在する場合はそれを使用)
```

```typescript
// 変更点 3: LLM プロバイダー（Optional）
// Before:
model: google("gemini-3-flash-preview"),

// After (Bedrock):
import { bedrock } from "@ai-sdk/amazon-bedrock";
model: bedrock("anthropic.claude-3-5-sonnet-20241022-v2:0"),
// または引き続き Google AI API を Secrets Manager 経由で使用
```

### 5.3 CDK での AgentCore 定義

> **注意**: Bedrock AgentCore の CDK L2 コンストラクトは 2025年時点でまだ安定版に含まれていない可能性がある。
> その場合は L1 (`CfnAgent`) または CloudFormation CustomResource で対応する。

```typescript
// 方法 A: L2 コンストラクト（利用可能な場合）
import * as bedrock from 'aws-cdk-lib/aws-bedrock';

const agent = new bedrock.Agent(this, 'SolanaAgent', {
  agentName: 'solana-ai-agent',
  foundationModel: bedrock.BedrockFoundationModel.ANTHROPIC_CLAUDE_3_5_SONNET_V2,
  instruction: SOLANA_AGENT_INSTRUCTIONS,
  // ...
});

// 方法 B: CustomResource（CDK未対応時のフォールバック）
const agentCoreSetup = new cr.AwsCustomResource(this, 'AgentCoreSetup', {
  onCreate: {
    service: 'BedrockAgentCore',
    action: 'createAgentRuntime',
    parameters: { /* ... */ },
    physicalResourceId: cr.PhysicalResourceId.fromResponse('agentId'),
  },
  // ...
});
```

### 5.4 Fallback: Lambda Docker (AgentCore 未対応時)

AgentCore の CDK/CloudFormation サポートが限定的な場合のフォールバック：

```typescript
// Lambda + Docker で Mastra サーバーをコンテナ実行
const mastraFunction = new lambda.DockerImageFunction(this, 'MastraAgent', {
  code: lambda.DockerImageCode.fromImageAsset('../mastra-react', {
    file: 'Dockerfile.lambda',
    cmd: ['index.handler'],
  }),
  timeout: cdk.Duration.minutes(5),
  memorySize: 1024,
  environment: {
    TABLE_NAME: props.memoryTable.tableName,
    SECRET_ARN: props.apiKeySecret.secretArn,
  },
});
```

---

## 6. コスト見積もり（検証環境・月額）

| サービス | 想定使用量 | 月額概算 |
|---------|-----------|---------|
| CloudFront | 10GB 転送 | ~$1.00 |
| S3 | 100MB ストレージ | ~$0.01 |
| API Gateway | 10,000 リクエスト | ~$0.01 |
| Bedrock AgentCore | 1,000 セッション | ~$5–10 ※ |
| Bedrock (LLM) | 100K input tokens / 50K output tokens | ~$3–5 |
| DynamoDB | PAY_PER_REQUEST, ~5,000 WCU/RCU | ~$0.01 |
| Secrets Manager | 3 シークレット | ~$1.20 |
| CloudWatch | 5GB ログ | ~$2.50 |
| Lambda (Fallback) | 10,000 invocations | ~$0.20 |
| **合計** | | **~$15–20/月** |

※ AgentCore の料金は GA 時の正式発表を確認

---

## 7. 実装ステップ（タスクリスト）

### Phase 1: CDK プロジェクト初期化

```
Task 1.1: CDK プロジェクトの scafold 作成
  - cdk init app --language typescript
  - 依存パッケージのインストール
  - tsconfig / cdk.json の設定

Task 1.2: StorageStack の実装
  - DynamoDB テーブル定義
  - Secrets Manager シークレット定義
  - ユニットテスト作成

Task 1.3: StorageStack のデプロイ確認
  - cdk synth → cdk diff → cdk deploy
```

### Phase 2: バックエンド

```
Task 2.1: BackendStack の実装 (Lambda proxy)
  - Lambda proxy function の作成
  - API Gateway HTTP API の定義
  - IAM ロール設定
  - ユニットテスト作成

Task 2.2: Bedrock AgentCore 統合
  - AgentCore リソース定義（L2 or CustomResource）
  - Mastra コードのパッケージング
  - エージェントツールの登録

Task 2.3: Mastra コード変更
  - Storage アダプターの変更 (LibSQL → DynamoDB)
  - LLM プロバイダー変更の検討 (Google AI → Bedrock)
  - deployer 設定の調整

Task 2.4: BackendStack のデプロイ確認
  - cdk deploy
  - curl で API Gateway エンドポイントをテスト
```

### Phase 3: フロントエンド

```
Task 3.1: FrontendStack の実装
  - S3 バケット定義
  - CloudFront ディストリビューション定義
  - BucketDeployment 定義
  - ユニットテスト作成

Task 3.2: フロントエンド設定調整
  - API エンドポイント URL の環境変数化
  - vite.config.ts の本番ビルド調整
  - CORS 設定

Task 3.3: E2E デプロイ確認
  - vite build → cdk deploy --all
  - CloudFront URL でアプリ全体の動作確認
  - Phantom Wallet 接続テスト
```

### Phase 4: 運用改善（Optional）

```
Task 4.1: CloudWatch ダッシュボード・アラーム設定
Task 4.2: WAF ルール追加（DDoS 保護等）
Task 4.3: カスタムドメイン + ACM 証明書
Task 4.4: Cognito によるユーザー認証
Task 4.5: CI/CD パイプライン (CodePipeline or GitHub Actions)
```

---

## 8. 必要な環境変数・シークレット

| 変数名 | 用途 | 管理場所 |
|--------|------|---------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI LLM (移行前) | Secrets Manager |
| `SOLANA_RPC_URL` | Solana DevNet RPC エンドポイント | Secrets Manager or 環境変数 |
| `MASTRA_CLOUD_ACCESS_TOKEN` | Mastra Cloud Observability | Secrets Manager (Optional) |
| `AGENT_TABLE_NAME` | DynamoDB テーブル名 | CDK 自動注入 |
| `CDK_DEFAULT_ACCOUNT` | AWS アカウント ID | ローカル環境 |
| `CDK_DEFAULT_REGION` | デプロイリージョン（ap-northeast-1 推奨） | ローカル環境 |

---

## 9. 注意事項・リスク

### 9.1 Bedrock AgentCore の CDK サポート

- 2025年時点で AgentCore は GA されたが、CDK L2 コンストラクトが安定版にない可能性がある
- **対策**: L1 (CloudFormation) か CustomResource で対応。Lambda Docker をフォールバックとして準備
- AgentCore の Mastra 対応状況は公式ドキュメントで最新情報を確認

### 9.2 Mastra フレームワークの AWS 互換性

- Mastra は Vercel deployer を正式サポートしているが、AWS 向け deployer は未提供の可能性
- **対策**: `@mastra/deployer-aws` の有無を確認。ない場合は直接 Lambda/AgentCore にデプロイ
- DuckDB（Observability 用）は Lambda/AgentCore 環境で動作しない → CloudWatch に置換

### 9.3 リージョン選択

- Bedrock AgentCore は `us-east-1` / `us-west-2` で先行提供の可能性
- 日本リージョン（`ap-northeast-1`）で利用可能か確認が必要
- **推奨**: `us-east-1` で構築し、レイテンシは CloudFront で吸収

### 9.4 Solana 特有の考慮事項

- エージェントはトランザクションを構築するだけで署名しない（現行設計を維持）
- Phantom Wallet 署名はクライアント（ブラウザ）で実行されるため、バックエンド変更不要
- DevNet RPC の Rate Limit に注意（必要に応じて Helius/QuickNode の有料 RPC を使用）

---

## 10. デプロイコマンド

```bash
# CDK プロジェクトディレクトリへ移動
cd solana-agent-cdk

# 依存関係インストール
npm install

# フロントエンドビルド（先に実行）
cd ../mastra-react && bun run build && cd ../solana-agent-cdk

# TypeScript コンパイル確認
npx tsc --noEmit

# テスト実行
npx jest

# 変更差分確認
npx cdk diff --all

# CloudFormation テンプレート生成（確認用）
npx cdk synth

# デプロイ（全スタック）
npx cdk deploy --all

# 特定スタックのみデプロイ
npx cdk deploy StorageStack
npx cdk deploy BackendStack
npx cdk deploy FrontendStack

# スタック削除（検証環境クリーンアップ）
npx cdk destroy --all
```

---

## 付録: 参考リンク

- [AWS CDK v2 API Reference](https://docs.aws.amazon.com/cdk/api/v2/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Mastra Documentation](https://mastra.dev/docs)
- [CloudFront + S3 OAC パターン](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [API Gateway HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html)
