import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as S3 from 'aws-cdk-lib/aws-s3';
import * as IAM from 'aws-cdk-lib/aws-iam';
import * as CloudFront from 'aws-cdk-lib/aws-cloudfront';
import * as ACM from 'aws-cdk-lib/aws-certificatemanager';
import * as Route53 from 'aws-cdk-lib/aws-route53';
import * as Route53Targets from 'aws-cdk-lib/aws-route53-targets';
import { RemovalPolicy } from 'aws-cdk-lib';

export interface FrontEndProps extends cdk.StackProps {
  project: string;
  stage: string;
  domain: string;
  alternativeDomains?: string[];
  certificateARN?: string;
}

export class FrontEndStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontEndProps) {
    super(scope, id, props);

    const frontEndBucket = new S3.Bucket(this, 'Bucket', {
      bucketName: props.project.concat('-', props.stage, '-front-end'),
      publicReadAccess: false,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: S3.BlockPublicAccess.BLOCK_ALL
    });

    new cdk.CfnOutput(this, 'S3BucketName', { value: frontEndBucket.bucketName });

    const zone = Route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: props.domain.split('.').slice(-2).join('.')
    });

    const certificate = props.certificateARN
      ? ACM.Certificate.fromCertificateArn(this, 'CloudFrontCertificate', props.certificateARN)
      : new ACM.DnsValidatedCertificate(this, 'Certificate', {
          domainName: props.domain,
          hostedZone: zone,
          region: 'us-east-1'
        });

    const frontEndDistributionOAI = new CloudFront.OriginAccessIdentity(this, 'DistributionOAI', {
      comment: `OAI for https://${props.domain}`
    });

    const frontEndDistribution = new CloudFront.CloudFrontWebDistribution(this, 'Distribution', {
      originConfigs: [
        {
          s3OriginSource: { s3BucketSource: frontEndBucket, originAccessIdentity: frontEndDistributionOAI },
          behaviors: [{ isDefaultBehavior: true }]
        }
      ],
      viewerProtocolPolicy: CloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      priceClass: CloudFront.PriceClass.PRICE_CLASS_100,
      errorConfigurations: [
        { errorCachingMinTtl: 0, errorCode: 403, responseCode: 200, responsePagePath: '/index.html' },
        { errorCachingMinTtl: 0, errorCode: 404, responseCode: 200, responsePagePath: '/index.html' }
      ],
      viewerCertificate: CloudFront.ViewerCertificate.fromAcmCertificate(certificate, {
        aliases: props.alternativeDomains ? [props.domain, ...props.alternativeDomains] : [props.domain],
        securityPolicy: CloudFront.SecurityPolicyProtocol.TLS_V1_2_2021
      })
    });
    new cdk.CfnOutput(this, 'CloudFrontDistributionID', { value: frontEndDistribution.distributionId });
    frontEndBucket.addToResourcePolicy(
      new IAM.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [frontEndBucket.arnForObjects('*')],
        principals: [
          new IAM.CanonicalUserPrincipal(frontEndDistributionOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId)
        ]
      })
    );

    new Route53.ARecord(this, 'DomainRecord', {
      zone: zone,
      recordName: props.domain,
      target: Route53.RecordTarget.fromAlias(new Route53Targets.CloudFrontTarget(frontEndDistribution))
    });
  }
}
