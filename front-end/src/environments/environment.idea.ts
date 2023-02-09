/**
 * Variables to configure an ITER IDEA's cloud app, together with its inner modules.
 */
export const environment = {
  idea: {
    project: 'esn-ga',
    app: {
      version: '1.0.1',
      url: 'https://esn-ga.link',
      mediaUrl: 'https://media.esn-ga.link',
      title: 'ESN General Assembly Q&A',
      maxFileUploadSizeMB: 20
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
