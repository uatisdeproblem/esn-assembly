#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as DDB from 'aws-cdk-lib/aws-dynamodb';

import { IDEAStack } from './idea-stack';
import { MediaStack } from './media-stack';
import { ApiDomainStack } from './api-domain-stack';
import { SESStack } from './ses-stack';
import { ResourceController, ApiStack, DDBTable } from './api-stack';
import { FrontEndStack } from './front-end-stack';

import { parameters, stages, Stage } from './environments';

//
// RESOURCES
//

const apiResources: ResourceController[] = [
  { name: 'auth', isAuthFunction: true },
  { name: 'login', paths: ['/login'] },
  { name: 'configurations', paths: ['/configurations'] },
  { name: 'media', paths: ['/media'] },
  { name: 'categories', paths: ['/categories', '/categories/{categoryId}'] },
  { name: 'events', paths: ['/events', '/events/{eventId}'] },
  { name: 'topics', paths: ['/topics', '/topics/{topicId}'] },
  { name: 'relatedTopics', paths: ['/topics/{topicId}/related', '/topics/{topicId}/related/{relatedId}'] },
  { name: 'questions', paths: ['/topics/{topicId}/questions', '/topics/{topicId}/questions/{questionId}'] },
  {
    name: 'answers',
    paths: [
      '/topics/{topicId}/questions/{questionId}/answers',
      '/topics/{topicId}/questions/{questionId}/answers/{answerId}'
    ]
  },
  { name: 'badges', paths: ['/badges', '/badges/{badge}'] },
  { name: 'scheduledOps' },
  { name: 'sesNotifications' }
];

const tables: { [tableName: string]: DDBTable } = {
  configurations: {
    PK: { name: 'PK', type: DDB.AttributeType.STRING }
  },
  categories: {
    PK: { name: 'categoryId', type: DDB.AttributeType.STRING }
  },
  events: {
    PK: { name: 'eventId', type: DDB.AttributeType.STRING }
  },
  topics: {
    PK: { name: 'topicId', type: DDB.AttributeType.STRING },
    indexes: [
      {
        indexName: 'topicId-meta-index',
        partitionKey: { name: 'topicId', type: DDB.AttributeType.STRING },
        sortKey: { name: 'name', type: DDB.AttributeType.STRING },
        projectionType: DDB.ProjectionType.INCLUDE,
        nonKeyAttributes: ['category', 'event']
      },
      {
        indexName: 'topicId-willCloseAt-index',
        partitionKey: { name: 'topicId', type: DDB.AttributeType.STRING },
        sortKey: { name: 'willCloseAt', type: DDB.AttributeType.STRING },
        projectionType: DDB.ProjectionType.KEYS_ONLY
      }
    ]
  },
  relatedTopics: {
    PK: { name: 'topicA', type: DDB.AttributeType.STRING },
    SK: { name: 'topicB', type: DDB.AttributeType.STRING }
  },
  questions: {
    PK: { name: 'topicId', type: DDB.AttributeType.STRING },
    SK: { name: 'questionId', type: DDB.AttributeType.STRING }
  },
  answers: {
    PK: { name: 'questionId', type: DDB.AttributeType.STRING },
    SK: { name: 'answerId', type: DDB.AttributeType.STRING }
  },
  questionsUpvotes: {
    PK: { name: 'questionId', type: DDB.AttributeType.STRING },
    SK: { name: 'userId', type: DDB.AttributeType.STRING },
    indexes: [
      {
        indexName: 'inverted-index',
        partitionKey: { name: 'userId', type: DDB.AttributeType.STRING },
        sortKey: { name: 'questionId', type: DDB.AttributeType.STRING },
        projectionType: DDB.ProjectionType.ALL
      }
    ]
  },
  usersBadges: {
    PK: { name: 'userId', type: DDB.AttributeType.STRING },
    SK: { name: 'badge', type: DDB.AttributeType.STRING }
  }
};

//
// STACKS
//

const createApp = async (): Promise<void> => {
  const app = new cdk.App({});

  const env = { account: parameters.awsAccount, region: parameters.awsRegion };

  const STAGE = app.node.tryGetContext('stage');
  const STAGE_VARIABLES = (stages as any)[STAGE] as Stage;
  if (!STAGE_VARIABLES) {
    console.log('Missing stage (environments.ts); e.g. --parameters stage=dev\n\n');
    throw new Error();
  }

  //
  // GENERIC RESOURCES (they don't depend by the stage)
  //

  new IDEAStack(app, `idea-resources`);

  const mediaStack = new MediaStack(app, `${parameters.project}-media`, {
    env,
    mediaBucketName: `${parameters.project}-media`,
    mediaDomain: parameters.mediaDomain
  });

  const apiDomainStack = new ApiDomainStack(app, `${parameters.project}-api-domain`, {
    env,
    domain: parameters.apiDomain
  });

  const sesStack = new SESStack(app, `${parameters.project}-ses`, {
    env,
    project: parameters.project,
    domain: parameters.apiDomain,
    testEmailAddress: parameters.firstAdminEmail
  });

  //
  // STAGE-DEPENDANT RESOURCES
  //

  const apiStack = new ApiStack(app, `${parameters.project}-${STAGE}-api`, {
    env,
    project: parameters.project,
    stage: STAGE,
    firstAdminEmail: parameters.firstAdminEmail,
    apiDomain: parameters.apiDomain,
    apiDefinitionFile: './swagger.yaml',
    resourceControllers: apiResources,
    tables,
    mediaBucketArn: mediaStack.mediaBucketArn,
    ses: { identityArn: sesStack.identityArn, notificationTopicArn: sesStack.notificationTopicArn },
    removalPolicy: STAGE_VARIABLES.destroyDataOnDelete ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN
  });
  apiStack.addDependency(mediaStack);
  apiStack.addDependency(apiDomainStack);
  apiStack.addDependency(sesStack);

  new FrontEndStack(app, `${parameters.project}-${STAGE}-front-end`, {
    env,
    project: parameters.project,
    stage: STAGE,
    domain: STAGE_VARIABLES.domain
  });
};
createApp();
