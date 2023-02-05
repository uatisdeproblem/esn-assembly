///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController } from 'idea-aws';

import { RelatedTopic, RelatedTopicRelations, Topic } from '../models/topic.model';
import { User } from '../models/user.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const DDB_TABLES = {
  topics: process.env.DDB_TABLE_topics,
  relatedTopics: process.env.DDB_TABLE_relatedTopics
};
const ddb = new DynamoDB();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new RelatedTopics(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class RelatedTopics extends ResourceController {
  galaxyUser: User;
  topic: Topic;
  relatedTopic: Topic;

  constructor(event: any, callback: any) {
    super(event, callback, { resourceId: 'relatedId' });
    this.galaxyUser = new User(event.requestContext.authorizer.lambda.user);
  }

  protected async checkAuthBeforeRequest(): Promise<void> {
    try {
      this.topic = new Topic(
        await ddb.get({ TableName: DDB_TABLES.topics, Key: { topicId: this.pathParameters.topicId } })
      );
    } catch (err) {
      throw new RCError('Topic not found');
    }

    if (!this.resourceId) return;

    try {
      this.relatedTopic = new Topic(await ddb.get({ TableName: DDB_TABLES.topics, Key: { topicId: this.resourceId } }));
    } catch (err) {
      throw new RCError('Related topic not found');
    }
  }

  protected async getResources(): Promise<Topic[]> {
    const relatedTopicsLink: RelatedTopic[] = await ddb.query({
      TableName: DDB_TABLES.relatedTopics,
      KeyConditionExpression: 'topicA = :topicA',
      ExpressionAttributeValues: { ':topicA': this.topic.topicId }
    });
    const relatedTopics: Topic[] = await ddb.batchGet(
      DDB_TABLES.topics,
      relatedTopicsLink.map(x => ({ topicId: x.topicB }))
    );

    return relatedTopics.map(x => new Topic(x)).sort((a, b): number => a.createdAt.localeCompare(b.createdAt));
  }

  protected async postResource(): Promise<void> {
    if (!this.galaxyUser.isAdministrator()) throw new RCError('Unauthorized');

    const relatedTopic1: RelatedTopic = {
      topicA: this.topic.topicId,
      topicB: this.relatedTopic.topicId,
      relation: RelatedTopicRelations.LINK
    };
    const relatedTopic2: RelatedTopic = {
      topicA: this.relatedTopic.topicId,
      topicB: this.topic.topicId,
      relation: RelatedTopicRelations.LINK
    };

    const relatedTopic1Put = { TableName: DDB_TABLES.relatedTopics, Item: relatedTopic1 };
    const relatedTopic2Put = { TableName: DDB_TABLES.relatedTopics, Item: relatedTopic2 };
    await ddb.transactWrites([{ Put: relatedTopic1Put }, { Put: relatedTopic2Put }]);
  }

  protected async deleteResource(): Promise<void> {
    if (!this.galaxyUser.isAdministrator()) throw new RCError('Unauthorized');

    const relatedTopic1Delete = {
      TableName: DDB_TABLES.relatedTopics,
      Key: { topicA: this.topic.topicId, topicB: this.relatedTopic.topicId }
    };
    const relatedTopic2Delete = {
      TableName: DDB_TABLES.relatedTopics,
      Key: { topicA: this.relatedTopic.topicId, topicB: this.topic.topicId }
    };

    await ddb.transactWrites([{ Delete: relatedTopic1Delete }, { Delete: relatedTopic2Delete }]);
  }
}
