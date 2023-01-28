import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import * as S3 from 'aws-cdk-lib/aws-s3';
import * as S3N from 'aws-cdk-lib/aws-s3-notifications';
import * as ACM from 'aws-cdk-lib/aws-certificatemanager';
import * as Route53 from 'aws-cdk-lib/aws-route53';
import * as Route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as CloudFront from 'aws-cdk-lib/aws-cloudfront';
import * as CloudFrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as IAM from 'aws-cdk-lib/aws-iam';

export interface MediaProps extends cdk.StackProps {
  mediaBucketName: string;
  mediaDomain: string;
}

export class MediaStack extends cdk.Stack {
  public readonly mediaBucketArn: string;

  constructor(scope: Construct, id: string, props: MediaProps) {
    super(scope, id, props);

    const s3MediaBucket = new S3.Bucket(this, 'MediaBucket', {
      bucketName: props.mediaBucketName,
      publicReadAccess: false,
      cors: [
        {
          allowedHeaders: ['*'],
          allowedMethods: [S3.HttpMethods.GET, S3.HttpMethods.PUT],
          allowedOrigins: ['*'],
          exposedHeaders: [],
          maxAge: 3000
        }
      ],
      removalPolicy: RemovalPolicy.DESTROY,
      lifecycleRules: [{ prefix: 'downloads/', expiration: cdk.Duration.days(1) }]
    });
    this.mediaBucketArn = s3MediaBucket.bucketArn;

    const s3BucketIDEALambdaFn = S3.Bucket.fromBucketName(
      this,
      'IDEALambdaFunctions',
      `idea-lambda-functions${cdk.Stack.of(this).region === 'eu-south-1' ? '' : `-${cdk.Stack.of(this).region}`}`
    );

    const thumbnailerFn = createThumbnailer(this, s3BucketIDEALambdaFn);
    s3MediaBucket.grantReadWrite(thumbnailerFn);
    s3MediaBucket.addToResourcePolicy(
      new IAM.PolicyStatement({
        effect: IAM.Effect.ALLOW,
        principals: [new IAM.ArnPrincipal(String(thumbnailerFn.role?.roleArn))],
        actions: ['s3:*'],
        resources: [
          `arn:aws:s3:::${s3MediaBucket.bucketName}/images/*`,
          `arn:aws:s3:::${s3MediaBucket.bucketName}/thumbnails/*`
        ]
      })
    );
    s3MediaBucket.addEventNotification(S3.EventType.OBJECT_CREATED, new S3N.LambdaDestination(thumbnailerFn), {
      prefix: 'images/'
    });

    const html2PDFFunctions = createHTMLToPDFLambdaFunctions(this, s3BucketIDEALambdaFn);
    html2PDFFunctions.forEach(fn => s3MediaBucket.grantReadWrite(fn));
    s3MediaBucket.addToResourcePolicy(
      new IAM.PolicyStatement({
        effect: IAM.Effect.ALLOW,
        principals: html2PDFFunctions.map(fn => new IAM.ArnPrincipal(String(fn.role?.roleArn))),
        actions: ['s3:*'],
        resources: [`arn:aws:s3:::${s3MediaBucket.bucketName}/downloads/*`]
      })
    );

    createCloudFrontDistributionForMediaBucket(this, s3MediaBucket, props.mediaDomain);
  }
}

const createThumbnailer = (scope: Construct, s3BucketIDEALambdaFn: S3.Bucket | cdk.aws_s3.IBucket): Lambda.Function => {
  const ghostScriptLayer = new Lambda.LayerVersion(scope, 'GhostScriptLayer', {
    description: 'To convert images',
    layerVersionName: 'idea_ghost_script',
    code: Lambda.Code.fromBucket(s3BucketIDEALambdaFn, 'layer-ghost-script.zip'),
    compatibleRuntimes: [Lambda.Runtime.NODEJS_14_X]
  });

  const imageMagickLayer = new Lambda.LayerVersion(scope, 'ImageMagickLayer', {
    description: 'To convert images',
    layerVersionName: 'idea_image_magick',

    code: Lambda.Code.fromBucket(s3BucketIDEALambdaFn, 'layer-image-magick.zip'),
    compatibleRuntimes: [Lambda.Runtime.NODEJS_14_X]
  });

  const thumbnailerFn = new Lambda.Function(scope, 'ThumbnailerFunction', {
    description: 'Convert an S3 uploaded media into a thumbnail',
    runtime: Lambda.Runtime.NODEJS_14_X,
    memorySize: 1536,
    timeout: Duration.seconds(10),
    code: Lambda.Code.fromBucket(s3BucketIDEALambdaFn, 'fn-thumbnailer.zip'),
    handler: 'index.handler',
    functionName: 'idea_thumbnailer',
    environment: {
      THUMB_KEY_PREFIX: 'thumbnails/',
      THUMB_HEIGHT: '600',
      THUMB_WIDTH: '600'
    },
    layers: [ghostScriptLayer, imageMagickLayer],
    logRetention: RetentionDays.TWO_WEEKS
  });

  return thumbnailerFn;
};

const createHTMLToPDFLambdaFunctions = (
  scope: Construct,
  s3BucketIDEALambdaFn: S3.Bucket | cdk.aws_s3.IBucket
): Lambda.Function[] => {
  const chromiumPuppetteerLayer = new Lambda.LayerVersion(scope, 'ChromiumPuppetteerLayer', {
    description: 'Chromium and Puppetteer',
    layerVersionName: 'idea_chromium_puppetter',
    code: Lambda.Code.fromBucket(s3BucketIDEALambdaFn, 'layer-chromium-puppetteer.zip'),
    compatibleRuntimes: [Lambda.Runtime.NODEJS_14_X]
  });

  const lambdaFnOptions = {
    runtime: Lambda.Runtime.NODEJS_14_X,
    memorySize: 1536,
    timeout: Duration.seconds(20),
    handler: 'index.handler',
    layers: [chromiumPuppetteerLayer],
    logRetention: RetentionDays.TWO_WEEKS
  };

  const htmlToPDFFunction = new Lambda.Function(scope, 'HTMLToPDFFunction', {
    ...lambdaFnOptions,
    description: 'Create a PDF from an HTML source',
    functionName: 'idea_html2pdf',
    code: Lambda.Code.fromBucket(s3BucketIDEALambdaFn, 'fn-html2pdf.zip')
  });

  const htmlToPDFFViaS3BucketFunction = new Lambda.Function(scope, 'HTMLToPDFViaS3BucketFunction', {
    ...lambdaFnOptions,
    description: 'Create a PDF from an HTML source and offer the result via S3 bucket',
    functionName: 'idea_html2pdf_viaS3Bucket',
    code: Lambda.Code.fromBucket(s3BucketIDEALambdaFn, 'fn-html2pdf_viaS3Bucket.zip')
  });

  return [htmlToPDFFunction, htmlToPDFFViaS3BucketFunction];
};

const createCloudFrontDistributionForMediaBucket = (
  scope: Construct,
  mediaBucket: S3.Bucket,
  mediaDomain: string
): void => {
  const zone = Route53.HostedZone.fromLookup(scope, 'HostedZone', {
    domainName: mediaDomain.split('.').slice(-2).join('.')
  });

  const certificate = new ACM.DnsValidatedCertificate(scope, 'MediaCertificate', {
    domainName: mediaDomain,
    hostedZone: zone,
    region: 'us-east-1'
  });

  const mediaDistributionOAI = new CloudFront.OriginAccessIdentity(scope, 'DistributionOAI', {
    comment: `OAI for https://${mediaDomain}`
  });

  const mediaDistribution = new CloudFront.Distribution(scope, 'MediaDistribution', {
    defaultBehavior: {
      origin: new CloudFrontOrigins.S3Origin(mediaBucket, {
        originAccessIdentity: mediaDistributionOAI,
        originPath: '/thumbnails'
      }),
      compress: true,
      viewerProtocolPolicy: CloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
    },
    domainNames: [mediaDomain],
    priceClass: CloudFront.PriceClass.PRICE_CLASS_100,
    certificate: ACM.Certificate.fromCertificateArn(scope, 'CloudFrontMediaCertificate', certificate.certificateArn)
  });

  new Route53.ARecord(scope, 'MediaDomainRecord', {
    zone: zone,
    recordName: mediaDomain,
    target: Route53.RecordTarget.fromAlias(new Route53Targets.CloudFrontTarget(mediaDistribution))
  });
};
