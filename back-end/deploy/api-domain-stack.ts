import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ApiGw from 'aws-cdk-lib/aws-apigatewayv2';
import * as ACM from 'aws-cdk-lib/aws-certificatemanager';
import * as Route53 from 'aws-cdk-lib/aws-route53';
import * as Route53Targets from 'aws-cdk-lib/aws-route53-targets';

export interface ApiDomainProps extends cdk.StackProps {
  domain: string;
}

export class ApiDomainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiDomainProps) {
    super(scope, id, props);

    const zone = Route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: props.domain.split('.').slice(-2).join('.')
    });

    const certificate = new ACM.DnsValidatedCertificate(this, 'ApiCertificate', {
      domainName: props.domain,
      hostedZone: zone
    });

    const apiDomain = new ApiGw.CfnDomainName(this, 'ApiDomain', {
      domainName: props.domain,
      domainNameConfigurations: [{ certificateArn: certificate.certificateArn, endpointType: 'REGIONAL' }]
    });

    new Route53.ARecord(this, 'DomainRecord', {
      zone: zone,
      recordName: props.domain,
      target: Route53.RecordTarget.fromAlias(
        new Route53Targets.ApiGatewayv2DomainProperties(
          apiDomain.attrRegionalDomainName,
          apiDomain.attrRegionalHostedZoneId
        )
      )
    });
  }
}
