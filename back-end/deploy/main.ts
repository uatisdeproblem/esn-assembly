#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as DDB from 'aws-cdk-lib/aws-dynamodb';

import { IDEAStack } from './idea-stack';
import { MediaStack } from './media-stack';
import { ApiDomainStack } from './api-domain-stack';
import { SESStack } from './ses-stack';
import { ResourceController, ApiStack, DDBTable } from './api-stack';
import { FrontEndStack } from './front-end-stack';

import { parameters, stages, Stage, PROD_CUSTOM_DOMAIN } from './environments';

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
  { name: 'publicAttachments', paths: ['/public-attachments'] },
  { name: 'topics', paths: ['/topics', '/topics/{topicId}'] },
  { name: 'relatedTopics', paths: ['/topics/{topicId}/related', '/topics/{topicId}/related/{relatedId}'] },
  { name: 'questions', paths: ['/topics/{topicId}/questions', '/topics/{topicId}/questions/{questionId}'] },
  {
    name: 'questionsUpvotes',
    paths: [
      '/topics/{topicId}/questions/{questionId}/upvotes',
      '/topics/{topicId}/questions/{questionId}/upvotes/{userId}'
    ]
  },
  {
    name: 'answers',
    paths: [
      '/topics/{topicId}/questions/{questionId}/answers',
      '/topics/{topicId}/questions/{questionId}/answers/{answerId}'
    ]
  },
  {
    name: 'answersClaps',
    paths: [
      '/topics/{topicId}/questions/{questionId}/answers/{answerId}/claps',
      '/topics/{topicId}/questions/{questionId}/answers/{answerId}/claps/{userId}'
    ]
  },
  { name: 'messages', paths: ['/topics/{topicId}/messages', '/topics/{topicId}/messages/{messageId}'] },
  { name: 'messagesAnonymous', paths: ['/topics/{topicId}/messages-anonymous'] },
  {
    name: 'messagesUpvotes',
    paths: ['/topics/{topicId}/messages/{messageId}/upvotes', '/topics/{topicId}/messages/{messageId}/upvotes/{userId}']
  },
  { name: 'badges', paths: ['/badges', '/badges/{badge}'] },
  { name: 'usefulLinks', paths: ['/usefulLinks', '/usefulLinks/{linkId}'] },
  { name: 'deadlines', paths: ['/deadlines', '/deadlines/{deadlineId}'] },
  { name: 'communications', paths: ['/communications', '/communications/{communicationId}'] },
  { name: 'scheduledOps' },
  { name: 'sesNotifications' },
  { name: 'statistics', paths: ['/statistics'] },
  { name: 'userDrafts', paths: ['/drafts', '/drafts/{draftId}'] },
  { name: 'opportunities', paths: ['/opportunities', '/opportunities/{opportunityId}'] },
  {
    name: 'applications',
    paths: [
      '/opportunities/{opportunityId}/applications',
      '/opportunities/{opportunityId}/applications/{applicationId}'
    ]
  },
  { name: 'votingSessions', paths: ['/voting-sessions', '/voting-sessions/{sessionId}'] },
  { name: 'vote', paths: ['/voting-sessions/{sessionId}/vote'] }
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
    ],
    stream: DDB.StreamViewType.NEW_AND_OLD_IMAGES
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
  answersClaps: {
    PK: { name: 'answerId', type: DDB.AttributeType.STRING },
    SK: { name: 'userId', type: DDB.AttributeType.STRING },
    indexes: [
      {
        indexName: 'inverted-index',
        partitionKey: { name: 'userId', type: DDB.AttributeType.STRING },
        sortKey: { name: 'answerId', type: DDB.AttributeType.STRING },
        projectionType: DDB.ProjectionType.ALL
      },
      {
        indexName: 'questionId-userId-index',
        partitionKey: { name: 'questionId', type: DDB.AttributeType.STRING },
        sortKey: { name: 'userId', type: DDB.AttributeType.STRING },
        projectionType: DDB.ProjectionType.ALL
      }
    ]
  },
  messages: {
    PK: { name: 'topicId', type: DDB.AttributeType.STRING },
    SK: { name: 'messageId', type: DDB.AttributeType.STRING },
    stream: DDB.StreamViewType.NEW_AND_OLD_IMAGES
  },
  messagesUpvotes: {
    PK: { name: 'messageId', type: DDB.AttributeType.STRING },
    SK: { name: 'userId', type: DDB.AttributeType.STRING },
    indexes: [
      {
        indexName: 'inverted-index',
        partitionKey: { name: 'userId', type: DDB.AttributeType.STRING },
        sortKey: { name: 'messageId', type: DDB.AttributeType.STRING },
        projectionType: DDB.ProjectionType.ALL
      },
      {
        indexName: 'topicId-userId-index',
        partitionKey: { name: 'topicId', type: DDB.AttributeType.STRING },
        sortKey: { name: 'userId', type: DDB.AttributeType.STRING },
        projectionType: DDB.ProjectionType.ALL
      }
    ]
  },
  usersBadges: {
    PK: { name: 'userId', type: DDB.AttributeType.STRING },
    SK: { name: 'badge', type: DDB.AttributeType.STRING }
  },
  usefulLinks: {
    PK: { name: 'linkId', type: DDB.AttributeType.STRING }
  },
  deadlines: {
    PK: { name: 'deadlineId', type: DDB.AttributeType.STRING }
  },
  communications: {
    PK: { name: 'communicationId', type: DDB.AttributeType.STRING }
  },
  statistics: {
    PK: { name: 'PK', type: DDB.AttributeType.STRING },
    SK: { name: 'SK', type: DDB.AttributeType.STRING },
    expiresAtField: 'expiresAt'
  },
  usersDrafts: {
    PK: { name: 'userId', type: DDB.AttributeType.STRING },
    SK: { name: 'draftId', type: DDB.AttributeType.STRING },
    expiresAtField: 'expiresAt'
  },
  opportunities: {
    PK: { name: 'opportunityId', type: DDB.AttributeType.STRING },
    indexes: [
      {
        indexName: 'opportunityId-willCloseAt-index',
        partitionKey: { name: 'opportunityId', type: DDB.AttributeType.STRING },
        sortKey: { name: 'willCloseAt', type: DDB.AttributeType.STRING },
        projectionType: DDB.ProjectionType.KEYS_ONLY
      }
    ]
  },
  applications: {
    PK: { name: 'opportunityId', type: DDB.AttributeType.STRING },
    SK: { name: 'applicationId', type: DDB.AttributeType.STRING }
  },
  votingSessions: {
    PK: { name: 'sessionId', type: DDB.AttributeType.STRING },
    indexes: [
      {
        indexName: 'sessionId-meta-index',
        partitionKey: { name: 'topicId', type: DDB.AttributeType.STRING },
        sortKey: { name: 'name', type: DDB.AttributeType.STRING },
        projectionType: DDB.ProjectionType.INCLUDE,
        nonKeyAttributes: ['event']
      }
    ]
  },
  votingTickets: {
    PK: { name: 'sessionId', type: DDB.AttributeType.STRING },
    SK: { name: 'voterId', type: DDB.AttributeType.STRING },
    stream: DDB.StreamViewType.NEW_AND_OLD_IMAGES
  },
  votingResults: {
    PK: { name: 'sessionId', type: DDB.AttributeType.STRING },
    SK: { name: 'ballotOption', type: DDB.AttributeType.STRING }
  }
};

//
// STACKS
//

const createApp = async (): Promise<void> => {
  const app = new cdk.App({});

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION };

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

  const webSocketApiDomainStack = new ApiDomainStack(app, `${parameters.project}-socket-api-domain`, {
    env,
    domain: parameters.webSocketApiDomain
  });

  const sesStack = new SESStack(app, `${parameters.project}-ses`, {
    env,
    project: parameters.project,
    domain: parameters.apiDomain
  });

  //
  // STAGE-DEPENDANT RESOURCES
  //

  const apiStack = new ApiStack(app, `${parameters.project}-${STAGE}-api`, {
    env,
    project: parameters.project,
    stage: STAGE,
    apiDomain: parameters.apiDomain,
    apiDefinitionFile: './swagger.yaml',
    webSocketApiDomain: parameters.webSocketApiDomain,
    resourceControllers: apiResources,
    tables,
    mediaBucketArn: mediaStack.mediaBucketArn,
    ses: { identityArn: sesStack.identityArn, notificationTopicArn: sesStack.notificationTopicArn },
    removalPolicy: STAGE_VARIABLES.destroyDataOnDelete ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    lambdaLogLevel: STAGE_VARIABLES.logLevel ?? 'INFO',
    appDomain: STAGE === 'prod' && PROD_CUSTOM_DOMAIN ? PROD_CUSTOM_DOMAIN : STAGE_VARIABLES.domain
  });
  apiStack.addDependency(mediaStack);
  apiStack.addDependency(apiDomainStack);
  apiStack.addDependency(webSocketApiDomainStack);
  apiStack.addDependency(sesStack);

  new FrontEndStack(app, `${parameters.project}-${STAGE}-front-end`, {
    env,
    project: parameters.project,
    stage: STAGE,
    domain: STAGE_VARIABLES.domain,
    alternativeDomains: STAGE_VARIABLES.alternativeDomains,
    certificateARN: parameters.frontEndCertificateARN
  });
};
createApp();
