export const parameters: Parameters = {
  project: 'esn-ga',
  awsAccount: '772823474617',
  awsRegion: 'eu-south-1',
  apiDomain: 'api.esn-ga.link',
  webSocketApiDomain: 'socket.esn-ga.link',
  mediaDomain: 'media.esn-ga.link',
  firstAdminEmail: 'email@matteocarbone.com',
  frontEndCertificateARN: 'arn:aws:acm:us-east-1:772823474617:certificate/12d7466b-c989-46ee-86c5-61b2cda3c35c'
};

export const stages: { [stage: string]: Stage } = {
  prod: {
    domain: 'ga.esn.org',
    alternativeDomains: ['esn-ga.link'],
    destroyDataOnDelete: false
  },
  dev: {
    domain: 'dev.esn-ga.link',
    destroyDataOnDelete: true
  }
};

export interface Parameters {
  /**
   * Project key (unique to the AWS account).
   */
  project: string;
  /**
   * The AWS account where the cloud resources will be deployed.
   */
  awsAccount: string;
  /**
   * The AWS region where the cloud resources will be deployed.
   */
  awsRegion: string;
  /**
   * HTTP API for each environment will be available at `${apiDomain}/${env.stage}`.
   */
  apiDomain: string;
  /**
   * Web Socket API for each environment will be available at `${apiDomain}/${env.stage}`.
   */
  webSocketApiDomain: string;
  /**
   * The domain name where to reach the front-end's media files.
   */
  mediaDomain: string;
  /**
   * The email address of the first (admin) user.
   */
  firstAdminEmail: string;
  /**
   * The custom front-end certificate ARN to use, to support alternative domains.
   */
  frontEndCertificateARN: string;
}

export interface Stage {
  /**
   * The domain name where to reach the front-end.
   */
  domain: string;
  /**
   * The (optional) alternative domain names to reach the front-end.
   */
  alternativeDomains?: string[];
  /**
   * Whether to delete the data when the environment is deleted.
   * It should be True for dev and False for prod environments.
   */
  destroyDataOnDelete: boolean;
}
