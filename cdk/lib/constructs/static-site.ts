import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export interface StaticSiteProps {
  /** Environment name used in bucket naming */
  environment: "dev" | "staging" | "prod";
  /** API Gateway endpoint (https://xxx.execute-api.region.amazonaws.com) */
  apiOriginDomain: string;
  /**
   * Optional custom domain name for the CloudFront distribution.
   * Requires `certificate` to be set as well.
   */
  domainName?: string;
}

/**
 * StaticSite — reusable construct that wires up:
 *   S3 bucket (private)  →  Origin Access Control  →  CloudFront
 *
 * Additionally adds an API Gateway custom origin for `/chat/*` routes
 * so the SPA and the backend share a single domain.
 */
export class StaticSite extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: StaticSiteProps) {
    super(scope, id);

    const isProd = props.environment === "prod";

    // ----------------------------------------------------------------
    // S3 bucket — SPA assets
    // ----------------------------------------------------------------
    this.bucket = new s3.Bucket(this, "SiteBucket", {
      bucketName: `solana-agent-frontend-${props.environment}-${cdk.Stack.of(this).account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: false,
      removalPolicy: isProd
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
    });

    // ----------------------------------------------------------------
    // CloudFront response headers policy (security headers)
    // ----------------------------------------------------------------
    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      "SecurityHeaders",
      {
        securityHeadersBehavior: {
          contentTypeOptions: { override: true },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
          referrerPolicy: {
            referrerPolicy:
              cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: true,
          },
          strictTransportSecurity: {
            accessControlMaxAge: cdk.Duration.seconds(63072000),
            includeSubdomains: true,
            preload: true,
            override: true,
          },
        },
      },
    );

    // ----------------------------------------------------------------
    // CloudFront distribution
    // ----------------------------------------------------------------
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(
      this.bucket,
    );

    // Strip the protocol prefix from the API Gateway domain
    const apiDomain = props.apiOriginDomain.replace(/^https?:\/\//, "");

    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: `Solana AI Agent SPA — ${props.environment}`,
      defaultRootObject: "index.html",
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // US + EU (cost-optimised)
      // Enforce TLS 1.2+
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,

      // Default: serve SPA from S3
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        compress: true,
      },

      // /chat/* → API Gateway (never cached; pass through all headers)
      additionalBehaviors: {
        "/chat/*": {
          origin: new origins.HttpOrigin(apiDomain, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          responseHeadersPolicy,
        },
      },

      // SPA fallback: route 403/404 → /index.html so React Router works
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.seconds(0),
        },
      ],
    });
  }
}
