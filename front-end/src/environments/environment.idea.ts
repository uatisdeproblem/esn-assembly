import { parameters, stages } from '../../../back-end/deploy/environments';

/**
 * The stage to use for API (and websocket) requests.
 */
const STAGE = 'prod';

/**
 * Variables to configure an ITER IDEA's cloud app, together with its inner modules.
 */
export const environment = {
  idea: {
    app: {
      version: '1.7.0',
      url: 'https://'.concat(stages[STAGE].domain),
      mediaUrl: 'https://'.concat(parameters.mediaDomain),
      maxFileUploadSizeMB: 50
    },
    api: { url: parameters.apiDomain, stage: STAGE },
    socket: { url: parameters.webSocketApiDomain, stage: STAGE },
    ionicExtraModules: ['common']
  }
};
