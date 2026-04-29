import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigatewayv2Integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as ecrAssets from "aws-cdk-lib/aws-ecr-assets";
import * as events from "aws-cdk-lib/aws-events";
import * as eventsTargets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import * as path from "path";

export interface BackendStackProps extends cdk.StackProps {
  environment: "dev" | "staging" | "prod";
  /** DynamoDB table from StorageStack */
  memoryTable: dynamodb.ITable;
  /** Secrets Manager secret from StorageStack */
  apiKeySecret: secretsmanager.ISecret;
  /**
   * Comma-separated list of allowed CORS origins.
   * Defaults to '*' for dev; set to the CloudFront domain in prod.
   */
  allowedOrigins?: string;
  /**
   * Bedrock foundation model ID for the Lambda proxy.
   * @default 'anthropic.claude-haiku-4-5-20251001-v1:0'
   */
  bedrockModelId?: string;
}

/**
 * BackendStack — Lambda proxy + API Gateway HTTP API v2.
 *
 * Architecture (updated):
 *   API Gateway → Mastra Lambda (Docker container) → Mastra AI Agent
 *                                                  → Solana Tools (on-chain operations)
 *                                                  → Google Gemini (via GOOGLE_GENERATIVE_AI_API_KEY)
 *
 * Legacy Bedrock proxy (proxyFunction) is retained but not routed;
 * remove it in a future cleanup once Mastra is confirmed stable.
 */
export class BackendStack extends cdk.Stack {
  /** HTTP API v2 endpoint URL (used by FrontendStack / CloudFront) */
  public readonly apiUrl: string;

  /** The HTTP API Gateway construct */
  public readonly httpApi: apigatewayv2.HttpApi;

  /**
   * コンストラクター
   * @param scope
   * @param id
   * @param props
   */
  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    const isProd = props.environment === "prod";
    const modelId =
      props.bedrockModelId ?? "jp.anthropic.claude-haiku-4-5-20251001-v1:0";
    // Strip cross-region inference profile prefix (e.g. "jp.", "us.", "eu.", "apac.")
    // so the IAM policy covers the underlying foundation model in all routing regions.
    const baseModelId = modelId.replace(/^[a-z]{2,5}\./, "");
    const allowedOrigins = props.allowedOrigins ?? "*";

    // ----------------------------------------------------------------
    // CloudWatch Log Group for Lambda
    // ----------------------------------------------------------------
    const logGroup = new logs.LogGroup(this, "ProxyLambdaLogs", {
      logGroupName: `/aws/lambda/solana-agent-proxy-${props.environment}`,
      retention: isProd
        ? logs.RetentionDays.ONE_MONTH
        : logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ----------------------------------------------------------------
    // Lambda — Bedrock proxy handler
    // ----------------------------------------------------------------
    const proxyFunction = new lambdaNodejs.NodejsFunction(
      this,
      "ProxyFunction",
      {
        functionName: `solana-agent-proxy-${props.environment}`,
        entry: path.join(__dirname, "../../assets/lambda/proxy/index.ts"),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_22_X,
        timeout: cdk.Duration.seconds(60),
        memorySize: 512,
        logGroup,
        bundling: {
          // AWS SDK v3 is provided by the Lambda runtime
          externalModules: ["@aws-sdk/*"],
          minify: true,
          sourceMap: false,
        },
        environment: {
          NODE_ENV: props.environment,
          BEDROCK_MODEL_ID: modelId,
          ALLOWED_ORIGIN: allowedOrigins,
          TABLE_NAME: props.memoryTable.tableName,
          SECRET_ARN: props.apiKeySecret.secretArn,
        },
      },
    );

    // ----------------------------------------------------------------
    // IAM — least-privilege grants for Bedrock proxy (legacy, not routed)
    // ----------------------------------------------------------------

    // Read/write agent memory in DynamoDB
    props.memoryTable.grantReadWriteData(proxyFunction);

    // Read API keys from Secrets Manager
    props.apiKeySecret.grantRead(proxyFunction);

    // Invoke Bedrock foundation models
    proxyFunction.addToRolePolicy(
      new iam.PolicyStatement({
        sid: "BedrockInvokeModel",
        effect: iam.Effect.ALLOW,
        actions: [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
        ],
        // Restrict to specified model; use wildcard only if model family is unknown at synth time
        resources: [
          `arn:aws:bedrock:*::foundation-model/${modelId}`,
          // Base model ID for cross-region inference profile routing
          // (e.g. jp. prefix routes to ap-northeast-1/ap-northeast-3,
          //  so both regions need access to the base model ARN)
          `arn:aws:bedrock:*::foundation-model/${baseModelId}`,
          // Allow cross-region inference profiles (e.g. jp.anthropic.*)
          `arn:aws:bedrock:*:*:inference-profile/*`,
        ],
      }),
    );

    // ----------------------------------------------------------------
    // Lambda — Mastra AI Agent (Docker container + Lambda Web Adapter)
    //
    // CDK が自動的に Dockerfile をビルドして ECR にプッシュする。
    // Lambda Web Adapter が Lambda イベント ↔ HTTP 変換を担当。
    // ----------------------------------------------------------------
    const mastraLogGroup = new logs.LogGroup(this, "MastraLambdaLogs", {
      logGroupName: `/aws/lambda/solana-agent-mastra-${props.environment}`,
      retention: isProd
        ? logs.RetentionDays.ONE_MONTH
        : logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const mastraFunction = new lambda.DockerImageFunction(
      this,
      "MastraFunction",
      {
        functionName: `solana-agent-mastra-${props.environment}`,
        code: lambda.DockerImageCode.fromImageAsset(
          // mastra-react/ ディレクトリの Dockerfile をビルド
          path.join(__dirname, "../../../mastra-react"),
          // Mac (arm64) でビルドしても Lambda (x86_64) 向けに固定する
          { platform: ecrAssets.Platform.LINUX_AMD64 },
        ),
        timeout: cdk.Duration.seconds(60),
        // 3008 MB → CPU が ~3× 増加してコールドスタート短縮（API GW 29 秒タイムアウト対策）
        memorySize: 3008,
        logGroup: mastraLogGroup,
        environment: {
          NODE_ENV: props.environment,
          // インメモリ SQLite（デモ用）。永続化が必要な場合は Turso URL に差し替え。
          MASTRA_LIBSQL_URL: "file::memory:?cache=shared",
          // Google Gemini API キー — .env ファイル（mastra-react/.env または cdk/.env）から読み込む
          GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "",
        },
      },
    );

    // IAM grants for Mastra Lambda
    props.memoryTable.grantReadWriteData(mastraFunction);

    // ----------------------------------------------------------------
    // API Gateway HTTP API v2
    // ----------------------------------------------------------------
    this.httpApi = new apigatewayv2.HttpApi(this, "HttpApi", {
      apiName: `solana-agent-api-${props.environment}`,
      description: "Solana AI Agent — chat API",
      corsPreflight: {
        allowOrigins:
          allowedOrigins === "*" ? ["*"] : allowedOrigins.split(","),
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ["Content-Type", "Authorization", "x-api-key"],
        maxAge: cdk.Duration.days(1),
      },
    });

    const mastraIntegration =
      new apigatewayv2Integrations.HttpLambdaIntegration(
        "MastraIntegration",
        mastraFunction,
      );

    // Route: POST /chat/{proxy+} → Mastra AI Agent
    // {proxy+} でサブパス（例: /chat/solana-agent）を全て Mastra にルーティング
    this.httpApi.addRoutes({
      path: "/chat/{proxy+}",
      methods: [apigatewayv2.HttpMethod.POST, apigatewayv2.HttpMethod.GET],
      integration: mastraIntegration,
    });

    this.apiUrl = this.httpApi.apiEndpoint;

    // ----------------------------------------------------------------
    // Throttling — default stage throttle (dev: 100 rps / prod: 500 rps)
    // ----------------------------------------------------------------
    const defaultStage = this.httpApi.defaultStage?.node.defaultChild as
      | apigatewayv2.CfnStage
      | undefined;

    if (defaultStage) {
      defaultStage.defaultRouteSettings = {
        throttlingBurstLimit: isProd ? 200 : 50,
        throttlingRateLimit: isProd ? 500 : 100,
      };
    }

    // ----------------------------------------------------------------
    // Tags
    // ----------------------------------------------------------------
    cdk.Tags.of(this).add("Project", "solana-ai-agent");
    cdk.Tags.of(this).add("Environment", props.environment);
    cdk.Tags.of(this).add("Stack", "backend");

    // ----------------------------------------------------------------
    // Warm-up: EventBridge で5分ごとに Lambda を起動してコールドスタートを回避
    // ----------------------------------------------------------------
    const warmUpRule = new events.Rule(this, "MastraWarmUpRule", {
      ruleName: `solana-agent-mastra-warmup-${props.environment}`,
      description: "Keep Mastra Lambda warm to avoid cold start 504 errors",
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
    });
    warmUpRule.addTarget(
      new eventsTargets.LambdaFunction(mastraFunction, {
        event: events.RuleTargetInput.fromObject({ source: "warmup" }),
        retryAttempts: 0,
      }),
    );

    // ----------------------------------------------------------------
    // Outputs
    // ----------------------------------------------------------------
    new cdk.CfnOutput(this, "ApiUrl", {
      value: this.httpApi.apiEndpoint,
      description: "API Gateway HTTP API endpoint URL",
      exportName: `SolanaAgent-ApiUrl-${props.environment}`,
    });

    new cdk.CfnOutput(this, "ProxyFunctionArn", {
      value: proxyFunction.functionArn,
      description: "Lambda Bedrock proxy function ARN (legacy, not routed)",
      exportName: `SolanaAgent-ProxyFunctionArn-${props.environment}`,
    });

    new cdk.CfnOutput(this, "MastraFunctionArn", {
      value: mastraFunction.functionArn,
      description: "Mastra AI Agent Lambda function ARN (active)",
      exportName: `SolanaAgent-MastraFunctionArn-${props.environment}`,
    });
  }
}
