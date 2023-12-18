/**
 * The stage to use for API (and websocket) requests.
 */
const STAGE = 'prod';

/**
 * Variables to configure an ITER IDEA's cloud app, together with its inner modules.
 */
export const environment = {
  idea: {
    project: 'esn-ga',
    app: {
      version: '1.6.0',
      url: 'https://ga.esn.org',
      mediaUrl: 'https://media.esn-ga.link',
      title: 'ESN Assembly app',
      bundle: 'com.esn.assembly',
      maxFileUploadSizeMB: 50
    },
    api: {
      url: 'api.esn-ga.link',
      stage: STAGE
    },
    socket: {
      url: 'socket.esn-ga.link',
      stage: STAGE
    },
    ionicExtraModules: ['common']
  }
};
