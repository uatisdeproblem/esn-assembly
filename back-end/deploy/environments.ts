/**
 * The codename of the project.
 */
export const PROJECT = 'esn-assembly-lt';
/**
 * The purchased domain to use.
 */
export const DOMAIN = 'esn-assembly-lt.link';
/**
 * An additional custom domain to use.
 */
export const PROD_CUSTOM_DOMAIN = 'na.esn.lt';

export const parameters: Parameters = {
  project: PROJECT,
  apiDomain: 'api.'.concat(DOMAIN),
  webSocketApiDomain: 'socket.'.concat(DOMAIN),
  mediaDomain: 'media.'.concat(DOMAIN),
  frontEndCertificateARN: PROD_CUSTOM_DOMAIN
    ? 'arn:aws:acm:us-east-1:730335531065:certificate/d4c87dba-8a41-4d53-8729-13233d946ae4'
    : undefined
};

export const stages: { [stage: string]: Stage } = {
  prod: {
    domain: DOMAIN,
    alternativeDomains: PROD_CUSTOM_DOMAIN ? [PROD_CUSTOM_DOMAIN] : undefined,
    destroyDataOnDelete: false,
    logLevel: 'INFO'
  },
  dev: {
    domain: 'dev.'.concat(DOMAIN),
    destroyDataOnDelete: true,
    logLevel: 'DEBUG'
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
  /**
   * The minimum level of log to print in functions (default: `INFO`).
   */
  logLevel?: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
}
