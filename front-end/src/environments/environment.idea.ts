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
      title: 'ESN General Assembly app',
      bundle: 'com.matteocarbone.esnga',
      maxFileUploadSizeMB: 50,
      supportEmail: 'ga-secretary@esn.org'
    },
    api: {
      url: 'api.esn-ga.link',
      stage: 'prod'
    },
    socket: {
      url: 'socket.esn-ga.link',
      stage: 'prod'
    },
    ionicExtraModules: ['common']
  }
};
