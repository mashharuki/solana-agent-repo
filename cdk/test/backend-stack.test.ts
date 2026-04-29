import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { BackendStack } from "../lib/stacks/backend-stack";
import { StorageStack } from "../lib/stacks/storage-stack";

describe("BackendStack", () => {
  const makeTemplate = () => {
    const app = new cdk.App();

    const storageStack = new StorageStack(app, "TestStorage", {
      environment: "dev",
    });

    const backendStack = new BackendStack(app, "TestBackendStack", {
      environment: "dev",
      memoryTable: storageStack.memoryTable,
      apiKeySecret: storageStack.apiKeySecret,
    });

    return Template.fromStack(backendStack);
  };

  test("creates a Lambda function", () => {
    const template = makeTemplate();

    // At least one Lambda function exists
    const lambdas = template.findResources("AWS::Lambda::Function");
    expect(Object.keys(lambdas).length).toBeGreaterThanOrEqual(1);
    template.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "nodejs22.x",
      Handler: Match.anyValue(),
    });
  });

  test("Lambda function has BEDROCK_MODEL_ID environment variable", () => {
    const template = makeTemplate();

    template.hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: Match.objectLike({
          BEDROCK_MODEL_ID: Match.anyValue(),
          TABLE_NAME: Match.anyValue(),
          ALLOWED_ORIGIN: Match.anyValue(),
        }),
      },
    });
  });

  test("creates an HTTP API", () => {
    const template = makeTemplate();

    template.resourceCountIs("AWS::ApiGatewayV2::Api", 1);
    template.hasResourceProperties("AWS::ApiGatewayV2::Api", {
      ProtocolType: "HTTP",
    });
  });

  test("API has a POST route for /chat/{agentId}", () => {
    const template = makeTemplate();

    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: Match.stringLikeRegexp("/chat/\\{agentId\\}"),
    });
  });

  test("Lambda execution role grants bedrock:InvokeModel", () => {
    const template = makeTemplate();

    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith([
              Match.stringLikeRegexp("bedrock:InvokeModel"),
            ]),
            Effect: "Allow",
          }),
        ]),
      },
    });
  });

  test("stack outputs include ApiUrl", () => {
    const template = makeTemplate();
    const outputs = template.findOutputs("*");
    const outputKeys = Object.keys(outputs);
    expect(outputKeys.some((k) => k.startsWith("ApiUrl"))).toBe(true);
  });
});
