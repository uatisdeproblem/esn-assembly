import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { VerifySesDomain } from '@iter-idea/ses-verify-identities';

export interface SESProps extends cdk.StackProps {
  project: string;
  domain: string;
}

export class SESStack extends cdk.Stack {
  public readonly identityArn: string;
  public readonly notificationTopicArn: string;

  constructor(scope: Construct, id: string, props: SESProps) {
    super(scope, id, props);

    const region = cdk.Stack.of(this).region;
    const account = cdk.Stack.of(this).account;

    const domainName = props.domain.split('.').slice(-2).join('.');
    const sesDomain = new VerifySesDomain(this, 'DomainIdentity', { domainName });

    this.identityArn = `arn:aws:ses:${region}:${account}:identity/${domainName}`;
    this.notificationTopicArn = sesDomain.notificationTopic.topicArn;

    new cdk.CfnOutput(this, 'SESIdentityARN', { value: this.identityArn });
    new cdk.CfnOutput(this, 'SESNotificationTopicARN', { value: this.notificationTopicArn });
  }
}
