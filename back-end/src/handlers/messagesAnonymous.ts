///
/// IMPORTS
///

import { DynamoDB, RCError, ResourceController } from 'idea-aws';

import { Message } from '../models/message.model';
import { Topic, TopicTypes } from '../models/topic.model';

///
/// CONSTANTS, ENVIRONMENT VARIABLES, HANDLER
///

const DDB_TABLES = { messages: process.env.DDB_TABLE_messages, topics: process.env.DDB_TABLE_topics };
const ddb = new DynamoDB();

export const handler = (ev: any, _: any, cb: any): Promise<void> => new MessagesAnonymousRC(ev, cb).handleRequest();

///
/// RESOURCE CONTROLLER
///

class MessagesAnonymousRC extends ResourceController {
  topic: Topic;

  constructor(event: any, callback: any) {
    super(event, callback);
  }

  protected async checkAuthBeforeRequest(): Promise<void> {
    try {
      this.topic = new Topic(
        await ddb.get({ TableName: DDB_TABLES.topics, Key: { topicId: this.pathParameters.topicId } })
      );
    } catch (err) {
      throw new RCError('Topic not found');
    }

    if (this.topic.type !== TopicTypes.LIVE) throw new RCError('Incompatible type of topic');
  }

  protected async postResources(): Promise<Message> {
    const message = new Message(this.body);
    message.topicId = this.topic.topicId;

    const getRandomInt = (max: number): number => Math.floor(Math.random() * max);
    message.messageId = Message.getPK('anonymous'.concat(getRandomInt(1_000_000_000).toString()));

    message.createdAt = new Date().toISOString();
    message.numOfUpvotes = 0;

    const errors = message.validate(this.topic);
    if (errors.length) throw new RCError(`Invalid fields: ${errors.join(', ')}`);

    await ddb.put({
      TableName: DDB_TABLES.messages,
      Item: message,
      ConditionExpression: 'attribute_not_exists(topicId) AND attribute_not_exists(messageId)'
    });

    return message;
  }
}
