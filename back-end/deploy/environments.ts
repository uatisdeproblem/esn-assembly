export const parameters: Parameters = {
  project: 'esn-ga',
  awsAccount: '772823474617',
  awsRegion: 'eu-south-1',
  apiDomain: 'api.esn-ga.link',
  mediaDomain: 'media.esn-ga.link',
  firstAdminEmail: 'email@matteocarbone.com'
};

export const stages: { [stage: string]: Stage } = {
  prod: {
    domain: 'esn-ga.link',
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
   * API for each environment will be available at `${apiDomain}/${env.stage}`.
   */
  apiDomain: string;
  /**
   * The domain name where to reach the front-end's media files.
   */
  mediaDomain: string;
  /**
   * The email address of the first (admin) user.
   */
  firstAdminEmail: string;
}

export interface Stage {
  /**
   * The domain name where to reach the front-end.
   */
  domain: string;
  /**
   * Whether to delete the data when the environment is deleted.
   * It should be True for dev and False for prod environments.
   */
  destroyDataOnDelete: boolean;
}
