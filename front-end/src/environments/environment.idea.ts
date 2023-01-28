/**
 * Variables to configure an ITER IDEA's cloud app, together with its inner modules.
 */
export const environment = {
  idea: {
    project: 'esn-ga',
    app: {
      version: '0.0.1',
      url: 'https://esn-ga.link',
      mediaUrl: 'https://media.esn-ga.link',
      title: 'ESN GA Candidates app',
      hasIntroPage: false
    },
    api: {
      url: 'api.esn-ga.link',
      stage: 'prod'
    },
    auth: {
      registrationIsPossible: false,
      singleSimultaneousSession: false
    },
    ionicExtraModules: ['common', 'variables', 'auth'],
    website: 'https://esn.org'
  },
  aws: {
    cognito: {
      userPoolId: 'eu-south-1_75DdHx8ba',
      userPoolClientId: '7cijl800ukriibl0g6rbj3iu5r'
    }
  }
};
