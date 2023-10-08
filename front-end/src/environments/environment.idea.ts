/**
 * Variables to configure an ITER IDEA's cloud app, together with its inner modules.
 */
export const environment = {
  idea: {
    project: 'esn-ga',
    app: {
      version: '1.3.0',
      url: 'https://qa.esn.org',
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
    auth: {
      registrationIsPossible: false,
      singleSimultaneousSession: false
    },
    ionicExtraModules: ['common'],
    website: 'https://esn.org'
  }
};
