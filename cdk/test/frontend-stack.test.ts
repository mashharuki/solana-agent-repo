import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { FrontendStack } from "../lib/stacks/frontend-stack";

describe("FrontendStack", () => {
  const makeTemplate = (environment: "dev" | "prod" = "dev") => {
    const app = new cdk.App();

    const stack = new FrontendStack(app, "TestFrontendStack", {
      environment,
      apiUrl: "https://abc123.execute-api.us-east-1.amazonaws.com",
      env: { account: "123456789012", region: "us-east-1" },
    });

    return Template.fromStack(stack);
  };

  test("creates an S3 bucket", () => {
    const template = makeTemplate();

    const buckets = template.findResources("AWS::S3::Bucket");
    expect(Object.keys(buckets).length).toBeGreaterThanOrEqual(1);
  });

  test("S3 bucket has public access blocked", () => {
    const template = makeTemplate();

    template.hasResourceProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test("creates a CloudFront distribution", () => {
    const template = makeTemplate();

    template.resourceCountIs("AWS::CloudFront::Distribution", 1);
  });

  test("CloudFront distribution enforces HTTPS redirect", () => {
    const template = makeTemplate();

    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        DefaultCacheBehavior: Match.objectLike({
          ViewerProtocolPolicy: "redirect-to-https",
        }),
      }),
    });
  });

  test("CloudFront has additional behavior for /chat/* API proxy", () => {
    const template = makeTemplate();

    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        CacheBehaviors: Match.arrayWith([
          Match.objectLike({
            PathPattern: "/chat/*",
          }),
        ]),
      }),
    });
  });

  test("stack outputs include DistributionDomainName", () => {
    const template = makeTemplate();
    const outputs = template.findOutputs("*");
    const outputKeys = Object.keys(outputs);
    expect(outputKeys.some((k) => k.startsWith("DistributionDomainName"))).toBe(
      true,
    );
  });

  test("stack outputs include BucketName", () => {
    const template = makeTemplate();
    const outputs = template.findOutputs("*");
    const outputKeys = Object.keys(outputs);
    expect(outputKeys.some((k) => k.startsWith("BucketName"))).toBe(true);
  });

  test("dev stack uses DESTROY removal policy for S3", () => {
    const app = new cdk.App();
    const stack = new FrontendStack(app, "DevFrontend", {
      environment: "dev",
      apiUrl: "https://example.execute-api.us-east-1.amazonaws.com",
      env: { account: "123456789012", region: "us-east-1" },
    });
    const template = Template.fromStack(stack);

    template.hasResource("AWS::S3::Bucket", {
      DeletionPolicy: "Delete",
    });
  });
});
