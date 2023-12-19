/**
 * The codename of the project.
 */
const PROJECT = 'esn-ga';
/**
 * The purchased domain to use.
 */
const DOMAIN = 'esn-ga.link';

export const parameters: Parameters = {
  project: PROJECT,
  apiDomain: 'api.'.concat(DOMAIN),
  webSocketApiDomain: 'socket.'.concat(DOMAIN),
  mediaDomain: 'media.'.concat(DOMAIN),
  frontEndCertificateARN:
    DOMAIN === 'esn-ga.link'
      ? 'arn:aws:acm:us-east-1:772823474617:certificate/12d7466b-c989-46ee-86c5-61b2cda3c35c'
      : undefined
};

export const stages: { [stage: string]: Stage } = {
  prod: {
    domain: DOMAIN === 'esn-ga.link' ? 'ga.esn.org' : DOMAIN,
    alternativeDomains: DOMAIN === 'esn-ga.link' ? ['esn-ga.link'] : undefined,
    destroyDataOnDelete: false
  },
  dev: {
    domain: 'dev.'.concat(DOMAIN),
    destroyDataOnDelete: true
  }
};

export interface Parameters {
  /**
   * Project key (unique to the AWS account).
   */
  project: string;
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
   * The custom front-end certificate ARN to use, to support alternative domains.
   */
  frontEndCertificateARN?: string;
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
