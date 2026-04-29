import * as cdk from "aws-cdk-lib";
import * as bedrock from "aws-cdk-lib/aws-bedrock";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

// Agent ランタイム用のCDK Constructインターフェース定義
export interface AgentRuntimeProps {
  /** Environment name — used for naming and tagging */
  environment: "dev" | "staging" | "prod";
  /**
   * Bedrock foundation model ID the agent will use.
   * @default 'anthropic.claude-3-5-haiku-20241022-v1:0'
   */
  modelId?: string;
  /** System instruction passed to the agent */
  instructions: string;
  /** IAM role that Bedrock assumes to invoke the agent */
  agentRole: iam.IRole;
}

/**
 * AgentRuntime — thin L1 wrapper around `aws_bedrock.CfnAgent`.
 *
 * AWS Bedrock Agents is not yet available as an L2 construct in aws-cdk-lib,
 * so we use the CloudFormation L1 construct (`CfnAgent`) directly.
 *
 * NOTE: After the first `cdk deploy`, you must manually prepare/version the
 * agent in the Bedrock console (or via CLI) before it can be invoked.
 */
export class AgentRuntime extends Construct {
  /** Bedrock Agent resource ID */
  public readonly agentId: string;

  /** Bedrock Agent ARN */
  public readonly agentArn: string;

  /**
   * コンストラクター
   * @param scope
   * @param id
   * @param props
   */
  constructor(scope: Construct, id: string, props: AgentRuntimeProps) {
    super(scope, id);

    // モデルIDと環境に応じたタグを設定
    const modelId = props.modelId ?? "anthropic.claude-3-5-haiku-20241022-v1:0";

    // Bedrock AgentのCloudFormationリソースを作成
    const cfnAgent = new bedrock.CfnAgent(this, "CfnAgent", {
      agentName: `solana-ai-agent-${props.environment}`,
      foundationModel: modelId,
      instruction: props.instructions,
      agentResourceRoleArn: props.agentRole.roleArn,
      // Auto-prepare so the agent is ready to test after deploy
      autoPrepare: true,
      description: `Solana AI Agent — ${props.environment}`,
      idleSessionTtlInSeconds: 600, // 10 min
    });

    this.agentId = cfnAgent.attrAgentId;
    this.agentArn = cfnAgent.attrAgentArn;

    // ----------------------------------------------------------------
    // Tags
    // ----------------------------------------------------------------
    cdk.Tags.of(this).add("Project", "solana-ai-agent");
    cdk.Tags.of(this).add("Environment", props.environment);
  }
}
