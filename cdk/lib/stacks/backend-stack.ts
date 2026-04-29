import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigatewayv2Integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
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
   * @default 'anthropic.claude-3-5-haiku-20241022-v1:0'
   */
  bedrockModelId?: string;
}

/**
 * BackendStack — Lambda proxy + API Gateway HTTP API v2.
 *
 * Architecture:
 *   API Gateway → Lambda (Bedrock proxy) → Amazon Bedrock (Claude)
 *                                        → DynamoDB (memory)
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
      props.bedrockModelId ?? "anthropic.claude-3-5-haiku-20241022-v1:0";
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
    // IAM — least-privilege grants
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
          // Allow cross-region inference profiles (e.g. us.anthropic.*)
          `arn:aws:bedrock:*:*:inference-profile/*`,
        ],
      }),
    );

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

    const lambdaIntegration =
      new apigatewayv2Integrations.HttpLambdaIntegration(
        "ProxyIntegration",
        proxyFunction,
      );

    // Route: POST /chat/{agentId}
    this.httpApi.addRoutes({
      path: "/chat/{agentId}",
      methods: [apigatewayv2.HttpMethod.POST, apigatewayv2.HttpMethod.GET],
      integration: lambdaIntegration,
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
    // Outputs
    // ----------------------------------------------------------------
    new cdk.CfnOutput(this, "ApiUrl", {
      value: this.httpApi.apiEndpoint,
      description: "API Gateway HTTP API endpoint URL",
      exportName: `SolanaAgent-ApiUrl-${props.environment}`,
    });

    new cdk.CfnOutput(this, "ProxyFunctionArn", {
      value: proxyFunction.functionArn,
      description: "Lambda proxy function ARN",
      exportName: `SolanaAgent-ProxyFunctionArn-${props.environment}`,
    });
  }
}
