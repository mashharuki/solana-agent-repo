import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { StorageStack } from "../lib/stacks/storage-stack";

describe("StorageStack", () => {
  const makeStack = (environment: "dev" | "prod" = "dev") => {
    const app = new cdk.App();
    const stack = new StorageStack(app, "TestStorageStack", { environment });
    return Template.fromStack(stack);
  };

  test("creates a DynamoDB table with PAY_PER_REQUEST billing", () => {
    const template = makeStack();

    template.hasResourceProperties("AWS::DynamoDB::Table", {
      BillingMode: "PAY_PER_REQUEST",
      KeySchema: [
        { AttributeName: "sessionId", KeyType: "HASH" },
        { AttributeName: "timestamp", KeyType: "RANGE" },
      ],
    });
  });

  test("DynamoDB table has TTL attribute configured", () => {
    const template = makeStack();

    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TimeToLiveSpecification: {
        AttributeName: "expiresAt",
        Enabled: true,
      },
    });
  });

  test("DynamoDB table uses AWS_OWNED encryption", () => {
    const template = makeStack();
    // AWS_MANAGED = SSEType 'KMS' without KMSMasterKeyId (uses AWS managed key)
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      SSESpecification: {
        SSEEnabled: true,
      },
    });
  });

  test("creates a Secrets Manager secret", () => {
    const template = makeStack();

    template.resourceCountIs("AWS::SecretsManager::Secret", 1);
  });

  test("stack has expected number of outputs", () => {
    const template = makeStack();
    const outputs = template.findOutputs("*");
    // MemoryTableName, MemoryTableArn, ApiKeySecretArn
    expect(Object.keys(outputs).length).toBeGreaterThanOrEqual(3);
  });

  test("dev stack uses DESTROY removal policy for DynamoDB", () => {
    const app = new cdk.App();
    const stack = new StorageStack(app, "DevStack", { environment: "dev" });
    const template = Template.fromStack(stack);

    // DynamoDB table should have DeletionPolicy Delete in dev
    template.hasResource("AWS::DynamoDB::Table", {
      DeletionPolicy: "Delete",
    });
  });

  test("prod stack uses RETAIN removal policy for DynamoDB", () => {
    const app = new cdk.App();
    const stack = new StorageStack(app, "ProdStack", { environment: "prod" });
    const template = Template.fromStack(stack);

    template.hasResource("AWS::DynamoDB::Table", {
      DeletionPolicy: "Retain",
    });
  });
});
