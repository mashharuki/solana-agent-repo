import * as cdk from "aws-cdk-lib";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import * as path from "path";
import { StaticSite } from "../constructs/static-site";

export interface FrontendStackProps extends cdk.StackProps {
  environment: "dev" | "staging" | "prod";
  /**
   * HTTP API endpoint URL from BackendStack
   * (e.g. https://abc123.execute-api.us-east-1.amazonaws.com)
   */
  apiUrl: string;
  /** Optional custom domain name for the CloudFront distribution */
  domainName?: string;
}

/**
 * FrontendStack — S3 + CloudFront + BucketDeployment.
 *
 * Serves the compiled Vite/React SPA.
 * CloudFront proxies `/chat/*` to the API Gateway so the SPA and API
 * share a single origin (avoids CORS in production).
 *
 * Prerequisites:
 *   Run `bun run build` (or `npm run build`) inside `mastra-react/`
 *   before deploying — BucketDeployment uploads `mastra-react/dist`.
 */
export class FrontendStack extends cdk.Stack {
  /** CloudFront distribution domain (e.g. d1234abcde.cloudfront.net) */
  public readonly distributionDomain: string;

  /**
   * コンストラクター
   * @param scope
   * @param id
   * @param props
   */
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    // ----------------------------------------------------------------
    // StaticSite construct — S3 + CloudFront + OAC
    // ----------------------------------------------------------------
    const site = new StaticSite(this, "Site", {
      environment: props.environment,
      apiOriginDomain: props.apiUrl,
      domainName: props.domainName,
    });

    this.distributionDomain = site.distribution.distributionDomainName;

    // ----------------------------------------------------------------
    // BucketDeployment — upload SPA build to S3 and invalidate CDN
    // ----------------------------------------------------------------
    new s3deploy.BucketDeployment(this, "DeploySPA", {
      sources: [
        s3deploy.Source.asset(
          path.join(__dirname, "../../../mastra-react/dist"),
        ),
      ],
      destinationBucket: site.bucket,
      distribution: site.distribution,
      distributionPaths: ["/*"],
      // Use higher memory for large bundles
      memoryLimit: 512,
      // Keep only the files in this deployment (prune stale files)
      prune: true,
    });

    // ----------------------------------------------------------------
    // Tags
    // ----------------------------------------------------------------
    cdk.Tags.of(this).add("Project", "solana-ai-agent");
    cdk.Tags.of(this).add("Environment", props.environment);
    cdk.Tags.of(this).add("Stack", "frontend");

    // ----------------------------------------------------------------
    // Outputs
    // ----------------------------------------------------------------
    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: site.distribution.distributionDomainName,
      description: "CloudFront distribution domain name",
      exportName: `SolanaAgent-DistributionDomain-${props.environment}`,
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: site.distribution.distributionId,
      description: "CloudFront distribution ID",
      exportName: `SolanaAgent-DistributionId-${props.environment}`,
    });

    new cdk.CfnOutput(this, "BucketName", {
      value: site.bucket.bucketName,
      description: "S3 bucket for frontend assets",
      exportName: `SolanaAgent-BucketName-${props.environment}`,
    });

    new cdk.CfnOutput(this, "AppUrl", {
      value: `https://${site.distribution.distributionDomainName}`,
      description: "Application URL",
    });
  }
}
