import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export interface StorageStackProps extends cdk.StackProps {
  environment: "dev" | "staging" | "prod";
}

/**
 * StorageStack — DynamoDB (agent memory / sessions) + Secrets Manager (API keys).
 * Deployed first; other stacks depend on its outputs.
 */
export class StorageStack extends cdk.Stack {
  /** DynamoDB table for agent memory and session data */
  public readonly memoryTable: dynamodb.Table;

  /** Secrets Manager secret containing third-party API keys */
  public readonly apiKeySecret: secretsmanager.Secret;

  /**
   * コンストラクター
   * @param scope
   * @param id
   * @param props
   */
  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const isProd = props.environment === "prod";

    // ----------------------------------------------------------------
    // DynamoDB — agent memory / sessions
    // ----------------------------------------------------------------
    this.memoryTable = new dynamodb.Table(this, "AgentMemoryTable", {
      tableName: `solana-agent-memory-${props.environment}`,
      partitionKey: { name: "sessionId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "expiresAt",
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: isProd },
      removalPolicy: isProd
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // GSI: look up all records for a session ordered by timestamp
    this.memoryTable.addGlobalSecondaryIndex({
      indexName: "sessionId-index",
      partitionKey: { name: "sessionId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ----------------------------------------------------------------
    // Secrets Manager — API keys for LLM / Solana RPC etc.
    // ----------------------------------------------------------------
    this.apiKeySecret = new secretsmanager.Secret(this, "AgentApiKeys", {
      secretName: `solana-agent-api-keys-${props.environment}`,
      description: "Third-party API keys used by the Solana AI Agent",
      // Provide the key structure; values must be updated manually after first deploy
      secretObjectValue: {
        GOOGLE_GENERATIVE_AI_API_KEY:
          cdk.SecretValue.unsafePlainText("REPLACE_ME"),
        SOLANA_RPC_URL: cdk.SecretValue.unsafePlainText(
          "https://api.devnet.solana.com",
        ),
        MASTRA_CLOUD_ACCESS_TOKEN: cdk.SecretValue.unsafePlainText(""),
      },
      removalPolicy: isProd
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // ----------------------------------------------------------------
    // Tags
    // ----------------------------------------------------------------
    cdk.Tags.of(this).add("Project", "solana-ai-agent");
    cdk.Tags.of(this).add("Environment", props.environment);
    cdk.Tags.of(this).add("Stack", "storage");

    // ----------------------------------------------------------------
    // Outputs (exported for cross-stack references)
    // ----------------------------------------------------------------
    new cdk.CfnOutput(this, "MemoryTableName", {
      value: this.memoryTable.tableName,
      description: "DynamoDB table for agent memory/sessions",
      exportName: `SolanaAgent-MemoryTableName-${props.environment}`,
    });

    new cdk.CfnOutput(this, "MemoryTableArn", {
      value: this.memoryTable.tableArn,
      description: "DynamoDB table ARN",
      exportName: `SolanaAgent-MemoryTableArn-${props.environment}`,
    });

    new cdk.CfnOutput(this, "ApiKeySecretArn", {
      value: this.apiKeySecret.secretArn,
      description: "Secrets Manager ARN for API keys",
      exportName: `SolanaAgent-ApiKeySecretArn-${props.environment}`,
    });
  }
}
