#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { BackendStack } from "../lib/stacks/backend-stack";
import { FrontendStack } from "../lib/stacks/frontend-stack";
import { StorageStack } from "../lib/stacks/storage-stack";

const app = new cdk.App();

// Resolve deployment environment
// Override with CDK context: cdk deploy -c env=prod
const envName = (app.node.tryGetContext("env") as string | undefined) ?? "dev";
const validEnvs = ["dev", "staging", "prod"] as const;
type Env = (typeof validEnvs)[number];

if (!validEnvs.includes(envName as Env)) {
  throw new Error(
    `Invalid environment "${envName}". Must be one of: ${validEnvs.join(", ")}`,
  );
}

const environment = envName as Env;

// AWS account/region from environment (required for stack-level constructs like S3 OAC)
const awsEnv: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
};

// ----------------------------------------------------------------
// Stack 1: Storage (DynamoDB + Secrets Manager)
// ----------------------------------------------------------------
const storageStack = new StorageStack(
  app,
  `SolanaAgentStorage-${environment}`,
  {
    environment,
    env: awsEnv,
    description: `Solana AI Agent — Storage stack (${environment})`,
    tags: {
      Project: "solana-ai-agent",
      Environment: environment,
    },
  },
);

// ----------------------------------------------------------------
// Stack 2: Backend (Lambda + API Gateway HTTP API v2)
// ----------------------------------------------------------------
const backendStack = new BackendStack(
  app,
  `SolanaAgentBackend-${environment}`,
  {
    environment,
    memoryTable: storageStack.memoryTable,
    apiKeySecret: storageStack.apiKeySecret,
    env: awsEnv,
    description: `Solana AI Agent — Backend stack (${environment})`,
    tags: {
      Project: "solana-ai-agent",
      Environment: environment,
    },
  },
);
backendStack.addDependency(storageStack);

// ----------------------------------------------------------------
// Stack 3: Frontend (S3 + CloudFront + BucketDeployment)
// ----------------------------------------------------------------
const frontendStack = new FrontendStack(
  app,
  `SolanaAgentFrontend-${environment}`,
  {
    environment,
    apiUrl: backendStack.apiUrl,
    env: awsEnv,
    description: `Solana AI Agent — Frontend stack (${environment})`,
    tags: {
      Project: "solana-ai-agent",
      Environment: environment,
    },
  },
);
frontendStack.addDependency(backendStack);

app.synth();
